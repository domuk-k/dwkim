import { Elysia, t } from 'elysia'
import { env } from '../config/env'
import { getUXLogService } from '../services/uxLogService'

/**
 * Admin 인증 체크
 */
function checkAdminAuth(request: Request): { authorized: boolean; error?: string } {
  // 개발 환경에서 ADMIN_API_KEY 미설정 시 경고 후 통과
  if (!env.ADMIN_API_KEY) {
    if (env.NODE_ENV === 'production') {
      return { authorized: false, error: 'Admin API key not configured' }
    }
    console.warn('⚠️  ADMIN_API_KEY not set - logs endpoint is unprotected')
    return { authorized: true }
  }

  const apiKey =
    request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')

  if (apiKey !== env.ADMIN_API_KEY) {
    return { authorized: false, error: 'Invalid or missing API key' }
  }

  return { authorized: true }
}

export const logsRoutes = new Elysia({ prefix: '/api/v1/logs' })
  // 인증 미들웨어
  .onBeforeHandle(({ request, set }) => {
    const auth = checkAdminAuth(request)
    if (!auth.authorized) {
      set.status = auth.error === 'Admin API key not configured' ? 503 : 401
      return {
        error:
          auth.error === 'Admin API key not configured' ? 'Service Unavailable' : 'Unauthorized',
        message: auth.error
      }
    }
    return undefined
  })

  // GET /api/v1/logs
  .get(
    '/',
    async ({ query }) => {
      const limit = query.limit || 30
      const uxLogService = getUXLogService()
      const logs = await uxLogService.getRecentLogs(limit)
      return { logs, count: logs.length }
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number({ maximum: 100, default: 30 }))
      })
    }
  )

  // GET /api/v1/logs/stats
  .get('/stats', async () => {
    const uxLogService = getUXLogService()
    return uxLogService.getStats()
  })

  // GET /api/v1/logs/:id
  .get(
    '/:id',
    async ({ params, set }) => {
      const uxLogService = getUXLogService()
      const log = await uxLogService.getLogById(params.id)

      if (!log) {
        set.status = 404
        return { error: 'Log not found' }
      }

      return log
    },
    {
      params: t.Object({
        id: t.String()
      })
    }
  )

  // GET /api/v1/logs/session/:sessionId
  .get(
    '/session/:sessionId',
    async ({ params }) => {
      const uxLogService = getUXLogService()
      const logs = await uxLogService.getLogsBySession(params.sessionId)
      return { logs, count: logs.length }
    },
    {
      params: t.Object({
        sessionId: t.String()
      })
    }
  )
