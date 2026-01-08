#!/usr/bin/env tsx

import fs from 'node:fs/promises'
import path from 'node:path'
import { NeonPostgres } from '@langchain/community/vectorstores/neon'
import { Document as LangChainDocument } from '@langchain/core/documents'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import dotenv from 'dotenv'

// Load .env.local first (for local dev), then .env
dotenv.config({ path: '.env.local' })
dotenv.config()

// Configuration
const DATA_DIR = path.join(__dirname, '../data')
const BLOG_ABOUT_DIR = path.join(__dirname, '../../blog/src/content/about')
const BLOG_POSTS_DIR = path.join(__dirname, '../../blog/src/content/posts')

interface ChunkResult {
  id: string
  content: string
  metadata: {
    type: string
    title: string
    category?: string
    source: 'persona-api' | 'blog'
    pubDate?: string
    keywords?: string[]
    chunkIndex: number
    totalChunks: number
  }
}

/**
 * 단락 기반 청킹 (persona-api/data용)
 */
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

/**
 * 섹션 기반 청킹 (blog posts용 - H2 기준)
 */
function chunkBySection(text: string): string[] {
  const sections = text.split(/(?=^## )/m)
  return sections.filter((s) => s.trim().length > 0)
}

/**
 * YAML Frontmatter 파싱
 */
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

    // 배열 파싱 (keywords 등)
    if (typeof value === 'string' && value.startsWith('[')) {
      try {
        value = JSON.parse(value.replace(/'/g, '"'))
      } catch {
        // 파싱 실패시 그대로 문자열
      }
    } else if (typeof value === 'string' && (value.startsWith("'") || value.startsWith('"'))) {
      value = value.slice(1, -1)
    }

    frontmatter[key] = value
  })

  return { frontmatter, body: match[2] }
}

/**
 * 텍스트에서 첫 번째 제목 추출
 */
function extractTitle(text: string): string | null {
  const match = text.match(/^#\s+(.+)$/m)
  return match ? match[1] : null
}

/**
 * 키워드로 카테고리 추론
 */
function inferCategory(keywords?: string[]): string {
  if (!keywords || keywords.length === 0) return 'general'

  const aiKeywords = ['AI', 'Claude', 'agent', 'LLM', 'RAG']
  const devKeywords = ['프로젝트', '멘탈모델', '프로세스', 'TDD']

  if (keywords.some((k) => aiKeywords.some((ai) => k.includes(ai)))) return 'ai'
  if (keywords.some((k) => devKeywords.some((dev) => k.includes(dev)))) return 'methodology'
  return 'philosophy'
}

/**
 * persona-api/data/*.md 처리
 */
async function processDataFiles(): Promise<ChunkResult[]> {
  console.log('📂 Processing persona-api/data files...')

  let files: string[]
  try {
    files = await fs.readdir(DATA_DIR)
  } catch {
    console.warn('⚠️  data 디렉토리를 찾을 수 없습니다:', DATA_DIR)
    return []
  }

  const results: ChunkResult[] = []
  const mdFiles = files.filter((f) => f.endsWith('.md') && f !== 'systemPrompt.md')

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8')
    const type = path.basename(file, '.md')

    // resume.md는 전체를 하나의 청크로 (검색 성능 향상)
    if (type === 'resume') {
      console.log(`  📄 ${file}: 1 chunk (whole document)`)
      results.push({
        id: `data_${type}_0`,
        content: content,
        metadata: {
          type,
          title: extractTitle(content) || '김동욱 이력서',
          source: 'persona-api',
          chunkIndex: 0,
          totalChunks: 1
        }
      })
      continue
    }

    const chunks = chunkByParagraph(content)
    console.log(`  📄 ${file}: ${chunks.length} chunks`)

    chunks.forEach((chunk, index) => {
      results.push({
        id: `data_${type}_${index}`,
        content: chunk,
        metadata: {
          type,
          title: extractTitle(chunk) || type,
          source: 'persona-api',
          chunkIndex: index,
          totalChunks: chunks.length
        }
      })
    })
  }

  return results
}

/**
 * blog/src/content/about/*.md 처리
 */
async function processAboutFiles(): Promise<ChunkResult[]> {
  console.log('📂 Processing blog/about files...')

  let files: string[]
  try {
    files = await fs.readdir(BLOG_ABOUT_DIR)
  } catch {
    console.warn('⚠️  about 디렉토리를 찾을 수 없습니다:', BLOG_ABOUT_DIR)
    return []
  }

  const results: ChunkResult[] = []
  const mdFiles = files.filter((f) => f.endsWith('.md'))

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(BLOG_ABOUT_DIR, file), 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    // rag: false인 경우 스킵
    if (frontmatter.rag === false || frontmatter.rag === 'false') {
      console.log(`  ⏭️  ${file}: skipped (rag: false)`)
      continue
    }

    const category = path.basename(file, '.md')

    console.log(`  📄 ${file}: 1 chunk (whole document)`)

    // About 파일은 짧으므로 전체 문서를 하나의 청크로
    results.push({
      id: `about_${category}_0`,
      content: body.trim(),
      metadata: {
        type: 'about',
        title: (frontmatter.title as string) || category,
        category,
        source: 'blog',
        chunkIndex: 0,
        totalChunks: 1
      }
    })
  }

  return results
}

