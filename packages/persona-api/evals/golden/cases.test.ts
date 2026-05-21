/**
 * Golden dataset validation (slice domuk-k/dwkim#22).
 * Asserts the curated cases have the labels their branch needs.
 */

import { describe, expect, it } from 'bun:test'
import { type Branch, goldenCases } from './cases'

const byName = (name: string) => {
  const c = goldenCases.find((g) => g.name === name)
  if (!c) throw new Error(`case not found: ${name}`)
  return c
}

describe('goldenCases', () => {
  it('every case has a non-empty query and a known branch', () => {
    const branches: Branch[] = [
      'simple',
      'contact-intent',
      'factual-persona',
      'out-of-scope',
      'multi-turn'
    ]
    for (const c of goldenCases) {
      expect(c.input.query.trim().length).toBeGreaterThan(0)
      expect(branches).toContain(c.branch)
    }
  })

  it('covers all five pipeline branches', () => {
    const covered = new Set(goldenCases.map((c) => c.branch))
    expect(covered).toEqual(
      new Set(['simple', 'contact-intent', 'factual-persona', 'out-of-scope', 'multi-turn'])
    )
  })

  it('greeting is the simple fast-path branch', () => {
    expect(byName('greeting').branch).toBe('simple')
  })

  it('out-of-scope case bans fabricated blood types (must_not_include)', () => {
    const c = byName('blood-type-out-of-scope')
    expect(c.branch).toBe('out-of-scope')
    expect(c.assertions?.mustNotInclude).toEqual(['A형', 'B형', 'O형', 'AB형'])
  })

  it('contact case requires the public email (must_include)', () => {
    expect(byName('contact-email').assertions?.mustInclude).toContain('dannyworks102@gmail.com')
  })

  it('multi-turn case carries conversation history', () => {
    const c = byName('cogni-stack-followup')
    expect(c.branch).toBe('multi-turn')
    expect((c.input.history ?? []).length).toBeGreaterThan(0)
  })

  it('hackathon case requires the 해커톤 fact', () => {
    expect(byName('hackathon').assertions?.mustInclude).toContain('해커톤')
  })

  it('broad tech-stack case is judge-only (no must_include)', () => {
    expect(byName('tech-stack').assertions?.mustInclude).toBeUndefined()
    expect(byName('tech-stack').rubric).toBeDefined()
  })
})
