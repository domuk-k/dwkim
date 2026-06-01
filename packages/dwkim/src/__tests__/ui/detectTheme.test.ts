import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { detectThemeModeSync, luminance } from '../../ui/detectTheme.js'

// 각 테스트가 환경변수를 더럽히지 않도록 원본을 저장/복구한다.
let savedDwkimTheme: string | undefined
let savedColorFgBg: string | undefined

beforeEach(() => {
  savedDwkimTheme = process.env.DWKIM_THEME
  savedColorFgBg = process.env.COLORFGBG
  process.env.DWKIM_THEME = undefined
  process.env.COLORFGBG = undefined
})

afterEach(() => {
  if (savedDwkimTheme === undefined) process.env.DWKIM_THEME = undefined
  else process.env.DWKIM_THEME = savedDwkimTheme
  if (savedColorFgBg === undefined) process.env.COLORFGBG = undefined
  else process.env.COLORFGBG = savedColorFgBg
})

describe('detectThemeModeSync - DWKIM_THEME 오버라이드', () => {
  test("DWKIM_THEME=light → 'light'", () => {
    process.env.DWKIM_THEME = 'light'
    expect(detectThemeModeSync()).toBe('light')
  })

  test("DWKIM_THEME=dark → 'dark'", () => {
    process.env.DWKIM_THEME = 'dark'
    expect(detectThemeModeSync()).toBe('dark')
  })

  test('대소문자/공백 무관하게 해석한다', () => {
    process.env.DWKIM_THEME = '  LIGHT  '
    expect(detectThemeModeSync()).toBe('light')
  })

  test('COLORFGBG 보다 우선한다', () => {
    // COLORFGBG 는 light 를 가리키지만 env 오버라이드가 dark 로 이긴다
    process.env.DWKIM_THEME = 'dark'
    process.env.COLORFGBG = '0;15'
    expect(detectThemeModeSync()).toBe('dark')
  })

  test('인식 불가 값은 무시하고 다음 우선순위로 넘어간다', () => {
    process.env.DWKIM_THEME = 'solarized'
    expect(detectThemeModeSync()).toBe('dark') // 기본값
  })
})

describe('detectThemeModeSync - COLORFGBG 파싱', () => {
  test("배경 인덱스 0 (검정) → 'dark'", () => {
    process.env.COLORFGBG = '15;0'
    expect(detectThemeModeSync()).toBe('dark')
  })

  test("배경 인덱스 6 → 'dark' (경계: 6 은 어두움)", () => {
    process.env.COLORFGBG = '0;6'
    expect(detectThemeModeSync()).toBe('dark')
  })

  test("배경 인덱스 7 (밝은 회색) → 'light' (경계: 7 은 밝음)", () => {
    process.env.COLORFGBG = '0;7'
    expect(detectThemeModeSync()).toBe('light')
  })

  test("배경 인덱스 15 (밝은 흰색) → 'light'", () => {
    process.env.COLORFGBG = '0;15'
    expect(detectThemeModeSync()).toBe('light')
  })

  test("세 토큰 형식 'fg;something;bg' 에서 마지막 토큰을 배경으로 본다", () => {
    process.env.COLORFGBG = '15;default;0'
    expect(detectThemeModeSync()).toBe('dark')
  })

  test('숫자가 아닌 배경 토큰은 무시하고 기본값으로 떨어진다', () => {
    process.env.COLORFGBG = '15;default'
    expect(detectThemeModeSync()).toBe('dark')
  })
})

describe('detectThemeModeSync - 기본값', () => {
  test("환경변수가 없으면 'dark'", () => {
    expect(detectThemeModeSync()).toBe('dark')
  })

  test("빈 COLORFGBG 는 'dark'", () => {
    process.env.COLORFGBG = ''
    expect(detectThemeModeSync()).toBe('dark')
  })
})

describe('luminance', () => {
  test('검정(#000000) 휘도는 0', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 5)
  })

  test('흰색(#ffffff) 휘도는 1', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 5)
  })

  test('# 접두사 없는 입력도 처리한다', () => {
    expect(luminance('ffffff')).toBeCloseTo(1, 5)
  })

  test('검정은 dark(<0.5), 흰색은 light(>=0.5) 경계를 가른다', () => {
    expect(luminance('#000000')).toBeLessThan(0.5)
    expect(luminance('#ffffff')).toBeGreaterThanOrEqual(0.5)
  })

  test('잘못된 길이의 입력은 0 을 반환한다', () => {
    expect(luminance('#fff')).toBe(0)
  })
})
