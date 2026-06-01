/**
 * 전역 크래시 핸들러
 *
 * process.on('uncaughtException') / process.on('unhandledRejection')를 등록한다.
 * 각 핸들러는:
 * - logger.error로 구조화 기록 (DWKIM_DEBUG 시 ~/.dwkim/debug.log)
 * - reportCrash로 best-effort 텔레메트리 전송 (opt-out 가능)
 * - 짧은 bounded flush(최대 3초) 후 터미널 복구를 시도하고 exit(1)
 *
 * 재진입 방지: 핸들러 내부에서 또 크래시가 나도 루프하지 않도록 플래그로 가드.
 *
 * 터미널 안전: TUI raw/alt-screen 중 크래시가 나면 cooked 모드/메인 스크린으로
 * best-effort 복구하고 stderr에 읽을 수 있는 한 줄을 남긴다. (app.ts의 cleanup에
 * 직접 닿을 수 없으므로 여기서 최소 복구만 수행한다.)
 */

import { logger } from './logger.js'
import { type CrashKind, reportCrash } from './telemetry.js'

let isHandlingFatal = false

const FLUSH_TIMEOUT_MS = 3000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * TUI가 점유했을 수 있는 터미널을 best-effort로 복구한다.
 * - raw 모드 해제
 * - alt-screen / cursor 복구 ANSI 시퀀스 출력
 * 어떤 오류도 무시한다.
 */
function restoreTerminal(): void {
  try {
    if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
      process.stdin.setRawMode(false)
    }
  } catch {
    // 무시
  }
  try {
    if (process.stdout.isTTY) {
      // CSI ?1049l: alt-screen 종료, CSI ?25h: 커서 표시, CSI ?2026l: sync 종료
      process.stdout.write('\x1b[?2026l\x1b[?1049l\x1b[?25h')
    }
  } catch {
    // 무시
  }
}

/**
 * 치명적 오류를 처리: 로깅 + 텔레메트리(bounded) + 터미널 복구 + exit(1).
 * 재진입 가드로 핸들러 내부 크래시 루프를 막는다.
 */
async function handleFatal(error: unknown, kind: CrashKind): Promise<void> {
  if (isHandlingFatal) {
    // 핸들러 처리 중 또 터지면 즉시 종료 (루프 방지)
    try {
      restoreTerminal()
    } catch {
      // 무시
    }
    process.exit(1)
  }
  isHandlingFatal = true

  logger.error('fatal', {
    kind,
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error)
  })

  // bounded flush: 리포트가 3초 안에 끝나지 않아도 진행한다.
  try {
    await Promise.race([reportCrash(error, { kind }), sleep(FLUSH_TIMEOUT_MS)])
  } catch {
    // reportCrash는 throw하지 않지만 방어적으로 감싼다.
  }

  restoreTerminal()
  // stderr에 읽을 수 있는 한 줄 (TUI 복구 후이므로 보인다).
  try {
    process.stderr.write(`\n[dwkim] Fatal error (${kind}): ${formatError(error)}\n`)
  } catch {
    // 무시
  }

  process.exit(1)
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message
  return String(error)
}

/**
 * 전역 크래시 핸들러를 설치한다. main() 진입 시 한 번 호출.
 *
 * - uncaughtException: 로깅 + 리포트 후 exit(1).
 * - unhandledRejection: CLI에서는 좀비 상태를 피하려고 동일하게 exit(1).
 */
export function installCrashHandlers(): void {
  process.on('uncaughtException', (error) => {
    void handleFatal(error, 'uncaughtException')
  })

  process.on('unhandledRejection', (reason) => {
    void handleFatal(reason, 'unhandledRejection')
  })
}
