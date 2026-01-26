import { describe, expect, test } from 'bun:test'
import { render } from 'ink-testing-library'
import { STARTER_QUESTIONS, WelcomeView } from '../../ui/WelcomeView.js'

describe('WelcomeView', () => {
  test('renders scope disclosure', () => {
    const { lastFrame } = render(<WelcomeView questions={STARTER_QUESTIONS} selectedIndex={0} />)
    expect(lastFrame()).toContain('커리어, 스킬, 프로젝트, 글에 대해 답변합니다')
  })

  test('renders topic grid', () => {
    const { lastFrame } = render(<WelcomeView questions={STARTER_QUESTIONS} selectedIndex={0} />)
    const frame = lastFrame()!
    expect(frame).toContain('커리어 & 경험')
    expect(frame).toContain('기술 스택 & 스킬')
    expect(frame).toContain('프로젝트 & 오픈소스')
    expect(frame).toContain('개발 철학 & 블로그')
  })

  test('renders all starter questions', () => {
    const { lastFrame } = render(<WelcomeView questions={STARTER_QUESTIONS} selectedIndex={0} />)
    const frame = lastFrame()!
    for (const q of STARTER_QUESTIONS) {
      expect(frame).toContain(q)
    }
  })

  test('shows selection indicator on selected question', () => {
    const { lastFrame } = render(<WelcomeView questions={STARTER_QUESTIONS} selectedIndex={1} />)
    const frame = lastFrame()!
    // selectedIndex=1 should have '›' prefix
    expect(frame).toContain(`› [2] ${STARTER_QUESTIONS[1]}`)
  })

  test('renders navigation hint', () => {
    const { lastFrame } = render(<WelcomeView questions={STARTER_QUESTIONS} selectedIndex={0} />)
    expect(lastFrame()).toContain('↑↓ 선택')
  })

  test('renders nothing for empty questions', () => {
    const { lastFrame } = render(<WelcomeView questions={[]} selectedIndex={0} />)
    // No starter questions section
    expect(lastFrame()).not.toContain('물어보세요')
  })
})
