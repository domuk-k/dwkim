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

import type { ChatMessage } from './llmService';
import { LLMService } from './llmService';

export interface RewriteResult {
  original: string;
  rewritten: string;
  method: 'rule' | 'llm' | 'none';
  changes: string[];
  /** 모호한 쿼리로 명확화 필요 시 true */
  needsClarification?: boolean;
  /** 추천 질문 (needsClarification=true일 때) */
  suggestedQuestions?: string[];
}

// 대명사 → 김동욱 매핑
const PRONOUN_MAP: Record<string, string> = {
  '그가': '김동욱이',
  '그는': '김동욱은',
  '그를': '김동욱을',
  '그의': '김동욱의',
  '그에게': '김동욱에게',
  '동욱이': '김동욱이',
  '동욱은': '김동욱은',
  '동욱의': '김동욱의',
};

// 단독 대명사 (문맥 필요)
const STANDALONE_PRONOUNS = ['그', '동욱'];

// 대명사로 오인되기 쉬운 접속사/부사 (negative lookahead용)
const PRONOUN_EXCEPTIONS = ['러나', '래서', '리고', '런데', '렇게', '러면', '래도', '러므로'];

// 짧은 쿼리 확장 키워드
const EXPANSION_KEYWORDS: Record<string, string[]> = {
  '경력': ['김동욱', '직장', '회사', '경험'],
  '학력': ['김동욱', '대학', '전공', '교육'],
  '기술': ['김동욱', '스택', '언어', '프레임워크'],
  '프로젝트': ['김동욱', '개발', '작업', '성과'],
  '연락처': ['김동욱', '이메일', 'GitHub', 'LinkedIn'],
};

// 모호함 감지: SEU (Semantic Embedding Uncertainty) 기반으로 전환
// 기존 AMBIGUOUS_PATTERNS는 제거하고 길이 threshold만 유지
// @see ragEngine.ts - shouldAskClarification() with SEU

// LLM 기반 추천 질문 생성 프롬프트
const SUGGESTION_PROMPT = `당신은 김동욱에 대한 질문을 추천하는 도우미입니다.

사용자의 모호한 질문을 보고, 김동욱에 대해 더 구체적으로 물어볼 수 있는 질문 2개를 추천해주세요.

규칙:
- 각 질문은 한 문장으로 간결하게
- "김동욱"을 주어로 사용
- 실제로 답변 가능한 구체적인 질문으로
- JSON 배열 형식으로만 응답 (예: ["질문1", "질문2"])

사용자 질문: {query}

추천 질문:`;

// 폴백용 기본 추천 질문
const FALLBACK_SUGGESTIONS = [
  '김동욱이 현재 어떤 회사에서 일하나요?',
  '김동욱의 주요 기술 스택은 무엇인가요?',
];

export class QueryRewriter {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

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
    const trimmed = query.trim();

    // 한글 포함 여부에 따라 threshold 조정
    const hasKorean = /[\uAC00-\uD7AF]/.test(trimmed);
    const threshold = hasKorean ? 3 : 5;

