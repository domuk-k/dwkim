import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { getCorrections, saveCorrection } from '../services/correctionService'
import { detectLanguage, HITL_MESSAGES } from '../utils/languageDetector'

interface CorrectionBody {
  originalQuery: string
  originalResponse: string
  correctionMessage: string
  sessionId?: string
}

/**
 * Correction Routes
 *
 * HITL: 응답 수정 요청 엔드포인트
 */
export default async function correctionRoutes(fastify: FastifyInstance) {
  // POST /api/v1/correction - 수정 피드백 제출
  fastify.post<{ Body: CorrectionBody }>(
    '/',
    {
      schema: {
        tags: ['Feedback'],
        summary: 'Submit response correction',
        description: 'Submit a correction for a wrong response',
        body: {
          type: 'object',
          properties: {
            originalQuery: {
              type: 'string',
              description: 'The original user query'
            },
            originalResponse: {
              type: 'string',
              description: 'The agent response that was wrong'
            },
            correctionMessage: {
              type: 'string',
              description: 'User message explaining the correction'
            },
            sessionId: {
              type: 'string',
              description: 'Session ID'
            }
          },
          required: ['originalQuery', 'originalResponse', 'correctionMessage']
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
    async (request: FastifyRequest<{ Body: CorrectionBody }>, reply: FastifyReply) => {
      try {
        const { originalQuery, originalResponse, correctionMessage, sessionId } = request.body

        await saveCorrection({
          originalQuery,
          originalResponse,
          correctionMessage,
          sessionId
        })

        // 사용자 언어에 맞는 응답 메시지
        const lang = detectLanguage(originalQuery)
        const messages = HITL_MESSAGES[lang]

        return reply.send({
          success: true,
          message: messages.correctionThanks
        })
      } catch (error) {
        fastify.log.error({ err: error }, 'Correction submission failed')
        return reply.status(500).send({
          success: false,
          message: 'Failed to save correction'
        })
      }
    }
  )

  // GET /api/v1/correction - 수정 피드백 목록 (관리자용)
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Feedback'],
        summary: 'Get correction list',
        description: 'Get list of correction feedback (admin only)',
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', default: 20 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
      try {
        const limit = request.query.limit || 20
        const corrections = await getCorrections(limit)

        return reply.send({
          success: true,
          data: corrections
        })
      } catch (error) {
        fastify.log.error({ err: error }, 'Correction list fetch failed')
        return reply.status(500).send({
          success: false,
          message: 'Failed to fetch corrections'
        })
      }
    }
  )
}
