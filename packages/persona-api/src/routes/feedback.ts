import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getFeedbackStats, saveFeedback } from '../services/feedbackService'

interface FeedbackBody {
  rating: 1 | 2 | 3 | null
  sessionId?: string
}

/**
 * Feedback Routes
 *
 * HITL: Response Feedback 엔드포인트
 *
 * Privacy 원칙:
 * - rating과 sessionId만 수집
 * - 대화 내용, 코드 절대 포함 안함
 */
export default async function feedbackRoutes(fastify: FastifyInstance) {
  // POST /api/v1/feedback - 피드백 제출
  fastify.post<{ Body: FeedbackBody }>(
    '/',
    {
      schema: {
        tags: ['Feedback'],
        summary: 'Submit response feedback',
        description:
          'Submit feedback for a response (1-3 scale). Privacy: only rating is collected.',
        body: {
          type: 'object',
          properties: {
            rating: {
              type: ['integer', 'null'],
              enum: [1, 2, 3, null],
              description: '1 = Good, 2 = Okay, 3 = Poor, null = dismissed'
            },
            sessionId: {
              type: 'string',
              description: 'Session ID for aggregation (not for identification)'
            }
          },
          required: ['rating']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: FeedbackBody }>, reply: FastifyReply) => {
      try {
        const { rating, sessionId } = request.body

        // 유효성 검사
        if (rating !== null && ![1, 2, 3].includes(rating)) {
          return reply.status(400).send({
            success: false,
            message: 'Invalid rating. Must be 1, 2, 3, or null.'
          })
        }

        await saveFeedback(rating, sessionId)

        return reply.send({
          success: true,
          message: rating === null ? 'Feedback dismissed' : 'Thank you for your feedback!'
        })
      } catch (error) {
        fastify.log.error({ err: error }, 'Feedback submission failed')
        return reply.status(500).send({
          success: false,
          message: 'Failed to save feedback'
        })
      }
    }
  )

  // GET /api/v1/feedback/stats - 피드백 통계 (관리자용)
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Feedback'],
        summary: 'Get feedback statistics',
        description: 'Get aggregated feedback statistics',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  ratings: {
                    type: 'object',
                    properties: {
                      good: { type: 'number' },
                      okay: { type: 'number' },
                      poor: { type: 'number' },
                      dismissed: { type: 'number' }
                    }
                  },
                  avgScore: { type: ['number', 'null'] }
                }
              }
            }
          }
        }
      }
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await getFeedbackStats()

        return reply.send({
          success: true,
          data: stats
        })
      } catch (error) {
        fastify.log.error({ err: error }, 'Feedback stats fetch failed')
        return reply.status(500).send({
          success: false,
          message: 'Failed to fetch feedback stats'
        })
      }
    }
  )
}
