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

// --- AI SDK UI Message Stream (SSE) Parsing (chatStream) ---
//
// 서버는 AI SDK UI Message Stream을 SSE로 emit한다.
// 포맷: 한 줄당 `data: {"type":...}\n` (text-delta는 delta, data-* 는 중첩 data 객체).
// 클라이언트 read 루프는 '\n'으로 라인을 나누고 'data: ' 프리픽스만 파싱한다.

/** 이벤트 객체 배열을 SSE `data: {...}\n` 라인 스트림으로 변환 */
function sseStream(events: object[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const content = `${events.map((e) => `data: ${JSON.stringify(e)}`).join('\n')}\n`
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(content))
      controller.close()
    }
  })
}

function abortError(): Error {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

describe('PersonaApiClient — chatStream UI Message Stream parsing', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('parses AI SDK UI Message Stream events into StreamEvent objects', async () => {
    const events_in = [
      { type: 'data-session', data: { sessionId: 'abc' } },
      { type: 'text-delta', delta: 'Hello' },
      {
        type: 'data-done',
        data: { metadata: { searchQuery: 'q', searchResults: 1, processingTime: 42 } }
      },
      { type: 'finish' } // 무시됨
    ]

    globalThis.fetch = (async () =>
      new Response(sseStream(events_in), {
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

  test('skips malformed lines gracefully', async () => {
    const encoder = new TextEncoder()
    // 'data: ' 프리픽스 없는 줄 + 잘못된 JSON 줄은 조용히 스킵된다
    const content = [
      `data: ${JSON.stringify({ type: 'data-session', data: { sessionId: 's1' } })}`,
      'NOT_VALID_FORMAT',
      'data: {not valid json}',
      `data: ${JSON.stringify({ type: 'text-delta', delta: 'ok' })}`
    ].join('\n')

    globalThis.fetch = (async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`${content}\n`))
            controller.close()
          }
        }),
        { status: 200 }
      )) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')
    const events: StreamEvent[] = []
    for await (const event of client.chatStream('hi')) {
      events.push(event)
    }

    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('session')
    expect(events[1].type).toBe('content')
  })

  test('handles chunked data split across reads', async () => {
    const encoder = new TextEncoder()
    // 첫 번째 청크: 불완전한 라인 (JSON 중간에서 끊김)
    const chunk1 = encoder.encode('data: {"type":"data-ses')
    // 두 번째 청크: 나머지 + 다음 라인
    const chunk2 = encoder.encode(
      'sion","data":{"sessionId":"x"}}\ndata: {"type":"text-delta","delta":"hi"}\n'
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

  test('parses various data part types', async () => {
    const events_in = [
      {
        type: 'data-sources',
        data: { sources: [{ id: '1', content: 'test', metadata: { type: 'faq' } }] }
      },
      {
        type: 'data-progress',
        data: { items: [{ id: '1', label: '검색중', status: 'in_progress' }] }
      },
      { type: 'data-clarification', data: { suggestedQuestions: ['질문1', '질문2'] } },
      { type: 'data-followup', data: { suggestedQuestions: ['다음 질문'] } },
      { type: 'data-escalation', data: { reason: '불확실', uncertainty: 0.8 } }
    ]

    globalThis.fetch = (async () =>
      new Response(sseStream(events_in), { status: 200 })) as unknown as typeof fetch

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

  test('keeps the active abort controller when an older stream exits', async () => {
    const signals: AbortSignal[] = []
    const encoder = new TextEncoder()

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal
      signals.push(signal)

      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text-delta', delta: 'chunk' })}\n`)
            )
            signal.addEventListener('abort', () => controller.error(abortError()), { once: true })
          }
        }),
        { status: 200 }
      )
    }) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')
    const first = client.chatStream('first')
    await expect(first.next()).resolves.toMatchObject({
      value: { type: 'content', content: 'chunk' },
      done: false
    })

    const second = client.chatStream('second')
    await expect(second.next()).resolves.toMatchObject({
      value: { type: 'content', content: 'chunk' },
      done: false
    })
    expect(signals[0].aborted).toBe(true)

    await expect(first.next()).resolves.toMatchObject({ done: true })

    client.abort()
    expect(signals[1].aborted).toBe(true)
    await expect(second.next()).resolves.toMatchObject({ done: true })
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

  test('getStatus unwraps current API envelope', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'ready',
            components: { vectorStore: true, llmService: true },
            timestamp: '2026-06-29T00:00:00.000Z'
          }
        }),
        { status: 200 }
      )) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')
    const status = await client.getStatus()

    expect(status.status).toBe('ready')
    expect(status.components).toEqual({ vectorStore: true, llmService: true })
  })

  test('getStatus still accepts legacy unwrapped payloads', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          status: 'ok',
          rag_engine: { status: 'ready', total_documents: 123, collections: ['persona'] }
        }),
        { status: 200 }
      )) as unknown as typeof fetch

    const client = new PersonaApiClient('http://test')
    const status = await client.getStatus()

    expect(status.status).toBe('ok')
    expect(status.rag_engine?.total_documents).toBe(123)
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
