/**
 * Query Rewriter for RAG
 *
 * 짧거나 모호한 쿼리를 검색에 최적화된 형태로 변환
 * - Rule-based: 대명사 치환, 키워드 확장 (빠름, 무료)
 * - LLM-based: 복잡한 쿼리 분해 (옵션, 추후 확장)
 *
 * @see https://www.anthropic.com/news/contextual-retrieval
 * @see https://shekhargulati.com/2024/07/17/query-rewriting-in-rag-applications/
 */

import {
  detectLanguage,
  getLanguageInstruction,
  type SupportedLanguage
} from '../utils/languageDetector'
import { utilityLLM } from './llmInstances'
import type { ChatMessage } from './llmService'

export interface RewriteResult {
  original: string
  rewritten: string
  method: 'rule' | 'llm' | 'none'
  changes: string[]
  /** 모호한 쿼리로 명확화 필요 시 true */
  needsClarification?: boolean
  /** 추천 질문 (needsClarification=true일 때) */
  suggestedQuestions?: string[]
}

// 대명사 → 김동욱 매핑
const PRONOUN_MAP: Record<string, string> = {
  그가: '김동욱이',
  그는: '김동욱은',
  그를: '김동욱을',
  그의: '김동욱의',
  그에게: '김동욱에게',
  동욱이: '김동욱이',
  동욱은: '김동욱은',
  동욱의: '김동욱의'
}

// 단독 대명사 (문맥 필요)
const STANDALONE_PRONOUNS = ['그', '동욱']

// 대명사로 오인되기 쉬운 접속사/부사 (negative lookahead용)
const PRONOUN_EXCEPTIONS = ['러나', '래서', '리고', '런데', '렇게', '러면', '래도', '러므로']

// 짧은 쿼리 확장 키워드
const EXPANSION_KEYWORDS: Record<string, string[]> = {
  경력: ['김동욱', '직장', '회사', '경험', '이력'],
  이력: ['김동욱', '경력', '커리어', '직장'],
  커리어: ['김동욱', '경력', '이력', '성장'],
  학력: ['김동욱', '대학', '전공', '교육'],
  기술: ['김동욱', '스택', '언어', '프레임워크'],
  스택: ['김동욱', '기술', '언어', '도구'],
  프로젝트: ['김동욱', '개발', '작업', '성과'],
  연락처: ['김동욱', '이메일', 'GitHub', 'LinkedIn'],
  회사: ['김동욱', '직장', '근무', '경력'],
  직장: ['김동욱', '회사', '근무', '경력']
}

// 모호함 감지: SEU (Semantic Embedding Uncertainty) 기반으로 전환
// 기존 AMBIGUOUS_PATTERNS는 제거하고 길이 threshold만 유지
// @see ragEngine.ts - shouldAskClarification() with SEU

/**
 * 다국어 LLM 프롬프트 생성 함수들
 * 사용자 쿼리 언어에 맞춰 동적 생성
 */

/** SEU 분석 결과 (순환 의존성 방지를 위한 인라인 타입) */
interface SEUResultForSuggestion {
  uncertainty: number
  responses: string[]
}

/**
 * Disambiguation Menu 프롬프트 (SEU 분석 결과 포함)
 *
 * 핵심 패러다임: AI가 되묻는 게 아니라, 사용자가 선택할 대안 질문 제시
 * @see https://www.eedi.com/news/improved-human-ai-alignment-by-asking-smarter-clarifying-questions
 * @see https://www.smashingmagazine.com/2024/07/how-design-effective-conversational-ai-experiences-guide/
 */
function getSuggestionPromptWithSEU(
  lang: SupportedLanguage,
  seuResult?: SEUResultForSuggestion
): string {
  const langInstruction = getLanguageInstruction(lang)

  // SEU responses를 "가능한 의도/해석"으로 프레이밍
  const interpretationsSection = seuResult?.responses?.length
    ? `
## AI가 추론한 가능한 의도들
${seuResult.responses.map((r, i) => `${i + 1}. ${r}`).join('\n')}

위 해석들을 구분할 수 있는 질문을 생성하세요.
`
    : ''

  return `## 질문 재작성

사용자가 "${'{query}'}"라고 물었습니다. 모호해서 **사용자가 김동욱에게 물어볼 구체적인 질문 2개**로 바꿔주세요.
${interpretationsSection}
## 김동욱 정보
{context}

## 핵심 규칙
질문의 화자는 **사용자**입니다. 사용자가 김동욱에게 묻는 질문을 생성하세요.

## ❌ 잘못된 예시 (AI가 되묻는 형태 - 절대 금지)
- "모토에 대해 궁금해?" ← AI가 사용자에게 되묻는 것
- "어떤 거 알고 싶어?" ← AI가 사용자에게 되묻는 것
- "뭐가 궁금한 거야?" ← AI가 사용자에게 되묻는 것

## ✅ 올바른 예시 (사용자가 김동욱에게 묻는 형태)
- "잘뛰나" → ["러닝 얼마나 해?", "마라톤 기록 있어?"]
- "기술?" → ["주로 어떤 언어 써?", "좋아하는 프레임워크 뭐야?"]

## 형식
- 반말 의문문, 15자 이내
- ${langInstruction}
- JSON 배열로만: ["질문1", "질문2"]

질문:`
}

