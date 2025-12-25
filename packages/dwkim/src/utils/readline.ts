import * as readline from 'readline';

export function createReadlineInterface(): readline.Interface {
  // stdin을 raw 모드가 아닌 일반 모드로 유지
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Ctrl+C로만 종료
  process.on('SIGINT', () => {
    console.log('\n\n👋 안녕히 가세요!');
    process.exit(0);
  });

  return rl;
}