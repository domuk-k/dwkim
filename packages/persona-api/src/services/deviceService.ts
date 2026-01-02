/**
 * Device Service
 *
 * Device ID 기반 익명 사용자 추적 및 개인화
 * - 재방문 사용자 식별
 * - 관심 주제 추적
 * - 이메일 연결 (선택적)
 *
 * Privacy:
 * - 개인정보 없이 행동 패턴만 저장
 * - 90일 후 비활성 데이터 자동 삭제
 * - 사용자 요청 시 삭제 가능
 */

import type { IRedisClient } from '../infra/redis';

const DEVICE_TTL_DAYS = 90;
const DEVICE_TTL_SECONDS = DEVICE_TTL_DAYS * 24 * 60 * 60;

// 관심 주제 키워드 매핑
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'AI/ML': ['ai', '인공지능', '머신러닝', 'llm', 'gpt', 'claude', '에이전트', 'agent'],
  'Frontend': ['react', 'vue', 'next', '프론트엔드', 'frontend', 'ui', 'ux', '웹'],
  'Backend': ['node', '백엔드', 'backend', 'api', '서버', 'fastify', 'express'],
  'Career': ['경력', '회사', '직장', '이직', '채용', '면접', '연봉'],
  'Education': ['학력', '대학', '전공', '공부', '자격증'],
  'Projects': ['프로젝트', '사이드', '오픈소스', 'github', '개발'],
  'Contact': ['연락', '이메일', '채용', '협업', '컨택'],
};

export interface DeviceProfile {
  deviceId: string;
  messageCount: number;
  topics: string[];
  firstSeen: Date | null;
  lastSeen: Date | null;
  email?: string;
}

export class DeviceService {
  constructor(private redis: IRedisClient) {}

  /**
   * Device ID 유효성 검증 (UUID v4 형식)
   * - 정상: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * - 임시: temp-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   */
  private isValidDeviceId(deviceId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const tempUuidRegex = /^temp-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(deviceId) || tempUuidRegex.test(deviceId);
  }

  /**
   * Device 키 생성 (검증 포함)
   */
  private deviceKey(deviceId: string): string {
    if (!this.isValidDeviceId(deviceId)) {
      throw new Error(`Invalid device ID format: ${deviceId.slice(0, 20)}...`);
    }
    return `device:${deviceId}`;
  }

