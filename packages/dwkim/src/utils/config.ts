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
  // 크래시 텔레메트리 옵트아웃 플래그. 미설정 시 활성(opt-out 모델).
  // false면 비활성. DWKIM_NO_TELEMETRY 환경변수로도 끌 수 있음.
  telemetry?: boolean
}

// 경로는 호출 시점에 lazy 계산한다(HOME 변경/테스트 격리에 안전).
// 프로덕션에서는 homedir()와 동일. Bun의 homedir()가 시작 시점 값을 캐시하므로
// 런타임 HOME 변경(테스트 격리)을 반영하도록 env를 우선한다.
function configDir(): string {
  return join(process.env.HOME || homedir(), '.dwkim')
}
function configFile(): string {
  return join(configDir(), 'config.json')
}

function ensureConfigDir(): void {
  const dir = configDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function loadConfig(): UserConfig {
  try {
    const file = configFile()
    if (existsSync(file)) {
      const data = readFileSync(file, 'utf-8')
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
    writeFileSync(configFile(), JSON.stringify(config, null, 2))
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

export function setTelemetryEnabled(enabled: boolean): void {
  const config = loadConfig()
  config.telemetry = enabled
  saveConfig(config)
}

// 미설정 시 undefined (= 기본 활성으로 해석). telemetry.ts에서 opt-out 판정에 사용.
export function getTelemetryEnabled(): boolean | undefined {
  return loadConfig().telemetry
}
