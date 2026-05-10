import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mockPath = resolve(__dirname, '../attachments/mock-server/server.js');

const mock = spawn('node', [mockPath], { stdio: 'inherit', shell: true });
const vite = spawn('vite', [], { stdio: 'inherit', shell: true, cwd: __dirname });

process.on('SIGINT', () => {
  mock.kill();
  vite.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  mock.kill();
  vite.kill();
  process.exit(0);
});
