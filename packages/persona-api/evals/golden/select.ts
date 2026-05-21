/**
 * Loader: maps Golden cases to Evalite data and selects scorers per branch
 * (slice domuk-k/dwkim#22).
 *
 * Evalite passes ONE `expected` per case to every scorer, so we flatten a case's
 * `assertions` + `rubric` into a single object — each scorer reads only its own
 * fields (assertion scorer reads mustInclude/etc; judge reads rubric). The
 * baseline eval (#23) creates one Evalite run per branch using `selectScorers`.
 */

import type { Evalite } from 'evalite'
import type { AgentInput, AgentOutput } from '../adapters/runAgent'
import { type Assertions, assertionsScorer } from '../scorers/assertions'
import { type JudgeExpected, type JudgeFn, makeJudgeScorers } from '../scorers/judge'
import type { Branch, GoldenCase } from './cases'

/** The flat `expected` both scorer families read from. */
export type CaseExpected = Assertions & JudgeExpected

type CaseScorer = Evalite.ScorerOpts<AgentInput, AgentOutput, CaseExpected>

/** Fast-path branches (greeting): verify a non-empty canned response, no judge. */
export const nonEmptyScorer: CaseScorer = {
  name: 'non-empty',
  description: 'Answer is a non-empty response (deterministic fast-path branches).',
  scorer: ({ output }) => (output.answer.trim().length > 0 ? 1 : 0)
}

export function toEvaliteData(
  cases: GoldenCase[]
): Array<{ input: AgentInput; expected: CaseExpected }> {
  return cases.map((c) => ({
    input: c.input,
    expected: { ...(c.assertions ?? {}), rubric: c.rubric }
  }))
}

export function groupByBranch(cases: GoldenCase[]): Map<Branch, GoldenCase[]> {
  const grouped = new Map<Branch, GoldenCase[]>()
  for (const c of cases) {
    const arr = grouped.get(c.branch) ?? []
    arr.push(c)
    grouped.set(c.branch, arr)
  }
  return grouped
}

/**
 * Which scorers run for a branch:
 * - `simple`:        non-empty only — canned fast-path has no grounding to judge.
 * - `out-of-scope`:  assertions (catch a fabricated answer) + relevance (did it
 *                    appropriately decline?). Faithfulness is meaningless with no
 *                    expected Sources.
 * - others:          assertions + faithfulness + relevance.
 */
export function selectScorers(branch: Branch, judge: JudgeFn): CaseScorer[] {
  const { faithfulness, relevance } = makeJudgeScorers(judge)
  switch (branch) {
    case 'simple':
      return [nonEmptyScorer]
    case 'out-of-scope':
      return [assertionsScorer, relevance]
    default:
      return [assertionsScorer, faithfulness, relevance]
  }
}