/**
 * 질문 재작성 프롬프트 (컨텍스트 없을 때 - 폴백)
 */
function getSuggestionPromptNoContext(lang: SupportedLanguage): string {
  const langInstruction = getLanguageInstruction(lang)
  return `## 질문 재작성

사용자가 "${'{query}'}"라고 물었습니다. 모호해서 **사용자가 김동욱에게 물어볼 구체적인 질문 2개**로 바꿔주세요.

## 핵심 규칙
질문의 화자는 **사용자**입니다. 사용자가 김동욱에게 묻는 질문을 생성하세요.

## ❌ 잘못된 예시 (AI가 되묻는 형태 - 절대 금지)
- "모토에 대해 궁금해?" ← AI가 사용자에게 되묻는 것
- "어떤 거 알고 싶어?" ← AI가 사용자에게 되묻는 것

## ✅ 올바른 예시 (사용자가 김동욱에게 묻는 형태)
- "기술?" → ["주로 어떤 언어 써?", "좋아하는 프레임워크 뭐야?"]

## 형식
- 반말 의문문, 15자 이내
- ${langInstruction}
- JSON 배열로만: ["질문1", "질문2"]

질문:`
}

// 폴백용 기본 추천 질문 (다국어)
const FALLBACK_SUGGESTIONS: Record<SupportedLanguage, string[]> = {
  ko: ['어디서 일해?', '어떤 기술 써?'],
  en: ['Where do you work?', 'What tech do you use?'],
  ja: ['どこで働いてる？', '何の技術使ってる？']
}

/**
 * LLM 응답에서 JSON 문자열 배열 파싱
 * @returns 파싱된 배열 또는 null (실패 시)
 */
function parseJsonStringArray(content: string, maxItems = 2): string[] | null {
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((item): item is string => typeof item === 'string')
    ) {
      return parsed.slice(0, maxItems)
    }
  } catch {
    // JSON 파싱 실패 - null 반환
  }

  return null
}

// HITL: 팔로업 질문 생성 프롬프트
function getFollowupPrompt(lang: SupportedLanguage): string {
  const langInstruction = getLanguageInstruction(lang)
  return `You are a helpful assistant that develops conversations about Kim Dongwook.

Based on the user's question and related documents, suggest 2 follow-up questions the user might naturally ask after seeing the answer.

## Related Documents
{context}

## User Question
{query}

## Rules
- Don't repeat already answered content
- Develop new keywords/topics mentioned in the answer
- Avoid generic phrases like "tell me more"
- Each question should be concise (one sentence)
- Questions should be answerable from documents
- ${langInstruction}
- Respond ONLY with a JSON array (e.g., ["question1", "question2"])

Follow-up questions:`
}

export class QueryRewriter {
  // utilityLLM은 llmInstances에서 공유 인스턴스 사용

  /**
   * 모호한 쿼리인지 확인 (길이 기반만)
   *
   * 한글은 정보 밀도가 높아 3자, 영어는 5자 threshold 적용
   * 한글 1자 ≈ 영어 0.5-0.7 단어
   *
   * 시맨틱 모호함은 SEU (Semantic Embedding Uncertainty)로 감지
   * @see ragEngine.ts - shouldAskClarification()
   */
  isAmbiguous(query: string): boolean {
    const trimmed = query.trim()

    // 1. 길이 기반 체크
    const hasKorean = /[\uAC00-\uD7AF]/.test(trimmed)
    const threshold = hasKorean ? 3 : 5
    if (trimmed.length < threshold) {
      return true
    }

    // 2. 모호한 패턴 체크
    const ambiguousPatterns = [
      // 단일 의문사 (한국어)
      /^(뭐|어떻게|왜|언제|어디|누구)[?？]?$/,
      // 단일 의문사 (영어)
      /^(tell me|what|how|why|when|where|who)[?]?$/i,
      // 짧은 주어만 (한국어) - 예: "그는?", "기술?"
      /^.{1,4}(은|는|이|가|을|를)[?？]?$/,
      // 단일 명사 (김동욱 관련 키워드만)
      /^(경력|이력|기술|스택|회사|직장|프로젝트|학력)[?？]?$/
    ]

    return ambiguousPatterns.some((p) => p.test(trimmed))
  }

