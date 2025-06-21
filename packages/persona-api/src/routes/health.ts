import { FastifyInstance } from 'fastify';

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
    async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
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
    async (request, reply) => {
      return {
        name: 'Persona API',
        version: '1.0.0',
        description: 'Personal chatbot API with RAG for dwkim persona',
        docs: '/docs',
      };
    }
  );
}
