import { Elysia, t } from 'elysia'
import { getCorrections, saveCorrection } from '../services/correctionService'
import { detectLanguage, HITL_MESSAGES } from '../utils/languageDetector'

export const correctionRoutes = new Elysia({ prefix: '/api/v1/correction' })
  // POST /api/v1/correction
  .post(
    '/',
    async ({ body, set }) => {
      try {
        const { originalQuery, originalResponse, correctionMessage, sessionId } = body

        await saveCorrection({
          originalQuery,
          originalResponse,
          correctionMessage,
          sessionId
        })

        // 사용자 언어에 맞는 응답 메시지
        const lang = detectLanguage(originalQuery)
        const messages = HITL_MESSAGES[lang]

        return { success: true, message: messages.correctionThanks }
      } catch (error) {
        console.error('Correction submission failed:', error)
        set.status = 500
        return { success: false, message: 'Failed to save correction' }
      }
    },
    {
      body: t.Object({
        originalQuery: t.String(),
        originalResponse: t.String(),
        correctionMessage: t.String(),
        sessionId: t.Optional(t.String())
      })
    }
  )

  // GET /api/v1/correction
  .get(
    '/',
    async ({ query, set }) => {
      try {
        const limit = query.limit || 20
        const corrections = await getCorrections(limit)
        return { success: true, data: corrections }
      } catch (error) {
        console.error('Correction list fetch failed:', error)
        set.status = 500
        return { success: false, message: 'Failed to fetch corrections' }
      }
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number({ default: 20 }))
      })
    }
  )
