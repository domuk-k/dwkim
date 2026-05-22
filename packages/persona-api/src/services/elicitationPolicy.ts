/**
 * Elicitation policy — 언제/무엇을 물을지 결정하는 규칙 (ADR-0003 Rung 1: code-held initiative).
 *
 * 순수 함수, LLM 없음. `null` (침묵)이 기본이자 흔한 경우 — 기본은 그냥 답한다.
 * 프레임워크(Mastra suspend)도 *언제 물을지*는 정해주지 않는다 — 그 판단이 여기 산다.
 */

import type { Elicitation } from './elicitation'
import type { VisitorContext } from './visitor'

const IDENTIFY_ELICITATION: Elicitation = {
  type: 'elicitation',
  intent: 'identify',
  prompt: '어떤 맥락에서 오셨어요?',
  options: [
    { value: 'developer', label: '개발자예요' },
    { value: 'recruiter', label: '채용 관련이에요' },
    { value: 'browsing', label: '그냥 구경 중이에요' },
    { value: 'undisclosed', label: '안 밝힐게요' }
  ],
  skippable: true
}

/**
 * 이번 턴에 elicitation을 emit할지 결정한다.
 * @returns Elicitation(물어볼 때) | null(침묵 — 기본)
 */
export function decideElicitation(
  ctx: VisitorContext,
  turn: number,
  _lastQuery: string
): Elicitation | null {
  // turn-1 미식별 방문자 → identify elicitation
  if (turn === 1 && !ctx.type) {
    return IDENTIFY_ELICITATION
  }
  return null
}
