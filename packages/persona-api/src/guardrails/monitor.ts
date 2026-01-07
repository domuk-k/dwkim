/**
 * Guardrail Monitor - 보안 이벤트 로깅 및 알림
 *
 * HITL (Human-in-the-Loop) 패턴 구현:
 * - AI가 감지 못하는 보안 이상 → 인간에게 알림
 * - Discord webhook으로 실시간 알림 (선택적)
 *
 * @see https://arxiv.org/abs/2511.15759
 */

import { env } from '../config/env';

export type SecurityEventType =
  | 'input_blocked'      // Level 1: 입력 차단
  | 'history_rejected'   // Level 2: 히스토리 검증 실패
  | 'output_filtered'    // Level 3: 응답 필터링
  | 'document_flagged'   // Level 4: 문서 경고
  | 'suspicious_pattern'; // 기타 의심 패턴

export interface SecurityEvent {
  type: SecurityEventType;
  message: string;
  deviceId?: string;
  ip?: string;
  sessionId?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

// 알림 디바운싱 (1분에 최대 5개)
const alertHistory: Map<string, number> = new Map();
const ALERT_DEBOUNCE_MS = 60_000;
const MAX_ALERTS_PER_MINUTE = 5;

function getAlertKey(event: SecurityEvent): string {
  return `${event.type}:${event.ip || 'unknown'}`;
}

function shouldSendAlert(event: SecurityEvent): boolean {
  const key = getAlertKey(event);
  const now = Date.now();
  const lastAlert = alertHistory.get(key) || 0;

  if (now - lastAlert < ALERT_DEBOUNCE_MS) {
    return false; // 디바운싱
  }

  // 전체 알림 수 체크
  let recentAlerts = 0;
  const cutoff = now - ALERT_DEBOUNCE_MS;
  for (const timestamp of alertHistory.values()) {
    if (timestamp > cutoff) recentAlerts++;
  }

  if (recentAlerts >= MAX_ALERTS_PER_MINUTE) {
    return false; // 알림 피로 방지
  }

  alertHistory.set(key, now);

  // 오래된 항목 정리
  for (const [k, timestamp] of alertHistory.entries()) {
    if (now - timestamp > ALERT_DEBOUNCE_MS * 2) {
      alertHistory.delete(k);
    }
  }

  return true;
}

/**
 * Discord 알림 전송 (fire-and-forget)
 */
async function sendDiscordAlert(event: SecurityEvent): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) return;
  if (!shouldSendAlert(event)) return;

  const colorMap: Record<SecurityEventType, number> = {
    input_blocked: 0xff6b6b,      // 빨강
    history_rejected: 0xffa94d,   // 주황
    output_filtered: 0xffd43b,    // 노랑
    document_flagged: 0x748ffc,   // 파랑
    suspicious_pattern: 0xe599f7, // 보라
  };

  const fields = [
    { name: 'Type', value: event.type, inline: true },
    { name: 'IP', value: event.ip || 'N/A', inline: true },
    { name: 'Device ID', value: event.deviceId?.slice(0, 8) || 'N/A', inline: true },
  ];

  if (event.sessionId) {
    fields.push({ name: 'Session', value: event.sessionId.slice(0, 8), inline: true });
  }

  if (event.details) {
    fields.push({
      name: 'Details',
      value: JSON.stringify(event.details, null, 2).slice(0, 1000),
      inline: false,
    });
  }

  try {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: `🚨 Guardrail Alert`,
            description: event.message.slice(0, 500),
            color: colorMap[event.type],
            fields,
            timestamp: event.timestamp.toISOString(),
            footer: {
              text: 'persona-api Guardrails',
            },
          },
        ],
      }),
    });
  } catch (error) {
    // 알림 실패는 로깅만 (메인 플로우 차단 X)
    console.error('[GUARDRAIL_MONITOR] Discord alert failed:', error);
  }
}

/**
 * 보안 이벤트 기록
 * - 항상 콘솔 로그
 * - 선택적으로 Discord 알림 (DISCORD_WEBHOOK_URL 설정 시)
 */
export function logSecurityEvent(event: SecurityEvent): void {
  // 콘솔 로그 (항상)
  console.warn('[GUARDRAIL]', JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString(),
  }));

  // Discord 알림 (fire-and-forget)
  sendDiscordAlert(event).catch(() => {
    // 무시 (이미 sendDiscordAlert 내부에서 로깅)
  });
}

/**
 * 편의 함수: 입력 차단 이벤트
 */
export function logInputBlocked(
  ip: string,
  reason: string,
  details?: Record<string, unknown>
): void {
  logSecurityEvent({
    type: 'input_blocked',
    message: `Input blocked: ${reason}`,
    ip,
    timestamp: new Date(),
    details,
  });
}

/**
 * 편의 함수: 히스토리 검증 실패 이벤트
 */
export function logHistoryRejected(
  ip: string,
  sessionId: string,
  reason: string
): void {
  logSecurityEvent({
    type: 'history_rejected',
    message: `History validation failed: ${reason}`,
    ip,
    sessionId,
    timestamp: new Date(),
  });
}

/**
 * 편의 함수: 응답 필터링 이벤트
 */
export function logOutputFiltered(
  sessionId: string,
  patterns: string[]
): void {
  logSecurityEvent({
    type: 'output_filtered',
    message: `Output filtered: ${patterns.length} patterns detected`,
    sessionId,
    timestamp: new Date(),
    details: { patterns },
  });
}
