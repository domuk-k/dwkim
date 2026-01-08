/**
 * Contact Collection Service
 *
 * 관심있는 사용자의 연락처 수집 및 알림
 */

import { env } from '../config/env'
import type { IRedisClient } from '../infra/redis'
import { chatLogger } from './chatLogger'

export interface ContactInfo {
  email?: string
  name?: string
  message?: string
  sessionId: string
  deviceId?: string
  clientIp: string
  messageCount: number
  collectedAt: string
  trigger: 'engagement' | 'block_interrupt' // 5회 vs 30회
}

export interface NotificationPayload {
  type: 'new_lead' | 'engaged_user_blocked'
  contact: ContactInfo
  conversationSummary?: string
}

// 설정
const CONTACT_KEY_PREFIX = 'contact:'
const CONTACT_TTL_SECONDS = 60 * 60 * 24 * 30 // 30일

export class ContactService {
  private redis: IRedisClient | null = null
  private memoryStore: Map<string, ContactInfo> = new Map()
  private discordWebhookUrl: string | null = null

  constructor(redis?: IRedisClient | null) {
    this.redis = redis || null
    this.discordWebhookUrl = env.DISCORD_WEBHOOK_URL || null

    if (this.redis) {
      console.log('ContactService: Using Redis backend')
    } else {
      console.log('ContactService: Using memory backend')
    }

    if (this.discordWebhookUrl) {
      console.log('ContactService: Discord notifications enabled')
    }
  }

  /**
   * 연락처 저장
   */
  async saveContact(contact: ContactInfo): Promise<void> {
    const key = `${CONTACT_KEY_PREFIX}${contact.sessionId}`

    if (this.redis) {
      await this.redis.setex(key, CONTACT_TTL_SECONDS, JSON.stringify(contact))
    } else {
      this.memoryStore.set(contact.sessionId, contact)
    }

    // 로그 기록 (중요: 관심있는 사용자)
    chatLogger.info({
      type: 'lead_captured',
      ...contact
    })

    // 알림 발송
    await this.sendNotification({
      type: contact.trigger === 'block_interrupt' ? 'engaged_user_blocked' : 'new_lead',
      contact
    })
  }

  /**
   * 연락처 조회
   */
  async getContact(sessionId: string): Promise<ContactInfo | null> {
    if (this.redis) {
      const data = await this.redis.get(`${CONTACT_KEY_PREFIX}${sessionId}`)
      return data ? JSON.parse(data) : null
    }
    return this.memoryStore.get(sessionId) || null
  }

  /**
   * 이메일로 이미 수집된 연락처인지 확인
   */
  async isEmailCollected(email: string): Promise<boolean> {
    // 간단한 중복 체크 (Redis SCAN 또는 메모리 검색)
    if (this.redis) {
      const keys = await this.redis.keys(`${CONTACT_KEY_PREFIX}*`)
      for (const key of keys) {
        const data = await this.redis.get(key)
        if (data) {
          const contact = JSON.parse(data) as ContactInfo
          if (contact.email === email) return true
        }
      }
      return false
    }

    for (const contact of this.memoryStore.values()) {
      if (contact.email === email) return true
    }
    return false
  }

  /**
   * Device ID 표시 포맷팅
   * - 정상 ID: 앞 8자리 표시
   * - temp- prefix: 임시 ID 표시 (세션용)
   * - 없음: 웹 접속 가능성 안내
   */
  private formatDeviceId(deviceId?: string): string {
    if (!deviceId) {
      return '❌ N/A (웹 접속?)'
    }
    if (deviceId.startsWith('temp-')) {
      const id = deviceId.slice(5)
      return id.length > 8 ? `⚠️ Temp: \`${id.slice(0, 8)}...\`` : `⚠️ Temp: \`${id}\``
    }
    return deviceId.length > 8 ? `\`${deviceId.slice(0, 8)}...\`` : `\`${deviceId}\``
  }

  /**
   * Discord Webhook 발송 (재시도 로직 포함)
   * @param webhookUrl - Discord Webhook URL
   * @param payload - Discord 메시지 페이로드
   * @param maxRetries - 최대 재시도 횟수 (기본 3회)
   */
  private async sendDiscordWithRetry(
    webhookUrl: string,
    payload: object,
    maxRetries = 3
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          return true
        }

