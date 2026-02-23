import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// package.json에서 버전 읽기
const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'))
const VERSION = pkg.version

// Node.js 내장 모듈 (node: prefix 포함)
const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)]

console.log('🚀 Starting build...')

try {
  await esbuild.build({
    entryPoints: [join(projectRoot, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: join(projectRoot, 'dist/index.js'),
    target: 'node18',
    minify: true,
    external: nodeBuiltins,
    define: {
      __VERSION__: JSON.stringify(VERSION)
    },
    banner: {
      js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
    }
  })

  console.log(`✅ Build completed (v${VERSION})`)
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}
