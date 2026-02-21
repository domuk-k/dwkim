/**
 * Cogni 노트 중 tags: [blog]가 있는 것을 posts/로 복사
 *
 * 사용법:
 *   pnpm sync-cogni
 *   pnpm build (prebuild에서 자동 실행)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

const COGNI_NOTES_DIR = join(homedir(), '.cogni', 'notes')
const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts')

interface Frontmatter {
  title?: string
  tags?: string[]
  pubDate?: string
  created?: string
  description?: string
  draft?: boolean
  slug?: string
}

/**
 * YAML frontmatter 파싱 (간단한 버전)
 */
function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const yamlStr = match[1]
  const body = match[2]
  const frontmatter: Frontmatter = {}

  // 간단한 YAML 파싱
  for (const line of yamlStr.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()

    // 배열 처리 (tags: [a, b, c])
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayStr = value.slice(1, -1)
      frontmatter[key as keyof Frontmatter] = arrayStr
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, '')) as string[]
    } else {
      // 따옴표 제거
      value = value.replace(/^["']|["']$/g, '')
      ;(frontmatter as Record<string, unknown>)[key] = value
    }
  }

  return { frontmatter, body }
}

/**
 * Obsidian callout 문법을 HTML로 변환
 *
 * > [!term] 💡 Title
 * > Content line 1
 * > Content line 2
 *
 * →
 *
 * <div class="callout callout-term">
 * <div class="callout-title">💡 Title</div>
 * <div class="callout-content">
 * <p>Content line 1</p>
 * <p>Content line 2</p>
 * </div>
 * </div>
 */
function transformObsidianCallouts(content: string): string {
  // Obsidian callout 패턴: > [!type] title 으로 시작하는 blockquote
  const calloutRegex = /^(> \[!(\w+)\]\s*(.*))\n((?:>.*\n?)*)/gm

  return content.replace(calloutRegex, (_match, _firstLine, type, title, restLines) => {
    const calloutType = type.toLowerCase()
    const calloutTitle = title || `💡 ${type.toUpperCase()}`

    // > 로 시작하는 라인들에서 > 제거하고 내용 추출
    const contentLines = restLines
      .split('\n')
      .filter((line: string) => line.startsWith('>'))
      .map((line: string) => line.slice(1).trim()) // > 와 앞뒤 공백 제거
      .filter((line: string) => line.length > 0)

    // 각 라인을 <p>로 감싸기
    const contentHtml = contentLines.map((line: string) => `<p>${line}</p>`).join('\n')

    return `<div class="callout callout-${calloutType}">
<div class="callout-title">${calloutTitle}</div>
<div class="callout-content">
${contentHtml}
</div>
</div>

`
  })
}

/**
 * Obsidian 위키링크를 처리
 *
 * 블로그에 존재하는 노트는 내부 링크로, 없는 노트는 텍스트만 남김.
 * "관련 노트" / "Related" 섹션의 위키링크 목록은 블로그 포스트 링크로 변환하되,
 * 블로그에 없는 노트 항목은 제거.
 *
 * 패턴:
 *   [[note-name]] → [note-name](/note-name/) 또는 텍스트만
 *   [[note-name|Display Text]] → [Display Text](/note-name/) 또는 텍스트만
 *   [[path/note-name]] → basename만 사용
 */
function transformWikiLinks(content: string, blogSlugs: Set<string>): string {
  const lines = content.split('\n')
  const result: string[] = []
  let inRelatedSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 관련 노트 / Related 섹션 시작 감지
    if (/^#{1,3}\s*(?:관련\s*노트|관련\s*글|Related)\s*$/.test(line)) {
      inRelatedSection = true
      result.push(line)
      continue
    }

    // 다른 헤딩이 나오면 Related 섹션 종료
    if (inRelatedSection && /^#{1,3}\s/.test(line)) {
      inRelatedSection = false
    }

    if (inRelatedSection) {
      // Related 섹션 내 목록 항목 처리
      const isListItem = /^\s*-\s/.test(line)
      if (isListItem) {
        // 하이브리드 패턴: [[Display Text](/slug)] — markdown link in [[ ]]
        const hybridMatch = line.match(/\[\[[^\]]+\]\([^)]+\)\]/)
        if (hybridMatch) {
          result.push(line.replace(/\[\[([^\]]+)\]\(([^)]+)\)\]/g, '[$1]($2)'))
        } else {
          // 표준 위키링크 패턴
          const wikiMatch = line.match(/\[\[(?:[^|\]]*\/)?([^|\]]+?)(?:\|([^\]]+))?\]\]/)
          if (wikiMatch) {
            const slug = wikiMatch[1].trim()
            const display = wikiMatch[2]?.trim() || slug
            if (blogSlugs.has(slug)) {
              const prefix = line.match(/^(\s*-\s*(?:[^[]*?))\[\[/)?.[1] || '- '
              const suffix = line.match(/\]\](.*?)$/)?.[1] || ''
              result.push(`${prefix}[${display}](/${slug}/)${suffix}`)
            }
            // 블로그에 없음: 목록 항목 제거
          } else {
            // 위키링크 없는 목록 항목은 그대로 유지
            result.push(line)
          }
        }
      } else {
        // 빈 줄 등 비목록 항목은 유지
        result.push(line)
      }
    } else {
      // 본문 인라인 위키링크 처리
      let transformed = line

      // 패턴 1: [[Display Text](/slug)] — markdown link이 [[]] 안에 들어간 형태
      // 구조: [[ text ]( /url ) ] → [text](/url)
      transformed = transformed.replace(/\[\[([^\]]+)\]\(([^)]+)\)\]/g, '[$1]($2)')

      // 패턴 2: [[path/note|Display]] 또는 [[note]] — 표준 Obsidian 위키링크
      transformed = transformed.replace(
        /\[\[(?:[^|\]]*\/)?([^|\]]+?)(?:\|([^\]]+))?\]\]/g,
        (_match, slug: string, display?: string) => {
          const trimmedSlug = slug.trim()
          const trimmedDisplay = display?.trim() || trimmedSlug
          if (blogSlugs.has(trimmedSlug)) {
            return `[${trimmedDisplay}](/${trimmedSlug}/)`
          }
          return trimmedDisplay
        }
      )
      result.push(transformed)
    }
  }

  // Related 섹션이 모두 비어있으면 (헤딩 + 빈줄만) 섹션 제거
  return cleanEmptyRelatedSections(result.join('\n'))
}

