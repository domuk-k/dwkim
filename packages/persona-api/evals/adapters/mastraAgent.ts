/**
 * Mastra adapter (slice domuk-k/dwkim#24).
 *
 * Implements the SAME `RunAgent` contract as the LangGraph adapter so the eval
 * harness compares apples-to-apples. The search tool reuses the existing local
 * BM25 search, so both agents ground on the identical Sources; the model
 * (openrouter/anthropic/claude-sonnet-4) is the same one the baseline used, so the
 * before/after isolates orchestration (LangGraph vs Mastra), not the model.
 *
 * APIs verified against installed docs (@mastra/core@1.36): Agent ctor, createTool,
 * Memory + LibSQLStore, agent.generate() -> { text, toolResults, usage }.
 */

import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { LibSQLStore } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import { z } from 'zod'
import type { Document } from '../../src/services/vectorStore'
import { getVectorStore, initVectorStore } from '../../src/services/vectorStore'
import type { AgentInput, AgentOutput, RunAgent } from './runAgent'

/**
 * Search tool — wraps the existing BM25 `searchHybrid`. We also stash the retrieved
 * Documents per call so the adapter can surface the real Document[] for scoring
 * (the tool's own output payload is summarised text).
 */
let lastSources: Document[] = []

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
    lastSources = docs
    return {
      sources: docs.map((d) => ({ id: d.id, title: d.metadata.title, content: d.content }))
    }
  }
})

const INSTRUCTIONS = `너는 김동욱(dwkim)의 AI 프로필 에이전트다.
질문이 들어오면 먼저 persona-search 도구로 김동욱의 노트를 검색하고, 검색된 내용에 근거해서만 답하라.
이전 대화 맥락(예: "그 프로젝트", "거기서 쓴 스택")을 이어받아 무엇을 묻는지 해석하라.
노트에 근거가 없으면 모른다고 솔직히 말하고, 정보를 지어내지 마라.
간결하고 자연스러운 한국어로 답하라.`

export function createPersonaAgent(): Agent {
  return new Agent({
    id: 'persona',
    name: 'Persona',
    model: 'openrouter/anthropic/claude-sonnet-4',
    instructions: INSTRUCTIONS,
    tools: { personaSearchTool },
    memory: new Memory({ storage: new LibSQLStore({ id: 'persona-eval', url: ':memory:' }) })
  })
}

let agent: Agent | null = null
let vectorStoreReady = false
let threadSeq = 0

async function ensureAgent(): Promise<Agent> {
  // The search tool reads getVectorStore(); it must be initialised first (the
  // LangGraph path does this via PersonaEngine.initialize()), else it returns mocks.
  if (!vectorStoreReady) {
    await initVectorStore()
    vectorStoreReady = true
  }
  if (!agent) agent = createPersonaAgent()
  return agent
}

export const mastraAgent: RunAgent = async ({
  query,
  history = []
}: AgentInput): Promise<AgentOutput> => {
  const agent = await ensureAgent()
  lastSources = []
  const start = performance.now()

  // Prior turns as messages so multi-turn follow-ups resolve in context; a unique
  // thread keeps Memory isolated per eval case.
  const messages = [...history, { role: 'user' as const, content: query }]
  const res = await agent.generate(messages, {
    memory: { resource: 'eval', thread: `case-${threadSeq++}` }
  })

  if (process.env.MASTRA_DEBUG) {
    console.log('[mastra debug] keys:', Object.keys(res))
    console.log('[mastra debug] usage:', JSON.stringify(res.usage))
    console.log('[mastra debug] toolResults:', JSON.stringify(res.toolResults)?.slice(0, 300))
  }

  const usage = res.usage as Record<string, number> | undefined
  const tokens = usage?.totalTokens ?? (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)

  return {
    answer: res.text,
    sources: lastSources,
    tokens,
    ms: Math.round(performance.now() - start)
  }
}