  /**
   * Device 활동 기록
   * - 메시지 카운트 증가
   * - 마지막 활동 시간 갱신
   * - 관심 주제 추출
   *
   * 실패해도 예외를 던지지 않음 (비핵심 기능)
   */
  async trackActivity(deviceId: string, messageContent: string): Promise<void> {
    try {
      const key = this.deviceKey(deviceId);
      const now = Date.now().toString();

      // 메시지 카운트 증가
      await this.redis.hincrby(key, 'messageCount', 1);

      // 마지막 활동 시간
      await this.redis.hset(key, 'lastSeen', now);

      // 첫 방문 시간 (없으면 설정)
      const firstSeen = await this.redis.hget(key, 'firstSeen');
      if (!firstSeen) {
        await this.redis.hset(key, 'firstSeen', now);
      }

      // 주제 추출 및 저장
      await this.extractAndStoreTopics(key, messageContent);

      // TTL 갱신 (활동 시마다 연장)
      await this.redis.expire(key, DEVICE_TTL_SECONDS);
    } catch (error) {
      // 로깅만 하고 예외를 던지지 않음 - 비핵심 기능
      console.error('Failed to track device activity:', {
        deviceId: deviceId.slice(0, 8),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 메시지에서 관심 주제 추출
   */
  private async extractAndStoreTopics(key: string, content: string): Promise<void> {
    const lowerContent = content.toLowerCase();
    const detectedTopics: string[] = [];

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some((kw) => lowerContent.includes(kw))) {
        detectedTopics.push(topic);
      }
    }

    if (detectedTopics.length === 0) return;

    // 기존 주제 가져오기 (파싱 실패 시 빈 배열)
    const existingTopics = await this.redis.hget(key, 'topics');
    let topics: string[] = [];
    if (existingTopics) {
      try {
        const parsed = JSON.parse(existingTopics);
        if (Array.isArray(parsed)) {
          topics = parsed.filter((t): t is string => typeof t === 'string');
        }
      } catch {
        console.warn('Failed to parse existing topics, resetting:', { key });
      }
    }

    // 새 주제 병합 (중복 제거, 최대 10개)
    const merged = [...new Set([...topics, ...detectedTopics])].slice(0, 10);
    await this.redis.hset(key, 'topics', JSON.stringify(merged));
  }

  /**
   * Device 프로필 조회
   */
  async getProfile(deviceId: string): Promise<DeviceProfile | null> {
    const data = await this.redis.hgetall(this.deviceKey(deviceId));
    if (!data) return null;

    // topics 파싱 (실패 시 빈 배열)
    let topics: string[] = [];
    if (data.topics) {
      try {
        const parsed = JSON.parse(data.topics);
        if (Array.isArray(parsed)) {
          topics = parsed.filter((t): t is string => typeof t === 'string');
        }
      } catch {
        console.warn('Failed to parse device topics:', { deviceId: deviceId.slice(0, 8) });
      }
    }

    return {
      deviceId,
      messageCount: parseInt(data.messageCount || '0', 10),
      topics,
      firstSeen: data.firstSeen ? new Date(parseInt(data.firstSeen, 10)) : null,
      lastSeen: data.lastSeen ? new Date(parseInt(data.lastSeen, 10)) : null,
      email: data.email,
    };
  }

  /**
   * 이메일 연결
   * Email Set에도 Device와 동일한 TTL 적용 (orphan 참조 방지)
   */
  async linkEmail(deviceId: string, email: string): Promise<void> {
    const key = this.deviceKey(deviceId);
    const emailKey = `email:${email}:devices`;

    // Device에 이메일 저장
    await this.redis.hset(key, 'email', email);

    // 이메일-Device 역참조 (여러 기기 연결 가능)
    await this.redis.sadd(emailKey, deviceId);

    // Email Set에도 TTL 설정 (Device와 동일한 90일)
    // 활동할 때마다 TTL 갱신됨 (trackActivity에서 device TTL 갱신)
    await this.redis.expire(emailKey, DEVICE_TTL_SECONDS);
  }

  /**
   * 재방문 사용자 여부 확인
   */
  async isReturningUser(deviceId: string): Promise<boolean> {
    const profile = await this.getProfile(deviceId);
    return profile !== null && profile.messageCount > 1;
  }

  /**
   * 개인화 힌트 생성
   * 재방문 사용자에게 맞춤 인사 등에 활용
   */
  async getPersonalizationHints(deviceId: string): Promise<{
    isReturning: boolean;
    visitCount: number;
    interests: string[];
    lastVisit?: Date;
  } | null> {
    const profile = await this.getProfile(deviceId);
    if (!profile) return null;

    return {
      isReturning: profile.messageCount > 1,
      visitCount: profile.messageCount,
      interests: profile.topics,
      lastVisit: profile.lastSeen || undefined,
    };
  }

  /**
   * Device 데이터 삭제 (GDPR 등 요청 시)
   * - Device 프로필 삭제
   * - Email-Device 연결 해제
   */
  async deleteDevice(deviceId: string): Promise<{ success: boolean; warnings?: string[] }> {
    const warnings: string[] = [];

    try {
      const profile = await this.getProfile(deviceId);

      // 이메일 연결 해제
      if (profile?.email) {
        try {
          await this.redis.srem(`email:${profile.email}:devices`, deviceId);
        } catch (error) {
          console.warn('Failed to unlink email from device:', { deviceId: deviceId.slice(0, 8), error });
          warnings.push('Email association could not be fully removed');
        }
      }

      // Device 데이터 삭제
      await this.redis.del(this.deviceKey(deviceId));

      return {
        success: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      console.error('Failed to delete device:', { deviceId: deviceId.slice(0, 8), error });
      return {
        success: false,
        warnings: ['Device deletion failed'],
      };
    }
  }
}

// 싱글톤 인스턴스
let deviceService: DeviceService | null = null;

/**
 * DeviceService 초기화 (server.ts에서 호출)
 */
export function initDeviceService(redis: IRedisClient): void {
  deviceService = new DeviceService(redis);
  console.log('📱 DeviceService initialized');
}

/**
 * DeviceService 인스턴스 반환
 */
export function getDeviceService(): DeviceService | null {
  return deviceService;
}
