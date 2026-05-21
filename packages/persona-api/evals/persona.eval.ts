/**
 * Walking skeleton eval (slice domuk-k/dwkim#19).
 *
 * The thinnest end-to-end path: golden case -> runAgent (LangGraph) -> trivial
 * scorer -> Evalite report. Proves the harness binds to the real agent. Real
 * scorers (#20 assertions, #21 LLM-judge) and the full dataset (#22) build on this.
 *
 * Run:  bun run eval        (watch + UI)
 *       bun run eval:run    (once, CI-style)
 */

import 'dotenv/config'
import { evalite } from 'evalite'
import { langGraphAgent } from './adapters/runAgent'
import { goldenCases } from './golden/cases'

// Smoke only: first case (greeting, fast-path). The full per-branch baseline run
// with real scorers is wired in slice #23.
evalite('persona-skeleton (LangGraph)', {
  data: async () => goldenCases.slice(0, 1).map((c) => ({ input: c.input })),
  task: async (input) => langGraphAgent(input),
  scorers: [
    {
      // Placeholder. Real scorers: #20 (assertions), #21 (faithfulness/relevance).
      name: 'answer-nonempty',
      scorer: ({ output }) => (output.answer.trim().length > 0 ? 1 : 0)
    }
  ],
  columns: async ({ input, output }) => [
    { label: 'query', value: input.query },
    { label: 'answer', value: output.answer },
    { label: 'sources', value: output.sources.length },
    { label: 'tokens', value: output.tokens },
    { label: 'ms', value: output.ms }
  ]
})
