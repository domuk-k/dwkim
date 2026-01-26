import { describe, expect, test } from 'bun:test'
import { render } from 'ink-testing-library'
import { ExitFeedback } from '../../ui/ExitFeedback.js'
import { FeedbackPrompt } from '../../ui/FeedbackPrompt.js'

describe('FeedbackPrompt', () => {
  test('renders feedback question', () => {
    const { lastFrame } = render(<FeedbackPrompt />)
    expect(lastFrame()).toContain('이 답변이 도움이 됐나요?')
  })

  test('renders all rating options', () => {
    const { lastFrame } = render(<FeedbackPrompt />)
    const frame = lastFrame()!
    expect(frame).toContain('[1]')
    expect(frame).toContain('좋아요')
    expect(frame).toContain('[2]')
    expect(frame).toContain('그냥 그래요')
    expect(frame).toContain('[3]')
    expect(frame).toContain('별로...')
  })

  test('renders dismiss options', () => {
    const { lastFrame } = render(<FeedbackPrompt />)
    const frame = lastFrame()!
    expect(frame).toContain('[d]')
    expect(frame).toContain('스킵')
    expect(frame).toContain('[D]')
    expect(frame).toContain('더 이상 묻지않기')
  })
})

describe('ExitFeedback', () => {
  test('renders exit feedback question', () => {
    const { lastFrame } = render(<ExitFeedback />)
    expect(lastFrame()).toContain('떠나시기 전에')
  })

  test('renders session feedback question', () => {
    const { lastFrame } = render(<ExitFeedback />)
    expect(lastFrame()).toContain('오늘 대화가 도움이 됐나요?')
  })

  test('renders rating options', () => {
    const { lastFrame } = render(<ExitFeedback />)
    const frame = lastFrame()!
    expect(frame).toContain('[1]')
    expect(frame).toContain('매우 도움됨')
    expect(frame).toContain('[2]')
    expect(frame).toContain('조금 도움됨')
    expect(frame).toContain('[3]')
    expect(frame).toContain('별로...')
    expect(frame).toContain('[d]')
    expect(frame).toContain('스킵')
  })
})
