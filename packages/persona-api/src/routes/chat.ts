/**
 * Chat Routes - Elysia
 */

import { Elysia, t } from 'elysia'
import { type ChatContext, ChatRequestSchema, createChatService } from '../services/chatService'
import { getContactService } from '../services/contactService'
import { getConversationLimiter } from '../services/conversationLimiter'
import { getConversationStore } from '../services/conversationStore'
import { getDeviceService } from '../services/deviceService'

// ─────────────────────────────────────────────────────────────
// Validation Schemas (Elysia/TypeBox)
// ─────────────────────────────────────────────────────────────
const chatBodySchema = t.Object({
  message: t.String({ minLength: 1, maxLength: 1000 }),
  sessionId: t.Optional(t.String()),
  conversationHistory: t.Optional(
    t.Array(
      t.Object({
        role: t.Union([t.Literal('user'), t.Literal('assistant')]),
        content: t.String()
      })
    )
  ),
  options: t.Optional(
    t.Object({
      maxSearchResults: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
      includeSources: t.Optional(t.Boolean())
    })
  )
})

const contactBodySchema = t.Object({
  email: t.String({ format: 'email' }),
  name: t.Optional(t.String()),
  message: t.Optional(t.String()),
  sessionId: t.Optional(t.String())
})

const searchQuerySchema = t.Object({
  q: t.String({ minLength: 1 }),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 20, default: 5 }))
})

// ─────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────
function getContext(request: Request): ChatContext {
  return {
    clientIp:
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
    deviceId: request.headers.get('x-device-id') || undefined
  }
}

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────
export const chatRoutes = new Elysia({ prefix: '/api/v1' })
  // Lazy init ChatService
  .derive(async () => {
    const conversationStore = getConversationStore()
    const conversationLimiter = getConversationLimiter()
    const contactService = getContactService()
    const chatService = await createChatService(
      conversationStore,
      conversationLimiter,
      contactService
    )
    return { chatService, deviceService: getDeviceService() }
  })

  // POST /api/v1/chat
  .post(
    '/chat',
    async ({ body, request, chatService, deviceService, set }) => {
      const context = getContext(request)

      try {
        // IP 차단 확인
        const blocked = await chatService.checkBlocked(context.clientIp)
        if (blocked) {
          set.status = 429
          return blocked
        }

        // Zod 검증 (추가 검증)
        const validatedData = ChatRequestSchema.parse(body)

        // Device 활동 추적
        if (context.deviceId && deviceService) {
          deviceService.trackActivity(context.deviceId, validatedData.message).catch((error) => {
            console.warn('Device tracking failed:', error)
          })
        }

        return await chatService.handleChat(validatedData, context)
      } catch (error) {
        console.error('Chat API error:', error)
        set.status = 500
        return { success: false, error: '서버 내부 오류가 발생했습니다.' }
      }
    },
    { body: chatBodySchema }
  )

  // POST /api/v1/chat/stream (SSE)
  .post(
    '/chat/stream',
    async function* ({ body, request, chatService, deviceService, set }) {
      const context = getContext(request)

      try {
        // IP 차단 확인
        const blocked = await chatService.checkBlocked(context.clientIp)
        if (blocked) {
          set.status = 429
          yield `data: ${JSON.stringify({ type: 'error', error: 'Rate limit exceeded' })}\n\n`
          return
        }

        const validatedData = ChatRequestSchema.parse(body)

        // Device 활동 추적
        if (context.deviceId && deviceService) {
          deviceService.trackActivity(context.deviceId, validatedData.message).catch((error) => {
            console.warn('Device tracking failed:', error)
          })
        }

        // SSE 헤더 설정
        set.headers['Content-Type'] = 'text/event-stream'
        set.headers['Cache-Control'] = 'no-cache'
        set.headers['Connection'] = 'keep-alive'

        for await (const event of chatService.handleStreamChat(validatedData, context)) {
          yield `data: ${JSON.stringify(event)}\n\n`
        }
      } catch (error) {
        console.error('Stream chat error:', error)
        yield `data: ${JSON.stringify({ type: 'error', error: '서버 오류' })}\n\n`
      }
    },
    { body: chatBodySchema }
  )

  // GET /api/v1/search
  .get(
    '/search',
    async ({ query, chatService, set }) => {
      try {
        const q = query.q
        const limit = query.limit || 5
        const results = await chatService.searchDocuments(q, limit)

        return {
          success: true,
          data: { query: q, results, count: results.length }
        }
      } catch (error) {
        console.error('Search API error:', error)
        set.status = 500
        return { success: false, error: '검색 중 오류가 발생했습니다.' }
      }
    },
    { query: searchQuerySchema }
  )

  // GET /api/v1/status
  .get('/status', async ({ chatService }) => {
    try {
      const status = await chatService.getEngineStatus()
      return {
        success: status.status === 'ready',
        data: { ...status, timestamp: new Date().toISOString() }
      }
    } catch (error) {
      console.error('Status check error:', error)
      return { success: false, error: '상태 확인 중 오류가 발생했습니다.' }
    }
  })

  // POST /api/v1/contact
  .post(
    '/contact',
    async ({ body, request, chatService, deviceService, set }) => {
      const context = getContext(request)

      try {
        const result = await chatService.collectContact(body.email, context, {
          name: body.name,
          message: body.message,
          sessionId: body.sessionId
        })

        // Device-Email 연결
        if (context.deviceId && deviceService) {
          deviceService.linkEmail(context.deviceId, body.email).catch((error) => {
            console.warn('Device-email linking failed:', error)
          })
        }

        return result
      } catch (error) {
        console.error('Contact collection error:', error)
        set.status = 500
        return { success: false, error: '연락처 저장 중 오류가 발생했습니다.' }
      }
    },
    { body: contactBodySchema }
  )
