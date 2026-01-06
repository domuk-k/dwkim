/**
 * Feedback Service
 *
 * HITL: Response Feedback 수집 및 저장
 *
 * Claude Code Privacy 원칙 준수:
 * - 숫자 rating만 수집 (1, 2, 3, null)
 * - 대화 내용, 코드, 파일 경로 절대 포함 안함
 * - 모델 학습에 사용 안함
 *
 * @see https://www.anthropic.com/products/claude-code (Claude Code feedback)
 */

import { getRedisClient } from '../infra/redis';

export interface FeedbackData {
  /** 1 = Good, 2 = Okay, 3 = Poor, null = dismissed */
  rating: 1 | 2 | 3 | null;
  /** 집계용 (개인 식별 불가) */
  sessionId?: string;
  timestamp: string;
}

interface FeedbackStats {
  total: number;
  ratings: { good: number; okay: number; poor: number; dismissed: number };
  avgScore: number | null;
}

// Redis key prefix
const FEEDBACK_KEY = 'persona:feedback';
const FEEDBACK_STATS_KEY = 'persona:feedback:stats';

// In-memory fallback
const memoryFeedback: FeedbackData[] = [];

/**
 * 피드백 저장
 * Privacy: rating과 timestamp만 저장
 */
export async function saveFeedback(
  rating: 1 | 2 | 3 | null,
  sessionId?: string
): Promise<void> {
  const feedback: FeedbackData = {
    rating,
    sessionId,
    timestamp: new Date().toISOString(),
  };

  const redis = getRedisClient();
  if (redis) {
    try {
      // List에 추가 (최근 1000개 유지)
      await redis.lpush(FEEDBACK_KEY, JSON.stringify(feedback));
      await redis.ltrim(FEEDBACK_KEY, 0, 999);

      // Stats 업데이트
      await updateStats(rating);

      console.log(`[Feedback] Saved: rating=${rating}, sessionId=${sessionId?.slice(0, 8)}...`);
    } catch (error) {
      console.warn('[Feedback] Redis save failed, using memory:', error);
      memoryFeedback.push(feedback);
    }
  } else {
    memoryFeedback.push(feedback);
    console.log(`[Feedback] Saved to memory: rating=${rating}`);
  }
}

/**
 * Stats 업데이트 (Atomic increment)
 */
async function updateStats(rating: 1 | 2 | 3 | null): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const field = rating === null ? 'dismissed' : `rating_${rating}`;
    await redis.hincrby(FEEDBACK_STATS_KEY, field, 1);
    await redis.hincrby(FEEDBACK_STATS_KEY, 'total', 1);
  } catch (error) {
    console.warn('[Feedback] Stats update failed:', error);
  }
}

/**
 * 피드백 통계 조회
 */
export async function getFeedbackStats(): Promise<FeedbackStats> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const stats = await redis.hgetall(FEEDBACK_STATS_KEY);
      const good = parseInt(stats.rating_1 || '0', 10);
      const okay = parseInt(stats.rating_2 || '0', 10);
      const poor = parseInt(stats.rating_3 || '0', 10);
      const dismissed = parseInt(stats.dismissed || '0', 10);
      const total = parseInt(stats.total || '0', 10);

      // 평균 점수 (dismissed 제외)
      const ratedCount = good + okay + poor;
      const avgScore = ratedCount > 0
        ? (good * 1 + okay * 2 + poor * 3) / ratedCount
        : null;

      return {
        total,
        ratings: { good, okay, poor, dismissed },
        avgScore,
      };
    } catch (error) {
      console.warn('[Feedback] Stats fetch failed:', error);
    }
  }

  // Memory fallback
  const good = memoryFeedback.filter((f) => f.rating === 1).length;
  const okay = memoryFeedback.filter((f) => f.rating === 2).length;
  const poor = memoryFeedback.filter((f) => f.rating === 3).length;
  const dismissed = memoryFeedback.filter((f) => f.rating === null).length;
  const total = memoryFeedback.length;
  const ratedCount = good + okay + poor;

  return {
    total,
    ratings: { good, okay, poor, dismissed },
    avgScore: ratedCount > 0 ? (good * 1 + okay * 2 + poor * 3) / ratedCount : null,
  };
}
