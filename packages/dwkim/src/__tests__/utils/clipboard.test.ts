import { describe, expect, test } from 'bun:test'
import { getClipboardText, setClipboardText } from '../../utils/clipboard.js'

describe('clipboard', () => {
  // 플랫폼 무관: 함수 시그니처/타입 계약만 검증한다 (CI 안전)
  test('getClipboardText는 함수이고 string | null을 반환한다', () => {
    expect(typeof getClipboardText).toBe('function')
    const result = getClipboardText()
    expect(result === null || typeof result === 'string').toBe(true)
  })

  test('setClipboardText는 함수이고 boolean을 반환한다', () => {
    expect(typeof setClipboardText).toBe('function')
    // 클립보드를 더럽히지 않도록 현재 값을 복원한다
    const before = getClipboardText()
    const result = setClipboardText('')
    expect(typeof result).toBe('boolean')
    if (before !== null) setClipboardText(before)
  })

  test('실패 시에도 throw하지 않는다', () => {
    // 어떤 플랫폼/환경에서도 예외를 던지지 않아야 한다
    expect(() => getClipboardText()).not.toThrow()
    expect(() => setClipboardText('noop-probe')).not.toThrow()
  })

  // 실제 클립보드 왕복은 macOS(pbcopy/pbpaste 항상 존재)에서만 검증한다.
  // Linux/Windows CI는 xclip/wl-clipboard가 없을 수 있으므로 guard로 제외.
  describe.if(process.platform === 'darwin')('macOS 실제 왕복', () => {
    test('쓴 텍스트를 그대로 다시 읽는다 (round-trip)', () => {
      const original = getClipboardText()
      const sample = `dwkim-clipboard-test-${Date.now()}`

      const ok = setClipboardText(sample)
      expect(ok).toBe(true)
      expect(getClipboardText()).toBe(sample)

      // 원래 클립보드 내용 복원 (사용자 환경 보호)
      if (original !== null) setClipboardText(original)
    })

    test('빈 클립보드는 null을 반환한다', () => {
      const original = getClipboardText()

      setClipboardText('')
      expect(getClipboardText()).toBeNull()

      if (original !== null) setClipboardText(original)
    })

    test('멀티라인/유니코드 텍스트도 보존한다', () => {
      const original = getClipboardText()
      const sample = '첫 줄\n둘째 줄\t탭\n😀 이모지'

      setClipboardText(sample)
      expect(getClipboardText()).toBe(sample)

      if (original !== null) setClipboardText(original)
    })
  })
})
