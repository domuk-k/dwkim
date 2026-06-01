/**
 * 구조화 JSON-lines 로거 (의존성 없음, node: 빌트인만 사용)
 *
 * 활성화 조건:
 * - `DWKIM_DEBUG` 환경변수가 truthy일 때만 동작. "0" / "false" / "" 는 OFF로 취급.
 * - 비활성 시 모든 메서드는 즉시 return하는 no-op(파일 IO 0). 핫패스에서 호출해도 안전.
 *
 * 싱크:
 * - ~/.dwkim/debug.log 에 한 줄에 하나의 JSON 엔트리를 append.
 * - 엔트리 형태: { ts: ISO8601, level, msg, ...fields }
 *
 * Privacy:
 * - 사용자 메시지 본문(raw text)을 절대 기록하지 않는다. 호출자는 구조화된
 *   필드만 전달한다(예: { method, sourceCount }). 본문은 넘기지 말 것.
 *
 * 안정성:
 * - 모든 fs 연산은 try/catch로 감싼다. 어떤 오류도 throw하지 않는다.
 * - 한 번이라도 IO에 실패하면 해당 세션 동안 조용히 no-op으로 강등된다.
 *
 * 회전(rotation):
 * - 파일이 ~1MB를 넘으면 debug.log.1 로 단일 회전(best-effort).
 */

import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// 경로는 호출 시점에 lazy 계산한다(HOME 변경/테스트 격리에 안전).
// 프로덕션에서는 homedir()와 동일(시작 시 HOME 기반). 단, Bun의 homedir()는
// 시작 시점 값을 캐시하므로, 런타임 HOME 변경(테스트 격리)을 반영하도록 env를 우선한다.
function configDir(): string {
  return join(process.env.HOME || homedir(), '.dwkim')
}
function logFile(): string {
  return join(configDir(), 'debug.log')
}
function logFileRotated(): string {
  return join(configDir(), 'debug.log.1')
}

// best-effort 크기 캡 (~1MB). 넘으면 단일 회전.
const MAX_LOG_BYTES = 1_048_576

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const
export type LogLevel = keyof typeof LEVELS

type Fields = Record<string, unknown>

/**
 * DWKIM_DEBUG가 truthy인지 판정. "0" / "false" / "" 는 비활성.
 */
export function isDebugEnabled(): boolean {
  const v = process.env.DWKIM_DEBUG
  if (!v) return false
  const lowered = v.trim().toLowerCase()
  if (lowered === '0' || lowered === 'false' || lowered === '') return false
  return true
}

class Logger {
  // 한 번 IO 실패하면 세션 동안 no-op으로 강등
  private disabledForSession = false

  private ensureDir(): boolean {
    try {
      const dir = configDir()
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * best-effort 회전. 파일이 캡을 넘으면 debug.log.1로 이동.
   * 어떤 오류도 무시한다.
   */
  private maybeRotate(): void {
    try {
      const file = logFile()
      if (!existsSync(file)) return
      const size = statSync(file).size
      if (size <= MAX_LOG_BYTES) return
      // 기존 회전본을 덮어쓴다(단일 회전).
      renameSync(file, logFileRotated())
    } catch {
      // 회전 실패는 무시 — 다음 write는 그대로 진행
    }
  }

  private write(level: LogLevel, msg: string, fields?: Fields): void {
    // 비활성 또는 세션 강등 시 즉시 return (파일 IO 없음)
    if (this.disabledForSession || !isDebugEnabled()) return

    try {
      if (!this.ensureDir()) {
        this.disabledForSession = true
        return
      }
      this.maybeRotate()

      const entry: Record<string, unknown> = {
        ts: new Date().toISOString(),
        level,
        msg,
        ...fields
      }
      appendFileSync(logFile(), `${JSON.stringify(entry)}\n`)
    } catch {
      // 어떤 IO 오류도 throw하지 않는다. 세션 동안 no-op으로 강등.
      this.disabledForSession = true
    }
  }

  debug(msg: string, fields?: Fields): void {
    this.write('debug', msg, fields)
  }

  info(msg: string, fields?: Fields): void {
    this.write('info', msg, fields)
  }

  warn(msg: string, fields?: Fields): void {
    this.write('warn', msg, fields)
  }

  error(msg: string, fields?: Fields): void {
    this.write('error', msg, fields)
  }
}

/** 싱글턴 로거. */
export const logger = new Logger()
