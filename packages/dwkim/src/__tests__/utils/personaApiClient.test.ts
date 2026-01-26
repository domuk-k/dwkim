import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
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

// --- SSE Parsing (chatStream) ---

/** SSE 형식 텍스트를 ReadableStream으로 변환 */
function sseStream(events: Array<{ data: string }>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const lines = events.map((e) => `data: ${e.data}\n\n`).join('')
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(lines))
      controller.close()
    }
  })
}

describe('PersonaApiClient — chatStream SSE parsing', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('parses SSE events into StreamEvent objects', async () => {
    const sseEvents = [
      { data: JSON.stringify({ type: 'session', sessionId: 'abc' }) },
      { data: JSON.stringify({ type: 'content', content: 'Hello' }) },
      {
        data: JSON.stringify({
          type: 'done',
          metadata: { searchQuery: 'q', searchResults: 1, processingTime: 42 }
        })
      }
    ]

    globalThis.fetch = (async () =>
      new Response(sseStream(sseEvents), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
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

  test('skips malformed JSON lines gracefully', async () => {
    const lines =
      'data: {"type":"session","sessionId":"s1"}\n\ndata: NOT_JSON\n\ndata: {"type":"content","content":"ok"}\n\n'
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(lines))
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

    // Malformed line silently skipped
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('session')
    expect(events[1].type).toBe('content')
  })

  test('handles chunked SSE data split across reads', async () => {
    const encoder = new TextEncoder()
    const chunk1 = encoder.encode('data: {"type":"ses')
    const chunk2 = encoder.encode(
      'sion","sessionId":"x"}\n\ndata: {"type":"content","content":"hi"}\n\n'
    )

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
