/**
 * Conversation Limiter Service
 *
 * 대화 기반 제한 및 리드 캡처 트리거
 * - 5회 이상: 연락처 제안 (shouldSuggestContact)
 * - 30회 이상: IP 차단 + 연락처 수집 기회
 */
import Redis from 'ioredis';

// 임계값 설정
export const THRESHOLDS = {
  SUGGEST_CONTACT: 5,      // 연락처 제안 시작
  BLOCK_IP: 30,            // IP 차단 시작
  BLOCK_DURATION_MS: 5 * 60 * 1000,  // 5분 차단
} as const;

export interface ConversationStatus {
  messageCount: number;
  shouldSuggestContact: boolean;
  shouldBlockIp: boolean;
  isBlocked: boolean;
  blockExpiresAt?: string;
  blockMessage?: string;
}

const BLOCK_KEY_PREFIX = 'block:';

export class ConversationLimiter {
  private redis: Redis | null = null;
  private memoryBlockList: Map<string, number> = new Map(); // IP -> unblock timestamp

  constructor(redis?: Redis | null) {
    this.redis = redis || null;
  }

  /**
   * IP 차단 여부 확인
   */
  async isBlocked(clientIp: string): Promise<{ blocked: boolean; expiresAt?: string }> {
    if (this.redis) {
      const ttl = await this.redis.ttl(`${BLOCK_KEY_PREFIX}${clientIp}`);
      if (ttl > 0) {
        const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
        return { blocked: true, expiresAt };
      }
      return { blocked: false };
    }

    const unblockTime = this.memoryBlockList.get(clientIp);
    if (unblockTime && Date.now() < unblockTime) {
      return {
        blocked: true,
        expiresAt: new Date(unblockTime).toISOString(),
      };
    }

    // 만료된 항목 정리
    if (unblockTime) {
      this.memoryBlockList.delete(clientIp);
    }
    return { blocked: false };
  }

  /**
   * IP 차단
   */
  async blockIp(clientIp: string, durationMs = THRESHOLDS.BLOCK_DURATION_MS): Promise<string> {
    const expiresAt = new Date(Date.now() + durationMs);

    if (this.redis) {
      await this.redis.setex(
        `${BLOCK_KEY_PREFIX}${clientIp}`,
        Math.ceil(durationMs / 1000),
        expiresAt.toISOString()
      );
    } else {
      this.memoryBlockList.set(clientIp, expiresAt.getTime());
    }

    console.log(`🚫 IP blocked: ${clientIp} until ${expiresAt.toISOString()}`);
    return expiresAt.toISOString();
  }

  /**
   * IP 차단 해제
   */
  async unblockIp(clientIp: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`${BLOCK_KEY_PREFIX}${clientIp}`);
    } else {
      this.memoryBlockList.delete(clientIp);
    }
  }

  /**
   * 대화 상태 평가
   */
  async evaluateConversation(
    clientIp: string,
    messageCount: number
  ): Promise<ConversationStatus> {
    const blockStatus = await this.isBlocked(clientIp);

    const status: ConversationStatus = {
      messageCount,
      shouldSuggestContact: messageCount >= THRESHOLDS.SUGGEST_CONTACT,
      shouldBlockIp: messageCount >= THRESHOLDS.BLOCK_IP,
      isBlocked: blockStatus.blocked,
      blockExpiresAt: blockStatus.expiresAt,
    };

    // 30회 도달 시 차단 메시지 생성
    if (status.shouldBlockIp && !status.isBlocked) {
      status.blockMessage = this.generateFriendlyBlockMessage();
    }

    return status;
  }

  /**
   * 친절한 차단 메시지 생성
   */
  generateFriendlyBlockMessage(): string {
    return `안녕하세요! 😊

오늘 정말 많은 대화를 나눴네요! 관심 가져주셔서 감사해요.

dwkim이 직접 답변드리면 더 좋을 것 같아요:
📧 이메일: hello@dwkim.dev
💼 LinkedIn: linkedin.com/in/dwkim

혹시 이메일 주소를 남겨주시면 제가 dwkim에게 전달해서 연락드릴게요!

5분 후에 다시 대화할 수 있어요. 잠시만 기다려주세요! ☕`;
  }

  /**
   * 연락처 제안 메시지 생성 (5회 이상)
   */
  generateContactSuggestionMessage(): string {
    return `혹시 더 자세한 이야기가 필요하시면, dwkim에게 직접 연결해드릴 수 있어요.

이메일 주소를 남겨주시겠어요? 24시간 내로 연락드릴게요! 😊

(원하지 않으시면 그냥 질문을 계속하셔도 돼요)`;
  }
}

// 전역 인스턴스
let conversationLimiter: ConversationLimiter | null = null;

export function initConversationLimiter(redis?: Redis | null): ConversationLimiter {
  conversationLimiter = new ConversationLimiter(redis);
  return conversationLimiter;
}

export function getConversationLimiter(): ConversationLimiter {
  if (!conversationLimiter) {
    conversationLimiter = new ConversationLimiter();
  }
  return conversationLimiter;
}
