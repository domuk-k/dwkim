import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// logger 모듈은 import 시점에 homedir() 기반으로 CONFIG_DIR을 계산한다.
// 격리된 임시 HOME을 import 전에 설정한다.
const ORIGINAL_HOME = process.env.HOME
const TMP_HOME = mkdtempSync(join(tmpdir(), 'dwkim-logger-test-'))
process.env.HOME = TMP_HOME

// HOME 설정 후 import (동적 import로 평가 시점 보장)
const { logger, isDebugEnabled } = await import('../../utils/logger.js')

const LOG_FILE = join(TMP_HOME, '.dwkim', 'debug.log')

const ORIGINAL_DEBUG = process.env.DWKIM_DEBUG

beforeEach(() => {
  // 다른 테스트 파일이 HOME을 바꿨을 수 있으므로 매 테스트마다 우리 HOME으로 고정.
  process.env.HOME = TMP_HOME
  // 각 테스트 전 로그 파일 정리
  try {
    rmSync(LOG_FILE, { force: true })
  } catch {
    // 무시
  }
})

afterEach(() => {
  if (ORIGINAL_DEBUG === undefined) delete process.env.DWKIM_DEBUG
  else process.env.DWKIM_DEBUG = ORIGINAL_DEBUG
})

// 전체 테스트 종료 후 임시 HOME 복구 + 삭제
process.on('exit', () => {
  if (ORIGINAL_HOME === undefined) delete process.env.HOME
  else process.env.HOME = ORIGINAL_HOME
  try {
    rmSync(TMP_HOME, { recursive: true, force: true })
  } catch {
    // 무시
  }
})

describe('isDebugEnabled', () => {
  test('returns false when DWKIM_DEBUG unset', () => {
    delete process.env.DWKIM_DEBUG
    expect(isDebugEnabled()).toBe(false)
  })

  test('returns false for "0" / "false" / empty', () => {
    process.env.DWKIM_DEBUG = '0'
    expect(isDebugEnabled()).toBe(false)
    process.env.DWKIM_DEBUG = 'false'
    expect(isDebugEnabled()).toBe(false)
    process.env.DWKIM_DEBUG = ''
    expect(isDebugEnabled()).toBe(false)
  })

  test('returns true for truthy values', () => {
    process.env.DWKIM_DEBUG = '1'
    expect(isDebugEnabled()).toBe(true)
    process.env.DWKIM_DEBUG = 'true'
    expect(isDebugEnabled()).toBe(true)
  })
})

describe('logger file sink', () => {
  test('writes nothing when DWKIM_DEBUG unset', () => {
    delete process.env.DWKIM_DEBUG
    logger.info('test_event', { foo: 'bar' })
    expect(existsSync(LOG_FILE)).toBe(false)
  })

  test('writes a valid JSON line when DWKIM_DEBUG set', () => {
    process.env.DWKIM_DEBUG = '1'
    logger.info('test_event', { foo: 'bar', count: 3 })

    expect(existsSync(LOG_FILE)).toBe(true)
    const content = readFileSync(LOG_FILE, 'utf-8').trim()
    const lines = content.split('\n').filter(Boolean)
    expect(lines.length).toBeGreaterThanOrEqual(1)

    const entry = JSON.parse(lines[lines.length - 1] as string)
    expect(entry.level).toBe('info')
    expect(entry.msg).toBe('test_event')
    expect(entry.foo).toBe('bar')
    expect(entry.count).toBe(3)
    expect(typeof entry.ts).toBe('string')
    // ISO8601 형식 확인
    expect(Number.isNaN(Date.parse(entry.ts))).toBe(false)
  })

  test('records the correct level for each method', () => {
    process.env.DWKIM_DEBUG = '1'
    logger.debug('d')
    logger.warn('w')
    logger.error('e')

    const lines = readFileSync(LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean)
    const levels = lines.map((l) => JSON.parse(l).level)
    expect(levels).toContain('debug')
    expect(levels).toContain('warn')
    expect(levels).toContain('error')
  })

  test('never throws', () => {
    process.env.DWKIM_DEBUG = '1'
    expect(() => logger.info('x')).not.toThrow()
    delete process.env.DWKIM_DEBUG
    expect(() => logger.error('y', { z: 1 })).not.toThrow()
  })
})
