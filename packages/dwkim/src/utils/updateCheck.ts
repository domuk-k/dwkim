/**
 * npm 업데이트 알림
 * dwkim CLI의 새 버전이 npm에 게시되었는지 확인하고 안내 문구를 만든다.
 *
 * 설계 원칙:
 * - 의존성 없음 (global fetch 사용)
 * - 절대 throw 하지 않음 (네트워크 실패/타임아웃은 null 반환)
 * - 시작 시 non-blocking으로 호출 가능
 */

import { execFile } from 'node:child_process'
import { realpathSync } from 'node:fs'

const PACKAGE_NAME = 'dwkim'
const NPM_REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`

/** npm registry fetch 타임아웃 (ms) */
const FETCH_TIMEOUT_MS = 5_000

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

/**
 * 문자열에서 패키지 매니저 추론.
 * 순서 주의: "npm"이 다른 경로의 부분 문자열일 수 있으므로 pnpm을 먼저 검사.
 */
function matchPM(str: string): PackageManager | null {
  if (/pnpm/i.test(str)) return 'pnpm'
  if (/\byarn\b/i.test(str)) return 'yarn'
  if (/\bbun\b/i.test(str)) return 'bun'
  if (/\bnpm\b/i.test(str)) return 'npm'
  return null
}

/**
 * dwkim을 전역 설치할 때 어떤 패키지 매니저를 썼는지 감지.
 *
 * 다단계 접근:
 * 1. npm_config_user_agent 환경변수 (`bun run`, `npm run` 등으로 실행 시 설정됨)
 * 2. npm_execpath 환경변수 (스크립트 기반 실행 fallback)
 * 3. NODE_PATH 환경변수 (pnpm 전역 bin stub이 설정)
 * 4. 실행 중인 스크립트의 실제 경로 (process.argv[1])
 * 5. `pnpm list -g`로 pnpm이 패키지를 관리하는지 확인
 * 6. 최종 fallback은 'npm'
 */
export async function detectPackageManager(): Promise<PackageManager> {
  // 1단계: npm_config_user_agent (가장 신뢰도 높음)
  const userAgent = process.env.npm_config_user_agent
  if (userAgent) {
    const pm = matchPM(userAgent)
    if (pm) return pm
  }

  // 2단계: npm_execpath
  const execPath = process.env.npm_execpath
  if (execPath) {
    const pm = matchPM(execPath)
    if (pm) return pm
  }

  // 3단계: NODE_PATH (pnpm 전역 stub은 .pnpm 경로를 설정)
  const nodePath = process.env.NODE_PATH
  if (nodePath) {
    if (/[/\\]\.pnpm[/\\]/.test(nodePath) || /[/\\]pnpm[/\\]/.test(nodePath)) return 'pnpm'
    if (/[/\\]\.yarn[/\\]/.test(nodePath)) return 'yarn'
    if (/[/\\]\.bun[/\\]/.test(nodePath)) return 'bun'
  }

  // 4단계: 실행 스크립트의 실제 경로
  try {
    const scriptPath = realpathSync(process.argv[1] ?? '')
    if (/[/\\]\.?pnpm[/\\]/.test(scriptPath)) return 'pnpm'
    if (/[/\\]\.?yarn[/\\]/.test(scriptPath)) return 'yarn'
    if (/[/\\]\.?bun[/\\]/.test(scriptPath)) return 'bun'
  } catch {
    // argv[1]이 없거나 깨졌으면 realpathSync 실패 — 다음 단계로
  }

  // 5단계: pnpm 전역 스토어에 패키지가 있는지 확인 (non-blocking)
  const pnpmManaged = await new Promise<boolean>((resolve) => {
    execFile(
      'pnpm',
      ['list', '-g', '--depth=0', PACKAGE_NAME],
      { timeout: 3_000 },
      (error, stdout) => {
        resolve(!error && stdout.includes(PACKAGE_NAME))
      }
    )
  })
  if (pnpmManaged) return 'pnpm'

  return 'npm'
}

/**
 * 단순 semver 비교: latest가 current보다 새 버전이면 true.
 * x.y.z 표준 버전 처리, pre-release 태그(-beta 등)는 무시.
 * 점(.) 단위로 잘라 숫자 비교.
 */
export function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string): number[] =>
    v
      .trim()
      .replace(/^v/, '')
      .split('-')[0]!
      .split('.')
      .map((s) => {
        const n = Number(s)
        return Number.isFinite(n) ? n : 0
      })

  const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current)
  const [lMajor = 0, lMinor = 0, lPatch = 0] = parse(latest)

  if (lMajor !== cMajor) return lMajor > cMajor
  if (lMinor !== cMinor) return lMinor > cMinor
  return lPatch > cPatch
}

/**
 * npm registry에서 최신 게시 버전을 가져와 현재 버전과 비교.
 * 네트워크 오류/타임아웃/파싱 실패 등 어떤 실패에도 null 반환 (절대 throw 안 함).
 */
export async function checkForUpdate(
  currentVersion: string
): Promise<{ latest: string; hasUpdate: boolean } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(NPM_REGISTRY_URL, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null

    const data = (await res.json()) as { version?: string }
    const latest = data.version
    if (!latest) return null

    return { latest, hasUpdate: compareVersions(currentVersion, latest) }
  } catch {
    return null
  }
}

/**
 * 패키지 매니저별 전역 업그레이드 명령어 문자열.
 */
function getUpgradeCommand(pm: PackageManager, latest: string): string {
  const pkg = `${PACKAGE_NAME}@latest`
  switch (pm) {
    case 'pnpm':
      return `pnpm add -g ${pkg}`
    case 'yarn':
      return `yarn global add ${PACKAGE_NAME}@${latest}`
    case 'bun':
      return `bun add -g ${pkg}`
    default:
      return `npm i -g ${pkg}`
  }
}

/**
 * 한국어 친화적 업데이트 안내 문구.
 * 패키지 매니저에 맞는 업그레이드 명령어를 포함한다.
 */
export function formatUpdateNotice(latest: string, pm: PackageManager): string {
  const command = getUpgradeCommand(pm, latest)
  return `새 버전 dwkim@${latest} 이 나왔어요. 업데이트: ${command}`
}
