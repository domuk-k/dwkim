/**
 * Before/after comparison (slice domuk-k/dwkim#25).
 *
 * Diffs the frozen LangGraph baseline (snapshot.json) against the Mastra run
 * (snapshot-mastra.json), per case and metric. Both were scored by the SAME judge
 * on the SAME golden dataset, so the relative comparison is fair (see ADR-0002).
 *
 * Run:  ADAPTER=mastra bun run baseline   # produces snapshot-mastra.json
 *       bun run evals/baseline/compare.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface CaseSummary {
  name: string
  metrics: Record<string, { mean: number }>
  hallucinationRate: number
}
interface Snapshot {
  adapter?: string
  runs: number
  judgeModel: string
  cases: CaseSummary[]
}

const dir = import.meta.dir
const before: Snapshot = JSON.parse(readFileSync(join(dir, 'snapshot.json'), 'utf8'))
const after: Snapshot = JSON.parse(readFileSync(join(dir, 'snapshot-mastra.json'), 'utf8'))

const afterByName = new Map(after.cases.map((c) => [c.name, c]))
const mean = (c: CaseSummary | undefined, m: string) => c?.metrics?.[m]?.mean
const f = (n: number | undefined) => (n === undefined ? '  — ' : n.toFixed(2))
const pair = (b: CaseSummary, a: CaseSummary | undefined, m: string) =>
  `${f(mean(b, m))}→${f(mean(a, m))}`

console.log(
  `\nbefore=${before.adapter ?? 'langgraph'}(n=${before.runs})  after=${after.adapter}(n=${after.runs})  judge=${before.judgeModel}\n`
)
console.log(
  'case                       | assert       | faith       | rel         | halluc    | tokens'
)
console.log('-'.repeat(92))
for (const b of before.cases) {
  const a = afterByName.get(b.name)
  const halluc = `${(b.hallucinationRate * 100).toFixed(0)}%→${((a?.hallucinationRate ?? 0) * 100).toFixed(0)}%`
  const tokens = `${Math.round(mean(b, 'tokens') ?? 0)}→${Math.round(mean(a, 'tokens') ?? 0)}`
  console.log(
    `${b.name.padEnd(26)} | ${pair(b, a, 'assertionScore')} | ${pair(b, a, 'faithfulness')} | ${pair(b, a, 'relevance')} | ${halluc.padEnd(9)} | ${tokens}`
  )
}
