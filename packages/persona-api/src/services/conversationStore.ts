import type { IRedisClient } from '../infra/redis';
import type { ChatMessage } from './llmService';

/**
 * 대화 히스토리 저장소
 * - Redis 사용 시: 서버사이드 세션 저장
 * - Redis 없을 시: 메모리 기반 (서버 재시작 시 초기화)
 */

// 세션 설정
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24시간
const MAX_HISTORY_LENGTH = 20; // 최대 대화 턴 수

export interface ConversationSession {
  id: string;
  history: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;  // 총 메시지 수 (n회 질문 후 연락 제안용)
}

export class ConversationStore {
  private redis: IRedisClient | null = null;
  private memoryStore: Map<string, ConversationSession> = new Map();

  constructor(redis?: IRedisClient | null) {
    this.redis = redis || null;
    if (this.redis) {
      console.log('ConversationStore: Using Redis backend');
    } else {
      console.log('ConversationStore: Using memory backend');
    }
  }

  /**
   * 세션 ID 생성 (IP 기반 또는 랜덤)
   */
  static generateSessionId(clientIp?: string): string {
    const base = clientIp || 'anon';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 6);
    return `session_${base.replace(/[.:]/g, '_')}_${timestamp}_${random}`;
  }

  /**
   * 세션 조회
   */
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    if (this.redis) {
      const data = await this.redis.get(`conv:${sessionId}`);
      if (!data) return null;
      return JSON.parse(data) as ConversationSession;
    }

    return this.memoryStore.get(sessionId) || null;
  }

  /**
   * 세션 저장/업데이트
   */
  async saveSession(session: ConversationSession): Promise<void> {
    // 히스토리 길이 제한
    if (session.history.length > MAX_HISTORY_LENGTH * 2) {
      // user + assistant 쌍으로 자르기
      session.history = session.history.slice(-MAX_HISTORY_LENGTH * 2);
    }

    session.updatedAt = new Date().toISOString();

    if (this.redis) {
      await this.redis.setex(
        `conv:${session.id}`,
        SESSION_TTL_SECONDS,
        JSON.stringify(session)
      );
      return;
    }

    this.memoryStore.set(session.id, session);
  }

  /**
   * 메시지 추가
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<ConversationSession> {
    let session = await this.getSession(sessionId);

    if (!session) {
      session = {
        id: sessionId,
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      };
    }

    session.history.push({ role, content });
    // user 메시지만 카운트 (5회 질문 후 연락 제안 트리거용)
    if (role === 'user') {
      session.messageCount++;
    }

    await this.saveSession(session);
    return session;
  }

  /**
   * 세션의 히스토리 조회
   */
  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    const session = await this.getSession(sessionId);
    return session?.history || [];
  }

  /**
   * 세션 삭제
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`conv:${sessionId}`);
      return;
    }

    this.memoryStore.delete(sessionId);
  }

  /**
   * 세션의 메시지 카운트 조회 (n회 질문 후 연락 제안용)
   */
  async getMessageCount(sessionId: string): Promise<number> {
    const session = await this.getSession(sessionId);
    return session?.messageCount || 0;
  }

  /**
   * 메모리 스토어 정리 (오래된 세션 삭제)
   * Redis는 TTL로 자동 만료
   */
  cleanupMemoryStore(): void {
    if (this.redis) return;

    const now = Date.now();
    const maxAge = SESSION_TTL_SECONDS * 1000;

    for (const [id, session] of this.memoryStore.entries()) {
      const updatedAt = new Date(session.updatedAt).getTime();
      if (now - updatedAt > maxAge) {
        this.memoryStore.delete(id);
      }
    }
  }
}

// 전역 인스턴스 (서버 초기화 시 설정)
let conversationStore: ConversationStore | null = null;

export function initConversationStore(redis?: IRedisClient | null): ConversationStore {
  conversationStore = new ConversationStore(redis);
  return conversationStore;
}

export function getConversationStore(): ConversationStore {
  if (!conversationStore) {
    conversationStore = new ConversationStore();
  }
  return conversationStore;
}
