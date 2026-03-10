#!/usr/bin/env tsx
/**
 * 빌드타임 검색 인덱스 생성
 *
 * Cogni notes에서 persona/blog/rag 태그 문서를 읽어
 * 청킹 후 JSON 파일로 출력. 프로덕션에서 이 JSON을 로드하여 BM25 검색.
 *
 * Usage: bun run build:index
 */

import fs from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

const COGNI_NOTES_DIR = path.join(homedir(), '.cogni', 'notes')
const OUTPUT_PATH = path.join(import.meta.dir, '..', 'data', 'searchIndex.json')

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ChunkResult {
  id: string
  content: string
  metadata: {
    type: string
    title: string
    category?: string
    source: 'cogni'
    pubDate?: string
    keywords?: string[]
    chunkIndex: number
    totalChunks: number
  }
}

// ─────────────────────────────────────────────────────────────
// Chunking Utils (from initQdrantData.ts)
// ─────────────────────────────────────────────────────────────

function chunkByParagraph(text: string, maxSize: number = 1000): string[] {
  const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 0)
  const chunks: string[] = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    } else {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = paragraph
    }
  }
  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

function chunkBySection(text: string): string[] {
  const sections = text.split(/(?=^## )/m)
  const filtered = sections.filter((s) => s.trim().length > 0)

  if (filtered.length > 1 && !filtered[0].includes('## ')) {
    const header = filtered[0]
    filtered[1] = `${header}\n\n${filtered[1]}`
    return filtered.slice(1)
  }

  return filtered
}

function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }

  const frontmatter: Record<string, unknown> = {}
  match[1].split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) return

    const key = line.slice(0, colonIndex).trim()
    let value: unknown = line.slice(colonIndex + 1).trim()

    if (typeof value === 'string' && value.startsWith('[')) {
      try {
        value = JSON.parse(value.replace(/'/g, '"'))
      } catch {
        // parse fail
      }
    } else if (typeof value === 'string' && (value.startsWith("'") || value.startsWith('"'))) {
      value = value.slice(1, -1)
    }

    frontmatter[key] = value
  })

  return { frontmatter, body: match[2] }
}

function extractTitle(text: string): string | null {
  const match = text.match(/^#\s+(.+)$/m)
  return match ? match[1] : null
}

function inferCategory(keywords?: string[] | string): string {
  if (!keywords) return 'general'
  const keywordArray = Array.isArray(keywords)
    ? keywords
    : typeof keywords === 'string'
      ? keywords.split(',').map((k) => k.trim())
      : []

  if (keywordArray.length === 0) return 'general'
  if (
    keywordArray.some((k) => ['AI', 'Claude', 'agent', 'LLM', 'RAG'].some((ai) => k.includes(ai)))
  )
    return 'ai'
  if (
    keywordArray.some((k) =>
      ['프로젝트', '멘탈모델', '프로세스', 'TDD'].some((dev) => k.includes(dev))
    )
  )
    return 'methodology'
  return 'philosophy'
}

// ─────────────────────────────────────────────────────────────
// Contextual Chunk Enhancement
// ─────────────────────────────────────────────────────────────

function addContextToChunk(chunk: ChunkResult): ChunkResult {
  const { content, metadata } = chunk

  if (metadata.type === 'resume' || metadata.type === 'resume-en') {
    if (
      ['콕스웨이브', 'Coxwave', '비에이치에스엔', '모두싸인', 'Engineer', '개발자'].some((k) =>
        content.includes(k)
      )
    ) {
      return { ...chunk, content: '[컨텍스트: 김동욱의 재직 회사, 경력, 직장 경험]\n\n' + content }
    }
    if (['이메일', 'GitHub', '소개'].some((k) => content.includes(k))) {
      return { ...chunk, content: '[컨텍스트: 김동욱의 연락처, 기본 정보]\n\n' + content }
    }
    if (['기술 스택', '프론트엔드', '백엔드'].some((k) => content.includes(k))) {
      return { ...chunk, content: '[컨텍스트: 김동욱의 기술 스택, 사용 기술]\n\n' + content }
    }
  }

  if (metadata.type === '100-questions') {
    if (
      ['회사', '직장', '일', 'Coxwave', '콕스웨이브', '경력', '재직'].some((k) =>
        content.includes(k)
      )
    ) {
      return { ...chunk, content: '[컨텍스트: 김동욱의 현재 회사, 직장 관련 질문]\n\n' + content }
    }
  }

  return chunk
}

// ─────────────────────────────────────────────────────────────
// Process Tagged Notes
// ─────────────────────────────────────────────────────────────

async function findMdFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await findMdFiles(fullPath)))
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  } catch {
    // directory not found
  }
  return files
}