/**
 * blog/src/content/posts/*.md 처리
 */
async function processPostFiles(): Promise<ChunkResult[]> {
  console.log('📂 Processing blog/posts files...')

  let files: string[]
  try {
    files = await fs.readdir(BLOG_POSTS_DIR)
  } catch {
    console.warn('⚠️  posts 디렉토리를 찾을 수 없습니다:', BLOG_POSTS_DIR)
    return []
  }

  const results: ChunkResult[] = []
  const mdFiles = files.filter((f) => f.endsWith('.md'))

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(BLOG_POSTS_DIR, file), 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    // rag: false인 경우 스킵
    if (frontmatter.rag === false || frontmatter.rag === 'false') {
      console.log(`  ⏭️  ${file}: skipped (rag: false)`)
      continue
    }

    const slug = path.basename(file, '.md')
    const keywords = frontmatter.keywords as string[] | undefined

    // 섹션 기반 청킹
    const chunks = chunkBySection(body)

    console.log(`  📄 ${file}: ${chunks.length} chunks`)

    chunks.forEach((chunk, index) => {
      results.push({
        id: `post_${slug}_${index}`,
        content: chunk.trim(),
        metadata: {
          type: 'post',
          title: (frontmatter.title as string) || slug,
          category: inferCategory(keywords),
          source: 'blog',
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

/**
 * Neon DB 초기화
 */
async function initializeDatabase(testMode: boolean = false) {
  console.log('\n🚀 Neon DB 초기화 시작...\n')

  const connectionString = process.env.DATABASE_URL
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY

  // 테스트 모드가 아닐 때만 환경변수 체크
  if (!testMode) {
    if (!connectionString) {
      console.error('❌ DATABASE_URL 환경변수가 필요합니다')
      process.exit(1)
    }

    if (!apiKey) {
      console.error('❌ GOOGLE_API_KEY 또는 GEMINI_API_KEY 환경변수가 필요합니다')
      process.exit(1)
    }
  }

  // 모든 문서 수집
  const dataChunks = await processDataFiles()
  const aboutChunks = await processAboutFiles()
  const postChunks = await processPostFiles()

  const allChunks = [...dataChunks, ...aboutChunks, ...postChunks]

  console.log(`\n📊 총 청크 수: ${allChunks.length}`)
  console.log(`   - data: ${dataChunks.length}`)
  console.log(`   - about: ${aboutChunks.length}`)
  console.log(`   - posts: ${postChunks.length}\n`)

  if (testMode) {
    console.log('🧪 테스트 모드 - DB 업로드 건너뜀\n')
    console.log('샘플 청크:')
    allChunks.slice(0, 3).forEach((chunk, i) => {
      console.log(`\n--- Chunk ${i + 1} ---`)
      console.log(`ID: ${chunk.id}`)
      console.log(`Type: ${chunk.metadata.type}`)
      console.log(`Title: ${chunk.metadata.title}`)
      console.log(`Content: ${chunk.content.substring(0, 100)}...`)
    })
    return
  }

  // Embeddings 초기화
  console.log('🔧 임베딩 모델 초기화...')
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: 'text-embedding-004'
  })

  // Vector Store 초기화
  console.log('🔧 Vector Store 연결...')
  const vectorStore = await NeonPostgres.initialize(embeddings, {
    connectionString,
    tableName: 'persona_documents',
    columns: {
      idColumnName: 'id',
      vectorColumnName: 'embedding',
      contentColumnName: 'content',
      metadataColumnName: 'metadata'
    }
  })

  // 배치로 문서 추가
  const batchSize = 10
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(allChunks.length / batchSize)

    console.log(`📤 배치 업로드 ${batchNum}/${totalBatches}...`)

    const docs = batch.map(
      (chunk) =>
        new LangChainDocument({
          pageContent: chunk.content,
          metadata: {
            ...chunk.metadata,
            docId: chunk.id
          }
        })
    )

    // NeonPostgres expects UUID, so let it auto-generate IDs
    // We store our custom ID in metadata.docId instead
    await vectorStore.addDocuments(docs)
  }

  console.log('\n✅ 데이터베이스 초기화 완료!')
}

/**
 * 검색 테스트
 */
async function testRetrieval() {
  console.log('\n🔍 검색 테스트 시작...\n')

  const connectionString = process.env.DATABASE_URL
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY

  if (!connectionString || !apiKey) {
    console.error('❌ DATABASE_URL과 API 키가 필요합니다')
    return
  }

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: 'text-embedding-004'
  })

  const vectorStore = await NeonPostgres.initialize(embeddings, {
    connectionString,
    tableName: 'persona_documents',
    columns: {
      idColumnName: 'id',
      vectorColumnName: 'embedding',
      contentColumnName: 'content',
      metadataColumnName: 'metadata'
    }
  })

  const testQueries = [
    '기술 스택이 뭔가요?',
    '어떤 프로젝트를 했나요?',
    'AI에 대한 생각은?',
    '개발 철학이 있나요?'
  ]

  for (const query of testQueries) {
    console.log(`❓ Query: "${query}"`)

    const results = await vectorStore.similaritySearch(query, 3)

    if (results.length === 0) {
      console.log('   ❌ 결과 없음\n')
    } else {
      results.forEach((doc, index) => {
        console.log(
          `   ${index + 1}. [${doc.metadata.type}] ${doc.pageContent.substring(0, 80)}...`
        )
      })
      console.log('')
    }
  }
}

/**
 * DB 클린 (기존 데이터 삭제)
 */
async function cleanDatabase() {
  console.log('\n🧹 기존 데이터 삭제 중...')

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('❌ DATABASE_URL 환경변수가 필요합니다')
    process.exit(1)
  }

  // Neon serverless driver 사용
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(connectionString)

  try {
    await sql`DELETE FROM persona_documents`
    console.log('✅ persona_documents 테이블 클리어 완료')
  } catch (error) {
    console.log('⚠️  테이블이 없거나 삭제 실패 (무시하고 진행):', error)
  }
}

// Main
async function main() {
  const args = process.argv.slice(2)
  const testMode = args.includes('--test')
  const runRetrieval = args.includes('--retrieval')
  const cleanMode = args.includes('--clean')

  if (cleanMode) {
    await cleanDatabase()
  }

  if (runRetrieval) {
    await testRetrieval()
  } else {
    await initializeDatabase(testMode)

    if (!testMode) {
      await testRetrieval()
    }
  }

  console.log('\n🎉 완료!\n')
}

main().catch((error) => {
  console.error('❌ 오류 발생:', error)
  process.exit(1)
})
