/**
 * Guardrails Module - LLM 입출력 보안 가드레일
 *
 * Multi-layered defense 패턴 구현:
 * - Level 1: Input Guard (Prompt Injection 방어)
 * - Level 3: Output Guard (민감 정보 필터링)
 * - Level 5: Monitor (HITL 알림)
 *
 * @see https://arxiv.org/abs/2511.15759
 * @see https://genai.owasp.org/llmrisk/llm01-prompt-injection/
 *
 * @example
 * ```typescript
 * import { guard } from './guardrails';
 *
 * // Input validation
 * const inputCheck = guard.validateInput(userMessage);
 * if (!inputCheck.safe) {
 *   guard.logInputBlocked(ip, inputCheck.reason);
 *   return { error: "Invalid input" };
 * }
 *
 * // LLM call...
 *
 * // Output filtering
 * const result = guard.filterOutput(llmResponse);
 * if (result.filtered) {
 *   guard.logOutputFiltered(sessionId, result.detectedPatterns);
 * }
 * return result.sanitized;
 * ```
 */

// Input Guard
export {
  validateInput,
  containsSecurityKeyword,
  matchesInjectionPattern,
  checkSecurityViolation,
  SECURITY_KEYWORDS,
  INJECTION_PATTERNS,
  type SecurityCheckResult,
} from './inputGuard';

// Output Guard
export {
  filterOutput,
  filterResponse,
  hasSensitiveContent,
  type FilterResult,
} from './outputGuard';

// Monitor
export {
  logSecurityEvent,
  logInputBlocked,
  logHistoryRejected,
  logOutputFiltered,
  type SecurityEvent,
  type SecurityEventType,
} from './monitor';

// Convenience namespace for functional usage
import { validateInput } from './inputGuard';
import { filterOutput, hasSensitiveContent } from './outputGuard';
import { logInputBlocked, logHistoryRejected, logOutputFiltered, logSecurityEvent } from './monitor';

export const guard = {
  // Input
  validateInput,

  // Output
  filterOutput,
  hasSensitiveContent,

  // Monitor
  logInputBlocked,
  logHistoryRejected,
  logOutputFiltered,
  logSecurityEvent,
} as const;
