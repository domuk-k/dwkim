#!/usr/bin/env node

declare const __VERSION__: string

const command = process.argv[2]

function showHelp() {
  console.log(`
📚 dwkim CLI v${__VERSION__}

사용법: dwkim [명령어]

명령어:
  (기본)    채팅 시작
  help      도움말
  --version 버전 확인

예시:
  dwkim              # 채팅 시작
  npx dwkim          # npm에서 실행
`)
}

// 24h throttle 간격
const UPDATE_CHECK_INTERVAL_MS = 86_400_000

/**
 * npm 최신 버전 확인 → 새 버전이 있으면 dimmed 한 줄 안내.
 * NON-BLOCKING: 앱 시작을 막지 않는다. config.lastUpdateCheck로 24h throttle.
 * checkForUpdate는 절대 throw하지 않고 실패 시 null을 반환하므로 try/catch 불필요하지만,
 * 안내 출력/감지 과정의 예기치 못한 오류로도 CLI가 죽지 않도록 전체를 방어한다.
 */
function fireUpdateCheck(): void {
  void (async () => {
    try {
      const { checkForUpdate, detectPackageManager, formatUpdateNotice } = await import(
        './utils/updateCheck.js'
      )
      const { getLastUpdateCheck, setLastUpdateCheck } = await import('./utils/config.js')

      const last = getLastUpdateCheck()
      if (last && Date.now() - last < UPDATE_CHECK_INTERVAL_MS) return

      const result = await checkForUpdate(__VERSION__)
      if (!result) return

      // 성공적으로 조회했으면(새 버전 여부 무관) throttle 타임스탬프 갱신
      setLastUpdateCheck(Date.now())

      if (!result.hasUpdate) return

      const pm = await detectPackageManager()
      const { c } = await import('./ui/theme.js')
      console.log(c.dim(formatUpdateNotice(result.latest, pm)))
    } catch {
      // 업데이트 체크는 부가 기능 — 어떤 실패도 CLI 흐름을 방해하지 않는다
    }
  })()
}

async function main() {
  if (command === '--version' || command === '-v') {
    console.log(__VERSION__)
    return
  }

  if (command === 'help') {
    showHelp()
    return
  }

  // 인터랙티브 채팅 진입 전, non-blocking 업데이트 체크를 백그라운드로 발사.
  // (help/--version 서브커맨드에서는 위에서 이미 return 되어 실행되지 않는다.)
  fireUpdateCheck()

  const { startApp } = await import('./app.js')
  await startApp()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
