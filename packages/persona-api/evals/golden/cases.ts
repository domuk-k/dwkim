/**
 * Golden cases. For the walking skeleton (slice domuk-k/dwkim#19) this holds ONE
 * real persona question, with a minimal shape. The full branch-tagged schema +
 * Langfuse-mined dataset arrives in slice domuk-k/dwkim#22.
 */

import type { AgentInput } from '../adapters/runAgent'

/** Which pipeline branch a case exercises — selects scorers later (#22). */
export type Branch = 'simple' | 'contact-intent' | 'factual-persona' | 'out-of-scope' | 'multi-turn'

export interface GoldenCase {
  name: string
  branch: Branch
  input: AgentInput
}

export const skeletonCases: GoldenCase[] = [
  {
    name: 'tech-stack',
    branch: 'factual-persona',
    input: { query: '김동욱은 어떤 기술 스택을 주로 쓰나요?' }
  }
]
