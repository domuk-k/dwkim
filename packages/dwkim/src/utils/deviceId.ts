/**
 * Device ID 관리
 * ~/.dwkim/device_id에 저장하여 재방문 사용자 식별
 *
 * Privacy:
 * - UUID는 로컬에만 저장, 개인정보 없음
 * - 사용자가 삭제 가능 (rm ~/.dwkim/device_id)
 * - 이메일 연결은 사용자 동의 시에만
 */
import { randomUUID } from 'crypto';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.dwkim');
const DEVICE_ID_FILE = join(CONFIG_DIR, 'device_id');

/**
 * Device ID 조회 또는 생성
 * 최초 실행 시 UUID v4 생성, 이후 동일 ID 반환
 */
export function getDeviceId(): string {
  try {
    // 디렉토리 확보
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // 기존 ID 조회
    if (existsSync(DEVICE_ID_FILE)) {
      const id = readFileSync(DEVICE_ID_FILE, 'utf-8').trim();
      if (isValidUUID(id)) {
        return id;
      }
      // 잘못된 형식이면 재생성
    }

    // 새 ID 생성 및 저장
    const deviceId = randomUUID();
    writeFileSync(DEVICE_ID_FILE, deviceId);
    return deviceId;
  } catch (error) {
    // 파일 시스템 오류 시 세션용 임시 ID 반환 (경고 로그)
    console.warn('Failed to persist device ID, using temporary session ID:', {
      error: error instanceof Error ? error.message : String(error),
      configDir: CONFIG_DIR,
    });
    return `temp-${randomUUID()}`;
  }
}

/**
 * UUID 형식 검증
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

