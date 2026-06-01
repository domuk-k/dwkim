import { flavors } from '@catppuccin/palette'
import chalk from 'chalk'
import { detectThemeModeSync } from './detectTheme.js'

// 터미널 테마 자동 감지 (순수/동기 — 모듈 로드 시점 호출 안전, OSC 부수효과 없음)
// light → latte, dark → mocha. 변수명 `mocha`는 활성 팔레트로 재사용한다.
// latte와 mocha는 동일한 색상 키를 노출하므로 아래 theme 객체 리터럴은 그대로 유지된다.
const mode = detectThemeModeSync()
const mocha = (mode === 'light' ? flavors.latte : flavors.mocha).colors

export const theme = {
  // 주요 색상
  primary: mocha.green.hex,
  secondary: mocha.blue.hex,
  accent: mocha.mauve.hex,

  // 텍스트
  text: mocha.text.hex,
  subtext: mocha.subtext0.hex,
  muted: mocha.overlay0.hex,

  // UI 요소
  border: mocha.surface1.hex,
  surface: mocha.surface0.hex,
  background: mocha.base.hex,

  // 상태 색상
  success: mocha.green.hex,
  warning: mocha.yellow.hex,
  error: mocha.red.hex,
  info: mocha.sapphire.hex,

  // 아이콘/강조
  lavender: mocha.lavender.hex,
  peach: mocha.peach.hex,
  teal: mocha.teal.hex
} as const

export type Theme = typeof theme

// ─────────────────────────────────────────────────────────────
// Chalk color functions for pi-tui components
// ─────────────────────────────────────────────────────────────

export const c = {
  primary: chalk.hex(theme.primary),
  secondary: chalk.hex(theme.secondary),
  accent: chalk.hex(theme.accent),
  text: chalk.hex(theme.text),
  subtext: chalk.hex(theme.subtext),
  muted: chalk.hex(theme.muted),
  border: chalk.hex(theme.border),
  surface: chalk.hex(theme.surface),
  success: chalk.hex(theme.success),
  warning: chalk.hex(theme.warning),
  error: chalk.hex(theme.error),
  info: chalk.hex(theme.info),
  lavender: chalk.hex(theme.lavender),
  peach: chalk.hex(theme.peach),
  teal: chalk.hex(theme.teal),
  bold: chalk.bold,
  dim: chalk.dim
} as const
