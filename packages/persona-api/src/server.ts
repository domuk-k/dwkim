import { bearer } from '@elysiajs/bearer'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { Elysia } from 'elysia'
import { env } from './config/env'
import { createRedisClient, type IRedisClient } from './infra/redis'
import { chatRoutes } from './routes/chat'
import { correctionRoutes } from './routes/correction'
import { feedbackRoutes } from './routes/feedback'
import { healthRoutes } from './routes/health'
import { logsRoutes } from './routes/logs'
import { syncRoutes } from './routes/sync'
import { initContactService } from './services/contactService'
import { initConversationLimiter } from './services/conversationLimiter'
import { initConversationStore } from './services/conversationStore'
import { initCorrectionService } from './services/correctionService'
import { initDeviceService } from './services/deviceService'
import { initFeedbackService } from './services/feedbackService'
import { initUXLogService } from './services/uxLogService'

// ─────────────────────────────────────────────────────────────
// Rate Limiting (In-Memory)
// ─────────────────────────────────────────────────────────────
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const windowMs = env.RATE_LIMIT_WINDOW_MS
  const max = env.RATE_LIMIT_MAX

  const entry = rateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

// ─────────────────────────────────────────────────────────────
// Server Factory
// ─────────────────────────────────────────────────────────────
export async function createServer() {
  // Redis 초기화
  let serviceRedisClient: IRedisClient

  if (env.REDIS_URL) {
    try {
      serviceRedisClient = createRedisClient(env.REDIS_URL)
      console.log('✅ Redis connected successfully')
    } catch (error) {
      console.warn('⚠️  Redis connection failed, using memory fallback:', error)
      serviceRedisClient = createRedisClient()
    }
  } else {
    console.log('ℹ️  No REDIS_URL provided, using memory fallback')
    serviceRedisClient = createRedisClient()
  }

  // 서비스 초기화
  initConversationStore(serviceRedisClient)
  initContactService(serviceRedisClient)
  initConversationLimiter(serviceRedisClient)
  initDeviceService(serviceRedisClient)
  initFeedbackService(serviceRedisClient)
  initCorrectionService(serviceRedisClient)
  initUXLogService(serviceRedisClient)

  const app = new Elysia()
    // CORS
    .use(
      cors({
        origin: env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      })
    )
    // Bearer token 지원
    .use(bearer())
    // Swagger
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Persona API',
            description: '개인화된 RAG+LLM 기반 챗봇 API',
            version: env.npm_package_version || '1.0.0'
          },
          tags: [
            { name: 'Health', description: '헬스체크 관련 엔드포인트' },
            { name: 'Chat', description: '채팅 관련 엔드포인트' },
            { name: 'Search', description: '문서 검색 엔드포인트' },
            { name: 'Sync', description: 'Cogni 노트 동기화 엔드포인트' },
            { name: 'Feedback', description: 'HITL 피드백 수집 엔드포인트' },
            { name: 'Logs', description: 'UX 로그 엔드포인트' }
          ]
        },
        path: '/docs'
      })
    )
    // Rate Limiting (제외 경로: health, sync)
    .onBeforeHandle(({ request, set }) => {
      const url = new URL(request.url)
      const path = url.pathname

      // 제외 경로
      if (
        path === '/health' ||
        path.startsWith('/health/') ||
        path.startsWith('/sync/') ||
        path.startsWith('/api/v1/sync/')
      ) {
        return
      }

      // Rate limit 체크
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'

      const result = rateLimit(ip)
      if (!result.allowed) {
        set.status = 429
        return {
          error: 'Too Many Requests',
          message: `Rate limit exceeded, retry in ${result.retryAfter}s`,
          retryAfter: result.retryAfter
        }
      }
      return undefined
    })
    // Error Handler
    .onError(({ code, error, set }) => {
      console.error('Error:', error)

      if (code === 'VALIDATION') {
        set.status = 400
        return {
          error: 'Validation Error',
          message: '입력 데이터 검증에 실패했습니다.',
          details: error.message
        }
      }

      if (code === 'NOT_FOUND') {
        set.status = 404
        return {
          error: 'Not Found',
          message: '요청한 리소스를 찾을 수 없습니다.'
        }
      }

      set.status = 500
      return {
        error: 'Internal Server Error',
        message: '서버 내부 오류가 발생했습니다.'
      }
    })
    // Root
    .get('/', () => ({
      name: 'Persona API',
      version: env.npm_package_version || '1.0.0',
      description: 'Personalized RAG+LLM Chatbot API for dwkim persona',
      docs: '/docs'
    }))
    // Routes
    .use(healthRoutes)
    .use(chatRoutes)
    .use(syncRoutes)
    .use(feedbackRoutes)
    .use(correctionRoutes)
    .use(logsRoutes)

  return { server: app }
}

// Export for testing
export { createServer as build }
