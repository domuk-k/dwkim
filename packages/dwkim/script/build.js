import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting build...');

try {
  await esbuild.build({
    entryPoints: [join(projectRoot, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: join(projectRoot, 'dist/index.js'),
    target: 'node18',
    minify: true,
  });

  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
