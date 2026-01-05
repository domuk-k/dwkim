/**
 * Contact Collection Service
 *
 * 관심있는 사용자의 연락처 수집 및 알림
 */
import type { IRedisClient } from '../infra/redis';
import { chatLogger } from './chatLogger';
import { env } from '../config/env';

export interface ContactInfo {
  email?: string;
  name?: string;
  message?: string;
  sessionId: string;
  deviceId?: string;
  clientIp: string;
  messageCount: number;
  collectedAt: string;
  trigger: 'engagement' | 'block_interrupt';  // 5회 vs 30회
}

export interface NotificationPayload {
  type: 'new_lead' | 'engaged_user_blocked';
  contact: ContactInfo;
  conversationSummary?: string;
}

// 설정
const CONTACT_KEY_PREFIX = 'contact:';
const CONTACT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30일

export class ContactService {
  private redis: IRedisClient | null = null;
  private memoryStore: Map<string, ContactInfo> = new Map();
  private discordWebhookUrl: string | null = null;

  constructor(redis?: IRedisClient | null) {
    this.redis = redis || null;
    this.discordWebhookUrl = env.DISCORD_WEBHOOK_URL || null;

    if (this.redis) {
      console.log('ContactService: Using Redis backend');
    } else {
      console.log('ContactService: Using memory backend');
    }

    if (this.discordWebhookUrl) {
      console.log('ContactService: Discord notifications enabled');
    }
  }

  /**
   * 연락처 저장
   */
  async saveContact(contact: ContactInfo): Promise<void> {
    const key = `${CONTACT_KEY_PREFIX}${contact.sessionId}`;

    if (this.redis) {
      await this.redis.setex(key, CONTACT_TTL_SECONDS, JSON.stringify(contact));
    } else {
      this.memoryStore.set(contact.sessionId, contact);
    }

    // 로그 기록 (중요: 관심있는 사용자)
    chatLogger.info({
      type: 'lead_captured',
      ...contact,
    });

    // 알림 발송
    await this.sendNotification({
      type: contact.trigger === 'block_interrupt' ? 'engaged_user_blocked' : 'new_lead',
      contact,
    });
  }

  /**
   * 연락처 조회
   */
  async getContact(sessionId: string): Promise<ContactInfo | null> {
    if (this.redis) {
      const data = await this.redis.get(`${CONTACT_KEY_PREFIX}${sessionId}`);
      return data ? JSON.parse(data) : null;
    }
    return this.memoryStore.get(sessionId) || null;
  }

  /**
   * 이메일로 이미 수집된 연락처인지 확인
   */
  async isEmailCollected(email: string): Promise<boolean> {
    // 간단한 중복 체크 (Redis SCAN 또는 메모리 검색)
    if (this.redis) {
      const keys = await this.redis.keys(`${CONTACT_KEY_PREFIX}*`);
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const contact = JSON.parse(data) as ContactInfo;
          if (contact.email === email) return true;
        }
      }
      return false;
    }

    for (const contact of this.memoryStore.values()) {
      if (contact.email === email) return true;
    }
    return false;
  }

  /**
   * 알림 발송 (Discord Webhook 또는 로그)
   */
  private async sendNotification(payload: NotificationPayload): Promise<void> {
    const emoji = payload.type === 'new_lead' ? '🎯' : '🔥';
    const title = payload.type === 'new_lead'
      ? 'New Lead Captured!'
      : 'Engaged User (30+ messages)';

    // 콘솔 로그 (항상)
    console.log(`\n${emoji} ${title}`);
    console.log(`   Email: ${payload.contact.email || 'N/A'}`);
    console.log(`   Name: ${payload.contact.name || 'N/A'}`);
    console.log(`   Messages: ${payload.contact.messageCount}`);
    console.log(`   Trigger: ${payload.contact.trigger}`);
    console.log(`   Device: ${payload.contact.deviceId || 'N/A'}`);
    console.log(`   Session: ${payload.contact.sessionId}`);
    console.log(`   Time: ${payload.contact.collectedAt}\n`);

    // Discord Webhook 발송 (설정된 경우)
    if (this.discordWebhookUrl) {
      try {
        const discordPayload = {
          embeds: [{
            title: `${emoji} ${title}`,
            color: payload.type === 'new_lead' ? 0x00ff00 : 0xff9900, // 초록 or 주황
            fields: [
              { name: '📧 Email', value: payload.contact.email || 'N/A', inline: true },
              { name: '👤 Name', value: payload.contact.name || 'Anonymous', inline: true },
              { name: '💬 Messages', value: String(payload.contact.messageCount), inline: true },
              { name: '🏷️ Trigger', value: payload.contact.trigger, inline: true },
              { name: '📱 Device ID', value: payload.contact.deviceId ? `\`${payload.contact.deviceId.slice(0, 8)}...\`` : 'N/A', inline: true },
              { name: '🔑 Session ID', value: `\`${payload.contact.sessionId.slice(0, 20)}...\``, inline: true },
              ...(payload.contact.message ? [{ name: '📝 Message', value: payload.contact.message, inline: false }] : []),
            ],
            timestamp: payload.contact.collectedAt,
            footer: { text: 'Persona API Lead Capture' },
          }],
        };

        const response = await fetch(this.discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload),
        });

        if (!response.ok) {
          console.error('Discord notification failed:', response.status);
        }
      } catch (error) {
        console.error('Discord notification error:', error);
      }
    }
  }

  /**
   * 최근 리드 목록 조회 (관리용)
   */
  async getRecentContacts(limit = 10): Promise<ContactInfo[]> {
    const contacts: ContactInfo[] = [];

    if (this.redis) {
      const keys = await this.redis.keys(`${CONTACT_KEY_PREFIX}*`);
      for (const key of keys.slice(0, limit)) {
        const data = await this.redis.get(key);
        if (data) contacts.push(JSON.parse(data));
      }
    } else {
      const values = Array.from(this.memoryStore.values());
      contacts.push(...values.slice(-limit));
    }

    // 최신순 정렬
    return contacts.sort((a, b) =>
      new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
    );
  }
}

// 전역 인스턴스
let contactService: ContactService | null = null;

export function initContactService(redis?: IRedisClient | null): ContactService {
  contactService = new ContactService(redis);
  return contactService;
}

export function getContactService(): ContactService {
  if (!contactService) {
    contactService = new ContactService();
  }
  return contactService;
}
