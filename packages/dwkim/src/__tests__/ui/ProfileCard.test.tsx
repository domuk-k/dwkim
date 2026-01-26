import { describe, expect, test } from 'bun:test'
import { render } from 'ink-testing-library'
import { ProfileBanner } from '../../ui/ProfileCard.js'

describe('ProfileBanner', () => {
  test('renders name and title', () => {
    const { lastFrame } = render(<ProfileBanner />)
    const frame = lastFrame()!
    expect(frame).toContain('김동욱')
    expect(frame).toContain('Agent Engineer')
  })

  test('renders bio', () => {
    const { lastFrame } = render(<ProfileBanner />)
    expect(lastFrame()).toContain('Problem Solver')
  })

  test('renders quote', () => {
    const { lastFrame } = render(<ProfileBanner />)
    expect(lastFrame()).toContain('Own my agency')
  })
})
