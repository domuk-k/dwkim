import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RAGEngine } from '../services/ragEngine';

export default async function healthRoutes(fastify: FastifyInstance) {
  // GET /health
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        description: 'Returns the health status of the API',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: {
                type: 'number',
                description: 'Server uptime in seconds',
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    }
  );

  // GET /health/detailed
  fastify.get(
    '/health/detailed',
    {
      schema: {
        tags: ['Health'],
        summary: 'Detailed health check',
        description: 'Returns detailed health status including RAG engine',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number' },
              version: { type: 'string' },
              environment: { type: 'string' },
              components: {
                type: 'object',
                properties: {
                  server: { type: 'boolean' },
                  redis: { type: 'boolean' },
                  ragEngine: { type: 'object' },
                },
              },
              memory: {
                type: 'object',
                properties: {
                  used: { type: 'number' },
                  total: { type: 'number' },
                  percentage: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // 메모리 사용량 확인
        const memUsage = process.memoryUsage();
        const memoryInfo = {
          used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          percentage: Math.round(
            (memUsage.heapUsed / memUsage.heapTotal) * 100
          ),
        };

        // Redis 연결 확인
        let redisStatus = false;
        try {
          // @ts-ignore - Redis 플러그인이 등록되어 있음
          await fastify.redis.ping();
          redisStatus = true;
        } catch (error) {
          fastify.log.error('Redis health check failed:', error);
        }

        // RAG 엔진 상태 확인
        let ragEngineStatus: any = {
          status: 'not_initialized',
          components: {},
        };
        try {
          const ragEngine = new RAGEngine();
          const engineStatus = await ragEngine.getEngineStatus();
          ragEngineStatus = {
            status: 'ready',
            components: engineStatus,
          };
        } catch (error) {
          fastify.log.error('RAG Engine health check failed:', error);
          ragEngineStatus = {
            status: 'error',
            components: {
              vectorStore: false,
              llmService: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }

        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          components: {
            server: true,
            redis: redisStatus,
            ragEngine: ragEngineStatus,
          },
          memory: memoryInfo,
        };

        return reply.send(health);
      } catch (error) {
        fastify.log.error('Detailed health check failed:', error);
        return reply.status(503).send({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Detailed health check failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // GET /
  fastify.get(
    '/',
    {
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
              docs: { type: 'string', description: 'API documentation URL' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return {
        name: 'Persona API',
        version: '1.0.0',
        description: 'Personalized RAG+LLM Chatbot API for dwkim persona',
        docs: '/documentation',
      };
    }
  );
}