async function processTaggedNotes(): Promise<ChunkResult[]> {
  console.log('📂 Processing Cogni tagged notes (persona/blog/rag)...')
  const results: ChunkResult[] = []
  const mdFiles = await findMdFiles(COGNI_NOTES_DIR)

  for (const filePath of mdFiles) {
    const content = await fs.readFile(filePath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    const tags = (frontmatter.tags as string[]) || []
    const hasIndexableTag =
      tags.includes('blog') || tags.includes('rag') || tags.includes('persona')
    if (!hasIndexableTag) continue

    if (frontmatter.rag === false || frontmatter.rag === 'false') {
      console.log(`  ⏭️  ${path.basename(filePath)}: skipped (rag: false)`)
      continue
    }

    const slug = path.basename(filePath, '.md')
    const title = (frontmatter.title as string) || slug
    const rawKeywords = frontmatter.keywords
    const keywords: string[] | undefined = Array.isArray(rawKeywords)
      ? rawKeywords
      : typeof rawKeywords === 'string'
        ? [rawKeywords]
        : undefined

    // persona 특수 청킹 (resume, 100-questions)
    if (
      tags.includes('persona') &&
      (slug === 'resume' || slug === 'resume-en' || slug === '100-questions')
    ) {
      const isQuestions = slug === '100-questions'
      const delimiter = isQuestions ? /(?=^### Q\d+)/m : /(?=^## )/m
      const chunks = body.split(delimiter).filter((s) => s.trim().length > 0)

      let validIndex = 0
      let skippedCount = 0
      for (const chunk of chunks) {
        const titleMatch = isQuestions
          ? chunk.match(/^### (Q\d+\..+)/m)
          : chunk.match(/^##\s+(.+)/m)
        const sectionTitle = titleMatch?.[1] || title

        if (isQuestions) {
          const answerContent = chunk.replace(/^### Q\d+\..+\n+/m, '').trim()
          if (answerContent === '[?]' || answerContent.length < 20) {
            skippedCount++
            continue
          }
        }

        results.push({
          id: `cogni_${slug}_${validIndex}`,
          content: chunk.trim(),
          metadata: {
            type: slug,
            title: sectionTitle,
            source: 'cogni',
            chunkIndex: validIndex,
            totalChunks: chunks.length
          }
        })
        validIndex++
      }
      console.log(
        `  📄 ${path.basename(filePath)}: ${isQuestions ? `${validIndex} valid, ${skippedCount} skipped` : `${validIndex} chunks`}`
      )
      continue
    }

    // persona 일반: 단락 기반 청킹
    if (tags.includes('persona') && !tags.includes('blog')) {
      const chunks = chunkByParagraph(body)
      console.log(`  📄 ${path.basename(filePath)}: ${chunks.length} chunks (persona)`)
      chunks.forEach((chunk, index) => {
        results.push({
          id: `cogni_${slug}_${index}`,
          content: chunk,
          metadata: {
            type: slug,
            title: extractTitle(chunk) || title,
            source: 'cogni',
            chunkIndex: index,
            totalChunks: chunks.length
          }
        })
      })
      continue
    }

    // blog/rag: 섹션 기반 청킹
    const chunks = chunkBySection(body)
    console.log(`  📄 ${path.basename(filePath)}: ${chunks.length} chunks`)
    const docType = tags.includes('blog') ? 'blog' : 'knowledge'
    const idPrefix = tags.includes('blog') ? 'blog' : 'rag'

    chunks.forEach((chunk, index) => {
      results.push({
        id: `${idPrefix}_${slug}_${index}`,
        content: chunk.trim(),
        metadata: {
          type: docType,
          title,
          category: inferCategory(keywords),
          source: 'cogni',
          pubDate: frontmatter.pubDate as string,
          keywords,
          chunkIndex: index,
          totalChunks: chunks.length
        }
      })
    })
  }

  return results
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 검색 인덱스 빌드 시작...\n')

  const chunks = await processTaggedNotes()
  const allChunks = chunks.map(addContextToChunk)

  console.log(`\n📊 총 청크 수: ${allChunks.length}`)

  // data/ 디렉토리 확인
  const dataDir = path.dirname(OUTPUT_PATH)
  await fs.mkdir(dataDir, { recursive: true })

  // JSON 출력
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(allChunks, null, 2))
  console.log(`✅ 검색 인덱스 저장: ${OUTPUT_PATH}`)
  console.log(`   파일 크기: ${((await fs.stat(OUTPUT_PATH)).size / 1024).toFixed(1)} KB\n`)
}

main().catch((error) => {
  console.error('❌ 빌드 실패:', error)
  process.exit(1)
})
