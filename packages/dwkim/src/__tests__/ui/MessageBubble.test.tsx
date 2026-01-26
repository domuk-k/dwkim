import { describe, expect, test } from 'bun:test'
import { render } from 'ink-testing-library'
import { type Message, MessageBubble } from '../../ui/MessageBubble.js'

describe('MessageBubble', () => {
  test('renders banner as ProfileBanner', () => {
    const msg: Message = { id: 0, role: 'banner', content: '' }
    const { lastFrame } = render(<MessageBubble message={msg} />)
    // ProfileBanner renders profile name
    expect(lastFrame()).toContain('김동욱')
  })

  test('renders user message with arrow icon', () => {
    const msg: Message = { id: 1, role: 'user', content: '어떤 기술을 쓰나요?' }
    const { lastFrame } = render(<MessageBubble message={msg} />)
    expect(lastFrame()).toContain('어떤 기술을 쓰나요?')
  })

  test('renders system message', () => {
    const msg: Message = { id: 2, role: 'system', content: '초기화 완료' }
    const { lastFrame } = render(<MessageBubble message={msg} />)
    expect(lastFrame()).toContain('초기화 완료')
  })

  test('renders assistant message content', () => {
    const msg: Message = { id: 3, role: 'assistant', content: 'TypeScript를 사용합니다.' }
    const { lastFrame } = render(<MessageBubble message={msg} />)
    expect(lastFrame()).toContain('TypeScript를 사용합니다.')
  })

  test('shows source count when sources exist', () => {
    const msg: Message = {
      id: 4,
      role: 'assistant',
      content: '답변입니다.',
      sources: [
        { id: 'doc1', content: '내용1', metadata: { type: 'resume', title: '이력서' } },
        { id: 'doc2', content: '내용2', metadata: { type: 'faq', title: 'FAQ' } }
      ]
    }
    const { lastFrame } = render(<MessageBubble message={msg} />)
    expect(lastFrame()).toContain('2개 문서 참조')
  })

  test('shows processing time when provided', () => {
    const msg: Message = {
      id: 5,
      role: 'assistant',
      content: '답변',
      processingTime: 420
    }
    const { lastFrame } = render(<MessageBubble message={msg} />)
    expect(lastFrame()).toContain('420ms')
  })

  test('shows low confidence warning', () => {
    const msg: Message = {
      id: 6,
      role: 'assistant',
      content: '답변',
      confidence: 'low'
    }
    const { lastFrame } = render(<MessageBubble message={msg} />)
    expect(lastFrame()).toContain('확인 필요')
  })

  test('shows medium confidence indicator', () => {
    const msg: Message = {
      id: 7,
      role: 'assistant',
      content: '답변',
      confidence: 'medium'
    }
    const { lastFrame } = render(<MessageBubble message={msg} />)
    expect(lastFrame()).toContain('참고 정보 기반')
  })

  test('hides confidence for high confidence', () => {
    const msg: Message = {
      id: 8,
      role: 'assistant',
      content: '답변',
      confidence: 'high'
    }
    const { lastFrame } = render(<MessageBubble message={msg} />)
    expect(lastFrame()).not.toContain('확인 필요')
    expect(lastFrame()).not.toContain('참고 정보 기반')
  })
})
