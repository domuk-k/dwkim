#!/usr/bin/env node

import { printProfile } from './printBio';
import { startChat } from './chat';

const command = process.argv[2];

switch (command) {
  case 'chat':
    await startChat();
    break;
  case 'profile':
  case undefined:
    printProfile();
    break;
  case 'help':
    console.log(`
📚 dwkim CLI

Usage: dwkim [command]

Commands:
  profile    Show developer profile (default)
  chat       Start interactive chat with AI assistant
  help       Show this help message

Examples:
  dwkim              # Show profile
  dwkim profile      # Show profile
  dwkim chat         # Start chat
`);
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Run "dwkim help" for available commands');
}
