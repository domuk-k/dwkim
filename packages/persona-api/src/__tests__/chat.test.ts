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
        response: expect.stringContaining('안녕하세요'),
        responseTime: expect.any(Number),
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        ),
      });
    });

    it('should return 400 for empty message', async () => {
      const response = await request(app.server)
        .post('/api/v1/chat')
        .send({
          message: '',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid input',
        message: '입력 데이터가 유효하지 않습니다',
      });
    });

    it('should return 400 for message too long', async () => {
      const longMessage = 'a'.repeat(1001);
      const response = await request(app.server)
        .post('/api/v1/chat')
        .send({
          message: longMessage,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid input',
        message: '입력 데이터가 유효하지 않습니다',
      });
    });

    it('should return 400 for malicious script', async () => {
      const response = await request(app.server)
        .post('/api/v1/chat')
        .send({
          message: '<script>alert("xss")</script>',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid input',
        message: '입력 데이터가 유효하지 않습니다',
      });
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app.server).post('/api/v1/chat').send({}).expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid input',
        message: '입력 데이터가 유효하지 않습니다',
      });
    });
  });
});
