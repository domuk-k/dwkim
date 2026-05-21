/**
 * Mastra adapter (slice domuk-k/dwkim#24) — SCAFFOLD.
 *
 * This implements the SAME `RunAgent` contract as the LangGraph adapter so the eval
 * harness compares apples-to-apples. The search tool below is wired (it reuses the
 * existing local BM25 search, so both agents retrieve from the identical Sources).
 *
 * ⚠️ The Agent definition + Memory + the result→AgentOutput mapping are LEFT FOR YOU —
 * that is the learning core of #24. TODOs mark each spot. Verify every Mastra API
 * against the installed docs, not memory:
 *   node_modules/.bun/…/@mastra/core/dist/docs/references/
 *     - docs-agents-overview.md   (new Agent({ id, name, instructions, model, tools }))
 *     - docs-agents-using-tools.md
 *     - docs-memory-overview.md    (new Memory({ storage: new LibSQLStore({ url }) }))
 * Debug interactively in Mastra Studio: `npm run dev` → http://localhost:4111
 */

import type { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getVectorStore } from '../../src/services/vectorStore'
import type { RunAgent } from './runAgent'

/**
 * Search tool — DONE. Wraps the existing BM25 `searchHybrid`, so the Mastra agent
 * grounds on the same Documents the LangGraph baseline used. Keep this as-is.
 */
export const personaSearchTool = createTool({
  id: 'persona-search',
  description:
    '김동욱의 노트에서 질문과 관련된 문서를 검색한다. 답변에 필요한 사실을 찾을 때 사용.',
  inputSchema: z.object({
    query: z.string().describe('검색할 질의'),
    topK: z.number().default(10)
  }),
  outputSchema: z.object({
    sources: z.array(
      z.object({ id: z.string(), title: z.string().optional(), content: z.string() })
    )
  }),
  execute: async (inputData) => {
    const { query, topK } = inputData
    const docs = await getVectorStore().searchHybrid(query, topK)
    return {
      sources: docs.map((d) => ({ id: d.id, title: d.metadata.title, content: d.content }))
    }
  }
})

/**
 * TODO(#24): define the Mastra persona Agent — the learning core.
 *
 * Model: use 'openrouter/anthropic/claude-sonnet-4' — the SAME model + gateway the
 *   LangGraph baseline used (OPENROUTER_API_KEY), so the before/after isolates
 *   orchestration, not the model.
 * Wire: instructions (port the persona-system prompt from Langfuse), tools:
 *   { personaSearchTool }, and memory (new Memory({ storage: new LibSQLStore(...) }))
 *   — Memory is the lever for the multi-turn weakness the baseline exposed
 *   (cogni follow-up: assertion 0/1, relevance 0.70).
 */
export function createPersonaAgent(): Agent {
  throw new Error('TODO(#24): define the Mastra persona Agent (instructions + tools + memory)')
  // return new Agent({
  //   id: 'persona',
  //   name: 'Persona',
  //   model: 'openrouter/anthropic/claude-sonnet-4',
  //   instructions: '…', // port persona-system
  //   tools: { personaSearchTool },
  //   memory: new Memory({ storage: new LibSQLStore({ url: ':memory:' }) })
  // })
}

/**
 * Adapter — SAME contract as `langGraphAgent`. The shell is here; fill the marked
 * gaps once `createPersonaAgent` exists.
 */
let agent: Agent | null = null

export const mastraAgent: RunAgent = async ({ query, history = [] }) => {
  if (!agent) agent = createPersonaAgent()
  const start = performance.now()

  // TODO(#24): pass `history` as Mastra messages (and/or a memory thread), and
  // capture the Sources returned by personaSearchTool from the agent's tool results.
  const res = await agent.generate(query)

  return {
    answer: res.text,
    sources: [], // TODO(#24): surface tool-retrieved Sources (from res tool results)
    tokens: res.usage?.totalTokens ?? 0, // TODO(#24): verify usage shape against docs
    ms: Math.round(performance.now() - start)
  }
}
