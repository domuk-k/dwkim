/**
 * QueryRewriter 단위 테스트
 *
 * 테스트 범위:
 * - 대명사 치환 (직접 매핑)
 * - 문맥 기반 대명사 해석
 * - 접속사 오탐 방지 (그러나, 그래서 등)
 * - 짧은 쿼리 확장
 * - 모호한 쿼리 감지
 */

import type { ChatMessage } from '../services/llmService'
import { QueryRewriter } from '../services/queryRewriter'

describe('QueryRewriter', () => {
  let rewriter: QueryRewriter

  beforeEach(() => {
    rewriter = new QueryRewriter()
  })

  describe('rewrite - 대명사 치환', () => {
    it('should replace "그가" with "김동욱이"', () => {
      const result = rewriter.rewrite('그가 어디서 일해?')
      expect(result.rewritten).toContain('김동욱이')
      expect(result.method).toBe('rule')
      // changes는 여러 치환을 하나의 문자열로 합침
      expect(result.changes.some((c) => c.includes('그가 → 김동욱이'))).toBe(true)
    })

    it('should replace "그는" with "김동욱은"', () => {
      const result = rewriter.rewrite('그는 무엇을 공부했지?')
      expect(result.rewritten).toContain('김동욱은')
    })

    it('should replace "그의" with "김동욱의"', () => {
      const result = rewriter.rewrite('그의 기술 스택은?')
      expect(result.rewritten).toContain('김동욱의')
    })

    it('should replace multiple pronouns', () => {
      const result = rewriter.rewrite('그가 만들었고 그의 프로젝트야')
      expect(result.rewritten).toContain('김동욱이')
      expect(result.rewritten).toContain('김동욱의')
    })

    it('should NOT double-replace "김동욱은" to "김김동욱은"', () => {
      const result = rewriter.rewrite('김동욱은 어떤 회사에 재직 중인가요?')
      expect(result.rewritten).toContain('김동욱은')
      expect(result.rewritten).not.toContain('김김동욱은')
    })

    it('should replace standalone "동욱은" but not when preceded by "김"', () => {
      const result = rewriter.rewrite('동욱은 무엇을 했지?')
      expect(result.rewritten).toContain('김동욱은')
      expect(result.rewritten).not.toContain('김김동욱은')
    })
  })

  describe('rewrite - 접속사 오탐 방지', () => {
    it('should NOT replace "그러나" (conjunction)', () => {
      const history: ChatMessage[] = [{ role: 'user', content: '김동욱에 대해 알려줘' }]
      const result = rewriter.rewrite('그러나 AI가 더 좋아', history)
      expect(result.rewritten).toContain('그러나')
      expect(result.rewritten).not.toContain('김동욱러나')
    })

    it('should NOT replace "그래서" (conjunction)', () => {
      const history: ChatMessage[] = [{ role: 'user', content: '김동욱에 대해 알려줘' }]
      const result = rewriter.rewrite('그래서 뭘 했지?', history)
      expect(result.rewritten).toContain('그래서')
    })

    it('should NOT replace "그리고" (conjunction)', () => {
      const history: ChatMessage[] = [{ role: 'user', content: '김동욱에 대해 알려줘' }]
      const result = rewriter.rewrite('그리고 또 뭐 있어?', history)
      expect(result.rewritten).toContain('그리고')
    })

    it('should NOT replace "그렇게" (adverb)', () => {
      const history: ChatMessage[] = [{ role: 'user', content: '김동욱에 대해 알려줘' }]
      const result = rewriter.rewrite('그렇게 했어?', history)
      expect(result.rewritten).toContain('그렇게')
    })

    it('should NOT replace "그런데" (conjunction)', () => {
      const history: ChatMessage[] = [{ role: 'user', content: '김동욱에 대해 알려줘' }]
      const result = rewriter.rewrite('그런데 경력은?', history)
      expect(result.rewritten).toContain('그런데')
    })
  })

  describe('rewrite - 문맥 기반 대명사 해석', () => {
    it('should replace standalone "그" when context mentions 김동욱', () => {
      const history: ChatMessage[] = [{ role: 'user', content: '김동욱에 대해 알려줘' }]
      const result = rewriter.rewrite('그를 만나려면?', history)
      expect(result.rewritten).toContain('김동욱')
    })

    it('should NOT replace "그" when no context about 김동욱', () => {
      const history: ChatMessage[] = [{ role: 'user', content: '날씨가 좋네' }]
      const result = rewriter.rewrite('그 사람은 누구?', history)
      // 문맥에 김동욱 언급이 없으면 치환하지 않음 (기본 맥락만 추가)
      expect(result.changes).not.toContain('문맥 대명사')
    })
  })

  describe('rewrite - 짧은 쿼리 확장', () => {
    it('should expand short query "경력"', () => {
      const result = rewriter.rewrite('경력')
      expect(result.rewritten).toContain('김동욱')
      expect(result.rewritten).toContain('직장')
      expect(result.changes).toContain('짧은 쿼리 확장')
    })

    it('should expand short query "학력"', () => {
      const result = rewriter.rewrite('학력')
      expect(result.rewritten).toContain('김동욱')
      expect(result.rewritten).toContain('대학')
    })

    it('should expand short query "기술"', () => {
      const result = rewriter.rewrite('기술')
      expect(result.rewritten).toContain('김동욱')
      expect(result.rewritten).toContain('스택')
    })

    it('should add default context to unrecognized short query', () => {
      const result = rewriter.rewrite('뭐해')
      expect(result.rewritten).toContain('김동욱')
    })
  })

  describe('rewrite - 기본 맥락 추가', () => {
    it('should add 김동욱 context when not mentioned', () => {
      const result = rewriter.rewrite('어디서 일해?')
      expect(result.rewritten).toContain('김동욱')
      expect(result.changes).toContain('기본 맥락 추가')
    })

    it('should NOT add context when 김동욱 is already mentioned', () => {
      const result = rewriter.rewrite('김동욱이 어디서 일해?')
      expect(result.changes).not.toContain('기본 맥락 추가')
    })
  })

  describe('isAmbiguous - 모호한 쿼리 감지 (길이 기반)', () => {
    // 한글: 3자 미만이면 ambiguous
    // 영어: 5자 미만이면 ambiguous
    // 시맨틱 패턴 감지는 SEU (ragEngine)로 이관됨

    it('should detect very short Korean queries as ambiguous (< 3 chars)', () => {
      expect(rewriter.isAmbiguous('뭐')).toBe(true) // 1자
      expect(rewriter.isAmbiguous('응')).toBe(true) // 1자
      expect(rewriter.isAmbiguous('왜')).toBe(true) // 1자
      expect(rewriter.isAmbiguous('뭐?')).toBe(true) // 2자
    })

    it('should NOT mark Korean queries >= 3 chars as ambiguous (if no pattern match)', () => {
      // 길이 >= 3 이고, 모호한 패턴에도 매칭되지 않으면 NOT ambiguous
      expect(rewriter.isAmbiguous('뭐 했어')).toBe(false) // 4자, 패턴 미매칭
      expect(rewriter.isAmbiguous('지금 뭐해요')).toBe(false) // 구체적 질문
    })

    it('should mark pattern-matched queries as ambiguous (even if >= 3 chars)', () => {
      // 패턴 매칭: 짧은 주어 + 조사, 단일 명사
      expect(rewriter.isAmbiguous('경력은?')).toBe(true) // 짧은 주어 + 조사 패턴
      expect(rewriter.isAmbiguous('경력')).toBe(true) // 단일 명사 패턴
      expect(rewriter.isAmbiguous('기술?')).toBe(true) // 단일 명사 패턴
    })

    it('should detect very short English queries as ambiguous (< 5 chars)', () => {
      expect(rewriter.isAmbiguous('hi')).toBe(true) // 2자
      expect(rewriter.isAmbiguous('what')).toBe(true) // 4자
    })

    it('should NOT mark English queries >= 5 chars as ambiguous', () => {
      expect(rewriter.isAmbiguous('hello')).toBe(false) // 5자
      expect(rewriter.isAmbiguous('skills?')).toBe(false) // 7자
    })

    it('should NOT mark specific questions as ambiguous', () => {
      expect(rewriter.isAmbiguous('김동욱이 어디서 일하나요?')).toBe(false)
      expect(rewriter.isAmbiguous('기술 스택이 뭐야?')).toBe(false)
    })
  })

  describe('rewrite - 변경 없는 경우', () => {
    it('should return original query when no changes needed', () => {
      // "김동욱"을 포함하되 "동욱이/동욱은/동욱의" 패턴 없이
      // (PRONOUN_MAP의 "동욱이" → "김동욱이" 치환 피하기)
      const result = rewriter.rewrite('김동욱 씨가 만든 프로젝트는 무엇인가요?')
      expect(result.original).toBe('김동욱 씨가 만든 프로젝트는 무엇인가요?')
      expect(result.method).toBe('none')
      expect(result.changes).toHaveLength(0)
    })
  })
})