  /**
   * LLM 기반 추천 질문 생성
   * @param query 사용자 쿼리
   * @param context 검색된 문서 컨텍스트 (있으면 더 의미있는 질문 생성)
   * @param seuResult SEU 분석 결과 (있으면 AI 해석을 참고하여 더 구체적인 질문 생성)
   */
  async generateSuggestedQuestions(
    query: string,
    context?: string,
    seuResult?: SEUResultForSuggestion
  ): Promise<string[]> {
    const lang = detectLanguage(query)

    try {
      const prompt = context
        ? getSuggestionPromptWithSEU(lang, seuResult)
            .replace('{context}', context.slice(0, 1500))
            .replace('{query}', query)
        : getSuggestionPromptNoContext(lang).replace('{query}', query)

      const messages: ChatMessage[] = [{ role: 'user', content: prompt }]
      const response = await utilityLLM.chat(messages, '')

      const parsed = parseJsonStringArray(response.content.trim())
      return parsed ?? FALLBACK_SUGGESTIONS[lang]
    } catch (error) {
      console.warn('Failed to generate LLM suggestions, using fallback:', error)
      return FALLBACK_SUGGESTIONS[lang]
    }
  }

  /**
   * 쿼리 재작성 메인 함수 (동기 - 규칙 기반만)
   */
  rewrite(query: string, history: ChatMessage[] = []): RewriteResult {
    const changes: string[] = []
    let rewritten = query

    // 1. 대명사 치환 (직접 매핑)
    const pronounResult = this.replacePronounsDirectly(rewritten)
    if (pronounResult.changed) {
      rewritten = pronounResult.text
      changes.push(`대명사 치환: ${pronounResult.replaced.join(', ')}`)
    }

    // 2. 문맥 기반 대명사 해석 (이전 대화에서 김동욱 언급 시)
    if (this.hasStandalonePronouns(rewritten) && this.mentionsDwkim(history)) {
      const contextResult = this.replaceStandalonePronouns(rewritten)
      if (contextResult.changed) {
        rewritten = contextResult.text
        changes.push(`문맥 대명사: ${contextResult.replaced.join(', ')}`)
      }
    }

    // 3. 짧은 쿼리 확장 (5자 미만)
    if (query.trim().length < 5) {
      const expanded = this.expandShortQuery(rewritten)
      if (expanded !== rewritten) {
        rewritten = expanded
        changes.push('짧은 쿼리 확장')
      }
    }

    // 4. 기본 맥락 추가 (김동욱 언급 없으면)
    if (!rewritten.includes('김동욱') && !rewritten.includes('동욱')) {
      rewritten = `김동욱 ${rewritten}`
      changes.push('기본 맥락 추가')
    }

    // 5. 모호한 쿼리 감지
    const isAmbiguousQuery = this.isAmbiguous(query)

    // 변경 없으면 원본 반환
    if (changes.length === 0 && !isAmbiguousQuery) {
      return {
        original: query,
        rewritten: query,
        method: 'none',
        changes: []
      }
    }

    return {
      original: query,
      rewritten: rewritten.trim(),
      method: 'rule',
      changes,
      needsClarification: isAmbiguousQuery
      // suggestedQuestions는 별도 async 호출로 생성
    }
  }

  /**
   * 쿼리 재작성 + LLM 추천 질문 (비동기)
   */
  async rewriteWithSuggestions(query: string, history: ChatMessage[] = []): Promise<RewriteResult> {
    const result = this.rewrite(query, history)

    // 모호한 쿼리면 LLM으로 추천 질문 생성
    if (result.needsClarification) {
      result.suggestedQuestions = await this.generateSuggestedQuestions(query)
    }

    return result
  }

