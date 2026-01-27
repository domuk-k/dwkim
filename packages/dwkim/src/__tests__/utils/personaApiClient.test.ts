import { afterEach, describe, expect, test } from 'bun:test'
import type { StreamEvent } from '../../utils/personaApiClient.js'
import { ApiError, PersonaApiClient } from '../../utils/personaApiClient.js'

// --- ApiError ---

describe('ApiError', () => {
  test('stores statusCode and isRetryable', () => {
    const err = new ApiError('rate limited', 429, true)
    expect(err.message).toBe('rate limited')
    expect(err.statusCode).toBe(429)
    expect(err.isRetryable).toBe(true)
    expect(err.name).toBe('ApiError')
  })

  test('defaults isRetryable to false', () => {
    const err = new ApiError('server error', 500)
    expect(err.isRetryable).toBe(false)
  })

  test('is instanceof Error', () => {
    const err = new ApiError('test')
    expect(err).toBeInstanceOf(Error)
  })
})

// --- AI SDK Data Stream Protocol Parsing (chatStream) ---

/**
 * AI SDK Data Stream 포맷 텍스트를 ReadableStream으로 변환
 * 포맷: `{type_id}:{json}\n`
 * - 0: text
 * - 2: data (custom parts)
 * - e: error
 * - d: finish
 */
function dataStream(parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const content = parts.join('\n') + '\n'
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(content))
      controller.close()
    }
  })
}

describe('PersonaApiClient — chatStream Data Stream parsing', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('parses AI SDK Data Stream events into StreamEvent objects', async () => {
    // AI SDK Data Stream Protocol 포맷
    const streamParts = [
      '2:[{"type":"data-session","sessionId":"abc"}]', // data part
      '0:"Hello"', // text part
      '2:[{"type":"data-done","metadata":{"searchQuery":"q","searchResults":1,"processingTime":42}}]', // data part
      'd:{"finishReason":"stop"}' // finish (ignored)
    ]

    globalThis.fetch = (async () =>
      new Response(dataStream(streamParts), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')
    const events: StreamEvent[] = []
    for await (const event of client.chatStream('hi')) {
      events.push(event)
    }

    expect(events).toHaveLength(3)
    expect(events[0]).toEqual({ type: 'session', sessionId: 'abc' })
    expect(events[1]).toEqual({ type: 'content', content: 'Hello' })
    expect(events[2].type).toBe('done')
  })

  test('skips malformed lines gracefully', async () => {
    const streamParts = [
      '2:[{"type":"data-session","sessionId":"s1"}]',
      'NOT_VALID_FORMAT', // 잘못된 포맷
      '0:"ok"'
    ]

    globalThis.fetch = (async () =>
      new Response(dataStream(streamParts), { status: 200 })) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')
    const events: StreamEvent[] = []
    for await (const event of client.chatStream('hi')) {
      events.push(event)
    }

    // Malformed line silently skipped
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('session')
    expect(events[1].type).toBe('content')
  })

  test('handles chunked data split across reads', async () => {
    const encoder = new TextEncoder()
    // 첫 번째 청크: 불완전한 라인
    const chunk1 = encoder.encode('2:[{"type":"data-ses')
    // 두 번째 청크: 나머지 + 다음 라인
    const chunk2 = encoder.encode('sion","sessionId":"x"}]\n0:"hi"\n')

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk1)
        controller.enqueue(chunk2)
        controller.close()
      }
    })

    globalThis.fetch = (async () =>
      new Response(stream, { status: 200 })) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')
    const events: StreamEvent[] = []
    for await (const event of client.chatStream('hi')) {
      events.push(event)
    }

    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'session', sessionId: 'x' })
    expect(events[1]).toEqual({ type: 'content', content: 'hi' })
  })

  test('parses various data part types', async () => {
    const streamParts = [
      '2:[{"type":"data-sources","sources":[{"id":"1","content":"test","metadata":{"type":"faq"}}]}]',
      '2:[{"type":"data-progress","items":[{"id":"1","label":"검색중","status":"in_progress"}]}]',
      '2:[{"type":"data-clarification","suggestedQuestions":["질문1","질문2"]}]',
      '2:[{"type":"data-followup","suggestedQuestions":["다음 질문"]}]',
      '2:[{"type":"data-escalation","reason":"불확실","uncertainty":0.8}]'
    ]

    globalThis.fetch = (async () =>
      new Response(dataStream(streamParts), { status: 200 })) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')
    const events: StreamEvent[] = []
    for await (const event of client.chatStream('hi')) {
      events.push(event)
    }

    expect(events).toHaveLength(5)
    expect(events[0].type).toBe('sources')
    expect(events[1].type).toBe('progress')
    expect(events[2].type).toBe('clarification')
    expect(events[3].type).toBe('followup')
    expect(events[4].type).toBe('escalation')
  })
})

// --- HTTP Error Handling ---

describe('PersonaApiClient — error handling', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('checkHealth throws on non-ok response after retries', async () => {
    globalThis.fetch = (async () => new Response('Bad', { status: 503 })) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')

    // maxRetries=1, retryDelay=0 to avoid slow test
    await expect(client.checkHealth(1, 0)).rejects.toThrow()
  })

  test('checkHealth succeeds when server recovers on retry', async () => {
    let attempt = 0
    globalThis.fetch = (async () => {
      attempt++
      if (attempt === 1) return new Response('', { status: 503 })
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
    }) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')
    // Should succeed on 2nd attempt
    await expect(client.checkHealth(3, 10)).resolves.toBeUndefined()
    expect(attempt).toBe(2)
  })

  test('chatStream throws ApiError on 429', async () => {
    globalThis.fetch = (async () =>
      new Response('rate limited', { status: 429 })) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')

    try {
      for await (const _ of client.chatStream('hi')) {
        // should not yield
      }
      expect(true).toBe(false) // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).statusCode).toBe(429)
      expect((err as ApiError).isRetryable).toBe(true)
    }
  })

  test('chatStream throws ApiError on 500', async () => {
    globalThis.fetch = (async () =>
      new Response('internal error', { status: 500 })) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')

    try {
      for await (const _ of client.chatStream('hi')) {
      }
      expect(true).toBe(false)
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).statusCode).toBe(500)
      expect((err as ApiError).isRetryable).toBe(false)
    }
  })
})
