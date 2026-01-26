import { describe, expect, test } from 'bun:test'
import { render } from 'ink-testing-library'
import { ChatView } from '../../ui/ChatView.js'
import type { StreamEvent } from '../../utils/personaApiClient.js'
import { waitForFrame } from '../helpers.js'
import { createMockClient } from '../mocks/mockPersonaApiClient.js'

const TEST_API_URL = 'http://localhost:9999'

/** 기본 스트리밍 이벤트 */
function makeStreamEvents(content = '테스트 응답', processingTime = 50): StreamEvent[] {
  return [
    { type: 'session', sessionId: 'test-session' },
    { type: 'content', content },
    {
      type: 'done',
      metadata: { searchQuery: 'q', searchResults: 1, processingTime }
    }
  ]
}

/**
 * 스트리밍 완료 대기: done 이벤트 처리 후 입력 영역이 나타날 때까지 대기.
 * done 이벤트 이후 status='idle'로 복귀하면 "질문을 입력하세요" 플레이스홀더가 나타나거나
 * processingTime이 표시된다. 단 number key로 시작하면 TextInput에 숫자가 남아서
 * 플레이스홀더가 안 보일 수 있으므로 processingTime으로도 판별한다.
 */
async function waitForStreamDone(
  getFrame: () => string | undefined,
  processingTime: number,
  timeout = 5000
) {
  await waitForFrame(
    getFrame,
    (f) => f.includes(`${processingTime}ms`) && !f.includes('처리 중'),
    timeout
  )
}

describe('ChatView — connection', () => {
  test('shows welcome view after successful health check', async () => {
    const client = createMockClient({ healthCheck: true })
    const { lastFrame } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('물어보세요')
    )
    expect(lastFrame()).toContain('물어보세요')
  })

  test('shows error on health check failure', async () => {
    const client = createMockClient({ healthCheck: false })
    const { lastFrame } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('API 연결 실패')
    )
    expect(lastFrame()).toContain('API 연결 실패')
  })
})

describe('ChatView — welcome screen', () => {
  test('shows starter questions with topics', async () => {
    const client = createMockClient({ healthCheck: true })
    const { lastFrame } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('커리어 & 경험')
    )
    const frame = lastFrame()!
    expect(frame).toContain('어떤 경력을 가지고 있나요?')
    expect(frame).toContain('주로 어떤 기술 스택을 사용하나요?')
    expect(frame).toContain('오픈소스 활동에 대해 알려주세요')
  })

  test('navigates starter questions with arrow keys', async () => {
    const client = createMockClient({ healthCheck: true })
    const { lastFrame, stdin } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('물어보세요')
    )
    expect(lastFrame()).toContain('› [1]')

    stdin.write('\x1B[B') // Down
    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('› [2]')
    )
    expect(lastFrame()).toContain('› [2]')

    stdin.write('\x1B[B') // Down
    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('› [3]')
    )
    expect(lastFrame()).toContain('› [3]')

    stdin.write('\x1B[A') // Up
    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('› [2]')
    )
    expect(lastFrame()).toContain('› [2]')
  })

  test('selects starter question with number key', async () => {
    const client = createMockClient({
      healthCheck: true,
      streamEvents: makeStreamEvents('기술 스택 답변', 80),
      eventDelay: 100
    })

    const { lastFrame, stdin } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('물어보세요')
    )

    stdin.write('2')

    // Wait for done (processingTime visible, loading gone)
    await waitForStreamDone(() => lastFrame(), 80)
    expect(lastFrame()).toContain('기술 스택 답변')
    expect(lastFrame()).not.toContain('물어보세요')
  })
})

describe('ChatView — streaming', () => {
  test('shows streaming content and processing time', async () => {
    const streamEvents: StreamEvent[] = [
      { type: 'session', sessionId: 'test-stream' },
      { type: 'content', content: 'TypeScript를 ' },
      { type: 'content', content: '주로 사용합니다.' },
      {
        type: 'done',
        metadata: {
          searchQuery: 'tech stack',
          searchResults: 3,
          processingTime: 150
        }
      }
    ]

    const client = createMockClient({
      healthCheck: true,
      streamEvents,
      eventDelay: 100
    })

    const { lastFrame, stdin } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('물어보세요')
    )

    stdin.write('1')

    await waitForStreamDone(() => lastFrame(), 150)
    expect(lastFrame()).toContain('사용합니다')
    expect(lastFrame()).toContain('150ms')
  })

  test('shows source reference count', async () => {
    const streamEvents: StreamEvent[] = [
      { type: 'session', sessionId: 'test-sources' },
      {
        type: 'sources',
        sources: [
          { id: 'doc1', content: '내용1', metadata: { type: 'resume', title: '이력서' } },
          { id: 'doc2', content: '내용2', metadata: { type: 'faq', title: 'FAQ' } }
        ]
      },
      { type: 'content', content: '소스 기반 답변' },
      {
        type: 'done',
        metadata: { searchQuery: 'q', searchResults: 2, processingTime: 200 }
      }
    ]

    const client = createMockClient({
      healthCheck: true,
      streamEvents,
      eventDelay: 100
    })

    const { lastFrame, stdin } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('물어보세요')
    )

    stdin.write('1')

    await waitForStreamDone(() => lastFrame(), 200)
    expect(lastFrame()).toContain('소스 기반 답변')
    expect(lastFrame()).toContain('2개 문서 참조')
  })

  test('shows loading indicator during streaming', async () => {
    const client = createMockClient({
      healthCheck: true,
      streamEvents: makeStreamEvents('응답', 99),
      eventDelay: 200
    })

    const { lastFrame, frames, stdin } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('물어보세요')
    )

    stdin.write('1')

    await waitForStreamDone(() => lastFrame(), 99)

    const hadLoadingState = frames.some((f) => f.includes('처리 중'))
    expect(hadLoadingState).toBe(true)
  })

  test('shows low confidence warning', async () => {
    const streamEvents: StreamEvent[] = [
      { type: 'session', sessionId: 'test-confidence' },
      { type: 'content', content: '확실하지 않은 답변' },
      {
        type: 'done',
        metadata: {
          searchQuery: 'q',
          searchResults: 0,
          processingTime: 77,
          confidence: 'low'
        }
      }
    ]

    const client = createMockClient({
      healthCheck: true,
      streamEvents,
      eventDelay: 100
    })

    const { lastFrame, stdin } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('물어보세요')
    )

    stdin.write('1')

    await waitForStreamDone(() => lastFrame(), 77)
    expect(lastFrame()).toContain('확실하지 않은 답변')
    expect(lastFrame()).toContain('확인 필요')
  })
})

describe('ChatView — commands', () => {
  test('/help command shows help text', async () => {
    const client = createMockClient({
      healthCheck: true,
      streamEvents: makeStreamEvents('초기 응답', 33),
      eventDelay: 100
    })

    const { lastFrame, stdin } = render(<ChatView apiUrl={TEST_API_URL} client={client} />)

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('물어보세요')
    )

    // Dismiss welcome with Enter (not number key — number key adds char to TextInput)
    stdin.write('\r')
    await waitForStreamDone(() => lastFrame(), 33)

    // Type /help character-by-character with delays (Ink needs time to process each keystroke)
    for (const ch of '/help') {
      stdin.write(ch)
      await new Promise((r) => setTimeout(r, 50))
    }
    // Submit separately
    stdin.write('\r')

    await waitForFrame(
      () => lastFrame(),
      (f) => f.includes('명령어'),
      5000
    )
    expect(lastFrame()).toContain('명령어')
    expect(lastFrame()).toContain('/help')
    expect(lastFrame()).toContain('/status')
  })
})
