import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import rateLimit, { RateLimitOptions } from '@fastify/rate-limit';
import fastifyRedis from '@fastify/redis';
import Redis from 'ioredis';

import healthRoutes from './routes/health';
import chatRoutes from './routes/chat';
import syncRoutes from './routes/sync';
import { RateLimiter } from './middleware/rateLimit';
import { AbuseDetection } from './middleware/abuseDetection';
import { initConversationStore } from './services/conversationStore';
import { initContactService } from './services/contactService';
import { initConversationLimiter } from './services/conversationLimiter';

export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // CORS 설정
  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
  });

  // Redis 설정 (선택적)
  let redisClient = null;
  
  if (process.env.REDIS_URL) {
    try {
      const redisOptions = {
        connectTimeout: 5000,
        commandTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100,
      };
      
      redisClient = new Redis(process.env.REDIS_URL, redisOptions);
      
      // 연결 테스트
      await redisClient.ping();
      console.log('✅ Redis connected successfully');
      
      // Redis 플러그인 등록
      await fastify.register(fastifyRedis, { client: redisClient });
      
    } catch (error) {
      console.warn('⚠️  Redis connection failed, running without cache:', error);
      redisClient = null;
    }
  } else {
    console.log('ℹ️  No REDIS_URL provided, running without cache');
  }

  // 서비스 초기화 (Redis 선택적)
  initConversationStore(redisClient);
  initContactService(redisClient);
  initConversationLimiter(redisClient);

  // Rate Limiting (Redis 선택적)
  const rateLimitConfig: RateLimitOptions & { redis?: Redis } = {
    max: parseInt(process.env.RATE_LIMIT_MAX || '50'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    errorResponseBuilder: (request: FastifyRequest, context: { after: string }) => ({
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.after}`,
      expiresIn: context.after,
    }),
  };

  // Redis가 있으면 Redis 기반, 없으면 메모리 기반 Rate Limiting
  if (redisClient) {
    rateLimitConfig.redis = redisClient;
    console.log('🚦 Rate limiting with Redis');
  } else {
    console.log('🚦 Rate limiting with memory store');
  }

  await fastify.register(rateLimit, rateLimitConfig);

  // 커스텀 미들웨어 등록 (Redis 선택적)
  const rateLimiter = redisClient ? new RateLimiter(redisClient, {
    windowMs: 15 * 60 * 1000, // 15분
    max: 200, // 최대 200개 요청
  }) : null;

  const abuseDetection = redisClient ? new AbuseDetection(redisClient, {
    suspiciousPatterns: [/<script/i, /javascript:/i, /on\w+\s*=/i, /eval\(/i],
    maxConsecutiveErrors: 10,
    blockDuration: 10 * 60 * 1000, // 10분
  }) : null;

  // 미들웨어 적용 (Redis가 있을 때만)
  if (rateLimiter && abuseDetection) {
    fastify.addHook('preHandler', async (request, reply) => {
      const clientIp = request.ip;

      // Rate limiting 체크
      const rateLimitResult = await rateLimiter.checkLimit(clientIp);
      if (!rateLimitResult.allowed) {
        return reply.status(429).send({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        });
      }

      // Abuse detection 체크
      const abuseResult = await abuseDetection.checkAbuse(request, reply);
      if (!abuseResult) {
        return;
      }
    });
    console.log('🛡️  Custom middleware enabled');
  } else {
    console.log('ℹ️  Custom middleware disabled (no Redis)');
  }

  // Swagger 설정
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Persona API',
        description: '개인화된 RAG+LLM 기반 챗봇 API',
        version: '1.0.0',
        contact: {
          name: 'dwkim',
          email: 'dwkim@example.com',
        },
      },
      host: process.env.API_HOST || 'localhost:3000',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Health', description: '헬스체크 관련 엔드포인트' },
        { name: 'Chat', description: '채팅 관련 엔드포인트' },
        { name: 'Search', description: '문서 검색 엔드포인트' },
        { name: 'Sync', description: 'Cogni 노트 동기화 엔드포인트' },
        { name: 'System', description: '시스템 관리 엔드포인트' },
      ],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // 라우트 등록
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(chatRoutes, { prefix: '/api/v1' });
  await fastify.register(syncRoutes, { prefix: '/api/v1' });

  // Root endpoint
  fastify.get('/', {
    schema: {
      tags: ['Health'],
      summary: 'Root endpoint',
      description: 'Returns basic API information',
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Persona API' },
            version: { type: 'string', example: '1.0.0' },
            description: { type: 'string' },
            docs: { type: 'string' },
          },
        },
      },
    },
  }, async () => ({
    name: 'Persona API',
    version: '1.0.0',
    description: 'Personalized RAG+LLM Chatbot API for dwkim persona',
    docs: '/docs',
  }));

  // 전역 에러 핸들러
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: '입력 데이터 검증에 실패했습니다.',
        details: error.validation,
      });
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: '서버 내부 오류가 발생했습니다.',
    });
  });

  // 404 핸들러
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: '요청한 리소스를 찾을 수 없습니다.',
      path: request.url,
    });
  });

  return fastify;
}

// Export build function for testing
export { createServer as build };