/**
 * 내용 없는 Related 섹션 제거
 */
function cleanEmptyRelatedSections(content: string): string {
  // Related 헤딩 뒤에 빈줄만 있고 다음 헤딩 또는 파일 끝까지 내용이 없는 경우 제거
  return content.replace(
    /^#{1,3}\s*(?:관련\s*노트|관련\s*글|Related)\s*\n(\s*\n)*(?=#{1,3}\s|$)/gm,
    ''
  )
}

/**
 * Cogni frontmatter를 Astro 형식으로 변환
 */
function convertToAstroFrontmatter(frontmatter: Frontmatter): string {
  const astro: Record<string, unknown> = {
    title: frontmatter.title || 'Untitled',
    description: frontmatter.description || '',
    pubDate: frontmatter.pubDate || frontmatter.created || new Date().toISOString().split('T')[0]
  }

  // draft 상태 확인 (tags에 draft가 있거나 draft: true)
  if (frontmatter.draft || frontmatter.tags?.includes('draft')) {
    astro.draft = true
  }

  // slug가 있으면 추가 (선택적)
  if (frontmatter.slug) {
    astro.slug = frontmatter.slug
  }

  // 이미지가 있으면 추가
  // (향후 확장)

  const lines = ['---']
  for (const [key, value] of Object.entries(astro)) {
    if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`)
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`)
    }
  }
  lines.push('---\n')

  return lines.join('\n')
}

/**
 * 디렉토리를 재귀적으로 스캔하여 모든 .md 파일 찾기
 */
function findMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return []

  const files: string[] = []
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      // .obsidian 등 숨김 폴더 제외
      if (!entry.startsWith('.')) {
        files.push(...findMarkdownFiles(fullPath))
      }
    } else if (entry.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * 메인 함수
 */
function main() {
  console.log('🔄 Syncing Cogni notes with blog tag...\n')

  // posts 디렉토리 확인
  if (!existsSync(POSTS_DIR)) {
    mkdirSync(POSTS_DIR, { recursive: true })
  }

  // Cogni 노트 스캔
  const mdFiles = findMarkdownFiles(COGNI_NOTES_DIR)
  let syncedCount = 0

  // 1단계: blog 태그가 있는 노트의 slug 목록 수집
  const blogSlugs = new Set<string>()
  const blogNotes: { filePath: string; frontmatter: Frontmatter; body: string }[] = []

  for (const filePath of mdFiles) {
    const content = readFileSync(filePath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    if (!frontmatter.tags?.includes('blog')) continue

    const fileName = basename(filePath, '.md')
    blogSlugs.add(fileName)
    blogNotes.push({ filePath, frontmatter, body })
  }

  // 2단계: 변환 및 저장
  for (const { filePath, frontmatter, body } of blogNotes) {
    const isDraft = frontmatter.tags?.includes('draft') || frontmatter.draft
    const fileName = basename(filePath)
    const destPath = join(POSTS_DIR, fileName)

    // Astro 형식으로 변환
    const astroFrontmatter = convertToAstroFrontmatter(frontmatter)

    // Obsidian callout을 HTML로 변환
    let transformedBody = transformObsidianCallouts(body)

    // Obsidian 위키링크를 변환
    transformedBody = transformWikiLinks(transformedBody, blogSlugs)

    const newContent = astroFrontmatter + transformedBody

    writeFileSync(destPath, newContent)
    console.log(`  ✅ ${fileName}${isDraft ? ' (draft)' : ''}`)
    syncedCount++
  }

  if (syncedCount === 0) {
    console.log('  ℹ️  No notes with [blog] tag found.')
  } else {
    console.log(`\n✨ Synced ${syncedCount} posts from Cogni notes.`)
  }
}

main()
