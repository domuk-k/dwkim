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

async function main() {
  if (command === '--version' || command === '-v') {
    console.log(__VERSION__)
    return
  }

  if (command === 'help') {
    showHelp()
    return
  }

  const { startApp } = await import('./app.js')
  await startApp()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
