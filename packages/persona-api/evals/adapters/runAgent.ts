/**
 * Agent-agnostic adapter contract — the spine of the eval harness.
 *
 * Both implementations satisfy the SAME contract so the before/after comparison
 * is apples-to-apples: the LangGraph adapter (here) now, the Mastra adapter later
 * (slice domuk-k/dwkim#24). The eval harness only ever talks to `RunAgent` — the
 * orchestration framework never leaks into the dataset or scorers.
 *
 * @see packages/persona-api/CONTEXT.md — "Source", "Document"
 * @see ADR-0002 — agent-agnostic adapter = fair before/after
 */

import type { ChatMessage } from '../../src/services/llmService'
import { PersonaEngine } from '../../src/services/personaAgent'
import type { Document } from '../../src/services/vectorStore'

export interface AgentInput {
  query: string
  history?: ChatMessage[]
}

/** The observable output the eval scores. No internal pipeline state. */
export interface AgentOutput {
  answer: string
  sources: Document[]
  tokens: number
  ms: number
}

export type RunAgent = (input: AgentInput) => Promise<AgentOutput>

// ─────────────────────────────────────────────────────────────
// LangGraph implementation (the current agent — the "before")
// ─────────────────────────────────────────────────────────────

let engine: PersonaEngine | null = null

async function getEngine(): Promise<PersonaEngine> {
  if (!engine) {
    engine = new PersonaEngine()
    await engine.initialize()
  }
  return engine
}

export const langGraphAgent: RunAgent = async ({ query, history = [] }) => {
  const e = await getEngine()
  const start = performance.now()
  const res = await e.processQuery(query, history)
  return {
    answer: res.answer,
    sources: res.sources,
    tokens: res.usage.totalTokens,
    ms: Math.round(performance.now() - start)
  }
}
