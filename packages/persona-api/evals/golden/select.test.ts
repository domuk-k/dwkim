/**
 * Loader / scorer-selection tests (slice domuk-k/dwkim#22).
 * No real LLM — the JudgeFn is a stub; we only check which scorers a branch picks
 * and that cases flatten into Evalite's { input, expected } shape.
 */

import { describe, expect, it } from 'bun:test'
import type { JudgeFn } from '../scorers/judge'
import type { GoldenCase } from './cases'
import { groupByBranch, selectScorers, toEvaliteData } from './select'

const stubJudge: JudgeFn = async () => ({ faithfulness: 1, relevance: 1 })
const names = (branch: Parameters<typeof selectScorers>[0]) =>
  selectScorers(branch, stubJudge).map((s) => s.name)

describe('selectScorers', () => {
  it('simple branch uses only the deterministic non-empty scorer', () => {
    expect(names('simple')).toEqual(['non-empty'])
  })

  it('out-of-scope uses assertions + relevance (no faithfulness)', () => {
    expect(names('out-of-scope')).toEqual(['assertions', 'relevance'])
  })

  it('factual/contact/multi-turn use assertions + faithfulness + relevance', () => {
    for (const b of ['factual-persona', 'contact-intent', 'multi-turn'] as const) {
      expect(names(b)).toEqual(['assertions', 'faithfulness', 'relevance'])
    }
  })
})

describe('toEvaliteData', () => {
  it('flattens assertions + rubric into a single expected object', () => {
    const c: GoldenCase = {
      name: 'x',
      branch: 'factual-persona',
      input: { query: 'q' },
      assertions: { mustInclude: ['해커톤'] },
      rubric: 'r'
    }
    const [row] = toEvaliteData([c])
    expect(row.input.query).toBe('q')
    expect(row.expected.mustInclude).toEqual(['해커톤'])
    expect(row.expected.rubric).toBe('r')
  })
})

describe('groupByBranch', () => {
  it('groups cases by their branch', () => {
    const cases: GoldenCase[] = [
      { name: 'a', branch: 'simple', input: { query: 'a' } },
      { name: 'b', branch: 'factual-persona', input: { query: 'b' } },
      { name: 'c', branch: 'factual-persona', input: { query: 'c' } }
    ]
    const grouped = groupByBranch(cases)
    expect(grouped.get('simple')?.length).toBe(1)
    expect(grouped.get('factual-persona')?.length).toBe(2)
  })
})
