import { FastifyInstance } from 'fastify';
import {
  chatRequestSchema,
  chatResponseSchema,
  errorResponseSchema,
} from '../schemas/chat';

export default async function chatRoutes(fastify: FastifyInstance) {
  // POST /chat
  fastify.post(
    '/chat',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Chat with personal agent',
        description:
          'Send a message to get a personalized response based on dwkim persona',
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
              description: 'User message to the agent',
            },
          },
        },
        response: {
          200: {
            description: 'Successful response',
            type: 'object',
            properties: {
              response: { type: 'string', description: 'Agent response' },
              responseTime: {
                type: 'number',
                description: 'Response time in milliseconds',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Response timestamp',
              },
            },
          },
          400: {
            description: 'Bad request - Invalid input',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          429: {
            description: 'Too many requests',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          500: {
            description: 'Internal server error',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const startTime = Date.now();

      try {
        // 입력 검증
        const validationResult = chatRequestSchema.safeParse(request.body);
        if (!validationResult.success) {
          return reply.status(400).send({
            error: 'Invalid input',
            message: '입력 데이터가 유효하지 않습니다',
            details: validationResult.error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          });
        }

        const { message } = validationResult.data;

        // TODO: 실제 RAG 엔진 연동
        // 현재는 Mock 응답
        const mockResponse = `안녕하세요! "${message}"에 대한 답변입니다. 현재는 개발 중인 상태입니다.`;

        const responseTime = Date.now() - startTime;

        return {
          response: mockResponse,
          responseTime,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        fastify.log.error('Chat processing error:', error);
        return reply.status(500).send({
          error: 'Internal server error',
          message: '챗봇 처리 중 오류가 발생했습니다',
        });
      }
    }
  );
}
