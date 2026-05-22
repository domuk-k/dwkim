/**
 * Elicitation protocol — schema-first SSOT (leaf module).
 *
 * 에이전트가 스트림에 흘리는 구조화된 질문(클릭 가능한 옵션).
 * prose가 아니라 사용자에게 입력을 *요청*하는 HITL 패턴 — MCP elicitation /
 * Mastra suspend-resume와 같은 계열. 기존 clarification/escalation/followup
 * 이벤트 패밀리에 합류하되, 이쪽만 리치 페이로드를 가진다.
 *
 * Zod schema가 SSOT: 타입은 z.infer로 파생하고, 경계(adapter·CLI parser)에서
 * .parse()로 검증해 5개 wiring 지점의 drift를 막는다.
 *
 * 핵심: `value ≠ label`
 * - label = 사람이 보는 글자
 * - value = visitorType 식별자 + framing 입력
 * clarification/followup(평평한 string[])을 재사용 못 하는 이유.
 */

import { z } from 'zod'

export const elicitationIntentSchema = z.enum(['identify', 'guide', 'convert'])

export const elicitationOptionSchema = z.object({
  value: z.string(),
  label: z.string()
})

export const elicitationSchema = z.object({
  type: z.literal('elicitation'),
  intent: elicitationIntentSchema,
  prompt: z.string(),
  options: z.array(elicitationOptionSchema),
  skippable: z.boolean()
})

export type ElicitationIntent = z.infer<typeof elicitationIntentSchema>
export type ElicitationOption = z.infer<typeof elicitationOptionSchema>
export type Elicitation = z.infer<typeof elicitationSchema>
