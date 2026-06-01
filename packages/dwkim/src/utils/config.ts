/**
 * 사용자 설정 관리
 * ~/.dwkim/config.json에 저장
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { NotificationMode } from './notify.js'

interface UserConfig {
  hideEmailPrompt?: boolean
  // 테마 명시적 오버라이드 ('dark' | 'light'). 미설정 시 자동 감지.
  themeOverride?: 'dark' | 'light'
  // 응답 완료 알림 모드. 미설정 시 'bell'로 취급.
  notifyMode?: NotificationMode
  // 마지막 업데이트 체크 시각 (epoch ms). 24h throttle용.
  lastUpdateCheck?: number
}

const CONFIG_DIR = join(homedir(), '.dwkim')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export function loadConfig(): UserConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch {
    // 파일 읽기 실패 시 기본값 반환
  }
  return {}
}

export function saveConfig(config: UserConfig): void {
  try {
    ensureConfigDir()
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch {
    // 저장 실패 무시
  }
}

export function setHideEmailPrompt(hide: boolean): void {
  const config = loadConfig()
  config.hideEmailPrompt = hide
  saveConfig(config)
}

export function shouldShowEmailPrompt(): boolean {
  const config = loadConfig()
  return !config.hideEmailPrompt
}

export function setThemeOverride(mode: 'dark' | 'light'): void {
  const config = loadConfig()
  config.themeOverride = mode
  saveConfig(config)
}

export function getThemeOverride(): 'dark' | 'light' | undefined {
  return loadConfig().themeOverride
}

export function setNotifyMode(mode: NotificationMode): void {
  const config = loadConfig()
  config.notifyMode = mode
  saveConfig(config)
}

// 미설정 시 기본값 'bell'
export function getNotifyMode(): NotificationMode {
  return loadConfig().notifyMode ?? 'bell'
}

export function setLastUpdateCheck(ts: number): void {
  const config = loadConfig()
  config.lastUpdateCheck = ts
  saveConfig(config)
}

export function getLastUpdateCheck(): number | undefined {
  return loadConfig().lastUpdateCheck
}
