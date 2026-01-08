/**
 * 환경별/용도별 LLM 모델 설정
 *
 * @see https://openrouter.ai/models - OpenRouter 모델 목록
 * @see https://openrouter.ai/rankings - 모델 랭킹
 */

export type ModelPurpose = 'generation' | 'utility'

export interface ModelProfile {
  /** 사용자 대면 응답 생성용 (고품질) */
  generation: string
  /** 내부 처리용 - 쿼리 재작성, 질문 생성 등 (가성비) */
  utility: string
  /** 장애 시 fallback */
  fallback: string
}

export interface ModelConfig {
  production: ModelProfile
  development: ModelProfile
  test: ModelProfile
}

/**
 * 환경별 모델 프로필
 *
 * Production:
 * - generation: Claude Sonnet 4 (사용자 대면, 품질 중요)
 * - utility: Gemini 2.5 Flash Lite (가성비, 빠름)
 *
 * Development:
 * - 모두 무료 모델 사용 (비용 절감)
 *
 * 가격 참고 (2025.01 기준):
 * - Claude Sonnet 4: $3/M input, $15/M output
 * - Gemini 2.5 Flash Lite: $0.10/M input, $0.40/M output
 * - Gemini 2.0 Flash: $0.13/M input, $0.50/M output
 * - Free models: $0
 */
export const MODEL_PROFILES: ModelConfig = {
  production: {
    generation: 'anthropic/claude-sonnet-4',
    utility: 'google/gemini-2.5-flash-lite',
    fallback: 'google/gemini-2.0-flash'
  },
  development: {
    generation: 'google/gemini-2.0-flash-exp:free',
    utility: 'google/gemini-2.0-flash-exp:free',
    fallback: 'google/gemini-2.0-flash-exp:free'
  },
  test: {
    generation: 'google/gemini-2.0-flash-exp:free',
    utility: 'google/gemini-2.0-flash-exp:free',
    fallback: 'google/gemini-2.0-flash-exp:free'
  }
}

/**
 * 현재 환경에 맞는 모델 프로필 반환
 */
export function getModelProfile(nodeEnv: string = 'development'): ModelProfile {
  const env = nodeEnv as keyof ModelConfig
  return MODEL_PROFILES[env] || MODEL_PROFILES.development
}

/**
 * 용도에 맞는 모델 반환 (환경변수 오버라이드 지원)
 */
export function getModel(
  purpose: ModelPurpose,
  options: {
    nodeEnv?: string
    overrideGeneration?: string
    overrideUtility?: string
  } = {}
): string {
  const profile = getModelProfile(options.nodeEnv)

  if (purpose === 'generation' && options.overrideGeneration) {
    return options.overrideGeneration
  }
  if (purpose === 'utility' && options.overrideUtility) {
    return options.overrideUtility
  }

  return profile[purpose]
}

/**
 * Fallback 모델 반환
 */
export function getFallbackModel(nodeEnv: string = 'development'): string {
  return getModelProfile(nodeEnv).fallback
}
