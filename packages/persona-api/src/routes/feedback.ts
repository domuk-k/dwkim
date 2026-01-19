import { Elysia, t } from 'elysia'
import { getFeedbackStats, saveFeedback } from '../services/feedbackService'

export const feedbackRoutes = new Elysia({ prefix: '/api/v1/feedback' })
  // POST /api/v1/feedback
  .post(
    '/',
    async ({ body, set }) => {
      try {
        const { rating, sessionId } = body

        // 유효성 검사
        if (rating !== null && ![1, 2, 3].includes(rating)) {
          set.status = 400
          return { success: false, message: 'Invalid rating. Must be 1, 2, 3, or null.' }
        }

        await saveFeedback(rating, sessionId)

        return {
          success: true,
          message: rating === null ? 'Feedback dismissed' : 'Thank you for your feedback!'
        }
      } catch (error) {
        console.error('Feedback submission failed:', error)
        set.status = 500
        return { success: false, message: 'Failed to save feedback' }
      }
    },
    {
      body: t.Object({
        rating: t.Union([t.Literal(1), t.Literal(2), t.Literal(3), t.Null()]),
        sessionId: t.Optional(t.String())
      })
    }
  )

  // GET /api/v1/feedback/stats
  .get('/stats', async ({ set }) => {
    try {
      const stats = await getFeedbackStats()
      return { success: true, data: stats }
    } catch (error) {
      console.error('Feedback stats fetch failed:', error)
      set.status = 500
      return { success: false, message: 'Failed to fetch feedback stats' }
    }
  })