    // 길이 threshold만 적용 (패턴 매칭 제거)
    return trimmed.length < threshold;
  }

  /**
   * LLM 기반 추천 질문 생성
   */
  async generateSuggestedQuestions(query: string): Promise<string[]> {
    try {
      const prompt = SUGGESTION_PROMPT.replace('{query}', query);
      const messages: ChatMessage[] = [
        { role: 'user', content: prompt },
      ];

      // 빠른 응답을 위해 짧은 context 사용
      const response = await this.llmService.chat(messages, '');

      // JSON 배열 파싱 시도
      const content = response.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          // 배열이고 모든 요소가 문자열인지 검증
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((item): item is string => typeof item === 'string')
          ) {
            return parsed.slice(0, 2);
          }
        } catch (parseError) {
          console.warn('Failed to parse LLM suggestion JSON:', parseError);
        }
      }

      // 파싱 실패 시 폴백
      return FALLBACK_SUGGESTIONS;
    } catch (error) {
      console.warn('Failed to generate LLM suggestions, using fallback:', error);
      return FALLBACK_SUGGESTIONS;
    }
  }

  /**
   * 쿼리 재작성 메인 함수 (동기 - 규칙 기반만)
   */
  rewrite(query: string, history: ChatMessage[] = []): RewriteResult {
    const changes: string[] = [];
    let rewritten = query;

    // 1. 대명사 치환 (직접 매핑)
    const pronounResult = this.replacePronounsDirectly(rewritten);
    if (pronounResult.changed) {
      rewritten = pronounResult.text;
      changes.push(`대명사 치환: ${pronounResult.replaced.join(', ')}`);
    }

    // 2. 문맥 기반 대명사 해석 (이전 대화에서 김동욱 언급 시)
    if (this.hasStandalonePronouns(rewritten) && this.mentionsDwkim(history)) {
      const contextResult = this.replaceStandalonePronouns(rewritten);
      if (contextResult.changed) {
        rewritten = contextResult.text;
        changes.push(`문맥 대명사: ${contextResult.replaced.join(', ')}`);
      }
    }

    // 3. 짧은 쿼리 확장 (5자 미만)
    if (query.trim().length < 5) {
      const expanded = this.expandShortQuery(rewritten);
      if (expanded !== rewritten) {
        rewritten = expanded;
        changes.push('짧은 쿼리 확장');
      }
    }

    // 4. 기본 맥락 추가 (김동욱 언급 없으면)
    if (!rewritten.includes('김동욱') && !rewritten.includes('동욱')) {
      rewritten = `김동욱 ${rewritten}`;
      changes.push('기본 맥락 추가');
    }

    // 5. 모호한 쿼리 감지
    const isAmbiguousQuery = this.isAmbiguous(query);

    // 변경 없으면 원본 반환
    if (changes.length === 0 && !isAmbiguousQuery) {
      return {
        original: query,
        rewritten: query,
        method: 'none',
        changes: [],
      };
    }

    return {
      original: query,
      rewritten: rewritten.trim(),
      method: 'rule',
      changes,
      needsClarification: isAmbiguousQuery,
      // suggestedQuestions는 별도 async 호출로 생성
    };
  }

  /**
   * 쿼리 재작성 + LLM 추천 질문 (비동기)
   */
  async rewriteWithSuggestions(
    query: string,
    history: ChatMessage[] = []
  ): Promise<RewriteResult> {
    const result = this.rewrite(query, history);

    // 모호한 쿼리면 LLM으로 추천 질문 생성
    if (result.needsClarification) {
      result.suggestedQuestions = await this.generateSuggestedQuestions(query);
    }

    return result;
  }

  /**
   * 직접 매핑 대명사 치환
   */
  private replacePronounsDirectly(text: string): {
    text: string;
    changed: boolean;
    replaced: string[];
  } {
    let result = text;
    const replaced: string[] = [];

    for (const [pronoun, replacement] of Object.entries(PRONOUN_MAP)) {
      if (result.includes(pronoun)) {
        result = result.replace(new RegExp(pronoun, 'g'), replacement);
        replaced.push(`${pronoun} → ${replacement}`);
      }
    }

    return {
      text: result,
      changed: replaced.length > 0,
      replaced,
    };
  }

  /**
   * 단독 대명사 포함 여부
   * "그러나", "그래서" 등 접속사는 제외
   */
  private hasStandalonePronouns(text: string): boolean {
    return STANDALONE_PRONOUNS.some((p) => {
      if (p === '그') {
        // "그" 뒤에 접속사 패턴이 오면 제외 (그러나, 그래서 등)
        const exceptionPattern = PRONOUN_EXCEPTIONS.join('|');
        const regex = new RegExp(`(^|\\s)그(?!(${exceptionPattern}))($|\\s|[을를이가은는의에게])`, 'g');
        return regex.test(text);
      }
      // 동욱은 그대로 처리
      const regex = new RegExp(`(^|\\s)${p}($|\\s|[을를이가은는의에게])`, 'g');
      return regex.test(text);
    });
  }

  /**
   * 이전 대화에서 김동욱 언급 여부
   */
  private mentionsDwkim(history: ChatMessage[]): boolean {
    const recentMessages = history.slice(-5);
    return recentMessages.some(
      (msg) =>
        msg.content.includes('김동욱') ||
        msg.content.includes('동욱') ||
        msg.content.includes('dwkim')
    );
  }

  /**
   * 단독 대명사를 김동욱으로 치환
   * "그러나", "그래서" 등 접속사는 치환하지 않음
   */
  private replaceStandalonePronouns(text: string): {
    text: string;
    changed: boolean;
    replaced: string[];
  } {
    let result = text;
    const replaced: string[] = [];

    // "그"를 "김동욱"으로 (문장 시작 또는 공백 뒤)
    // negative lookahead로 접속사 패턴 제외
    const exceptionPattern = PRONOUN_EXCEPTIONS.join('|');
    const pronounRegex = new RegExp(`(^|\\s)그(?!(${exceptionPattern}))(?=\\s|$|[을를])`, 'g');

    if (pronounRegex.test(result)) {
      // reset lastIndex after test
      pronounRegex.lastIndex = 0;
      result = result.replace(pronounRegex, (match) =>
        match.replace('그', '김동욱')
      );
      replaced.push('그 → 김동욱');
    }

    return {
      text: result,
      changed: replaced.length > 0,
      replaced,
    };
  }

  /**
   * 짧은 쿼리 확장
   */
  private expandShortQuery(query: string): string {
    const trimmed = query.trim();

    // 키워드 매칭 확장
    for (const [keyword, expansions] of Object.entries(EXPANSION_KEYWORDS)) {
      if (trimmed.includes(keyword)) {
        return [...new Set([trimmed, ...expansions])].join(' ');
      }
    }

    // 매칭 없으면 김동욱 + 원본
    return `김동욱 ${trimmed}`;
  }
}

// 싱글톤 인스턴스
let queryRewriter: QueryRewriter | null = null;

export function getQueryRewriter(): QueryRewriter {
  if (!queryRewriter) {
    queryRewriter = new QueryRewriter();
  }
  return queryRewriter;
}
