/**
 * Chat Routes - AI SDK v2
 *
 * Vercel AI SDK Data Stream Protocol을 사용하는 새 엔드포인트
 * - POST /api/v2/chat/stream
 *
 * v1 엔드포인트는 그대로 유지하여 dwkim CLI 호환성 보장
 */

import { Elysia, t } from 'elysia'
import { createDataStreamResponse } from '../services/aisdk/messageStreamAdapter'
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
export const chatAISDKRoutes = new Elysia({ prefix: '/api/v2' })
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

  // POST /api/v2/chat/stream (AI SDK Data Stream Protocol)
  .post(
    '/chat/stream',
    async ({ body, request, chatService, deviceService, set }) => {
      const context = getContext(request)

      try {
        // IP 차단 확인
        const blocked = await chatService.checkBlocked(context.clientIp)
        if (blocked) {
          set.status = 429
          return {
            error: 'Rate limit exceeded',
            message: blocked.message,
            retryAfter: blocked.expiresAt
          }
        }

        const validatedData = ChatRequestSchema.parse(body)

        // Device 활동 추적
        if (context.deviceId && deviceService) {
          deviceService.trackActivity(context.deviceId, validatedData.message).catch((error) => {
            console.warn('Device tracking failed:', error)
          })
        }

        // ChatService의 스트리밍 제너레이터 → AI SDK UI Message Stream Response
        const eventStream = chatService.handleStreamChat(validatedData, context)
        return createDataStreamResponse(eventStream)
      } catch (error) {
        console.error('AI SDK Chat stream error:', error)
        set.status = 500
        return { success: false, error: '서버 내부 오류가 발생했습니다.' }
      }
    },
    { body: chatBodySchema }
  )
