/**
 * Postbuild link checker — dist/ HTML 내부 링크가 실제 파일로 존재하는지 검증
 * Usage: bun scripts/check-links.ts
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const DIST = resolve(import.meta.dir, '../dist')

async function collectFiles(dir: string, ext?: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await collectFiles(full, ext)))
    else if (!ext || entry.name.endsWith(ext)) files.push(full)
  }
  return files
}

async function main() {
  const htmlFiles = await collectFiles(DIST, '.html')

  // Build set of valid routes from dist/ structure
  // dist/foo/index.html → /foo, dist/index.html → /
  const validRoutes = new Set<string>()
  for (const file of htmlFiles) {
    const rel = file.replace(DIST, '').replace('/index.html', '').replace('.html', '')
    validRoutes.add(rel || '/')
  }

  // Collect all assets for non-HTML link targets
  const allFiles = await collectFiles(DIST)
  const validAssets = new Set(allFiles.map((f) => f.replace(DIST, '')))

  const linkPattern = /href="(\/[^"#?]*)(?:[#?][^"]*)?"/g
  const broken: { source: string; href: string }[] = []

  for (const file of htmlFiles) {
    const source = file.replace(DIST, '')
    const html = await readFile(file, 'utf-8')
    let match: RegExpExecArray | null
    while ((match = linkPattern.exec(html)) !== null) {
      const href = decodeURIComponent(match[1]).replace(/\/$/, '') // decode + strip trailing slash
      if (href === '') continue // root
      if (validRoutes.has(href)) continue
      if (validAssets.has(href)) continue
      broken.push({ source, href })
    }
  }

  if (broken.length === 0) {
    console.log('✓ No broken internal links found')
    return
  }

  console.error(`✗ Found ${broken.length} broken internal link(s):\n`)
  for (const { source, href } of broken) {
    console.error(`  ${source} → ${href}`)
  }
  process.exitCode = 1
}

main()
