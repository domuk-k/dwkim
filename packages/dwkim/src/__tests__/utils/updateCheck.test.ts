import { describe, expect, test } from 'bun:test'
import { compareVersions, formatUpdateNotice } from '../../utils/updateCheck.js'

describe('compareVersions', () => {
  test('patch 증가는 새 버전으로 판단', () => {
    expect(compareVersions('3.6.0', '3.6.1')).toBe(true)
  })

  test('minor 증가는 새 버전으로 판단', () => {
    expect(compareVersions('3.6.0', '3.7.0')).toBe(true)
  })

  test('major 증가는 새 버전으로 판단', () => {
    expect(compareVersions('3.6.0', '4.0.0')).toBe(true)
  })

  test('동일 버전은 false', () => {
    expect(compareVersions('3.6.0', '3.6.0')).toBe(false)
  })

  test('latest가 더 낮으면 false', () => {
    expect(compareVersions('3.6.0', '3.5.9')).toBe(false)
    expect(compareVersions('4.0.0', '3.9.9')).toBe(false)
  })

  test('major가 minor/patch보다 우선', () => {
    // latest major는 낮지만 minor가 높음 → false
    expect(compareVersions('4.0.0', '3.99.99')).toBe(false)
  })

  test('minor가 patch보다 우선', () => {
    // 같은 major, latest minor 높음 → patch 무관하게 true
    expect(compareVersions('3.6.9', '3.7.0')).toBe(true)
    // 같은 major, latest minor 낮음 → patch 높아도 false
    expect(compareVersions('3.7.0', '3.6.9')).toBe(false)
  })

  test("'v' 접두사를 허용", () => {
    expect(compareVersions('v3.6.0', 'v3.6.1')).toBe(true)
    expect(compareVersions('3.6.0', 'v3.6.0')).toBe(false)
  })

  test('pre-release 태그는 무시 (base 버전만 비교)', () => {
    // 3.6.1-beta.1 → base 3.6.1 > 3.6.0
    expect(compareVersions('3.6.0', '3.6.1-beta.1')).toBe(true)
    // base가 같으면 pre-release는 무시되어 false
    expect(compareVersions('3.6.0', '3.6.0-rc.1')).toBe(false)
  })

  test('숫자가 아닌 세그먼트는 0으로 처리', () => {
    expect(compareVersions('3.6.x', '3.6.1')).toBe(true)
    expect(compareVersions('foo', 'bar')).toBe(false)
  })

  test('누락된 세그먼트는 0으로 보정', () => {
    expect(compareVersions('3.6', '3.6.1')).toBe(true)
    expect(compareVersions('3', '3.0.0')).toBe(false)
  })

  test('앞뒤 공백 허용', () => {
    expect(compareVersions(' 3.6.0 ', ' 3.6.1 ')).toBe(true)
  })
})

describe('formatUpdateNotice', () => {
  test('npm 명령어 포함', () => {
    const notice = formatUpdateNotice('3.7.0', 'npm')
    expect(notice).toContain('npm i -g dwkim@latest')
    expect(notice).toContain('3.7.0')
  })

  test('pnpm 명령어 포함', () => {
    const notice = formatUpdateNotice('3.7.0', 'pnpm')
    expect(notice).toContain('pnpm add -g dwkim@latest')
  })

  test('yarn 명령어 포함 (버전 명시)', () => {
    const notice = formatUpdateNotice('3.7.0', 'yarn')
    expect(notice).toContain('yarn global add dwkim@3.7.0')
  })

  test('bun 명령어 포함', () => {
    const notice = formatUpdateNotice('3.7.0', 'bun')
    expect(notice).toContain('bun add -g dwkim@latest')
  })

  test('패키지 이름과 최신 버전이 모두 들어감', () => {
    const notice = formatUpdateNotice('9.9.9', 'npm')
    expect(notice).toContain('dwkim')
    expect(notice).toContain('9.9.9')
  })
})
