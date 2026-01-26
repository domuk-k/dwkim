import { describe, expect, test } from 'bun:test'
import { render } from 'ink-testing-library'
import { SuggestedQuestions } from '../../ui/SuggestedQuestions.js'

describe('SuggestedQuestions', () => {
  const questions = ['TypeScript에 대해 더 알려주세요', 'React 경험이 있나요?']

  test('renders all suggested questions', () => {
    const { lastFrame } = render(<SuggestedQuestions questions={questions} selectedIndex={0} />)
    const frame = lastFrame()!
    expect(frame).toContain(questions[0])
    expect(frame).toContain(questions[1])
  })

  test('highlights selected question with › prefix', () => {
    const { lastFrame } = render(<SuggestedQuestions questions={questions} selectedIndex={0} />)
    expect(lastFrame()).toContain(`› [1] ${questions[0]}`)
  })

  test('changes highlight when selectedIndex changes', () => {
    const { lastFrame } = render(<SuggestedQuestions questions={questions} selectedIndex={1} />)
    expect(lastFrame()).toContain(`› [2] ${questions[1]}`)
  })

  test('shows header text', () => {
    const { lastFrame } = render(<SuggestedQuestions questions={questions} selectedIndex={0} />)
    expect(lastFrame()).toContain('더 구체적으로 물어보시겠어요?')
  })

  test('shows navigation hint', () => {
    const { lastFrame } = render(<SuggestedQuestions questions={questions} selectedIndex={0} />)
    expect(lastFrame()).toContain('↑↓ 선택')
    expect(lastFrame()).toContain('ESC 닫기')
  })

  test('returns null for empty questions', () => {
    const { lastFrame } = render(<SuggestedQuestions questions={[]} selectedIndex={0} />)
    // Empty component renders nothing
    expect(lastFrame()).toBe('')
  })
})
