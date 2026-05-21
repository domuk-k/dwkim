/**
 * Assertion scorer 단위 테스트 (slice domuk-k/dwkim#20).
 *
 * Constructs fake AgentOutput objects directly — no LLM, no real agent. Covers:
 * - all-pass (every assertion satisfied)
 * - a missing mustInclude
 * - a mustNotInclude violation (hallucination === true)
 * - expectedSourceIds present vs absent
 * - case-insensitivity of text matching
 * - vacuous pass when no assertions are declared
 */

import { describe, expect, it } from 'bun:test'
import type { Document } from '../../src/services/vectorStore'
import type { AgentOutput } from '../adapters/runAgent'
import { type Assertions, assertionsScorer, evaluateAssertions } from './assertions'

function makeDoc(id: string): Document {
  return {
    id,
    content: `content of ${id}`,
    metadata: { type: 'cogni' }
  }
}

function makeOutput(answer: string, sourceIds: string[] = []): AgentOutput {
  return {
    answer,
    sources: sourceIds.map(makeDoc),
    tokens: 0,
    ms: 0
  }
}

describe('evaluateAssertions', () => {
  describe('all-pass', () => {
    it('scores 1.0 when every assertion is satisfied', () => {
      const output = makeOutput('김동욱은 TypeScript와 Elysia를 주로 씁니다.', [
        'cogni_resume_0',
        'cogni_resume_1'
      ])
      const expected: Assertions = {
        mustInclude: ['TypeScript', 'Elysia'],
        mustNotInclude: ['Python'],
        expectedSourceIds: ['cogni_resume_0']
      }

      const result = evaluateAssertions(output, expected)

      expect(result.score).toBe(1)
      expect(result.metadata.passed).toBe(4)
      expect(result.metadata.total).toBe(4)
      expect(result.metadata.hallucination).toBe(false)
      expect(result.metadata.mustInclude.every((a) => a.passed)).toBe(true)
      expect(result.metadata.mustNotInclude.every((a) => a.passed)).toBe(true)
      expect(result.metadata.expectedSourceIds.every((a) => a.passed)).toBe(true)
    })
  })

  describe('mustInclude', () => {
    it('marks a missing required fact as failed and lowers the score', () => {
      const output = makeOutput('김동욱은 TypeScript를 씁니다.')
      const expected: Assertions = {
        mustInclude: ['TypeScript', 'Rust']
      }

      const result = evaluateAssertions(output, expected)

      // 1 of 2 assertions pass.
      expect(result.score).toBe(0.5)
      expect(result.metadata.passed).toBe(1)
      expect(result.metadata.total).toBe(2)
      expect(result.metadata.mustInclude.find((a) => a.value === 'TypeScript')?.passed).toBe(true)
      expect(result.metadata.mustInclude.find((a) => a.value === 'Rust')?.passed).toBe(false)
      // A missing mustInclude is NOT a hallucination.
      expect(result.metadata.hallucination).toBe(false)
    })

    it('matches case-insensitively', () => {
      const output = makeOutput('He mainly uses typescript.')
      const result = evaluateAssertions(output, { mustInclude: ['TypeScript'] })

      expect(result.score).toBe(1)
      expect(result.metadata.mustInclude[0]?.passed).toBe(true)
    })
  })

  describe('mustNotInclude (hallucination)', () => {
    it('flags hallucination === true when a banned string is present', () => {
      const output = makeOutput('김동욱은 OpenAI의 CEO입니다.')
      const expected: Assertions = {
        mustNotInclude: ['CEO']
      }

      const result = evaluateAssertions(output, expected)

      expect(result.score).toBe(0)
      expect(result.metadata.hallucination).toBe(true)
      expect(result.metadata.mustNotInclude[0]?.passed).toBe(false)
    })

    it('keeps hallucination === false when banned strings are absent', () => {
      const output = makeOutput('김동욱은 개발자입니다.')
      const result = evaluateAssertions(output, { mustNotInclude: ['CEO', 'CTO'] })

      expect(result.score).toBe(1)
      expect(result.metadata.hallucination).toBe(false)
      expect(result.metadata.mustNotInclude.every((a) => a.passed)).toBe(true)
    })

    it('detects a banned string case-insensitively', () => {
      const output = makeOutput('He is the ceo.')
      const result = evaluateAssertions(output, { mustNotInclude: ['CEO'] })

      expect(result.metadata.hallucination).toBe(true)
      expect(result.metadata.mustNotInclude[0]?.passed).toBe(false)
    })
  })

  describe('expectedSourceIds', () => {
    it('passes when the expected Document id is among retrieved Sources', () => {
      const output = makeOutput('answer', ['cogni_resume_0', 'cogni_resume_1'])
      const result = evaluateAssertions(output, {
        expectedSourceIds: ['cogni_resume_1']
      })

      expect(result.score).toBe(1)
      expect(result.metadata.expectedSourceIds[0]?.passed).toBe(true)
    })

    it('fails when the expected Document id was not retrieved', () => {
      const output = makeOutput('answer', ['cogni_resume_0'])
      const result = evaluateAssertions(output, {
        expectedSourceIds: ['cogni_resume_9']
      })

      expect(result.score).toBe(0)
      expect(result.metadata.expectedSourceIds[0]?.passed).toBe(false)
      // Retrieval miss is not a hallucination.
      expect(result.metadata.hallucination).toBe(false)
    })

    it('matches source ids exactly (case-sensitive)', () => {
      const output = makeOutput('answer', ['cogni_Resume_0'])
      const result = evaluateAssertions(output, {
        expectedSourceIds: ['cogni_resume_0']
      })

      expect(result.metadata.expectedSourceIds[0]?.passed).toBe(false)
    })
  })

  describe('no assertions declared', () => {
    it('vacuously scores 1.0 with zero total', () => {
      const result = evaluateAssertions(makeOutput('anything'), {})

      expect(result.score).toBe(1)
      expect(result.metadata.total).toBe(0)
      expect(result.metadata.passed).toBe(0)
      expect(result.metadata.hallucination).toBe(false)
    })
  })

  describe('mixed pass/fail fraction', () => {
    it('scores the fraction of individual assertions that passed', () => {
      const output = makeOutput('김동욱은 TypeScript를 씁니다.', ['cogni_resume_0'])
      const expected: Assertions = {
        mustInclude: ['TypeScript', 'Rust'], // 1 pass, 1 fail
        mustNotInclude: ['CEO'], // pass (absent)
        expectedSourceIds: ['cogni_resume_0', 'cogni_resume_9'] // 1 pass, 1 fail
      }

      const result = evaluateAssertions(output, expected)

      // 3 of 5 pass.
      expect(result.metadata.total).toBe(5)
      expect(result.metadata.passed).toBe(3)
      expect(result.score).toBeCloseTo(3 / 5, 10)
      expect(result.metadata.hallucination).toBe(false)
    })
  })
})

describe('assertionsScorer (Evalite ScorerOpts)', () => {
  it('is named "assertions"', () => {
    expect(assertionsScorer.name).toBe('assertions')
  })

  it('delegates to evaluateAssertions via the scorer fn', () => {
    const result = assertionsScorer.scorer({
      input: { query: 'q' },
      output: makeOutput('김동욱은 TypeScript를 씁니다.'),
      expected: { mustInclude: ['TypeScript'] }
    }) as { score: number; metadata: { hallucination: boolean } }

    expect(result.score).toBe(1)
    expect(result.metadata.hallucination).toBe(false)
  })

  it('treats undefined expected as no assertions (vacuous pass)', () => {
    const result = assertionsScorer.scorer({
      input: { query: 'q' },
      output: makeOutput('anything'),
      expected: undefined
    }) as { score: number }

    expect(result.score).toBe(1)
  })
})
