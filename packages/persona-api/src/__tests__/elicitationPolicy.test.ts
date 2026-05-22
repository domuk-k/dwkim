/**
 * Elicitation policy 단위 테스트 (rule-held initiative — ADR-0003 Rung 1)
 *
 * 테스트 범위 (Slice 1, domuk-k/dwkim#27):
 * - turn-1 미식별 방문자 → identify elicitation
 * - visitorType 이미 있음 → null (재질문 안 함)
 * - 페이로드가 SSOT 스키마(elicitationSchema)를 통과한다
 *
 * 순수 함수 — LLM 없음.
 */

import { elicitationSchema } from '../services/elicitation'
import { decideElicitation } from '../services/elicitationPolicy'
import type { VisitorContext } from '../services/visitor'

describe('decideElicitation — elicitation policy', () => {
  describe('identify elicitation', () => {
    it('turn-1 미식별 방문자에게 identify elicitation을 emit한다', () => {
      const ctx: VisitorContext = { type: undefined, interests: [], isReturning: false }

      const result = decideElicitation(ctx, 1, '안녕하세요')

      expect(result).not.toBeNull()
      expect(result?.intent).toBe('identify')
      expect(result?.skippable).toBe(true)
      expect(result?.options.length).toBeGreaterThan(0)
      // 핵심: value ≠ label (label은 사람, value는 visitorType 식별자)
      expect(result?.options.some((o) => o.value !== o.label)).toBe(true)
    })

    it('emit하는 페이로드가 SSOT 스키마를 통과한다', () => {
      const ctx: VisitorContext = { type: undefined, interests: [], isReturning: false }

      const result = decideElicitation(ctx, 1, '안녕하세요')

      // schema-first: 경계에서 .parse() 검증이 가능함을 증명
      expect(() => elicitationSchema.parse(result)).not.toThrow()
    })

    it('visitorType이 이미 있으면 재질문하지 않고 null을 반환한다', () => {
      const ctx: VisitorContext = { type: 'recruiter', interests: [], isReturning: true }

      expect(decideElicitation(ctx, 1, '안녕하세요')).toBeNull()
    })

    it('turn-1이 아니면(미식별이어도) identify elicitation을 emit하지 않는다', () => {
      const ctx: VisitorContext = { type: undefined, interests: [], isReturning: true }

      expect(decideElicitation(ctx, 3, '경력이 어떻게 돼?')).toBeNull()
    })
  })
})
