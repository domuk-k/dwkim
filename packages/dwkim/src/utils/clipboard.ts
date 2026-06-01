/**
 * 시스템 클립보드 텍스트 읽기/쓰기
 *
 * paste/copy 이벤트에서만 동작하므로 동기 실행(execFileSync)을 사용한다.
 * macOS: pbpaste/pbcopy. Linux: xclip 우선, 실패 시 wl-paste/wl-copy (Wayland).
 * 모든 실패는 throw 없이 null/false로 흡수한다.
 *
 * 보안: 셸을 거치지 않는 execFileSync + 인자 배열만 사용한다.
 * 텍스트는 stdin(`input`)으로 전달하므로 명령 문자열에 사용자 입력을 끼워넣지 않는다.
 */

import { execFileSync } from 'node:child_process'

// 클립보드 명령은 짧게 끊는다 (UI 블로킹 방지)
const TIMEOUT_MS = 2000

// stdout/stderr를 파이프로 받아 터미널 오염을 막는다
const STDIO: ['pipe', 'pipe', 'pipe'] = ['pipe', 'pipe', 'pipe']

/**
 * 시스템 클립보드에서 일반 텍스트를 읽는다.
 * 비어있거나 읽기 실패 시 null 반환.
 */
export function getClipboardText(): string | null {
  try {
    if (process.platform === 'darwin') {
      const text = execFileSync('pbpaste', [], {
        encoding: 'utf-8',
        timeout: TIMEOUT_MS,
        stdio: STDIO
      })
      return text.length > 0 ? text : null
    }
    if (process.platform === 'linux') {
      // xclip 우선, 없으면 wl-paste (Wayland) fallback
      try {
        const text = execFileSync('xclip', ['-selection', 'clipboard', '-o'], {
          encoding: 'utf-8',
          timeout: TIMEOUT_MS,
          stdio: STDIO
        })
        return text.length > 0 ? text : null
      } catch {
        const text = execFileSync('wl-paste', [], {
          encoding: 'utf-8',
          timeout: TIMEOUT_MS,
          stdio: STDIO
        })
        return text.length > 0 ? text : null
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * 시스템 클립보드에 일반 텍스트를 쓴다.
 * 성공 시 true, 실패 시 false.
 */
export function setClipboardText(text: string): boolean {
  try {
    if (process.platform === 'darwin') {
      execFileSync('pbcopy', [], {
        input: text,
        timeout: TIMEOUT_MS,
        stdio: STDIO
      })
      return true
    }
    if (process.platform === 'linux') {
      // xclip 우선, 없으면 wl-copy (Wayland) fallback
      try {
        execFileSync('xclip', ['-selection', 'clipboard'], {
          input: text,
          timeout: TIMEOUT_MS,
          stdio: STDIO
        })
        return true
      } catch {
        execFileSync('wl-copy', [], {
          input: text,
          timeout: TIMEOUT_MS,
          stdio: STDIO
        })
        return true
      }
    }
    return false
  } catch {
    return false
  }
}
