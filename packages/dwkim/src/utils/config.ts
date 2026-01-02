/**
 * 사용자 설정 관리
 * ~/.dwkim/config.json에 저장
 */
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

interface UserConfig {
  hideEmailPrompt?: boolean;
}

const CONFIG_DIR = join(homedir(), '.dwkim');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): UserConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // 파일 읽기 실패 시 기본값 반환
  }
  return {};
}

export function saveConfig(config: UserConfig): void {
  try {
    ensureConfigDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch {
    // 저장 실패 무시
  }
}

export function setHideEmailPrompt(hide: boolean): void {
  const config = loadConfig();
  config.hideEmailPrompt = hide;
  saveConfig(config);
}

export function shouldShowEmailPrompt(): boolean {
  const config = loadConfig();
  return !config.hideEmailPrompt;
}
