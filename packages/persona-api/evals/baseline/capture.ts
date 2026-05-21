/**
 * Baseline capture (slice domuk-k/dwkim#23) — the "before" of the migration story.
 *
 * Runs each Golden case through the LangGraph agent N times at temperature 0,
 * scores every run (deterministic assertions + LLM-as-judge), aggregates per-metric
 * mean ± σ, and writes committed artifacts:
 *   - evals/baseline/fixtures/<case>.json   — the raw outputs (re-score without re-calling the agent)
 *   - evals/baseline/snapshot.json          — the score summary (the evidence)
 *
 * Run (forces temp 0):  bun run baseline
 * Knobs: BASELINE_RUNS (default 3), BASELINE_LIMIT (cap cases, for smoke runs).
 *
 * This is evidence, NOT a release gate (ADR-0002). It must be committed BEFORE any
 * Mastra code so the before/after cannot be accused of moving the goalposts.
 */

import 'dotenv/config'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { mastraAgent } from '../adapters/mastraAgent'
import { langGraphAgent } from '../adapters/runAgent'
import { goldenCases } from '../golden/cases'
import { evaluateAssertions } from '../scorers/assertions'
import { JUDGE_MODEL, realJudgeFn } from '../scorers/judge'
import { type Summary, summarize } from './stats'

const RUNS = Number(process.env.BASELINE_RUNS ?? 3)
const LIMIT = process.env.BASELINE_LIMIT ? Number(process.env.BASELINE_LIMIT) : undefined
// ADAPTER=langgraph writes the frozen baseline; ADAPTER=mastra writes the "after".
const ADAPTER = (process.env.ADAPTER ?? 'langgraph') as 'langgraph' | 'mastra'
const runAgent = ADAPTER === 'mastra' ? mastraAgent : langGraphAgent
const SUFFIX = ADAPTER === 'mastra' ? '-mastra' : ''
const OUT_DIR = import.meta.dir
const FIX_DIR = join(OUT_DIR, `fixtures${SUFFIX}`)

interface RunResult {
  answer: string
  sourceIds: string[]
  tokens: number
  ms: number
  assertionScore: number
  hallucination: boolean
  faithfulness?: number
  relevance?: number
}

interface CaseSummary {
  name: string
  branch: string
  metrics: Record<string, Summary>
  hallucinationRate: number
}

async function main() {
  const cases = LIMIT ? goldenCases.slice(0, LIMIT) : goldenCases
  console.log(
    `[${ADAPTER}] ${cases.length} cases × ${RUNS} runs @ temp=${process.env.LLM_GENERATION_TEMPERATURE ?? 'default'}\n`
  )
  mkdirSync(FIX_DIR, { recursive: true })

  const perCase: CaseSummary[] = []
  for (const c of cases) {
    const judged = c.branch !== 'simple'
    const runs: RunResult[] = []

    for (let i = 0; i < RUNS; i++) {
      const out = await runAgent(c.input)
      const assertion = evaluateAssertions(out, c.assertions ?? {})

      let faithfulness: number | undefined
      let relevance: number | undefined
      if (judged) {
        const j = await realJudgeFn({
          query: c.input.query,
          answer: out.answer,
          sources: out.sources,
          rubric: c.rubric
        })
        relevance = j.relevance
        // out-of-scope has no expected Sources, so faithfulness is meaningless there.
        if (c.branch !== 'out-of-scope') faithfulness = j.faithfulness
      }

      runs.push({
        answer: out.answer,
        sourceIds: out.sources.map((s) => s.id),
        tokens: out.tokens,
        ms: out.ms,
        assertionScore: assertion.score,
        hallucination: assertion.metadata.hallucination,
        faithfulness,
        relevance
      })
      console.log(
        `  [${c.name}] ${i + 1}/${RUNS} tokens=${out.tokens} assert=${assertion.score.toFixed(2)}` +
          `${faithfulness !== undefined ? ` faith=${faithfulness.toFixed(2)}` : ''}` +
          `${relevance !== undefined ? ` rel=${relevance.toFixed(2)}` : ''}` +
          `${assertion.metadata.hallucination ? ' ⚠ HALLUCINATION' : ''}`
      )
    }

    writeFileSync(
      join(FIX_DIR, `${c.name}.json`),
      JSON.stringify({ case: c.name, branch: c.branch, query: c.input.query, runs }, null, 2)
    )

    const metrics: Record<string, Summary> = {
      assertionScore: summarize(runs.map((r) => r.assertionScore)),
      tokens: summarize(runs.map((r) => r.tokens)),
      ms: summarize(runs.map((r) => r.ms))
    }
    const faith = runs
      .filter((r) => r.faithfulness !== undefined)
      .map((r) => r.faithfulness as number)
    const rel = runs.filter((r) => r.relevance !== undefined).map((r) => r.relevance as number)
    if (faith.length) metrics.faithfulness = summarize(faith)
    if (rel.length) metrics.relevance = summarize(rel)

    const hallucinationRate = runs.filter((r) => r.hallucination).length / runs.length
    perCase.push({ name: c.name, branch: c.branch, metrics, hallucinationRate })
  }

  const snapshot = {
    adapter: ADAPTER,
    capturedAt: new Date().toISOString(),
    runs: RUNS,
    temperature: process.env.LLM_GENERATION_TEMPERATURE ?? null,
    generationModel: process.env.LLM_GENERATION_MODEL ?? null,
    judgeModel: JUDGE_MODEL,
    cases: perCase
  }
  writeFileSync(join(OUT_DIR, `snapshot${SUFFIX}.json`), JSON.stringify(snapshot, null, 2))

  console.log(
    `\n✓ ${ADAPTER} written: evals/baseline/snapshot${SUFFIX}.json (+ fixtures${SUFFIX}/)\n`
  )
  for (const c of perCase) {
    const f = c.metrics.faithfulness
    const r = c.metrics.relevance
    console.log(
      `${c.name.padEnd(26)} assert=${c.metrics.assertionScore.mean.toFixed(2)} ` +
        `${f ? `faith=${f.mean.toFixed(2)}±${f.stddev.toFixed(2)} ` : ''}` +
        `${r ? `rel=${r.mean.toFixed(2)} ` : ''}` +
        `halluc=${(c.hallucinationRate * 100).toFixed(0)}% tokens≈${Math.round(c.metrics.tokens.mean)}`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
