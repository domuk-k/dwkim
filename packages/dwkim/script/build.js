import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { builtinModules } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Ink의 optional dependencies를 빈 모듈로 대체
const emptyModulePlugin = {
  name: 'empty-module',
  setup(build) {
    const emptyModules = ['react-devtools-core', 'yoga-wasm-web'];

    emptyModules.forEach((mod) => {
      build.onResolve({ filter: new RegExp(`^${mod}$`) }, () => ({
        path: mod,
        namespace: 'empty-module',
      }));
    });

    build.onLoad({ filter: /.*/, namespace: 'empty-module' }, () => ({
      contents: 'export default {}; export const connectToDevTools = () => {};',
      loader: 'js',
    }));
  },
};

// Node.js 내장 모듈 (node: prefix 포함)
const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

console.log('🚀 Starting build...');

try {
  await esbuild.build({
    entryPoints: [join(projectRoot, 'src/index.tsx')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: join(projectRoot, 'dist/index.js'),
    target: 'node18',
    minify: true,
    jsx: 'automatic',
    plugins: [emptyModulePlugin],
    external: nodeBuiltins,
    banner: {
      js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
    },
  });

  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
