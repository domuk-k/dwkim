/**
 * SEU (Semantic Embedding Uncertainty) Service
 *
 * 다중 응답 생성 후 cosine similarity로 uncertainty 측정
 *
 * @see https://arxiv.org/html/2410.22685v1 (Improving UQ in LLMs via Semantic Embeddings)
 * @see https://arxiv.org/pdf/2502.21239 (Semantic Volume for uncertainty quantification)
 */

import { utilityLLM } from './llmInstances'
import type { ChatMessage } from './llmService'
import { OpenAIEmbeddings } from './openaiEmbeddings'

export interface SEUResult {
  /** 0-1, 높을수록 불확실함 */
  uncertainty: number
  /** 응답들 간의 평균 cosine similarity */
  avgSimilarity: number
  /** 생성된 응답들 */
  responses: string[]
  /** uncertainty > UNCERTAINTY_THRESHOLD (clarification 트리거) */
  isUncertain: boolean
  /** uncertainty > ESCALATION_THRESHOLD (human escalation 트리거) */
  shouldEscalate: boolean
}

// Uncertainty threshold (더 적극적인 clarification 트리거)
// 0.35 = 35% 불확실성 이상이면 clarification 제안
const UNCERTAINTY_THRESHOLD = 0.35

// Human Escalation threshold (사람에게 연결)
// 0.65 = 65% 불확실성 이상이면 연락 유도
export const ESCALATION_THRESHOLD = 0.65

// 빠른 응답을 위한 짧은 프롬프트
const QUICK_RESPONSE_SYSTEM = `당신은 김동욱에 대한 질문에 **한 문장**으로 핵심만 답변하는 AI입니다.
- 모르면 "잘 모르겠어요"라고 솔직히 답변
- 여러 가능성이 있으면 가장 가능성 높은 것 하나만
- 최대 50자 이내`

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

/**
 * SEU Service - Semantic Embedding Uncertainty estimation
 */
export class SEUService {
  // utilityLLM은 llmInstances에서 공유 인스턴스 사용
  private embeddings: OpenAIEmbeddings
  private numSamples: number

  constructor(numSamples = 2) {
    this.embeddings = new OpenAIEmbeddings()
    this.numSamples = numSamples
  }

  /**
   * 쿼리에 대한 uncertainty 측정
   *
   * 1. N개의 다양한 응답 생성 (temperature=1.0)
   * 2. 응답들을 embedding
   * 3. pairwise cosine similarity 계산
   * 4. uncertainty = 1 - avg_similarity
   */
  async measureUncertainty(query: string, context: string = ''): Promise<SEUResult> {
    try {
      // 1. Generate multiple diverse responses
      const responses = await this.generateDiverseResponses(query, context)

      if (responses.length < 2) {
        return {
          uncertainty: 0,
          avgSimilarity: 1,
          responses,
          isUncertain: false,
          shouldEscalate: false
        }
      }

      // 2. Embed responses
      const embeddings = await this.embeddings.embedDocuments(responses)

      // 3. Calculate pairwise cosine similarity
      const similarities: number[] = []
      for (let i = 0; i < embeddings.length; i++) {
        for (let j = i + 1; j < embeddings.length; j++) {
          similarities.push(cosineSimilarity(embeddings[i], embeddings[j]))
        }
      }

      // 4. Average similarity → uncertainty
      const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length
      const uncertainty = 1 - avgSimilarity

      console.log(
        `SEU: query="${query.slice(0, 30)}..." uncertainty=${uncertainty.toFixed(3)} (avgSim=${avgSimilarity.toFixed(3)})`
      )

      return {
        uncertainty: Math.round(uncertainty * 100) / 100,
        avgSimilarity: Math.round(avgSimilarity * 100) / 100,
        responses,
        isUncertain: uncertainty > UNCERTAINTY_THRESHOLD,
        shouldEscalate: uncertainty > ESCALATION_THRESHOLD
      }
    } catch (error) {
      console.error('SEU measurement failed:', error)
      // 실패 시 uncertain으로 처리 (안전한 기본값)
      // escalation은 false로 - 에러 시 사람 연결까지는 안함
      return {
        uncertainty: 1,
        avgSimilarity: 0,
        responses: [],
        isUncertain: true,
        shouldEscalate: false
      }
    }
  }

  /**
   * 다양한 응답 생성
   *
   * Note: temperature 파라미터는 llmService에서 지원하지 않음
   * 대신 다양한 프롬프트로 응답 다양성 확보
   */
  private async generateDiverseResponses(query: string, context: string): Promise<string[]> {
    const responses: string[] = []

    // 다양한 관점의 프롬프트로 응답 생성
    const prompts = [
      `${query} (가장 관련성 높은 정보 하나만)`,
      `${query} (다른 가능한 해석이 있다면?)`
    ]

    // 병렬로 응답 생성
    const promises = prompts.slice(0, this.numSamples).map((promptVariant) => {
      const messages: ChatMessage[] = [{ role: 'user', content: promptVariant }]
      return utilityLLM.chat(messages, `${QUICK_RESPONSE_SYSTEM}\n\n${context}`)
    })

    const results = await Promise.allSettled(promises)

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.content) {
        responses.push(result.value.content)
      }
    }

    return responses
  }
}

// 싱글톤 인스턴스
let seuService: SEUService | null = null

export function getSEUService(): SEUService {
  if (!seuService) {
    seuService = new SEUService()
  }
  return seuService
}
