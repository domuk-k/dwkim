/**
 * Chat API 통합 테스트 (Elysia)
 *
 * 구 Fastify + supertest 기반 테스트를 현재 Elysia 아키텍처로 재작성.
 * - createServer()는 { server: Elysia } 를 반환한다.
 * - HTTP 호출은 supertest 대신 Elysia의 web-standard handler(server.handle)를 사용한다.
 * - 무거운 의존성(LangGraph / vectorStore / LLM)은 setup.ts에서 전역 모킹된다.
 *
 * 검증 대상:
 * - POST /api/v1/chat (정상 응답 구조 + 입력 검증)
 * - GET  /api/v1/search (검색 결과 + 파라미터 검증)
 * - GET  /api/v1/status (엔진 상태)
 */

import type { Elysia } from 'elysia'
import { createServer } from '../server'

describe('Chat API (Elysia)', () => {
  let server: Elysia

  beforeAll(async () => {
    const result = await createServer()
    server = result.server
  })

  // 헬퍼: web-standard Request로 라우트 호출
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    server.handle(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body)
      })
    )

  const get = (path: string) => server.handle(new Request(`http://localhost${path}`))

  describe('POST /api/v1/chat', () => {
    it('should return successful response with valid input', async () => {
      const res = await post('/api/v1/chat', {
        message: '안녕하세요! dwkim에 대해 알려주세요.'
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('data')
      expect(body.data).toHaveProperty('answer')
      expect(body.data).toHaveProperty('sources')
      expect(body.data).toHaveProperty('usage')
      expect(body.data).toHaveProperty('metadata')
      expect(body.data.metadata).toHaveProperty('searchQuery')
      expect(body.data.metadata).toHaveProperty('searchResults')
      expect(body.data.metadata).toHaveProperty('processingTime')
    })

    it('should handle conversation history', async () => {
      const res = await post('/api/v1/chat', {
        message: '그 다음은?',
        conversationHistory: [
          { role: 'user', content: '안녕하세요!' },
          { role: 'assistant', content: '안녕하세요! 무엇을 도와드릴까요?' }
        ]
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.answer).toBeDefined()
    })

    it('should handle options parameter (includeSources=false)', async () => {
      const res = await post('/api/v1/chat', {
        message: '테스트 메시지',
        options: {
          maxSearchResults: 3,
          includeSources: false
        }
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.sources).toEqual([])
    })

    it('should validate required message field', async () => {
      const res = await post('/api/v1/chat', {})
      expect(res.status).toBe(400)

      const body = await res.json()
      // Elysia onError: VALIDATION → 400 + { error: 'Validation Error', ... }
      expect(body.error).toBe('Validation Error')
    })

    it('should validate message length', async () => {
      const res = await post('/api/v1/chat', { message: 'a'.repeat(1001) })
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Validation Error')
    })

    it('should validate conversation history format', async () => {
      const res = await post('/api/v1/chat', {
        message: '테스트',
        conversationHistory: [{ role: 'invalid', content: '잘못된 역할' }]
      })
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Validation Error')
    })

    it('should validate options parameters (maxSearchResults 상한)', async () => {
      const res = await post('/api/v1/chat', {
        message: '테스트',
        options: {
          maxSearchResults: 15 // 최대값(10) 초과
        }
      })
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Validation Error')
    })
  })

  describe('GET /api/v1/search', () => {
    it('should return search results', async () => {
      const query = encodeURIComponent('테스트')
      const res = await get(`/api/v1/search?q=${query}&limit=5`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toHaveProperty('success', true)
      expect(body).toHaveProperty('data')
      expect(body.data).toHaveProperty('query', '테스트')
      expect(body.data).toHaveProperty('results')
      expect(body.data).toHaveProperty('count')
      expect(Array.isArray(body.data.results)).toBe(true)
    })

    it('should validate required query parameter', async () => {
      const res = await get('/api/v1/search')
      expect(res.status).toBe(400)
    })

    it('should validate limit parameter range', async () => {
      const query = encodeURIComponent('테스트')
      const res = await get(`/api/v1/search?q=${query}&limit=25`) // 최대값 초과
      expect(res.status).toBe(400)
    })

    it('should use default limit when not provided', async () => {
      const query = encodeURIComponent('테스트')
      const res = await get(`/api/v1/search?q=${query}`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.count).toBeLessThanOrEqual(5) // 기본값
    })
  })

  describe('GET /api/v1/status', () => {
    it('should return RAG engine status', async () => {
      const res = await get('/api/v1/status')
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('data')
      expect(body.data).toHaveProperty('status')
      expect(body.data).toHaveProperty('components')
      expect(body.data).toHaveProperty('timestamp')
    })
  })

  describe('Error handling', () => {
    it('should map malformed JSON to 400 (Bad Request), not 500', async () => {
      const res = await post('/api/v1/chat', '{"invalid": json}')
      // 깨진 JSON은 클라이언트 오류 → onError의 PARSE 분기에서 400으로 매핑된다.
      // (서버 장애 500으로 오분류하지 않는다.)
      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toBe('Bad Request')
    })

    it('should return 200 with mocked engine', async () => {
      const res = await post('/api/v1/chat', { message: '테스트 메시지' })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Response format consistency', () => {
    it('should maintain consistent response structure', async () => {
      const res = await post('/api/v1/chat', { message: '일관성 테스트' })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('data')

      if (body.success) {
        expect(body.data).toHaveProperty('answer')
        expect(body.data).toHaveProperty('sources')
        expect(body.data).toHaveProperty('usage')
        expect(body.data).toHaveProperty('metadata')

        expect(body.data.usage).toHaveProperty('promptTokens')
        expect(body.data.usage).toHaveProperty('completionTokens')
        expect(body.data.usage).toHaveProperty('totalTokens')

        expect(body.data.metadata).toHaveProperty('searchQuery')
        expect(body.data.metadata).toHaveProperty('searchResults')
        expect(body.data.metadata).toHaveProperty('processingTime')
      }
    })
  })
})
