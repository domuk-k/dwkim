#!/usr/bin/env node

import { render } from 'ink'
import { App, type Mode } from './ui/App.js'

const command = process.argv[2]

function showHelp() {
  console.log(`
📚 dwkim CLI

사용법: dwkim [명령어]

명령어:
  (기본)    프로필 + 채팅 시작
  profile   프로필만 표시
  help      도움말

예시:
  dwkim              # 프로필 + 채팅
  dwkim profile      # 프로필만
`)
}

function main() {
  let mode: Mode = 'full'

  switch (command) {
    case 'help':
      showHelp()
      return

    case 'profile':
      mode = 'profile'
      break
    default:
      mode = 'full'
  }

  render(<App mode={mode} />)
}

main()
