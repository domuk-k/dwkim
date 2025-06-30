import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RAGEngine, RAGResponse } from '../services/ragEngine';
import { ChatMessage } from '../services/llmService';

// 요청 스키마
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
  options: z
    .object({
      maxSearchResults: z.number().min(1).max(10).optional(),
      includeSources: z.boolean().optional(),
    })
    .optional(),
});

// 응답 스키마
const ChatResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    answer: z.string(),
    sources: z
      .array(
        z.object({
          id: z.string(),
          content: z.string(),
          metadata: z.object({
            type: z.string(),
            title: z.string().optional(),
            category: z.string().optional(),
          }),
        })
      )
      .optional(),
    usage: z.object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    }),
    metadata: z.object({
      searchQuery: z.string(),
      searchResults: z.number(),
      processingTime: z.number(),
    }),
  }),
  error: z.string().optional(),
});

export default async function chatRoutes(fastify: FastifyInstance) {
  const ragEngine = new RAGEngine();

  // RAG 엔진 초기화
  try {
    await ragEngine.initialize();
    console.log('RAG Engine initialized for chat routes');
  } catch (error) {
    console.error('Failed to initialize RAG Engine:', error);
    // 초기화 실패 시에도 서버는 계속 실행 (Mock 응답 사용)
  }

  // 채팅 엔드포인트
  fastify.post(
    '/chat',
    {
      schema: {
        description: '개인화된 RAG 기반 채팅 API',
        tags: ['Chat'],
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: '사용자 메시지',
              minLength: 1,
              maxLength: 1000,
            },
            conversationHistory: {
              type: 'array',
              description: '대화 히스토리',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    enum: ['user', 'assistant'],
                  },
                  content: { type: 'string' },
                },
              },
            },
            options: {
              type: 'object',
              properties: {
                maxSearchResults: {
                  type: 'number',
                  minimum: 1,
                  maximum: 10,
                  default: 5,
                },
                includeSources: {
                  type: 'boolean',
                  default: true,
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  answer: { type: 'string' },
                  sources: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        content: { type: 'string' },
                        metadata: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            title: { type: 'string' },
                            category: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                  usage: {
                    type: 'object',
                    properties: {
                      promptTokens: { type: 'number' },
                      completionTokens: { type: 'number' },
                      totalTokens: { type: 'number' },
                    },
                  },
                  metadata: {
                    type: 'object',
                    properties: {
                      searchQuery: { type: 'string' },
                      searchResults: { type: 'number' },
                      processingTime: { type: 'number' },
                    },
                  },
                },
              },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // 입력 검증
        const validatedData = ChatRequestSchema.parse(request.body);
        const {
          message,
          conversationHistory = [],
          options = {},
        } = validatedData;

        // RAG 엔진이 초기화되지 않은 경우 Mock 응답
        if (!ragEngine) {
          return reply.send({
            success: true,
            data: {
              answer: `안녕하세요! dwkim의 AI 어시스턴트입니다. 현재 RAG 엔진이 초기화 중이므로 Mock 응답을 드립니다.\n\n질문: ${message}\n\n실제 RAG 엔진이 준비되면 더 정확하고 개인화된 답변을 제공할 수 있습니다.`,
              sources: [],
              usage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
              },
              metadata: {
                searchQuery: message,
                searchResults: 0,
                processingTime: 0,
              },
            },
          });
        }

        // 대화 히스토리 변환
        const history: ChatMessage[] = conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // RAG 엔진으로 쿼리 처리
        const response: RAGResponse = await ragEngine.processQuery(
          message,
          history
        );

        // 응답 구성
        const result = {
          success: true,
          data: {
            answer: response.answer,
            sources: options.includeSources !== false ? response.sources : [],
            usage: response.usage,
            metadata: response.metadata,
          },
        };

        return reply.send(result);
      } catch (error) {
        console.error('Chat API error:', error);

        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: '입력 데이터 검증 실패',
            details: error.errors,
          });
        }

        return reply.status(500).send({
          success: false,
          error: '서버 내부 오류가 발생했습니다.',
        });
      }
    }
  );

  // 문서 검색 엔드포인트
  fastify.get(
    '/search',
    {
      schema: {
        description: '문서 검색 API',
        tags: ['Search'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: {
              type: 'string',
              description: '검색 쿼리',
              minLength: 1,
            },
            limit: {
              type: 'number',
              description: '검색 결과 수',
              minimum: 1,
              maximum: 20,
              default: 5,
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { q, limit = 5 } = request.query as { q: string; limit?: number };

        if (!ragEngine) {
          return reply.status(503).send({
            success: false,
            error: 'RAG 엔진이 초기화되지 않았습니다.',
          });
        }

        const documents = await ragEngine.searchDocuments(q, limit);

        return reply.send({
          success: true,
          data: {
            query: q,
            results: documents,
            count: documents.length,
          },
        });
      } catch (error) {
        console.error('Search API error:', error);
        return reply.status(500).send({
          success: false,
          error: '검색 중 오류가 발생했습니다.',
        });
      }
    }
  );

  // 엔진 상태 확인 엔드포인트
  fastify.get(
    '/status',
    {
      schema: {
        description: 'RAG 엔진 상태 확인',
        tags: ['System'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!ragEngine) {
          return reply.send({
            success: false,
            data: {
              status: 'not_initialized',
              message: 'RAG 엔진이 초기화되지 않았습니다.',
            },
          });
        }

        const status = await ragEngine.getEngineStatus();

        return reply.send({
          success: true,
          data: {
            status: 'ready',
            components: status,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Status check error:', error);
        return reply.status(500).send({
          success: false,
          error: '상태 확인 중 오류가 발생했습니다.',
        });
      }
    }
  );
}
