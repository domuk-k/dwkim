import { spawn } from 'node:child_process';

export const runBashCommand = (command: string) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, [], { shell: true, env: process.env });

    child.on('error', (error) => {
      reject(new Error(`Failed to start command: ${error.message}`));
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => process.stdout.write(data));
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data) => process.stderr.write(data));
    child.on('close', function (code) {
      if (code === 0) resolve(void 0);
      else reject(new Error(`Command failed with exit code ${code}`));
    });
  });
