#!/usr/bin/env node

import { render } from 'ink'
import { App } from './ui/App.js'

const command = process.argv[2]

function showHelp() {
  console.log(`
📚 dwkim CLI

사용법: dwkim [명령어]

명령어:
  (기본)    채팅 시작
  help      도움말

예시:
  dwkim              # 채팅 시작
  npx dwkim          # npm에서 실행
`)
}

function main() {
  if (command === 'help') {
    showHelp()
    return
  }

  render(<App />)
}

main()
