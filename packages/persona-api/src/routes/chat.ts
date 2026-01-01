/**
 * Chat Routes - 슬림화된 라우트 정의
 *
 * 비즈니스 로직은 ChatService로 분리됨
 * 라우트는 입출력 처리와 에러 핸들링만 담당
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createChatService,
  ChatRequestSchema,
  type ChatContext,
} from '../services/chatService';
import {
  getConversationStore,
} from '../services/conversationStore';
import {
  getConversationLimiter,
} from '../services/conversationLimiter';
import {
  getContactService,
} from '../services/contactService';

// Feature flag
const USE_DEEP_AGENT = process.env.USE_DEEP_AGENT === '1';

// ─────────────────────────────────────────────────────────────
// OpenAPI Schemas
// ─────────────────────────────────────────────────────────────

const chatBodySchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'string',
      description: '사용자 메시지',
      minLength: 1,
      maxLength: 1000,
    },
    sessionId: {
      type: 'string',
      description: '세션 ID (서버사이드 히스토리용)',
    },
    conversationHistory: {
      type: 'array',
      description: '대화 히스토리 (레거시)',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['user', 'assistant'] },
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
};

const chatResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        sessionId: { type: 'string' },
        shouldSuggestContact: { type: 'boolean' },
        sources: { type: 'array' },
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
};

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

export default async function chatRoutes(fastify: FastifyInstance) {
  // ChatService 생성 (DI 패턴 - 싱글턴 없이 직접 인스턴스 관리)
  const conversationStore = getConversationStore();
  const conversationLimiter = getConversationLimiter();
  const contactService = getContactService();

  const chatService = await createChatService(
    conversationStore,
    conversationLimiter,
    contactService,
    USE_DEEP_AGENT
  );

  // Helper: context 추출
  const getContext = (request: FastifyRequest): ChatContext => ({
    clientIp: request.ip,
    userAgent: request.headers['user-agent'],
  });

  // ─────────────────────────────────────────────────────────────
  // POST /chat - 일반 채팅
  // ─────────────────────────────────────────────────────────────
  fastify.post(
    '/chat',
    {
      schema: {
        description: '개인화된 RAG 기반 채팅 API',
        tags: ['Chat'],
        body: chatBodySchema,
        response: { 200: chatResponseSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const context = getContext(request);

      try {
        // IP 차단 확인
        const blocked = await chatService.checkBlocked(context.clientIp);
        if (blocked) {
          return reply.status(429).send(blocked);
        }

        // 입력 검증
        const validatedData = ChatRequestSchema.parse(request.body);

        // 채팅 처리
        const response = await chatService.handleChat(validatedData, context);
        return reply.send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: '입력 데이터 검증 실패',
            details: error.errors,
          });
        }

        console.error('Chat API error:', error);
        return reply.status(500).send({
          success: false,
          error: '서버 내부 오류가 발생했습니다.',
        });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────
  // POST /chat/stream - 스트리밍 채팅 (SSE)
  // ─────────────────────────────────────────────────────────────
  fastify.post(
    '/chat/stream',
    {
      schema: {
        description: '스트리밍 RAG 채팅 API (Server-Sent Events)',
        tags: ['Chat'],
        body: chatBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const context = getContext(request);

      try {
        const validatedData = ChatRequestSchema.parse(request.body);

        // SSE 헤더 설정
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        // 스트리밍 처리
        for await (const event of chatService.handleStreamChat(validatedData, context)) {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
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

  // ─────────────────────────────────────────────────────────────
  // GET /search - 문서 검색
  // ─────────────────────────────────────────────────────────────
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
        const results = await chatService.searchDocuments(q, limit);

        return reply.send({
          success: true,
          data: {
            query: q,
            results,
            count: results.length,
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

  // ─────────────────────────────────────────────────────────────
  // GET /status - 엔진 상태
  // ─────────────────────────────────────────────────────────────
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
        const status = await chatService.getEngineStatus();

        return reply.send({
          success: status.status === 'ready',
          data: {
            ...status,
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

  // ─────────────────────────────────────────────────────────────
  // POST /contact - 연락처 수집
  // ─────────────────────────────────────────────────────────────
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
      const context = getContext(request);

      try {
        const body = request.body as {
          email: string;
          name?: string;
          message?: string;
          sessionId?: string;
        };

        const result = await chatService.collectContact(
          body.email,
          context,
          {
            name: body.name,
            message: body.message,
            sessionId: body.sessionId,
          }
        );

        return reply.send(result);
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
