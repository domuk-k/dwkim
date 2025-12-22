import request from 'supertest';
import { createServer } from '../server';
import type { FastifyInstance } from 'fastify';

describe('Chat API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /chat', () => {
    it('should return valid response for valid request', async () => {
      const response = await request(app.server)
        .post('/api/v1/chat')
        .send({
          message: '안녕하세요',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          answer: expect.any(String),
          sources: expect.any(Array),
          usage: expect.objectContaining({
            promptTokens: expect.any(Number),
            completionTokens: expect.any(Number),
            totalTokens: expect.any(Number),
          }),
          metadata: expect.objectContaining({
            searchQuery: '안녕하세요',
            searchResults: expect.any(Number),
            processingTime: expect.any(Number),
          }),
        }),
      });
    });

    it('should return 400 for empty message', async () => {
      const response = await request(app.server)
        .post('/api/v1/chat')
        .send({
          message: '',
        })
        .expect(400);

      // Fastify schema validation 또는 Zod validation 에러
      expect(response.status).toBe(400);
    });

    it('should return 400 for message too long', async () => {
      const longMessage = 'a'.repeat(1001);
      const response = await request(app.server)
        .post('/api/v1/chat')
        .send({
          message: longMessage,
        })
        .expect(400);

      // Fastify schema validation 에러
      expect(response.status).toBe(400);
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app.server).post('/api/v1/chat').send({}).expect(400);

      // Fastify schema validation 에러
      expect(response.status).toBe(400);
    });
  });
});
