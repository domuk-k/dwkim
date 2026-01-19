import { createHash } from 'node:crypto'
import { Elysia, t } from 'elysia'
import matter from 'gray-matter'
import {
  type Document,
  type DocumentType,
  getVectorStore,
  initVectorStore
} from '../services/vectorStore'

// 경로 기반 UUID 생성 (동일 경로+인덱스는 동일 UUID)
const generateDocId = (path: string, chunkIndex: number): string => {
  const hash = createHash('sha256').update(`${path}:${chunkIndex}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

// Frontmatter 스키마
interface CogniFrontmatter {
  title?: string
  created?: string
  updated?: string
  tags?: string[]
  type?: string
  status?: string
}

// 청킹 설정
const MAX_CHUNK_SIZE = 1500

function chunkBySection(content: string): string[] {
  const sections = content.split(/(?=^## )/m)
  const chunks: string[] = []

  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed) continue

    if (trimmed.length > MAX_CHUNK_SIZE) {
      const subChunks = chunkByParagraph(trimmed, MAX_CHUNK_SIZE)
      chunks.push(...subChunks)
    } else {
      chunks.push(trimmed)
    }
  }

  return chunks
}

function chunkByParagraph(text: string, maxSize: number): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxSize) {
      if (current) chunks.push(current.trim())
      current = para
    } else {
      current = current ? `${current}\n\n${para}` : para
    }
  }

  if (current) chunks.push(current.trim())
  return chunks
}

function parseAndChunkNote(
  _path: string,
  rawContent: string
): { frontmatter: CogniFrontmatter; chunks: string[] } {
  const { data, content } = matter(rawContent)
  const frontmatter = data as CogniFrontmatter
  const chunks = chunkBySection(content)
  return { frontmatter, chunks }
}

function createDocuments(
  path: string,
  frontmatter: CogniFrontmatter,
  chunks: string[]
): Document[] {
  const now = new Date().toISOString()

  return chunks.map((chunk, index) => ({
    id: generateDocId(path, index),
    content: chunk,
    metadata: {
      type: 'cogni' as DocumentType,
      title: frontmatter.title || path.split('/').pop()?.replace('.md', ''),
      source: 'cogni' as const,
      path,
      tags: frontmatter.tags || [],
      chunkIndex: index,
      totalChunks: chunks.length,
      createdAt: frontmatter.created || now
    }
  }))
}

// VectorStore 초기화
let vectorStoreInitialized = false

export const syncRoutes = new Elysia({ prefix: '/api/v1' })
  // 초기화 미들웨어
  .onBeforeHandle(async () => {
    if (!vectorStoreInitialized) {
      try {
        await initVectorStore()
        console.log('Vector store initialized for sync routes')
        vectorStoreInitialized = true
      } catch (error) {
        console.error('Failed to initialize vector store for sync:', error)
      }
    }
  })

  // POST /api/v1/sync/note
  .post(
    '/sync/note',
    async ({ body, set }) => {
      try {
        const { path, content, action } = body

        console.log(`Sync request: ${action} for ${path}`)

        const vectorStore = getVectorStore()

        if (action === 'delete') {
          const deletedCount = await vectorStore.deleteDocumentsByPath(path)
          return {
            success: true,
            action: 'delete',
            path,
            chunksProcessed: deletedCount,
            message:
              deletedCount > 0 ? `Deleted ${deletedCount} chunks` : 'No documents found to delete'
          }
        }

        // Upsert 요청
        if (!content) {
          set.status = 400
          return { success: false, error: 'Content is required for upsert action' }
        }

        const { frontmatter, chunks } = parseAndChunkNote(path, content)

        // persona 태그 확인
        const hasPersonaTag = frontmatter.tags?.includes('persona')
        if (!hasPersonaTag) {
          const deletedCount = await vectorStore.deleteDocumentsByPath(path)
          return {
            success: true,
            action: 'skip',
            path,
            chunksProcessed: deletedCount,
            message:
              deletedCount > 0
                ? `Removed ${deletedCount} chunks (persona tag removed)`
                : 'Skipped (no persona tag)'
          }
        }

        const documents = createDocuments(path, frontmatter, chunks)
        await vectorStore.upsertDocuments(documents, path)

        return {
          success: true,
          action: 'upsert',
          path,
          chunksProcessed: documents.length,
          message: `Synced ${documents.length} chunks`
        }
      } catch (error) {
        console.error('Sync error:', error)
        set.status = 500
        return {
          success: false,
          error: 'Sync failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    },
    {
      body: t.Object({
        path: t.String({ minLength: 1 }),
        content: t.Optional(t.String()),
        action: t.Union([t.Literal('upsert'), t.Literal('delete')])
      })
    }
  )

  // GET /api/v1/sync/status
  .get(
    '/sync/status',
    async ({ query, set }) => {
      try {
        const tag = query.tag || 'persona'
        const vectorStore = getVectorStore()
        const documents = await vectorStore.getDocumentsByTag(tag)

        const paths = [
          ...new Set(documents.map((doc) => doc.metadata.path).filter((p): p is string => !!p))
        ]

        return {
          success: true,
          tag,
          documentCount: documents.length,
          paths
        }
      } catch (error) {
        console.error('Status check error:', error)
        set.status = 500
        return { success: false, error: 'Status check failed' }
      }
    },
    {
      query: t.Object({
        tag: t.Optional(t.String({ default: 'persona' }))
      })
    }
  )

  // POST /api/v1/sync/reindex
  .post('/sync/reindex', () => ({
    success: true,
    message: 'Reindex endpoint ready. Use initQdrantData.ts for now.'
  }))
