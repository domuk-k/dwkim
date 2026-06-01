/**
 * Golden dataset (slice domuk-k/dwkim#22).
 *
 * Queries mined from Langfuse production traces (41 traces, 25 distinct), with
 * contact-intent and out-of-scope hand-authored because real users never trigger
 * them. Assertions are grounded in `data/searchIndex.json` (the same SSOT the
 * agent retrieves from) — citations noted per case.
 *
 * Labels read by scorers:
 *  - `assertions`  -> assertion scorer (#20), observable output only
 *  - `rubric`      -> LLM-as-judge (#21), faithfulness/relevance
 * Which scorers run is decided by `branch` — see ./select.ts.
 */

import type { ChatMessage } from '../../src/services/llmService'
import type { AgentInput } from '../adapters/runAgent'
import type { Assertions } from '../scorers/assertions'

/** Which pipeline branch a case exercises — selects scorers (see ./select.ts). */
export type Branch = 'simple' | 'contact-intent' | 'factual-persona' | 'out-of-scope' | 'multi-turn'

export interface GoldenCase {
  name: string
  branch: Branch
  input: AgentInput
  /** Deterministic checks on observable output. */
  assertions?: Assertions
  /** Rubric for the LLM-as-judge (faithfulness/relevance). */
  rubric?: string
}

const multiTurnHistory: ChatMessage[] = [
  { role: 'user', content: '주로 어떤 기술 스택을 사용하나요?' },
  { role: 'assistant', content: 'AI 에이전트와 RAG 중심으로 TypeScript 기반 스택을 주로 씁니다.' }
]

export const goldenCases: GoldenCase[] = [
  {
    name: 'greeting',
    branch: 'simple',
    input: { query: '안녕' },
    // Fast-path canned response (no LLM). Scored deterministically — see ./select.ts.
    rubric: '인사에 대한 짧고 자연스러운 응답. 비어 있으면 안 됨.'
  },
  {
    name: 'tech-stack',
    branch: 'factual-persona',
    input: { query: '주로 어떤 기술 스택을 사용하나요?' },
    // Broad question — no single mandatory fact. Judge-only (must_include intentionally empty).
    rubric:
      '김동욱의 노트에 근거해 그가 실제로 쓰는 스택(AI 에이전트/RAG/TypeScript 계열)을 설명. 노트에 없는 기술을 지어내지 말 것.'
  },
  {
    name: 'hackathon',
    branch: 'factual-persona',
    input: { query: '동욱이 해커톤 경험이 있어?' },
    // SSOT: cogni_self-pr-hackathon-openai-coxwave_0 — ran OpenAI x Coxwave Hackathon (2026-01).
    assertions: { mustInclude: ['해커톤'] },
    rubric: 'OpenAI x Coxwave 해커톤(2026년 1월) 운영 경험이 있다고 답해야 함.'
  },
  {
    name: 'cogni-stack-followup',
    branch: 'multi-turn',
    input: { query: 'cogni 프로젝트는 어떤 기술 스택을 사용했나요?', history: multiTurnHistory },
    // SSOT: cogni_personal-profile_6 — cogni is built with Claude Agent SDK.
    assertions: { mustInclude: ['Agent SDK'] },
    rubric:
      '직전 맥락(기술 스택)을 이어, cogni가 Claude Agent SDK 기반 개인 노트 시스템(SSOT)임을 설명.'
  },
  {
    name: 'contact-email',
    branch: 'contact-intent',
    input: { query: '이메일로 연락하려면 어떻게 해?' },
    // SSOT: cogni_100-questions_97, cogni_personal-profile_0 — public contact email.
    assertions: { mustInclude: ['dannyworks102@gmail.com'] },
    rubric: '공개 이메일 주소를 안내해야 함.'
  },
  {
    name: 'blood-type-out-of-scope',
    branch: 'out-of-scope',
    input: { query: '김동욱 혈액형이 뭐야?' },
    // Not in the index (0 hits) — refusing is correct; fabricating a blood type is a hallucination.
    assertions: { mustNotInclude: ['A형', 'B형', 'O형', 'AB형'] },
    rubric:
      '혈액형 정보는 노트에 없음. 모른다/확인할 수 없다고 답해야 하며, 혈액형을 지어내면 안 됨.'
  },
  // ── Elicitation chip behavior (ADR-0004 / #27). Deterministic, no LLM judgment. ──
  {
    name: 'elicitation-identify-turn1',
    branch: 'simple',
    // 미식별 방문자의 turn-1 (history 없음) → identify elicitation을 발화해야 한다.
    input: { query: '김동욱은 어떤 개발자야?' },
    assertions: { expectElicitation: 'identify' }
  },
  {
    name: 'elicitation-silent-known-visitor',
    branch: 'simple',
    // 이미 식별된 방문자(developer) → turn-1이어도 침묵해야 한다.
    input: { query: '김동욱은 어떤 개발자야?', visitorType: 'developer' },
    assertions: { expectElicitation: null }
  },
  {
    name: 'elicitation-silent-turn2',
    branch: 'multi-turn',
    // turn-2 (직전 대화쌍 존재) → 침묵해야 한다.
    input: { query: 'cogni는 뭐야?', history: multiTurnHistory },
    assertions: { expectElicitation: null }
  }
]
