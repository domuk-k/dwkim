/**
 * Shared LLM Instances
 *
 * 순환 의존성 방지를 위해 별도 모듈로 분리
 * - generationLLM: 사용자 대면 응답 (고품질 모델)
 * - utilityLLM: 내부 처리 - 쿼리 재작성, 질문 생성, SEU 등 (가성비 모델)
 *
 * @see personaAgent.ts - 이 모듈을 재export
 * @see queryRewriter.ts, seuService.ts - 이 모듈에서 import
 */

import { LLMService } from './llmService'

export const generationLLM = new LLMService({ purpose: 'generation' })
export const utilityLLM = new LLMService({ purpose: 'utility' })
