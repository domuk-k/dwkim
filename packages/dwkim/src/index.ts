#!/usr/bin/env node

import { printProfile } from './printBio';
import { startChat } from './chat';

const command = process.argv[2];

(async () => {
  switch (command) {
    case 'profile':
      printProfile();
      break;
    case 'help':
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
`);
      break;
    case undefined:
    default:
      // 기본: 명함 출력 후 채팅 시작
      printProfile();
      console.log('');
      await startChat();
  }
})();