  /**
   * HITL: 팔로업 질문 생성
   * 응답 완료 후 대화를 발전시킬 수 있는 질문 제안
   * @param query 사용자 쿼리
   * @param context 검색된 문서 컨텍스트
   */
  async generateFollowupQuestions(query: string, context: string): Promise<string[]> {
    const lang = detectLanguage(query)

    try {
      const prompt = getFollowupPrompt(lang)
        .replace('{context}', context.slice(0, 1500))
        .replace('{query}', query)

      const messages: ChatMessage[] = [{ role: 'user', content: prompt }]
      const response = await utilityLLM.chat(messages, '')

      return parseJsonStringArray(response.content.trim()) ?? []
    } catch (error) {
      console.warn('Failed to generate followup questions:', error)
      return []
    }
  }

  /**
   * 직접 매핑 대명사 치환
   * Note: "동욱" 패턴은 앞에 "김"이 없을 때만 치환 (김김동욱 방지)
   */
  private replacePronounsDirectly(text: string): {
    text: string
    changed: boolean
    replaced: string[]
  } {
    let result = text
    const replaced: string[] = []

    for (const [pronoun, replacement] of Object.entries(PRONOUN_MAP)) {
      // "동욱"으로 시작하는 패턴은 앞에 "김"이 없을 때만 치환
      const pattern = pronoun.startsWith('동욱')
        ? new RegExp(`(?<!김)${pronoun}`, 'g')
        : new RegExp(pronoun, 'g')

      if (pattern.test(result)) {
        // reset lastIndex after test
        pattern.lastIndex = 0
        result = result.replace(pattern, replacement)
        replaced.push(`${pronoun} → ${replacement}`)
      }
    }

    return {
      text: result,
      changed: replaced.length > 0,
      replaced
    }
  }

  /**
   * 단독 대명사 포함 여부
   * "그러나", "그래서" 등 접속사는 제외
   */
  private hasStandalonePronouns(text: string): boolean {
    return STANDALONE_PRONOUNS.some((p) => {
      if (p === '그') {
        // "그" 뒤에 접속사 패턴이 오면 제외 (그러나, 그래서 등)
        const exceptionPattern = PRONOUN_EXCEPTIONS.join('|')
        const regex = new RegExp(
          `(^|\\s)그(?!(${exceptionPattern}))($|\\s|[을를이가은는의에게])`,
          'g'
        )
        return regex.test(text)
      }
      // 동욱은 그대로 처리
      const regex = new RegExp(`(^|\\s)${p}($|\\s|[을를이가은는의에게])`, 'g')
      return regex.test(text)
    })
  }

  /**
   * 이전 대화에서 김동욱 언급 여부
   */
  private mentionsDwkim(history: ChatMessage[]): boolean {
    const recentMessages = history.slice(-5)
    return recentMessages.some(
      (msg) =>
        msg.content.includes('김동욱') ||
        msg.content.includes('동욱') ||
        msg.content.includes('dwkim')
    )
  }

  /**
   * 단독 대명사를 김동욱으로 치환
   * "그러나", "그래서" 등 접속사는 치환하지 않음
   */
  private replaceStandalonePronouns(text: string): {
    text: string
    changed: boolean
    replaced: string[]
  } {
    let result = text
    const replaced: string[] = []

    // "그"를 "김동욱"으로 (문장 시작 또는 공백 뒤)
    // negative lookahead로 접속사 패턴 제외
    const exceptionPattern = PRONOUN_EXCEPTIONS.join('|')
    const pronounRegex = new RegExp(`(^|\\s)그(?!(${exceptionPattern}))(?=\\s|$|[을를])`, 'g')

    if (pronounRegex.test(result)) {
      // reset lastIndex after test
      pronounRegex.lastIndex = 0
      result = result.replace(pronounRegex, (match) => match.replace('그', '김동욱'))
      replaced.push('그 → 김동욱')
    }

    return {
      text: result,
      changed: replaced.length > 0,
      replaced
    }
  }

  /**
   * 짧은 쿼리 확장
   */
  private expandShortQuery(query: string): string {
    const trimmed = query.trim()

    // 키워드 매칭 확장
    for (const [keyword, expansions] of Object.entries(EXPANSION_KEYWORDS)) {
      if (trimmed.includes(keyword)) {
        return [...new Set([trimmed, ...expansions])].join(' ')
      }
    }

    // 매칭 없으면 김동욱 + 원본
    return `김동욱 ${trimmed}`
  }
}

// 싱글톤 인스턴스
let queryRewriter: QueryRewriter | null = null

export function getQueryRewriter(): QueryRewriter {
  if (!queryRewriter) {
    queryRewriter = new QueryRewriter()
  }
  return queryRewriter
}
