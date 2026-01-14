/**
 * 최초 실행 여부 관리
 * ~/.dwkim/banner_shown 파일로 배너 표시 여부 추적
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CONFIG_DIR = join(homedir(), '.dwkim')
const BANNER_SHOWN_FILE = join(CONFIG_DIR, 'banner_shown')

/**
 * 배너가 이미 표시되었는지 확인
 * @returns 배너가 이미 표시되었으면 true
 */
export function hasBannerBeenShown(): boolean {
  return existsSync(BANNER_SHOWN_FILE)
}

/**
 * 배너를 표시했음을 기록
 */
export function markBannerAsShown(): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true })
    }
    writeFileSync(BANNER_SHOWN_FILE, new Date().toISOString())
  } catch {
    // 파일 시스템 오류는 무시 (다음 실행 시 다시 표시됨)
  }
}
