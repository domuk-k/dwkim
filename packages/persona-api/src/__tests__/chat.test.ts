import { createServer } from '../server';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';

// Mock personaAgent to prevent LangChain imports in test environment
jest.mock('../services/personaAgent', () => ({
  initPersonaAgent: jest.fn().mockResolvedValue(undefined),
  queryPersona: jest.fn().mockResolvedValue({
    answer: 'Mock agent response',
    sources: [],
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    metadata: { searchQuery: 'test', searchResults: 0, processingTime: 100 },
  }),
  queryPersonaStream: jest.fn().mockImplementation(async function* () {
    yield { type: 'content', content: 'Mock stream response' };
    yield { type: 'done', metadata: { searchQuery: 'test', searchResults: 0, processingTime: 100 } };
  }),
  isPersonaAgentReady: jest.fn().mockReturnValue(false),
}));

// Mock vectorStore module for singleton pattern
jest.mock('../services/vectorStore', () => {
  const mockVectorStore = {
    initialize: jest.fn().mockResolvedValue(undefined),
    searchDiverse: jest.fn().mockResolvedValue([
      {
        id: 'test-doc',
        content: 'Test document content',
        metadata: { type: 'thoughts', title: 'Test' },
      },
    ]),
    addDocument: jest.fn().mockResolvedValue(undefined),
    deleteDocument: jest.fn().mockResolvedValue(undefined),
  };

  return {
    VectorStore: jest.fn().mockImplementation(() => mockVectorStore),
    Document: {},
    getVectorStore: jest.fn().mockReturnValue(mockVectorStore),
    initVectorStore: jest.fn().mockResolvedValue(undefined),
    resetVectorStore: jest.fn(),
  };
});

// Mock LLM service
jest.mock('../services/llmService', () => ({
  LLMService: jest.fn().mockImplementation(() => ({
    chat: jest.fn().mockResolvedValue({
      content: 'Mock response from LLM',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }),
    getModelInfo: jest.fn().mockReturnValue({ model: 'mock-model' }),
  })),
}));

describe('Chat API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper to get server for supertest
  const getServer = () => app.server;

  describe('POST /api/v1/chat', () => {
    it('should return successful response with valid input', async () => {
      const response = await request(getServer())
        .post('/api/v1/chat')
        .send({
          message: '안녕하세요! dwkim에 대해 알려주세요.',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('answer');
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('usage');
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data.metadata).toHaveProperty('searchQuery');
      expect(response.body.data.metadata).toHaveProperty('searchResults');
      expect(response.body.data.metadata).toHaveProperty('processingTime');
    });

    it('should handle conversation history', async () => {
      const response = await request(getServer())
        .post('/api/v1/chat')
        .send({
          message: '그 다음은?',
          conversationHistory: [
            { role: 'user', content: '안녕하세요!' },
            { role: 'assistant', content: '안녕하세요! 무엇을 도와드릴까요?' },
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.answer).toBeDefined();
    });

    it('should handle options parameter', async () => {
      const response = await request(getServer())
        .post('/api/v1/chat')
        .send({
          message: '테스트 메시지',
          options: {
            maxSearchResults: 3,
            includeSources: false,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sources).toEqual([]);
    });

    it('should validate required message field', async () => {
      const response = await request(getServer())
        .post('/api/v1/chat')
        .send({})
        .expect(400);

      // Fastify schema validation returns statusCode format
      expect(response.body.statusCode).toBe(400);
    });

    it('should validate message length', async () => {
      const longMessage = 'a'.repeat(1001);
      const response = await request(getServer())
        .post('/api/v1/chat')
        .send({
          message: longMessage,
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should validate conversation history format', async () => {
      const response = await request(getServer())
        .post('/api/v1/chat')
        .send({
          message: '테스트',
          conversationHistory: [{ role: 'invalid', content: '잘못된 역할' }],
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should validate options parameters', async () => {
      const response = await request(getServer())
        .post('/api/v1/chat')
        .send({
          message: '테스트',
          options: {
            maxSearchResults: 15, // 최대값 초과
          },
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/search', () => {
    it('should return search results', async () => {
      const query = encodeURIComponent('테스트');
      const response = await request(getServer())
        .get(`/api/v1/search?q=${query}&limit=5`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('query', '테스트');
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it('should validate required query parameter', async () => {
      const response = await request(getServer()).get('/api/v1/search').expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should validate limit parameter range', async () => {
      const query = encodeURIComponent('테스트');
      const response = await request(getServer())
        .get(`/api/v1/search?q=${query}&limit=25`) // 최대값 초과
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should use default limit when not provided', async () => {
      const query = encodeURIComponent('테스트');
      const response = await request(getServer())
        .get(`/api/v1/search?q=${query}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBeLessThanOrEqual(5); // 기본값
    });
  });

  describe('GET /api/v1/status', () => {
    it('should return RAG engine status', async () => {
      const response = await request(getServer()).get('/api/v1/status').expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('components');
      expect(response.body.data).toHaveProperty('timestamp');
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(getServer())
        .post('/api/v1/chat')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Fastify returns statusCode format for JSON parse errors
      expect(response.body.statusCode).toBe(400);
    });

    it('should return 200 with mocked LLM', async () => {
      // With mocked LLM, this should succeed
      const response = await request(getServer())
        .post('/api/v1/chat')
        .send({
          message: '테스트 메시지',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Response format consistency', () => {
    it('should maintain consistent response structure', async () => {
      const response = await request(getServer())
        .post('/api/v1/chat')
        .send({
          message: '일관성 테스트',
        })
        .expect(200);

      // Check response structure
      const { body } = response;
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');

      if (body.success) {
        expect(body.data).toHaveProperty('answer');
        expect(body.data).toHaveProperty('sources');
        expect(body.data).toHaveProperty('usage');
        expect(body.data).toHaveProperty('metadata');

        expect(body.data.usage).toHaveProperty('promptTokens');
        expect(body.data.usage).toHaveProperty('completionTokens');
        expect(body.data.usage).toHaveProperty('totalTokens');

        expect(body.data.metadata).toHaveProperty('searchQuery');
        expect(body.data.metadata).toHaveProperty('searchResults');
        expect(body.data.metadata).toHaveProperty('processingTime');
      }
    });
  });
});
