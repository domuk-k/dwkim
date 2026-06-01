import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import * as childProcess from 'node:child_process'
import { sendNotification } from '../../utils/notify.js'

// process.stdout.write를 캡처하는 가벼운 스파이.
// mode에 따라 터미널 벨(\x07)이 출력되는지/안 되는지 검증한다.
const originalWrite = process.stdout.write.bind(process.stdout)
let writes: string[]

// execFile을 가로채 실제 osascript 시스템 알림이 발생하지 않도록 한다.
// (이게 없으면 'system'/'both' 테스트가 매 실행마다 진짜 macOS 알림을 띄운다.)
let execFileSpy: ReturnType<typeof spyOn<typeof childProcess, 'execFile'>>

function installSpy(): void {
  writes = []
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString())
    return true
  }) as typeof process.stdout.write
}

describe('sendNotification', () => {
  beforeEach(() => {
    installSpy()
    execFileSpy = spyOn(childProcess, 'execFile').mockImplementation(
      (() => undefined) as unknown as typeof childProcess.execFile
    )
  })

  afterEach(() => {
    process.stdout.write = originalWrite
    execFileSpy.mockRestore()
  })

  test("mode 'off' is a no-op (no stdout write, no system call)", () => {
    sendNotification('response_done', { mode: 'off' })
    expect(writes).toEqual([])
    expect(execFileSpy).not.toHaveBeenCalled()
  })

  test("mode 'bell' writes the terminal bell (\\x07), no system call", () => {
    sendNotification('response_done', { mode: 'bell' })
    expect(writes).toEqual(['\x07'])
    expect(execFileSpy).not.toHaveBeenCalled()
  })

  test("mode 'both' writes the terminal bell to stdout", () => {
    sendNotification('response_done', { mode: 'both' })
    expect(writes).toEqual(['\x07'])
  })

  test("mode 'system' does not write the bell to stdout", () => {
    // 시스템 알림만 시도, 벨은 출력하지 않음
    sendNotification('response_done', { mode: 'system' })
    expect(writes).toEqual([])
  })

  test('darwin에서 system 모드는 execFile(osascript)을 셸 없이 호출한다', () => {
    if (process.platform !== 'darwin') return
    sendNotification('response_done', { mode: 'system', message: 'hi "there" $(whoami)' })
    expect(execFileSpy).toHaveBeenCalledTimes(1)
    const [cmd, args] = execFileSpy.mock.calls[0] as unknown as [string, string[]]
    expect(cmd).toBe('osascript')
    // 메시지는 argv로 전달되어 셸/AppleScript 인터폴레이션을 거치지 않는다
    expect(args).toContain('hi "there" $(whoami)')
  })
})
