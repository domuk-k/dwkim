/**
 * 터미널 테마 자동 감지.
 *
 * 감지 우선순위 (detectThemeModeSync):
 * 1. DWKIM_THEME 환경변수 ('dark' / 'light') — 명시적 오버라이드
 * 2. COLORFGBG 환경변수 (일부 터미널 에뮬레이터가 설정) — 배경 luminance 추정
 * 3. 기본값: 'dark'
 *
 * detectThemeModeSync는 순수 + 동기 함수다. TTY를 만지거나 출력을 쓰지 않으므로
 * 모듈 로드 시점에 안전하게 호출할 수 있다.
 *
 * queryTerminalTheme는 OSC 11(배경색 질의)을 보내 실제 터미널 배경을 묻는다.
 * 이건 stdin/stdout 부수효과가 있으므로 별도 async 함수로 분리했다.
 */

export type ThemeMode = 'dark' | 'light'

/**
 * 16진수 색상(#rrggbb 또는 rrggbb)의 WCAG 상대 휘도(0~1)를 계산한다.
 * luma >= 0.5 면 밝은 배경(light), 그 미만이면 어두운 배경(dark)으로 본다.
 */
export function luminance(hex: string): number {
  const normalized = hex.replace(/^#/, '')
  if (normalized.length !== 6) return 0

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return 0

  // sRGB → 선형 변환 후 WCAG 가중치 적용
  const toLinear = (channel: number): number =>
    channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * DWKIM_THEME 환경변수를 읽어 명시적 모드를 반환한다.
 * 'dark' / 'light' 만 인정하고, 그 외/미설정이면 null.
 */
function readEnvOverride(): ThemeMode | null {
  const value = process.env.DWKIM_THEME?.trim().toLowerCase()
  if (value === 'light') return 'light'
  if (value === 'dark') return 'dark'
  return null
}

/**
 * COLORFGBG 환경변수를 해석한다.
 * 형식: "fg;bg" 또는 "fg;...;bg" — 마지막 토큰이 배경 ANSI 색상 인덱스.
 * 표준 ANSI: 0~6 은 어두운 색, 7 이상(7=흰색/밝은 회색, 15=밝은 흰색)은 밝은 색.
 */
function readColorFgBg(): ThemeMode | null {
  const colorFgBg = process.env.COLORFGBG
  if (!colorFgBg) return null

  const parts = colorFgBg.split(';')
  const bgPart = parts[parts.length - 1]
  if (bgPart === undefined) return null

  const bgIndex = Number.parseInt(bgPart, 10)
  if (Number.isNaN(bgIndex)) return null

  return bgIndex >= 7 ? 'light' : 'dark'
}

/**
 * 동기/순수 테마 감지. 환경변수만 본다.
 * 모듈 로드 시점(예: theme.ts 최상단)에서 호출하기 위한 진입점.
 */
export function detectThemeModeSync(): ThemeMode {
  // 1. 명시적 오버라이드
  const override = readEnvOverride()
  if (override) return override

  // 2. COLORFGBG 기반 추정
  const fromColorFgBg = readColorFgBg()
  if (fromColorFgBg) return fromColorFgBg

  // 3. 기본값
  return 'dark'
}

/**
 * OSC 11(터미널 배경색 질의)로 실제 배경색을 묻는다.
 * stdin/stdout 이 TTY 일 때만 동작하며, raw 모드를 잠깐 켰다가 원상복구한다.
 * 응답이 없거나(timeout) 비-TTY 환경이면 null 을 resolve 한다.
 *
 * 부수효과가 있으므로 detectThemeModeSync 와 분리했다. 통합 시 모듈 로드가 아니라
 * 앱 부팅(app.ts) 직후 한 번 await 해서 결과를 theme 에 반영하는 식으로 쓰면 된다.
 */
export function queryTerminalTheme(timeoutMs = 200): Promise<ThemeMode | null> {
  return new Promise((resolve) => {
    const stdin = process.stdin
    const stdout = process.stdout

    // TTY 가 아니면 질의 불가
    if (!stdin.isTTY || !stdout.isTTY) {
      resolve(null)
      return
    }

    let settled = false
    let buffer = ''
    let wasRaw = false
    let wasResumed = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const cleanup = (): void => {
      if (settled) return
      settled = true
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
      stdin.removeListener('data', onData)
      try {
        if (stdin.isTTY) stdin.setRawMode(wasRaw)
      } catch {
        // raw 모드 복구 실패는 무시
      }
      // 우리가 resume 했을 때만 다시 pause
      if (wasResumed) stdin.pause()
    }

    const onData = (data: Buffer): void => {
      buffer += data.toString()

      // OSC 11 응답: \x1b]11;rgb:RRRR/GGGG/BBBB (BEL 또는 ST 종료자)
      // biome-ignore lint/suspicious/noControlCharactersInRegex: OSC 11 응답은 ESC(\x1b) 제어문자로 시작하므로 의도된 매칭이다
      const match = buffer.match(/\x1b\]11;rgb:([0-9a-fA-F]+)\/([0-9a-fA-F]+)\/([0-9a-fA-F]+)/)
      if (!match) return

      cleanup()

      // 터미널은 컴포넌트당 2 또는 4 hex 로 응답할 수 있음
      const normalize = (hex: string): number => {
        const val = Number.parseInt(hex, 16)
        return hex.length <= 2 ? val / 0xff : val / 0xffff
      }
      const r = normalize(match[1] ?? '0')
      const g = normalize(match[2] ?? '0')
      const b = normalize(match[3] ?? '0')

      const toHexByte = (v: number): string =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, '0')
      const bgHex = `${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`

      resolve(luminance(bgHex) >= 0.5 ? 'light' : 'dark')
    }

    timer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, timeoutMs)
    if (timer.unref) timer.unref()

    try {
      wasRaw = stdin.isRaw ?? false
      stdin.setRawMode(true)
      if (stdin.isPaused()) {
        stdin.resume()
        wasResumed = true
      }
      stdin.on('data', onData)

      // OSC 11 질의 — 호환성 위해 BEL(\x07) 종료자 사용
      stdout.write('\x1b]11;?\x07')
    } catch {
      cleanup()
      resolve(null)
    }
  })
}
