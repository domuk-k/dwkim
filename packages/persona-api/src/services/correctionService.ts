/**
 * Correction Service
 *
 * HITL: 응답 수정 요청 수집
 * 사용자가 "틀렸어", "아니야" 등을 말하면 수정 피드백 저장
 *
 * Phase 1: 수집만 (Discord 알림)
 * Phase 2: KB 업데이트 큐 (추후)
 */

import { getRedisClient } from '../infra/redis';

export interface CorrectionData {
  /** 원래 질문 */
  originalQuery: string;
  /** 에이전트의 틀린 응답 */
  originalResponse: string;
  /** 사용자의 수정 메시지 */
  correctionMessage: string;
  /** 세션 ID */
  sessionId?: string;
  timestamp: string;
}

// Redis key prefix
const CORRECTION_KEY = 'persona:corrections';

// In-memory fallback
const memoryCorrections: CorrectionData[] = [];

// 수정 요청 감지 패턴 (한국어)
export const CORRECTION_PATTERNS = [
  /틀렸/,
  /아니야/,
  /아닌데/,
  /잘못됐/,
  /수정해/,
  /고쳐/,
  /오류야/,
  /맞지\s*않/,
  /정확하지\s*않/,
  /incorrect/i,
  /wrong/i,
  /fix/i,
  /correct/i,
];

/**
 * 수정 요청 메시지인지 감지
 */
export function isCorrection(message: string): boolean {
  return CORRECTION_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * 수정 피드백 저장
 */
export async function saveCorrection(
  data: Omit<CorrectionData, 'timestamp'>
): Promise<void> {
  const correction: CorrectionData = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  const redis = getRedisClient();
  if (redis) {
    try {
      // List에 추가 (최근 100개 유지)
      await redis.lpush(CORRECTION_KEY, JSON.stringify(correction));
      await redis.ltrim(CORRECTION_KEY, 0, 99);

      console.log(
        `[Correction] Saved: query="${data.originalQuery.slice(0, 30)}..." correction="${data.correctionMessage.slice(0, 30)}..."`
      );
    } catch (error) {
      console.warn('[Correction] Redis save failed, using memory:', error);
      memoryCorrections.push(correction);
    }
  } else {
    memoryCorrections.push(correction);
    console.log(`[Correction] Saved to memory: ${data.correctionMessage.slice(0, 30)}...`);
  }
}

/**
 * 수정 피드백 목록 조회 (관리자용)
 */
export async function getCorrections(limit = 20): Promise<CorrectionData[]> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const items = await redis.lrange(CORRECTION_KEY, 0, limit - 1);
      return items.map((item) => JSON.parse(item));
    } catch (error) {
      console.warn('[Correction] Redis fetch failed:', error);
    }
  }

  return memoryCorrections.slice(0, limit);
}
