/**
 * 사용자 알림 유틸
 * 응답이 끝났을 때 터미널 벨 + macOS 시스템 알림으로 주의를 환기시킨다.
 *
 * - "bell": stdout에 \x07 (터미널 벨) 출력
 * - "system": macOS 네이티브 알림 (osascript)
 * - "both": 벨 + 시스템 알림
 * - "off": 아무것도 하지 않음
 */
import * as childProcess from 'node:child_process'

export type NotificationMode = 'bell' | 'system' | 'both' | 'off'

// dwkim CLI는 응답 완료 한 가지 이유만 알리면 된다 (HITL 승인/질문 등 없음)
export type NotificationReason = 'response_done'

/**
 * 사용자에게 알림을 보낸다.
 * mode가 'off'면 no-op. 그 외에는 mode에 따라 벨/시스템 알림을 발생시킨다.
 */
export function sendNotification(
  reason: NotificationReason,
  opts: {
    mode: NotificationMode
    message?: string
  }
): void {
  const { mode, message } = opts

  if (mode === 'off') {
    return
  }

  if (mode === 'bell' || mode === 'both') {
    process.stdout.write('\x07')
  }

  if (mode === 'system' || mode === 'both') {
    sendSystemNotification(reason, message)
  }
}

/**
 * macOS 시스템 알림 (osascript display notification).
 * 다른 플랫폼에서는 no-op — 추후 notify-send/powershell 추가 가능.
 *
 * execFile + AppleScript 변수 바인딩(-e 'on run argv ...')으로 셸을 거치지 않는다.
 * message가 임의의 응답 텍스트(따옴표, $(...), ' 등)를 담아도 명령 주입이 불가능하다.
 */
function sendSystemNotification(reason: NotificationReason, message?: string): void {
  if (process.platform === 'darwin') {
    const title = 'dwkim'
    const body = message ?? reasonToMessage(reason)
    // body/title은 argv로 전달되어 AppleScript 내부에서 문자열로만 다뤄진다 (인터폴레이션 없음)
    childProcess.execFile('osascript', [
      '-e',
      'on run argv',
      '-e',
      'display notification (item 1 of argv) with title (item 2 of argv)',
      '-e',
      'end run',
      body,
      title
    ])
  }
}

function reasonToMessage(reason: NotificationReason): string {
  switch (reason) {
    case 'response_done':
      return '응답이 완료되었습니다'
  }
}
