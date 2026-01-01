import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RAGEngine } from '../services/ragEngine';
import {
  initPersonaAgent,
  queryPersona,
  queryPersonaStream,
  isPersonaAgentReady,
} from '../services/personaAgent';
import type { RAGResponse } from '../services/ragEngine';
import type { ChatMessage } from '../services/llmService';
import {
  logChatResponse,
  logChatError,
  generateRequestId,
  type ChatLogEntry,
} from '../services/chatLogger';
import {
  getConversationStore,
  ConversationStore,
} from '../services/conversationStore';
import {
  getConversationLimiter,
  THRESHOLDS,
} from '../services/conversationLimiter';
import {
  getContactService,
  type ContactInfo,
} from '../services/contactService';

// Feature flag: USE_DEEP_AGENT=1 to enable DeepAgents
const USE_DEEP_AGENT = process.env.USE_DEEP_AGENT === '1';

// 요청 스키마
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),  // 서버사이드 히스토리용
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

// THRESHOLDS는 conversationLimiter에서 import
// THRESHOLDS.SUGGEST_CONTACT = 5, THRESHOLDS.BLOCK_IP = 30

// 응답 스키마
export const ChatResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    answer: z.string(),
    sessionId: z.string().optional(),  // 세션 ID (히스토리 추적용)
    shouldSuggestContact: z.boolean().optional(),  // n회 질문 후 연락 제안
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
          score: z.number().optional(),
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
  let useDeepAgent = USE_DEEP_AGENT;

  // 엔진 초기화
  try {
    if (USE_DEEP_AGENT) {
      await initPersonaAgent();
      console.log('PersonaAgent initialized (Gemini 2.0 Flash + LangGraph)');
    } else {
      await ragEngine.initialize();
      console.log('RAG Engine initialized for chat routes');
    }
  } catch (error) {
    console.error('Failed to initialize engine:', error);
    useDeepAgent = false;
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
      const requestId = generateRequestId();
      const startTime = Date.now();
      const clientIp = request.ip;
      const userAgent = request.headers['user-agent'];
      const conversationStore = getConversationStore();
      const conversationLimiter = getConversationLimiter();

      try {
        // IP 차단 확인
        const blockStatus = await conversationLimiter.isBlocked(clientIp);
        if (blockStatus.blocked) {
          return reply.status(429).send({
            success: false,
            error: 'conversation_limit_exceeded',
            message: conversationLimiter.generateFriendlyBlockMessage(),
            expiresAt: blockStatus.expiresAt,
            canProvideContact: true, // 연락처 제공 기회
          });
        }

        // 입력 검증
        const validatedData = ChatRequestSchema.parse(request.body);
        const {
          message,
          sessionId: inputSessionId,
          conversationHistory: clientHistory = [],
          options = {},
        } = validatedData;

        // 세션 ID 결정: 클라이언트 제공 → IP 기반 생성
        const sessionId = inputSessionId || ConversationStore.generateSessionId(clientIp);

        // 히스토리 결정: sessionId 있으면 서버 히스토리, 없으면 클라이언트 히스토리
        let history: ChatMessage[];
        if (inputSessionId) {
          // 서버 히스토리 사용
          history = await conversationStore.getHistory(sessionId);
        } else if (clientHistory.length > 0) {
          // 클라이언트 히스토리 사용 (기존 호환성)
          history = clientHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));
        } else {
          history = [];
        }

        // 사용자 메시지 저장 (서버 히스토리)
        await conversationStore.addMessage(sessionId, 'user', message);

        // 로그 엔트리 기본 정보
        const logEntry: ChatLogEntry = {
          requestId,
          timestamp: new Date().toISOString(),
          clientIp,
          userAgent,
          request: {
            message,
            historyLength: history.length,
          },
          engine: 'rag',
        };

        // 응답 생성 헬퍼
        const sendResponse = async (answer: string, sources: unknown[], usage: unknown, metadata: unknown) => {
          // 어시스턴트 응답 저장
          await conversationStore.addMessage(sessionId, 'assistant', answer);

          // 메시지 카운트로 상태 결정
          const messageCount = await conversationStore.getMessageCount(sessionId);
          const shouldSuggestContact = messageCount >= THRESHOLDS.SUGGEST_CONTACT;
          const shouldBlockAfterThis = messageCount >= THRESHOLDS.BLOCK_IP;

          // 30회 도달 시 IP 차단 예약 (다음 요청부터 적용)
          if (shouldBlockAfterThis) {
            await conversationLimiter.blockIp(clientIp);
            console.log(`🚫 Conversation limit reached for ${clientIp} (${messageCount} messages)`);
          }

          return reply.send({
            success: true,
            data: {
              answer,
              sessionId,
              shouldSuggestContact,
              // 30회 도달 시 추가 정보
              ...(shouldBlockAfterThis && {
                conversationLimitReached: true,
                contactSuggestionMessage: conversationLimiter.generateFriendlyBlockMessage(),
              }),
              sources: options.includeSources !== false ? sources : [],
              usage,
              metadata,
            },
          });
        };

        // DeepAgent (PersonaAgent) 또는 RAG 엔진 사용
        if (useDeepAgent && isPersonaAgentReady()) {
          logEntry.engine = 'deepagent';

          // sessionId가 있으면 LangGraph가 히스토리 자동 관리
          const response = await queryPersona(message, sessionId);

          const processingTimeMs = Date.now() - startTime;
          logEntry.response = {
            answerPreview: response.answer.slice(0, 100),
            sourcesCount: response.sources.length,
            processingTimeMs,
          };
          logChatResponse(logEntry);

          return sendResponse(response.answer, response.sources, response.usage, response.metadata);
        }

        // Fallback: RAG 엔진 사용
        if (!ragEngine) {
          logEntry.engine = 'mock';
          const mockAnswer = `안녕하세요! dwkim의 AI 어시스턴트입니다. 현재 엔진이 초기화 중이므로 Mock 응답을 드립니다.\n\n질문: ${message}`;

          logEntry.response = {
            answerPreview: mockAnswer.slice(0, 100),
            sourcesCount: 0,
            processingTimeMs: Date.now() - startTime,
          };
          logChatResponse(logEntry);

          return sendResponse(
            mockAnswer,
            [],
            { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            { searchQuery: message, searchResults: 0, processingTime: 0 }
          );
        }

        // RAG 엔진으로 쿼리 처리
        const response: RAGResponse = await ragEngine.processQuery(message, history);

        const processingTimeMs = Date.now() - startTime;
        logEntry.response = {
          answerPreview: response.answer.slice(0, 100),
          sourcesCount: response.sources.length,
          processingTimeMs,
        };
        logChatResponse(logEntry);

        return sendResponse(response.answer, response.sources, response.usage, response.metadata);
      } catch (error) {
        logChatError(requestId, clientIp, 'Chat API error', error);

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

  // 스트리밍 채팅 엔드포인트 (SSE)
  fastify.post(
    '/chat/stream',
    {
      schema: {
        description: '스트리밍 RAG 채팅 API (Server-Sent Events)',
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
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validatedData = ChatRequestSchema.parse(request.body);
        const { message, sessionId: inputSessionId, conversationHistory: clientHistory = [] } = validatedData;
        const clientIp = request.ip;
        const sessionId = inputSessionId || ConversationStore.generateSessionId(clientIp);
        const conversationStore = getConversationStore();

        // SSE 헤더 설정
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        // 히스토리 결정: sessionId 있으면 서버 히스토리, 없으면 클라이언트 히스토리
        let history: ChatMessage[];
        if (inputSessionId) {
          // 서버 히스토리 사용 (세션 ID가 제공된 경우)
          history = await conversationStore.getHistory(sessionId);
        } else if (clientHistory.length > 0) {
          // 클라이언트 히스토리 사용 (기존 호환성)
          history = clientHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));
        } else {
          history = [];
        }

        // 사용자 메시지 저장 (서버 히스토리)
        await conversationStore.addMessage(sessionId, 'user', message);
        let fullAnswer = '';

        // 연결 시작 이벤트 (sessionId 포함)
        reply.raw.write(`data: ${JSON.stringify({ type: 'session', sessionId })}\n\n`);

        // DeepAgent (PersonaAgent) 또는 RAG 엔진 사용
        if (useDeepAgent && isPersonaAgentReady()) {
          for await (const event of queryPersonaStream(message, sessionId)) {
            if (event.type === 'content') {
              fullAnswer += event.content;
            }
            const data = JSON.stringify(event);
            reply.raw.write(`data: ${data}\n\n`);
          }
        } else if (ragEngine) {
          for await (const event of ragEngine.processQueryStream(message, history)) {
            if (event.type === 'content') {
              fullAnswer += event.content;
            }
            // done 이벤트에 shouldSuggestContact 추가
            if (event.type === 'done') {
              const messageCount = await conversationStore.getMessageCount(sessionId);
              const shouldSuggestContact = messageCount >= THRESHOLDS.SUGGEST_CONTACT;
              const enrichedEvent = {
                ...event,
                metadata: {
                  ...event.metadata,
                  shouldSuggestContact,
                  messageCount,
                },
              };
              reply.raw.write(`data: ${JSON.stringify(enrichedEvent)}\n\n`);
              continue;
            }
            const data = JSON.stringify(event);
            reply.raw.write(`data: ${data}\n\n`);
          }
        } else {
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: '엔진이 초기화되지 않았습니다.' })}\n\n`);
        }

        // 어시스턴트 응답 저장
        if (fullAnswer) {
          await conversationStore.addMessage(sessionId, 'assistant', fullAnswer);
        }

        reply.raw.end();
      } catch (error) {
        console.error('Stream chat error:', error);

        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: '입력 데이터 검증 실패',
          });
        }

        reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: '서버 오류' })}\n\n`);
        reply.raw.end();
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

  // 연락처 수집 엔드포인트
  fastify.post(
    '/contact',
    {
      schema: {
        description: '연락처 수집 API (리드 캡처)',
        tags: ['Chat'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: '이메일 주소',
            },
            name: {
              type: 'string',
              description: '이름 (선택)',
            },
            message: {
              type: 'string',
              description: '전달할 메시지 (선택)',
            },
            sessionId: {
              type: 'string',
              description: '세션 ID',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as {
          email: string;
          name?: string;
          message?: string;
          sessionId?: string;
        };

        const clientIp = request.ip;
        const conversationStore = getConversationStore();
        const contactService = getContactService();
        const conversationLimiter = getConversationLimiter();

        // 세션 ID 결정
        const sessionId = body.sessionId || ConversationStore.generateSessionId(clientIp);
        const messageCount = await conversationStore.getMessageCount(sessionId);

        // 차단 상태 확인
        const blockStatus = await conversationLimiter.isBlocked(clientIp);
        const trigger = blockStatus.blocked ? 'block_interrupt' : 'engagement';

        // 연락처 저장
        const contactInfo: ContactInfo = {
          email: body.email,
          name: body.name,
          message: body.message,
          sessionId,
          clientIp,
          messageCount,
          collectedAt: new Date().toISOString(),
          trigger,
        };

        await contactService.saveContact(contactInfo);

        // 차단 중이었다면 차단 해제 (선의의 사용자)
        if (blockStatus.blocked) {
          await conversationLimiter.unblockIp(clientIp);
          console.log(`✅ IP unblocked after contact collection: ${clientIp}`);
        }

        return reply.send({
          success: true,
          message: `감사합니다! ${body.name || ''}님, dwkim이 24시간 내로 ${body.email}로 연락드릴게요! 😊`,
        });
      } catch (error) {
        console.error('Contact collection error:', error);
        return reply.status(500).send({
          success: false,
          error: '연락처 저장 중 오류가 발생했습니다.',
        });
      }
    }
  );
}
