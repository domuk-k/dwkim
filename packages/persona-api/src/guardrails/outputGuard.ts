/**
 * Output Guard - LLM 응답 필터링 가드레일
 *
 * LLM이 실수로 민감한 정보를 노출하는 것을 방지
 * - API 키 패턴 감지 및 마스킹
 * - 민감 키워드 패턴 감지
 *
 * @see https://arxiv.org/abs/2511.15759 - Multi-layered defense
 */

export interface FilterResult {
  /** 필터링이 적용되었는지 */
  filtered: boolean;
  /** 필터링 이유 */
  reason?: string;
  /** 필터링된 응답 */
  sanitized: string;
  /** 감지된 패턴 (로깅용) */
  detectedPatterns?: string[];
}

/**
 * API 키 패턴들
 * - 각 서비스별 키 형식에 맞춤
 * - false positive 최소화를 위해 prefix 기반
 */
const API_KEY_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // OpenAI
  { name: 'openai', pattern: /sk-[a-zA-Z0-9]{20,}/g },
  // Google
  { name: 'google', pattern: /AIza[a-zA-Z0-9_-]{35}/g },
  // GitHub
  { name: 'github', pattern: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'github_oauth', pattern: /gho_[a-zA-Z0-9]{36}/g },
  // Slack
  { name: 'slack', pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/g },
  // AWS
  { name: 'aws_access', pattern: /AKIA[0-9A-Z]{16}/g },
  // Anthropic
  { name: 'anthropic', pattern: /sk-ant-[a-zA-Z0-9-]{20,}/g },
  // Voyage
  { name: 'voyage', pattern: /pa-[a-zA-Z0-9]{32,}/g },
];

/**
 * 민감 정보 패턴
 * - 키워드 + 값 형태의 패턴
 */
const SENSITIVE_INFO_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // 환경변수 형태
  { name: 'env_var', pattern: /(?:환경변수|env(?:ironment)?)\s*[:=]\s*\S+/gi },
  { name: 'api_key_value', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*\S+/gi },
  { name: 'secret_value', pattern: /(?:secret|password|credential)\s*[:=]\s*\S+/gi },
  // 시스템 프롬프트 노출 시도
  { name: 'system_prompt', pattern: /시스템\s*프롬프트\s*[:=]/gi },
];

/**
 * LLM 응답 필터링
 *
 * @param response - LLM 원본 응답
 * @returns 필터링 결과
 *
 * @example
 * ```typescript
 * const result = filterOutput("Your key is sk-abc123...");
 * if (result.filtered) {
 *   console.warn("Sensitive content filtered:", result.detectedPatterns);
 * }
 * return result.sanitized;
 * ```
 */
export function filterOutput(response: string): FilterResult {
  let sanitized = response;
  const detectedPatterns: string[] = [];

  // API 키 패턴 검사 및 마스킹
  for (const { name, pattern } of API_KEY_PATTERNS) {
    // 정규식 lastIndex 리셋 (global flag 사용 시 필요)
    pattern.lastIndex = 0;

    if (pattern.test(response)) {
      detectedPatterns.push(`api_key:${name}`);
      // Note: test() 후 lastIndex가 이동하므로 replace 전 리셋 필요
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, (match) => {
        const prefix = match.slice(0, 4);
        return `${prefix}***[REDACTED]`;
      });
    }
  }

  // 민감 정보 패턴 검사 및 마스킹
  for (const { name, pattern } of SENSITIVE_INFO_PATTERNS) {
    pattern.lastIndex = 0;

    if (pattern.test(response)) {
      detectedPatterns.push(`sensitive:${name}`);
      // Note: test() 후 lastIndex가 이동하므로 replace 전 리셋 필요
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, (match) => {
        const colonIndex = match.indexOf(':');
        const equalIndex = match.indexOf('=');
        const separatorIndex =
          colonIndex !== -1 && (equalIndex === -1 || colonIndex < equalIndex)
            ? colonIndex
            : equalIndex;

        if (separatorIndex !== -1) {
          const key = match.slice(0, separatorIndex + 1);
          return `${key} [REDACTED]`;
        }
        return '[REDACTED]';
      });
    }
  }

  const filtered = detectedPatterns.length > 0;

  if (filtered) {
    console.warn('[GUARDRAIL] Output filtered:', {
      patternsDetected: detectedPatterns,
      originalLength: response.length,
      sanitizedLength: sanitized.length,
    });
  }

  return {
    filtered,
    reason: filtered ? 'sensitive_content_detected' : undefined,
    sanitized,
    detectedPatterns: filtered ? detectedPatterns : undefined,
  };
}

/**
 * 응답에 민감한 정보가 포함되어 있는지만 검사 (마스킹 없음)
 * - 빠른 검사용 (스트리밍 중 early termination)
 */
export function hasSensitiveContent(response: string): boolean {
  for (const { pattern } of API_KEY_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(response)) return true;
  }

  for (const { pattern } of SENSITIVE_INFO_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(response)) return true;
  }

  return false;
}

// Legacy alias for backward compatibility
export const filterResponse = filterOutput;
