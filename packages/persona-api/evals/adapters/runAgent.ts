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

import type { Elicitation } from '../../src/services/elicitation'
import { decideElicitation } from '../../src/services/elicitationPolicy'
import type { ChatMessage } from '../../src/services/llmService'
import { PersonaEngine } from '../../src/services/personaAgent'
import type { Document } from '../../src/services/vectorStore'
import type { VisitorContext, VisitorType } from '../../src/services/visitor'

export interface AgentInput {
  query: string
  history?: ChatMessage[]
  /** 방문자 유형(식별됐다면). 미지정 = 미식별 — elicitation 정책의 turn-1 분기를 탄다. */
  visitorType?: VisitorType
}

/** The observable output the eval scores. No internal pipeline state. */
export interface AgentOutput {
  answer: string
  sources: Document[]
  tokens: number
  ms: number
  /** Structured prompts the agent emitted this turn — observable, lets golden cases assert chip behavior (ADR-0004). */
  elicitations?: Elicitation[]
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

export const langGraphAgent: RunAgent = async ({ query, history = [], visitorType }) => {
  const e = await getEngine()
  const start = performance.now()
  const res = await e.processQuery(query, history)

  // 라우트가 agent *주위에서* 적용하는 elicitation 정책(ADR-0003/0004)을 eval에서도 관측 가능하게 재현.
  // turn = 직전 대화쌍 수 + 1 (history 비어있으면 turn-1). 미식별 방문자의 turn-1만 identify를 발화한다.
  const turn = Math.floor(history.length / 2) + 1
  const ctx: VisitorContext = { type: visitorType, interests: [], isReturning: false }
  const elicitation = decideElicitation(ctx, turn, query)

  return {
    answer: res.answer,
    sources: res.sources,
    tokens: res.usage.totalTokens,
    ms: Math.round(performance.now() - start),
    elicitations: elicitation ? [elicitation] : []
  }
}
