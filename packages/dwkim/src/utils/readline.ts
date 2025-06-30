import * as readline from 'readline';

export function createReadlineInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    console.log('\n\n👋 Goodbye!');
    process.exit(0);
  });

  return rl;
}