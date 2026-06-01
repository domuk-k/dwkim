import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// telemetry → deviceId/logger 가 homedir() 기반 경로를 import 시점에 계산하므로
// 격리된 임시 HOME을 import 전에 설정한다.
const ORIGINAL_HOME = process.env.HOME
const TMP_HOME = mkdtempSync(join(tmpdir(), 'dwkim-telemetry-test-'))
process.env.HOME = TMP_HOME

const { isTelemetryEnabled, reportCrash } = await import('../../utils/telemetry.js')

const ORIGINAL_NO_TELEMETRY = process.env.DWKIM_NO_TELEMETRY
const ORIGINAL_FETCH = globalThis.fetch

process.on('exit', () => {
  if (ORIGINAL_HOME === undefined) delete process.env.HOME
  else process.env.HOME = ORIGINAL_HOME
  try {
    rmSync(TMP_HOME, { recursive: true, force: true })
  } catch {
    // 무시
  }
})

beforeEach(() => {
  // 다른 테스트 파일이 HOME을 바꿨을 수 있으므로 매 테스트마다 우리 HOME으로 고정.
  process.env.HOME = TMP_HOME
  delete process.env.DWKIM_NO_TELEMETRY
})

afterEach(() => {
  if (ORIGINAL_NO_TELEMETRY === undefined) delete process.env.DWKIM_NO_TELEMETRY
  else process.env.DWKIM_NO_TELEMETRY = ORIGINAL_NO_TELEMETRY
  globalThis.fetch = ORIGINAL_FETCH
})

describe('isTelemetryEnabled', () => {
  test('default is enabled (opt-out model)', () => {
    delete process.env.DWKIM_NO_TELEMETRY
    expect(isTelemetryEnabled()).toBe(true)
  })

  test('disabled when DWKIM_NO_TELEMETRY truthy', () => {
    process.env.DWKIM_NO_TELEMETRY = '1'
    expect(isTelemetryEnabled()).toBe(false)
    process.env.DWKIM_NO_TELEMETRY = 'true'
    expect(isTelemetryEnabled()).toBe(false)
  })

  test('NOT disabled when DWKIM_NO_TELEMETRY is "0" / "false"', () => {
    process.env.DWKIM_NO_TELEMETRY = '0'
    expect(isTelemetryEnabled()).toBe(true)
    process.env.DWKIM_NO_TELEMETRY = 'false'
    expect(isTelemetryEnabled()).toBe(true)
  })

  test('disabled when config.json has telemetry === false', () => {
    const dir = join(TMP_HOME, '.dwkim')
    const file = join(dir, 'config.json')
    try {
      mkdirSync(dir, { recursive: true })
      writeFileSync(file, JSON.stringify({ telemetry: false }))
      expect(isTelemetryEnabled()).toBe(false)
    } finally {
      rmSync(file, { force: true })
    }
  })
})

describe('reportCrash payload', () => {
  test('posts a PII-free payload with deviceId, version, platform', async () => {
    let captured: { url: string; body: Record<string, unknown> } | null = null
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      captured = { url: String(url), body: JSON.parse(String(init?.body)) }
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch

    const err = new Error('boom went the thing')
    await reportCrash(err, { kind: 'uncaughtException' })

    expect(captured).not.toBeNull()
    const { url, body } = captured as unknown as {
      url: string
      body: Record<string, unknown>
    }
    expect(url).toContain('/api/v1/telemetry/error')

    // 필수 필드 존재
    expect(body.kind).toBe('uncaughtException')
    expect(body.message).toBe('boom went the thing')
    expect(typeof body.deviceId).toBe('string')
    expect(typeof body.version).toBe('string')
    expect(body.platform).toBe(process.platform)
    expect(body.arch).toBe(process.arch)
    expect(body.nodeVersion).toBe(process.version)
    expect(typeof body.ts).toBe('string')

    // PII / 컨텍스트 누출 금지
    expect(body).not.toHaveProperty('cwd')
    expect(body).not.toHaveProperty('env')
    expect(body).not.toHaveProperty('argv')
    expect(body).not.toHaveProperty('content')
  })

  test('does NOT post when telemetry disabled', async () => {
    process.env.DWKIM_NO_TELEMETRY = '1'
    let called = false
    globalThis.fetch = (async () => {
      called = true
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch

    await reportCrash(new Error('nope'), { kind: 'fatal' })
    expect(called).toBe(false)
  })

  test('never throws on fetch rejection', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch

    let threw = false
    try {
      await reportCrash(new Error('crash'), { kind: 'fatal' })
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
  })

  test('never throws on non-2xx response', async () => {
    globalThis.fetch = (async () => new Response('err', { status: 500 })) as unknown as typeof fetch
    let threw = false
    try {
      await reportCrash(new Error('crash'), { kind: 'fatal' })
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
  })

  test('handles non-Error inputs without throwing', async () => {
    globalThis.fetch = (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch
    let threw = false
    try {
      await reportCrash('string error', { kind: 'fatal' })
      await reportCrash(undefined)
    } catch {
      threw = true
    }
    expect(threw).toBe(false)
  })
})
