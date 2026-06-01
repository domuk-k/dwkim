/**
 * 프라이버시 안전 크래시 리포터 (best-effort POST)
 *
 * 모델: opt-out (기본 활성).
 * 비활성 조건:
 * - `DWKIM_NO_TELEMETRY` 환경변수가 truthy일 때, 또는
 * - config.json의 `telemetry === false` 일 때.
 *
 * 페이로드는 최소·PII 프리:
 * - error.message / 잘라낸 stack / name, 버전, deviceId(로컬 UUID), platform,
 *   arch, nodeVersion, ts 만 전송한다.
 * - 사용자 메시지 본문, cwd, env, argv는 절대 포함하지 않는다.
 *
 * 전송:
 * - `${baseUrl}/api/v1/telemetry/error` 로 POST. 3초 타임아웃.
 * - 절대 throw하지 않고, 절대 블록하지 않는다. 항상 resolve되는 Promise 반환.
 * - 네트워크 실패 / 비2xx → logger.debug로 남기고 조용히 무시.
 *
 * 로컬 로깅(logger.error)은 텔레메트리 opt-out과 무관하게 항상 수행한다
 * (로컬 로깅은 텔레메트리가 아니다).
 */

import { getTelemetryEnabled } from './config.js'
import { getDeviceId } from './deviceId.js'
import { logger } from './logger.js'
import { getVersion } from './version.js'

const DEFAULT_API_URL = 'https://persona-api.fly.dev'

// stack 길이 캡 (대략적). 과도한 payload 방지.
const MAX_STACK_CHARS = 4000

/**
 * 절대경로에 박힌 OS username을 제거한다 (PII).
 * stack/message에 `/Users/alice/...`, `/home/alice/...`, `C:\Users\alice\...`
 * 같은 경로가 섞여 들어오면 username 부분을 `<redacted>`로 치환한다.
 */
function redactHomePaths(s: string): string {
  return s
    .replace(/\/(Users|home)\/[^/\s]+/g, '/$1/<redacted>')
    .replace(/([A-Za-z]:\\Users\\)[^\\\s]+/g, '$1<redacted>')
}

// POST 타임아웃 (ms). 절대 블록하지 않도록 짧게.
const TELEMETRY_TIMEOUT_MS = 3000

export type CrashKind = 'uncaughtException' | 'unhandledRejection' | 'fatal'

interface CrashContext {
  kind?: CrashKind
}

interface CrashPayload {
  kind: CrashKind
  name: string
  message: string
  stack: string | null
  version: string
  deviceId: string
  platform: string
  arch: string
  nodeVersion: string
  ts: string
}

function baseUrl(): string {
  return process.env.DWKIM_API_URL || DEFAULT_API_URL
}

function isTruthyEnv(v: string | undefined): boolean {
  if (!v) return false
  const lowered = v.trim().toLowerCase()
  if (lowered === '0' || lowered === 'false' || lowered === '') return false
  return true
}

/**
 * 텔레메트리 활성 여부. opt-out 모델.
 * DWKIM_NO_TELEMETRY가 truthy거나 config.telemetry === false면 비활성.
 */
export function isTelemetryEnabled(): boolean {
  if (isTruthyEnv(process.env.DWKIM_NO_TELEMETRY)) return false
  if (getTelemetryEnabled() === false) return false
  return true
}

/**
 * error로부터 최소·PII 프리 페이로드를 구성한다.
 */
function buildPayload(error: unknown, kind: CrashKind): CrashPayload {
  const err = error instanceof Error ? error : undefined
  const rawStack = err?.stack ?? ''
  // username이 박힌 절대경로를 제거한 뒤 길이 캡 적용
  const stack = rawStack ? redactHomePaths(rawStack).slice(0, MAX_STACK_CHARS) : null

  return {
    kind,
    name: err?.name ?? 'Error',
    message: redactHomePaths(err?.message ?? String(error)),
    stack,
    version: getVersion(),
    deviceId: getDeviceId(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    ts: new Date().toISOString()
  }
}

/**
 * 크래시 리포트. 항상 resolve되며 절대 throw/블록하지 않는다.
 *
 * - 로컬 logger.error는 opt-out과 무관하게 항상 수행.
 * - 텔레메트리 비활성이면 네트워크 전송은 생략하고 resolve.
 * - 전송 실패/비2xx는 logger.debug로 남기고 swallow.
 */
export async function reportCrash(error: unknown, context?: CrashContext): Promise<void> {
  const kind: CrashKind = context?.kind ?? 'fatal'
  const payload = buildPayload(error, kind)

  // 로컬 로깅은 텔레메트리가 아니다 — 항상 수행.
  logger.error('crash', {
    kind,
    name: payload.name,
    message: payload.message,
    version: payload.version
  })

  if (!isTelemetryEnabled()) return

  try {
    const response = await fetch(`${baseUrl()}/api/v1/telemetry/error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': payload.deviceId
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TELEMETRY_TIMEOUT_MS)
    })

    if (!response.ok) {
      logger.debug('telemetry_non_2xx', { status: response.status })
    }
  } catch (e) {
    // 네트워크/타임아웃/그 외 모든 실패 → 조용히 무시
    logger.debug('telemetry_failed', {
      error: e instanceof Error ? e.message : String(e)
    })
  }
}
