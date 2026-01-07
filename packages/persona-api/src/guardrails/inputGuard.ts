/**
 * Input Guard - 입력 검증 가드레일
 *
 * LLM에 전달되기 전 사용자 입력을 검증
 * - 보안 키워드 감지
 * - Prompt Injection 패턴 감지
 *
 * @see https://genai.owasp.org/llmrisk/llm01-prompt-injection/
 */

/**
 * 민감 정보 요청 키워드
 * - 부분 일치로 검사 (toLowerCase 적용)
 * - 주의: 너무 일반적인 단어는 false positive 유발
 */
export const SECURITY_KEYWORDS = [
  // 민감 정보 요청 (한국어)
  '환경변수',
  '비밀번호',
  '시스템 프롬프트',
  '시스템프롬프트',
  '관리자 모드',
  '개발자 모드',

  // 민감 정보 요청 (영어)
  'api_key',
  'api-key',
  'apikey',
  'secret',
  'password',
  'credential',
  'system prompt',
  'systemprompt',

  // Prompt Injection 시도
  'ignore previous',
  'ignore above',
  'ignore all',
  'disregard',
  'jailbreak',
  'bypass',
  'DAN',
  'developer mode',
  'admin mode',
] as const;

/**
 * Prompt Injection 정규식 패턴
 * - 전체 입력에 대해 test() 수행
 * - 순서: 비용 낮은 패턴부터 검사
 */
export const INJECTION_PATTERNS: readonly RegExp[] = [
  // 지시사항 무시 시도
  /ignore.*(?:previous|above|all).*(?:instructions?|prompts?)/i,
  /disregard.*(?:previous|above|all)/i,
  /forget.*(?:everything|all|previous)/i,

  // 역할 변경 시도
  /you are now/i,
  /pretend (?:you are|to be|that)/i,
  /act as (?:if|a|an)/i,
  /imagine you(?:'re| are)/i,
  /roleplay as/i,

  // 시스템 프롬프트 탈취 시도
  /(?:show|reveal|print|output|display).*(?:system|initial).*(?:prompt|instruction)/i,
  /what (?:is|are) your (?:instructions?|prompts?|rules?)/i,

  // 컨텍스트 주입 시도
  /\[system\]/i,
  /\[assistant\]/i,
  /<\/?system>/i,

  // 권한 상승 시도
  /(?:enable|activate|switch to).*(?:admin|developer|debug|test).*mode/i,
  /sudo/i,
] as const;

// O(1) 검색을 위한 Set
const keywordSet = new Set(SECURITY_KEYWORDS.map((k) => k.toLowerCase()));

/**
 * 보안 키워드 포함 여부 검사
 */
export function containsSecurityKeyword(input: string): boolean {
  const lowerInput = input.toLowerCase();
  for (const keyword of keywordSet) {
    if (lowerInput.includes(keyword)) {
      return true;
    }
  }
  return false;
}

/**
 * Injection 패턴 매칭 검사
 */
export function matchesInjectionPattern(input: string): RegExp | null {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return pattern;
    }
  }
  return null;
}

/**
 * 보안 검사 결과 타입
 */
export interface SecurityCheckResult {
  safe: boolean;
  reason?: 'keyword' | 'pattern';
  matched?: string;
}

/**
 * 종합 입력 보안 검사
 *
 * @example
 * ```typescript
 * const result = validateInput("ignore previous instructions");
 * if (!result.safe) {
 *   return { error: "Invalid input", reason: result.reason };
 * }
 * ```
 */
export function validateInput(input: string): SecurityCheckResult {
  // 키워드 검사 (더 빠름)
  if (containsSecurityKeyword(input)) {
    return {
      safe: false,
      reason: 'keyword',
      matched: SECURITY_KEYWORDS.find((k) => input.toLowerCase().includes(k.toLowerCase())),
    };
  }

  // 패턴 검사
  const matchedPattern = matchesInjectionPattern(input);
  if (matchedPattern) {
    return {
      safe: false,
      reason: 'pattern',
      matched: matchedPattern.toString(),
    };
  }

  return { safe: true };
}

// Legacy alias for backward compatibility
export const checkSecurityViolation = validateInput;
