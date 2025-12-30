import { flavors } from '@catppuccin/palette';

// Catppuccin Mocha (기본 다크 테마)
const mocha = flavors.mocha.colors;

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
  teal: mocha.teal.hex,
} as const;

export type Theme = typeof theme;
