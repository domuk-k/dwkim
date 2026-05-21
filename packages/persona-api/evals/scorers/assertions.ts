/**
 * Deterministic Assertion scorer (slice domuk-k/dwkim#20).
 *
 * An **Assertion** is a reproducible, no-LLM check on a Golden case's
 * **observable output** — the answer text and the retrieved **Sources** — never
 * internal pipeline state (which node fired, the rewritten query). Probing
 * internals would couple the eval to one orchestration framework and break the
 * agent-agnostic before/after contract.
 *
 * This scorer reports faithfully; it does NOT enforce hard-stop semantics. The
 * `hallucination` flag is surfaced in metadata for downstream gates (#5/#7) to
 * act on. It is not a release gate (ADR-0002).
 *
 * @see packages/persona-api/CONTEXT.md — "Assertion", "Source", "Document"
 * @see packages/persona-api/docs/adr/0002-eval-first-strangler-parity-gate.md
 * @see packages/persona-api/evals/adapters/runAgent.ts — AgentOutput contract
 */

import type { Evalite } from 'evalite'
import type { AgentInput, AgentOutput } from '../adapters/runAgent'

/**
 * The expected-data shape a Golden case carries for deterministic checks.
 * Each field is independent and optional; an absent field contributes no
 * assertions.
 *
 * - `mustInclude`: facts that MUST appear in the answer text.
 * - `mustNotInclude`: banned/hallucinated claims that MUST be absent. A present
 *   one is a **hallucination** (flagged distinctly in metadata).
 * - `expectedSourceIds`: chunk-level **Document** ids the search step MUST have
 *   retrieved. Coupled to the indexing scheme, not the Note's content — see the
 *   "Source ID stability" ambiguity in CONTEXT.md; re-chunking shifts these ids.
 */
export interface Assertions {
  mustInclude?: string[]
  mustNotInclude?: string[]
  expectedSourceIds?: string[]
}

/** Per-string outcome for a text-based assertion group. */
export interface StringAssertionResult {
  value: string
  passed: boolean
}

/** Per-id outcome for the `expectedSourceIds` assertion group. */
export interface SourceIdAssertionResult {
  id: string
  passed: boolean
}

/** Faithful, per-assertion report attached to the score. */
export interface AssertionsMetadata {
  mustInclude: StringAssertionResult[]
  mustNotInclude: StringAssertionResult[]
  expectedSourceIds: SourceIdAssertionResult[]
  /** True if ANY `mustNotInclude` string was present in the answer. */
  hallucination: boolean
  /** Count of individual assertions that passed. */
  passed: number
  /** Total number of individual assertions evaluated. */
  total: number
}

/**
 * Case-sensitivity decision: all text matching (`mustInclude` /
 * `mustNotInclude`) is CASE-INSENSITIVE. The persona answers mix Korean (which
 * has no case) with English tech terms (TypeScript / typescript / Elysia), and
 * a Golden case should not fail over incidental capitalization. Source-id
 * matching is exact — ids are machine-generated and case-exact by construction.
 */
function answerIncludes(answer: string, needle: string): boolean {
  return answer.toLowerCase().includes(needle.toLowerCase())
}

export type AssertionsScoreInput = Evalite.ScoreInput<AgentInput, AgentOutput, Assertions>

/**
 * Evaluate the Assertions against an `AgentOutput`. Reads only `output.answer`
 * and `output.sources` (observable output).
 *
 * Scoring formula: `score = passed / total`, the fraction of individual
 * assertions that passed (1.0 = every assertion passed). Each string in
 * `mustInclude`/`mustNotInclude` and each id in `expectedSourceIds` counts as
 * one assertion. With no assertions declared, `total === 0` and the score is
 * `1` (vacuously true — nothing to violate).
 */
export function evaluateAssertions(
  output: AgentOutput,
  expected: Assertions
): Evalite.UserProvidedScoreWithMetadata & { metadata: AssertionsMetadata } {
  const answer = output.answer ?? ''
  const retrievedIds = new Set(output.sources.map((s) => s.id))

  const mustInclude: StringAssertionResult[] = (expected.mustInclude ?? []).map((value) => ({
    value,
    passed: answerIncludes(answer, value)
  }))

  // mustNotInclude passes when the banned string is ABSENT.
  const mustNotInclude: StringAssertionResult[] = (expected.mustNotInclude ?? []).map((value) => ({
    value,
    passed: !answerIncludes(answer, value)
  }))

  const expectedSourceIds: SourceIdAssertionResult[] = (expected.expectedSourceIds ?? []).map(
    (id) => ({
      id,
      passed: retrievedIds.has(id)
    })
  )

  const all = [...mustInclude, ...mustNotInclude, ...expectedSourceIds]
  const total = all.length
  const passed = all.filter((a) => a.passed).length

  // A failing mustNotInclude assertion means a banned string was present.
  const hallucination = mustNotInclude.some((a) => !a.passed)

  return {
    score: total === 0 ? 1 : passed / total,
    metadata: {
      mustInclude,
      mustNotInclude,
      expectedSourceIds,
      hallucination,
      passed,
      total
    }
  }
}

/**
 * Evalite-compatible scorer. Selected by `branch` for Golden cases that carry
 * deterministic `expected: Assertions` data (wiring lands with #22).
 */
export const assertionsScorer: Evalite.ScorerOpts<AgentInput, AgentOutput, Assertions> = {
  name: 'assertions',
  description: 'Deterministic checks on observable output (answer text + retrieved Sources)',
  scorer: ({ output, expected }) => evaluateAssertions(output, expected ?? {})
}