        // Rate limit (429) - 재시도
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000
          console.warn(`Discord rate limited, waiting ${waitMs}ms (attempt ${attempt}/${maxRetries})`)
          await this.sleep(waitMs)
          continue
        }

        // 5xx 서버 에러 - 재시도
        if (response.status >= 500) {
          const waitMs = Math.pow(2, attempt) * 1000 // exponential backoff
          console.warn(
            `Discord server error ${response.status}, retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})`
          )
          await this.sleep(waitMs)
          continue
        }

        // 4xx 클라이언트 에러 (429 제외) - 재시도 안함
        console.error(`Discord notification failed: ${response.status}`)
        return false
      } catch (error) {
        // 네트워크 에러 - 재시도
        if (attempt < maxRetries) {
          const waitMs = Math.pow(2, attempt) * 1000
          console.warn(
            `Discord network error, retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries}):`,
            error
          )
          await this.sleep(waitMs)
          continue
        }
        console.error('Discord notification error after retries:', error)
        return false
      }
    }
    return false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 알림 발송 (Discord Webhook 또는 로그)
   */
  private async sendNotification(payload: NotificationPayload): Promise<void> {
    const emoji = payload.type === 'new_lead' ? '🎯' : '🔥'
    const title = payload.type === 'new_lead' ? 'New Lead Captured!' : 'Engaged User (30+ messages)'

    // 콘솔 로그 (항상)
    console.log(`\n${emoji} ${title}`)
    console.log(`   Email: ${payload.contact.email || 'N/A'}`)
    console.log(`   Name: ${payload.contact.name || 'N/A'}`)
    console.log(`   Messages: ${payload.contact.messageCount}`)
    console.log(`   Trigger: ${payload.contact.trigger}`)
    console.log(`   Device: ${payload.contact.deviceId || 'N/A'}`)
    console.log(`   Session: ${payload.contact.sessionId}`)
    console.log(`   Time: ${payload.contact.collectedAt}\n`)

    // Discord Webhook 발송 (설정된 경우)
    if (this.discordWebhookUrl) {
      const discordPayload = {
        embeds: [
          {
            title: `${emoji} ${title}`,
            color: payload.type === 'new_lead' ? 0x00ff00 : 0xff9900, // 초록 or 주황
            fields: [
              { name: '📧 Email', value: payload.contact.email || 'N/A', inline: true },
              { name: '👤 Name', value: payload.contact.name || 'Anonymous', inline: true },
              { name: '💬 Messages', value: String(payload.contact.messageCount), inline: true },
              { name: '🏷️ Trigger', value: payload.contact.trigger, inline: true },
              { name: '📱 Device ID', value: this.formatDeviceId(payload.contact.deviceId), inline: true },
              {
                name: '🔑 Session ID',
                value:
                  payload.contact.sessionId.length > 20
                    ? `\`${payload.contact.sessionId.slice(0, 20)}...\``
                    : `\`${payload.contact.sessionId}\``,
                inline: true
              },
              ...(payload.contact.message
                ? [{ name: '📝 Message', value: payload.contact.message, inline: false }]
                : [])
            ],
            timestamp: payload.contact.collectedAt,
            footer: { text: 'Persona API Lead Capture' }
          }
        ]
      }

      const success = await this.sendDiscordWithRetry(this.discordWebhookUrl, discordPayload)
      if (!success) {
        chatLogger.warn({
          type: 'discord_notification_failed',
          payload: payload.type,
          sessionId: payload.contact.sessionId
        })
      }
    }
  }

  /**
   * 최근 리드 목록 조회 (관리용)
   */
  async getRecentContacts(limit = 10): Promise<ContactInfo[]> {
    const contacts: ContactInfo[] = []

    if (this.redis) {
      const keys = await this.redis.keys(`${CONTACT_KEY_PREFIX}*`)
      for (const key of keys.slice(0, limit)) {
        const data = await this.redis.get(key)
        if (data) contacts.push(JSON.parse(data))
      }
    } else {
      const values = Array.from(this.memoryStore.values())
      contacts.push(...values.slice(-limit))
    }

    // 최신순 정렬
    return contacts.sort(
      (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
    )
  }
}

// 전역 인스턴스
let contactService: ContactService | null = null

export function initContactService(redis?: IRedisClient | null): ContactService {
  contactService = new ContactService(redis)
  return contactService
}

export function getContactService(): ContactService {
  if (!contactService) {
    contactService = new ContactService()
  }
  return contactService
}
