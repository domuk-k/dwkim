import { createHash } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import matter from 'gray-matter'
import { z } from 'zod'
import {
  type Document,
  type DocumentType,
  getVectorStore,
  initVectorStore
} from '../services/vectorStore'

// 경로 기반 UUID 생성 (동일 경로+인덱스는 동일 UUID)
const generateDocId = (path: string, chunkIndex: number): string => {
  const hash = createHash('sha256').update(`${path}:${chunkIndex}`).digest('hex')
  // UUID v4 형식으로 변환 (8-4-4-4-12)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

// Frontmatter 스키마 (Cogni 노트 형식)
interface CogniFrontmatter {
  title?: string
  created?: string
  updated?: string
  tags?: string[]
  type?: string
  status?: string
}

// 요청 스키마
const SyncNoteRequestSchema = z.object({
  path: z.string().min(1),
  content: z.string().optional(),
  action: z.enum(['upsert', 'delete'])
})

// 청킹 설정
const MAX_CHUNK_SIZE = 1500

/**
 * Markdown 콘텐츠를 섹션 기반으로 청킹
 */
function chunkBySection(content: string): string[] {
  const sections = content.split(/(?=^## )/m)
  const chunks: string[] = []

  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed) continue

    // 섹션이 너무 길면 추가로 분할
    if (trimmed.length > MAX_CHUNK_SIZE) {
      const subChunks = chunkByParagraph(trimmed, MAX_CHUNK_SIZE)
      chunks.push(...subChunks)
    } else {
      chunks.push(trimmed)
    }
  }

  return chunks
}

/**
 * 단락 기반 청킹 (섹션이 너무 길 때 사용)
 */
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

/**
 * Cogni 노트 파일을 파싱하고 청크 생성
 */
function parseAndChunkNote(
  _path: string,
  rawContent: string
): { frontmatter: CogniFrontmatter; chunks: string[] } {
  const { data, content } = matter(rawContent)
  const frontmatter = data as CogniFrontmatter

  // 섹션 기반 청킹
  const chunks = chunkBySection(content)

  return { frontmatter, chunks }
}

/**
 * 청크를 Document 객체로 변환
 */
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

export default async function syncRoutes(fastify: FastifyInstance) {
  // 초기화
  try {
    // VectorStore 싱글턴 초기화
    await initVectorStore()
    console.log('Vector store initialized for sync routes')
  } catch (error) {
    console.error('Failed to initialize vector store for sync:', error)
  }

  /**
   * POST /sync/note - 노트 동기화 (upsert 또는 delete)
   *
   * Cogni Hook에서 호출됨:
   * - action: 'upsert' - 노트 생성/수정 시
   * - action: 'delete' - 노트 삭제 시 또는 persona 태그 제거 시
   */
  fastify.post(
    '/sync/note',
    {
      schema: {
        description: 'Cogni 노트 동기화 엔드포인트',
        tags: ['Sync'],
        body: {
          type: 'object',
          required: ['path', 'action'],
          properties: {
            path: { type: 'string', description: '노트 파일 경로' },
            content: { type: 'string', description: '노트 전체 내용 (frontmatter 포함)' },
            action: {
              type: 'string',
              enum: ['upsert', 'delete'],
              description: 'upsert: 생성/수정, delete: 삭제'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              action: { type: 'string' },
              path: { type: 'string' },
              chunksProcessed: { type: 'number' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validated = SyncNoteRequestSchema.parse(request.body)
        const { path, content, action } = validated

        console.log(`Sync request: ${action} for ${path}`)

        const vectorStore = getVectorStore()

        if (action === 'delete') {
          // 삭제 요청
          const deletedCount = await vectorStore.deleteDocumentsByPath(path)
          return reply.send({
            success: true,
            action: 'delete',
            path,
            chunksProcessed: deletedCount,
            message:
              deletedCount > 0 ? `Deleted ${deletedCount} chunks` : 'No documents found to delete'
          })
        }

        // Upsert 요청
        if (!content) {
          return reply.status(400).send({
            success: false,
            error: 'Content is required for upsert action'
          })
        }

        // Frontmatter 파싱
        const { frontmatter, chunks } = parseAndChunkNote(path, content)

        // persona 태그 확인
        const hasPersonaTag = frontmatter.tags?.includes('persona')
        if (!hasPersonaTag) {
          // persona 태그가 없으면 기존 문서 삭제 (태그가 제거된 경우)
          const deletedCount = await vectorStore.deleteDocumentsByPath(path)
          return reply.send({
            success: true,
            action: 'skip',
            path,
            chunksProcessed: deletedCount,
            message:
              deletedCount > 0
                ? `Removed ${deletedCount} chunks (persona tag removed)`
                : 'Skipped (no persona tag)'
          })
        }

        // Document 생성 및 업서트
        const documents = createDocuments(path, frontmatter, chunks)
        await vectorStore.upsertDocuments(documents, path)

        return reply.send({
          success: true,
          action: 'upsert',
          path,
          chunksProcessed: documents.length,
          message: `Synced ${documents.length} chunks`
        })
      } catch (error) {
        console.error('Sync error:', error)

        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid request data',
            details: error.errors
          })
        }

        return reply.status(500).send({
          success: false,
          error: 'Sync failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  )

  /**
   * GET /sync/status - 동기화 상태 확인
   */
  fastify.get(
    '/sync/status',
    {
      schema: {
        description: 'Cogni 동기화 상태 확인',
        tags: ['Sync'],
        querystring: {
          type: 'object',
          properties: {
            tag: { type: 'string', default: 'persona' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              tag: { type: 'string' },
              documentCount: { type: 'number' },
              paths: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tag = 'persona' } = request.query as { tag?: string }

        const vectorStore = getVectorStore()
        const documents = await vectorStore.getDocumentsByTag(tag)

        // 고유 경로 추출
        const paths = [
          ...new Set(documents.map((doc) => doc.metadata.path).filter((p): p is string => !!p))
        ]

        return reply.send({
          success: true,
          tag,
          documentCount: documents.length,
          paths
        })
      } catch (error) {
        console.error('Status check error:', error)
        return reply.status(500).send({
          success: false,
          error: 'Status check failed'
        })
      }
    }
  )

  /**
   * POST /sync/reindex - 전체 재인덱싱 트리거
   * (향후 Cogni 노트 디렉토리 전체 스캔용)
   */
  fastify.post(
    '/sync/reindex',
    {
      schema: {
        description: '전체 재인덱싱 트리거 (향후 구현)',
        tags: ['Sync'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // TODO: Cogni 노트 디렉토리 전체 스캔 및 재인덱싱
      return reply.send({
        success: true,
        message: 'Reindex endpoint ready. Use initQdrantData.ts for now.'
      })
    }
  )
}
