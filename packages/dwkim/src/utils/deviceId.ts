/**
 * Device ID 관리
 * ~/.dwkim/device_id에 저장하여 재방문 사용자 식별
 *
 * Privacy:
 * - UUID는 로컬에만 저장, 개인정보 없음
 * - 사용자가 삭제 가능 (rm ~/.dwkim/device_id)
 * - 이메일 연결은 사용자 동의 시에만
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { logger } from './logger.js'

// HOME을 lazy로 읽어 테스트에서 임시 디렉토리로 격리 가능하게 한다 (logger/config와 동일 패턴)
function configDir(): string {
  return join(process.env.HOME || homedir(), '.dwkim')
}
function deviceIdFile(): string {
  return join(configDir(), 'device_id')
}

/**
 * Device ID 조회 또는 생성
 * 최초 실행 시 UUID v4 생성, 이후 동일 ID 반환
 */
export function getDeviceId(): string {
  const dir = configDir()
  const file = deviceIdFile()
  try {
    // 디렉토리 확보
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // 기존 ID 조회
    if (existsSync(file)) {
      const id = readFileSync(file, 'utf-8').trim()
      if (isValidUUID(id)) {
        return id
      }
      // 잘못된 형식이면 재생성
    }

    // 새 ID 생성 및 저장
    const deviceId = randomUUID()
    writeFileSync(file, deviceId)
    return deviceId
  } catch (error) {
    // 파일 시스템 오류 시 세션용 임시 ID 반환 (TUI 점유 중 console 출력 금지 → logger)
    logger.warn('device_id_persist_failed', {
      error: error instanceof Error ? error.message : String(error),
      configDir: dir
    })
    return `temp-${randomUUID()}`
  }
}

/**
 * UUID 형식 검증
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}
