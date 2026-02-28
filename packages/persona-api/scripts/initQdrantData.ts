#!/usr/bin/env tsx
// NOTE: dotenv is preloaded via npm script (--require dotenv/config)

import fs from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { QdrantClient } from '@qdrant/js-client-rest'
import dotenv from 'dotenv'
import { getBM25Engine, resetBM25Engine } from '../src/services/bm25Engine'
import { OpenAIEmbeddings } from '../src/services/openaiEmbeddings'

// Load .env.local first (for local dev), then .env
dotenv.config({ path: '.env.local' })
dotenv.config()

// Configuration - Cogni as SSOT (Single Source of Truth)
// about 콘텐츠도 cogni/persona에 tags: [persona]로 통합됨
const COGNI_PERSONA_DIR = path.join(homedir(), '.cogni', 'notes', 'persona')
const COGNI_NOTES_DIR = path.join(homedir(), '.cogni', 'notes')
const COLLECTION_NAME = 'persona_documents'

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
 * H2 이전의 서문은 첫 번째 H2 섹션에 병합
 */
function chunkBySection(text: string): string[] {
  const sections = text.split(/(?=^## )/m)
  const filtered = sections.filter((s) => s.trim().length > 0)

  // H1 제목만 있는 첫 섹션을 다음 섹션에 병합
  if (filtered.length > 1 && !filtered[0].includes('## ')) {
    const header = filtered[0]
    filtered[1] = `${header}\n\n${filtered[1]}`
    return filtered.slice(1)
  }

  return filtered
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
function inferCategory(keywords?: string[] | string): string {
  if (!keywords) return 'general'

  // string인 경우 배열로 변환
  const keywordArray = Array.isArray(keywords)
    ? keywords
    : typeof keywords === 'string'
      ? keywords.split(',').map((k) => k.trim())
      : []

  if (keywordArray.length === 0) return 'general'

  const aiKeywords = ['AI', 'Claude', 'agent', 'LLM', 'RAG']
  const devKeywords = ['프로젝트', '멘탈모델', '프로세스', 'TDD']

  if (keywordArray.some((k) => aiKeywords.some((ai) => k.includes(ai)))) return 'ai'
  if (keywordArray.some((k) => devKeywords.some((dev) => k.includes(dev)))) return 'methodology'
  return 'philosophy'
}

/**
 * ~/.cogni/notes/persona/*.md 처리 (SSOT)
 */
async function processPersonaFiles(): Promise<ChunkResult[]> {
  console.log('📂 Processing Cogni persona files...')

  let files: string[]
  try {
    files = await fs.readdir(COGNI_PERSONA_DIR)
  } catch {
    console.warn('⚠️  Cogni persona 디렉토리를 찾을 수 없습니다:', COGNI_PERSONA_DIR)
    return []
  }

  const results: ChunkResult[] = []
  const mdFiles = files.filter((f) => f.endsWith('.md'))

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(COGNI_PERSONA_DIR, file), 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    // tags에 persona가 없으면 스킵
    const tags = (frontmatter.tags as string[]) || []
    if (!tags.includes('persona')) {
      console.log(`  ⏭️  ${file}: skipped (no persona tag)`)
      continue
    }
    const type = path.basename(file, '.md')
    const title = (frontmatter.title as string) || type

    // resume.md는 섹션 기반 청킹 (## 기준)
    // 100-questions.md는 질문별 청킹 (### Q 기준)
    if (type === 'resume' || type === '100-questions') {
      const delimiter = type === '100-questions' ? /(?=^### Q\d+)/m : /(?=^## )/m
      const chunks = body.split(delimiter).filter((s) => s.trim().length > 0)

      let validIndex = 0
      let skippedCount = 0
      chunks.forEach((chunk) => {
        // 제목 추출: 100-questions는 ### Q, resume는 ##
        const titleMatch =
          type === '100-questions' ? chunk.match(/^### (Q\d+\..+)/m) : chunk.match(/^##\s+(.+)/m)
        const sectionTitle = titleMatch?.[1] || title

        // [?] 플레이스홀더만 있는 답변 스킵 (노이즈 제거)
        if (type === '100-questions') {
          const content = chunk.replace(/^### Q\d+\..+\n+/m, '').trim()
          if (content === '[?]' || content.length < 20) {
            skippedCount++
            return // 답변이 없거나 너무 짧으면 스킵
          }
        }

        results.push({
          id: `cogni_${type}_${validIndex}`,
          content: chunk.trim(),
          metadata: {
            type,
            title: sectionTitle,
            source: 'cogni',
            chunkIndex: validIndex,
            totalChunks: chunks.length
          }
        })
        validIndex++
      })

      const chunkInfo =
        type === '100-questions'
          ? `${validIndex} valid, ${skippedCount} skipped`
          : `${validIndex} chunks`
      console.log(`  📄 ${file}: ${chunkInfo}`)
      continue
    }

    const chunks = chunkByParagraph(body)
    console.log(`  📄 ${file}: ${chunks.length} chunks`)

    chunks.forEach((chunk, index) => {
      results.push({
        id: `cogni_${type}_${index}`,
        content: chunk,
        metadata: {
          type,
          title: extractTitle(chunk) || title,
          source: 'cogni',
          chunkIndex: index,
          totalChunks: chunks.length
        }
      })
    })
  }

  return results
}

/**
 * Cogni notes에서 인덱싱 가능한 태그가 있는 파일 처리
 * - blog: 블로그 포스트로 발행된 노트들
 * - rag: RAG에만 노출할 지식 문서들 (미발행)
 * - persona: 김동욱 관련 지식/생각 노트 (persona 디렉토리 밖에 있는 것들)
 */
async function processTaggedNotes(): Promise<ChunkResult[]> {
  console.log('📂 Processing Cogni tagged notes (blog/rag/persona)...')

  const results: ChunkResult[] = []

  // 재귀적으로 모든 md 파일 찾기
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
      // 디렉토리 없음
    }
    return files
  }

  const mdFiles = await findMdFiles(COGNI_NOTES_DIR)

  for (const filePath of mdFiles) {
    // persona 디렉토리는 이미 processPersonaFiles에서 처리하므로 스킵
    if (filePath.includes('/persona/')) continue

    const content = await fs.readFile(filePath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    // tags에 blog 또는 rag가 있는지 확인
    const tags = (frontmatter.tags as string[]) || []
    const hasIndexableTag =
      tags.includes('blog') || tags.includes('rag') || tags.includes('persona')
    if (!hasIndexableTag) continue

    // rag: false인 경우 스킵
    if (frontmatter.rag === false || frontmatter.rag === 'false') {
      console.log(`  ⏭️  ${path.basename(filePath)}: skipped (rag: false)`)
      continue
    }

    const slug = path.basename(filePath, '.md')
    const rawKeywords = frontmatter.keywords
    const keywords: string[] | undefined = Array.isArray(rawKeywords)
      ? rawKeywords
      : typeof rawKeywords === 'string'
        ? [rawKeywords]
        : undefined

    // 섹션 기반 청킹
    const chunks = chunkBySection(body)

    console.log(`  📄 ${path.basename(filePath)}: ${chunks.length} chunks`)

    // 태그 우선순위: blog > persona > rag(knowledge)
    const docType = tags.includes('blog')
      ? 'blog'
      : tags.includes('persona')
        ? 'persona'
        : 'knowledge'
    const idPrefix = tags.includes('blog') ? 'blog' : tags.includes('persona') ? 'persona' : 'rag'

    chunks.forEach((chunk, index) => {
      results.push({
        id: `${idPrefix}_${slug}_${index}`,
        content: chunk.trim(),
        metadata: {
          type: docType,
          title: (frontmatter.title as string) || slug,
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

// OpenAI embedding 차원 (text-embedding-3-large)
const OPENAI_DIMENSION = 3072

/**
 * Qdrant Hybrid Collection 생성
 * Dense (OpenAI) + Sparse (BM25) 벡터 지원
 */
async function createHybridCollection(client: QdrantClient): Promise<void> {
  try {
    // 기존 컬렉션 삭제
    await client.deleteCollection(COLLECTION_NAME)
    console.log(`🗑️  기존 컬렉션 삭제: ${COLLECTION_NAME}`)
  } catch {
    // 컬렉션이 없으면 무시
  }

  // Hybrid 컬렉션 생성 (dense + sparse)
  await client.createCollection(COLLECTION_NAME, {
    vectors: {
      dense: {
        size: OPENAI_DIMENSION,
        distance: 'Cosine'
      }
    },
    sparse_vectors: {
      sparse: {
        index: {
          on_disk: false // 메모리에서 빠른 검색
        }
      }
    }
  })

  console.log(`✅ Hybrid 컬렉션 생성: ${COLLECTION_NAME}`)
  console.log(`   - Dense: ${OPENAI_DIMENSION}d (OpenAI text-embedding-3-large)`)
  console.log(`   - Sparse: BM25 (한국어/영어 토크나이저)`)
}

/**
 * Contextual Chunk Enhancement (Anthropic Contextual Retrieval 방식)
 *
 * 청크에 의미적 컨텍스트를 주입하여 시맨틱 갭 해결
 * - "어떤 회사에 재직 중?" → "콕스웨이브" 매칭 가능
 * - BM25 + Dense 모두 개선
 *
 * @see https://www.anthropic.com/news/contextual-retrieval
 */
function addContextToChunk(chunk: ChunkResult): ChunkResult {
  const { content, metadata } = chunk

  // 경력/이력서 섹션에 컨텍스트 추가
  if (metadata.type === 'resume') {
    // "## 경력" 섹션인지 확인
    if (
      content.includes('콕스웨이브') ||
      content.includes('Coxwave') ||
      content.includes('비에이치에스엔') ||
      content.includes('모두싸인') ||
      content.includes('Engineer') ||
      content.includes('개발자')
    ) {
      const contextPrefix = '[컨텍스트: 김동욱의 재직 회사, 경력, 직장 경험]\n\n'
      return {
        ...chunk,
        content: contextPrefix + content
      }
    }

    // 기본 정보/연락처 섹션
    if (content.includes('이메일') || content.includes('GitHub') || content.includes('소개')) {
      const contextPrefix = '[컨텍스트: 김동욱의 연락처, 기본 정보]\n\n'
      return {
        ...chunk,
        content: contextPrefix + content
      }
    }

    // 기술 스택 섹션
    if (
      content.includes('기술 스택') ||
      content.includes('프론트엔드') ||
      content.includes('백엔드')
    ) {
      const contextPrefix = '[컨텍스트: 김동욱의 기술 스택, 사용 기술]\n\n'
      return {
        ...chunk,
        content: contextPrefix + content
      }
    }
  }

  // 100-questions 경력/회사 관련 질문
  if (metadata.type === '100-questions') {
    const careerKeywords = ['회사', '직장', '일', 'Coxwave', '콕스웨이브', '경력', '재직']
    if (careerKeywords.some((k) => content.includes(k))) {
      const contextPrefix = '[컨텍스트: 김동욱의 현재 회사, 직장 관련 질문]\n\n'
      return {
        ...chunk,
        content: contextPrefix + content
      }
    }
  }

  return chunk
}

/**
 * Qdrant 초기화 (Hybrid Search 지원)
 */
async function initializeDatabase(testMode: boolean = false) {
  console.log('\n🚀 Qdrant Hybrid 초기화 시작...\n')

  const qdrantUrl = process.env.QDRANT_URL

  // 테스트 모드가 아닐 때만 환경변수 체크
  if (!testMode) {
    if (!qdrantUrl) {
      console.error('❌ QDRANT_URL 환경변수가 필요합니다')
      process.exit(1)
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY 환경변수가 필요합니다')
      process.exit(1)
    }
  }

  // 모든 문서 수집 (Cogni SSOT)
  const personaChunks = await processPersonaFiles()
  const blogChunks = await processTaggedNotes()

  // Contextual Retrieval: 청크에 의미적 컨텍스트 주입 (Anthropic 방식)
  // @see https://www.anthropic.com/news/contextual-retrieval
  const allChunks = [...personaChunks, ...blogChunks].map(addContextToChunk)

  console.log(`\n📊 총 청크 수: ${allChunks.length}`)
  console.log(`   - cogni/persona: ${personaChunks.length}`)
  console.log(`   - cogni/tagged (blog+rag+persona): ${blogChunks.length}\n`)

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

  // Embeddings 초기화 (OpenAI text-embedding-3-large)
  console.log('🔧 OpenAI text-embedding-3-large 임베딩 초기화...')
  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-large',
    dimensions: OPENAI_DIMENSION
  })

  // BM25 엔진 초기화
  console.log('🔧 BM25 엔진 초기화...')
  resetBM25Engine() // 싱글톤 리셋
  const bm25Engine = getBM25Engine()
  await bm25Engine.initialize(
    allChunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content
    }))
  )

  // Qdrant 클라이언트 설정
  const url = new URL(qdrantUrl!)
  const isHttps = url.protocol === 'https:'

  // HTTPS 외부 접근시 포트 443 사용, 내부/로컬은 URL에서 추출
  const port = isHttps ? 443 : parseInt(url.port || '6333', 10)

  console.log(`🔗 Qdrant 연결: ${url.hostname}:${port} (${isHttps ? 'HTTPS' : 'HTTP'})`)

  // QdrantClient 직접 생성 (포트 명시)
  const qdrantClient = new QdrantClient({
    host: url.hostname,
    port,
    https: isHttps,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false // 버전 체크 스킵
  })

  // Hybrid 컬렉션 생성
  console.log('🔧 Qdrant Hybrid 컬렉션 생성 중...')
  await createHybridCollection(qdrantClient)

  // Dense 임베딩 생성 (배치 처리)
  console.log('🔧 Dense 임베딩 생성 중...')
  const contents = allChunks.map((chunk) => chunk.content)
  const denseVectors = await embeddings.embedDocuments(contents)
  console.log(`   ${denseVectors.length}개 dense 벡터 생성 완료`)

  // Sparse 벡터 생성 (BM25)
  console.log('🔧 Sparse 벡터 생성 중...')
  const sparseVectors = allChunks.map((chunk) => bm25Engine.generateSparseVector(chunk.content))
  console.log(`   ${sparseVectors.length}개 sparse 벡터 생성 완료`)

  // 포인트 업서트 (배치)
  console.log('🔧 Qdrant에 포인트 업서트 중...')
  const BATCH_SIZE = 100

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batchChunks = allChunks.slice(i, i + BATCH_SIZE)
    const batchDense = denseVectors.slice(i, i + BATCH_SIZE)
    const batchSparse = sparseVectors.slice(i, i + BATCH_SIZE)

    const points = batchChunks.map((chunk, idx) => ({
      id: i + idx, // Qdrant requires integer or UUID
      vector: {
        dense: batchDense[idx],
        sparse: batchSparse[idx]
      },
      payload: {
        content: chunk.content,
        ...chunk.metadata,
        docId: chunk.id // 원래 문자열 ID는 payload에 저장
      }
    }))

    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points
    })

    console.log(
      `   배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)} 업로드 완료`
    )
  }

  console.log(`✅ ${allChunks.length}개 문서 Hybrid 업로드 완료!`)

  // 연결 확인을 위해 간단한 검색 테스트
  const testResults = await qdrantClient.query(COLLECTION_NAME, {
    query: denseVectors[0],
    using: 'dense',
    limit: 1
  })
  if (testResults.points.length > 0) {
    console.log('✅ Qdrant Hybrid 연결 확인 완료')
  }

  console.log('\n✅ Hybrid 데이터베이스 초기화 완료!')
}

/**
 * 검색 테스트 (Hybrid Search 포함)
 */
async function testSearch() {
  console.log('\n🔍 Hybrid 검색 테스트 시작...\n')

  const qdrantUrl = process.env.QDRANT_URL

  if (!qdrantUrl) {
    console.error('❌ QDRANT_URL이 필요합니다')
    return
  }

  // OpenAI text-embedding-3-large 사용
  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-large',
    dimensions: OPENAI_DIMENSION
  })

  // BM25 엔진 체크
  const bm25Engine = getBM25Engine()
  const hasBM25 = bm25Engine.isInitialized()
  if (!hasBM25) {
    console.warn('⚠️  BM25 엔진이 초기화되지 않았습니다. Dense 검색만 테스트합니다.')
  }

  // Qdrant 클라이언트 설정
  const url = new URL(qdrantUrl)
  const isHttps = url.protocol === 'https:'
  const port = isHttps ? 443 : parseInt(url.port || '6333', 10)

  console.log(`🔗 Qdrant 연결: ${url.hostname}:${port} (${isHttps ? 'HTTPS' : 'HTTP'})`)

  const qdrantClient = new QdrantClient({
    host: url.hostname,
    port,
    https: isHttps,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false
  })

  const testQueries = [
    '취미가 뭐야?',
    '코드 리뷰에서 중요하게 보는 것은?',
    '기술 스택이 뭔가요?',
    '어떤 프로젝트를 했나요?',
    'Coxwave' // 고유명사 테스트 (BM25가 강점)
  ]

  // Dense 검색 테스트
  console.log('📌 Dense 검색 (Voyage):')
  for (const query of testQueries) {
    console.log(`\n❓ Query: "${query}"`)

    const denseVector = await embeddings.embedQuery(query)
    const results = await qdrantClient.query(COLLECTION_NAME, {
      query: denseVector,
      using: 'dense',
      limit: 3,
      with_payload: true
    })

    if (results.points.length === 0) {
      console.log('   ❌ 결과 없음')
    } else {
      results.points.forEach((point, index) => {
        const payload = point.payload as Record<string, unknown>
        const content = (payload.content as string) || ''
        console.log(`   ${index + 1}. [${payload.type}] ${content.substring(0, 80)}...`)
      })
    }
  }

  // BM25가 초기화된 경우에만 Sparse/Hybrid 테스트
  if (hasBM25) {
    console.log('\n\n📌 Sparse 검색 (BM25):')
    for (const query of testQueries) {
      console.log(`\n❓ Query: "${query}"`)

      const sparseVector = bm25Engine.generateSparseVector(query)
      if (sparseVector.indices.length === 0) {
        console.log('   ⚠️ 쿼리 토큰이 어휘에 없음 (OOV)')
        continue
      }

      const results = await qdrantClient.query(COLLECTION_NAME, {
        query: sparseVector,
        using: 'sparse',
        limit: 3,
        with_payload: true
      })

      if (results.points.length === 0) {
        console.log('   ❌ 결과 없음')
      } else {
        results.points.forEach((point, index) => {
          const payload = point.payload as Record<string, unknown>
          const content = (payload.content as string) || ''
          console.log(`   ${index + 1}. [${payload.type}] ${content.substring(0, 80)}...`)
        })
      }
    }

    console.log('\n\n📌 Hybrid 검색 (RRF Fusion):')
    for (const query of testQueries) {
      console.log(`\n❓ Query: "${query}"`)

      const denseVector = await embeddings.embedQuery(query)
      const sparseVector = bm25Engine.generateSparseVector(query)

      // Qdrant Query API with prefetch + RRF fusion
      const results = await qdrantClient.query(COLLECTION_NAME, {
        prefetch: [
          {
            query: sparseVector,
            using: 'sparse',
            limit: 10
          },
          {
            query: denseVector,
            using: 'dense',
            limit: 10
          }
        ],
        query: { fusion: 'rrf' },
        limit: 3,
        with_payload: true
      })

      if (results.points.length === 0) {
        console.log('   ❌ 결과 없음')
      } else {
        results.points.forEach((point, index) => {
          const payload = point.payload as Record<string, unknown>
          const content = (payload.content as string) || ''
          const score = point.score?.toFixed(3) || 'N/A'
          console.log(
            `   ${index + 1}. [${payload.type}] (score: ${score}) ${content.substring(0, 70)}...`
          )
        })
      }
    }
  }
}

/**
 * 컬렉션 삭제 후 재생성 (Hybrid)
 */
async function cleanAndInitialize() {
  console.log('\n🧹 Hybrid 컬렉션 정리 및 재생성...\n')

  // 재초기화 (createHybridCollection에서 삭제 포함)
  await initializeDatabase(false)
}

// Main
async function main() {
  const args = process.argv.slice(2)
  const testMode = args.includes('--test')
  const searchOnly = args.includes('--search')
  const cleanMode = args.includes('--clean')

  if (searchOnly) {
    await testSearch()
  } else if (cleanMode) {
    await cleanAndInitialize()
    await testSearch()
  } else {
    await initializeDatabase(testMode)

    if (!testMode) {
      await testSearch()
    }
  }

  console.log('\n🎉 완료!\n')
}

main().catch((error) => {
  console.error('❌ 오류 발생:', error)
  process.exit(1)
})
