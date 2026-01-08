import { QdrantVectorStore } from '@langchain/qdrant'
import { QdrantClient } from '@qdrant/js-client-rest'
import { env } from '../config/env'
import { getBM25Engine, type SparseVector } from './bm25Engine'
import { OpenAIEmbeddings } from './openaiEmbeddings'

export type DocumentType =
  | 'resume'
  | 'faq'
  | 'thoughts'
  | 'experience'
  | 'about'
  | 'post'
  | 'blog'
  | 'knowledge' // RAG 전용 지식 문서
  | 'cogni'

export type DocumentSource = 'persona-api' | 'blog' | 'cogni'

export interface Document {
  id: string
  content: string
  metadata: {
    type: DocumentType
    title?: string
    category?: string
    source?: DocumentSource
    pubDate?: string
    keywords?: string[]
    chunkIndex?: number
    totalChunks?: number
    createdAt?: string
    path?: string // Cogni 노트 파일 경로
    tags?: string[] // Cogni 노트 태그
  }
  score?: number // 유사도 점수 (0~1, 높을수록 관련성 높음)
}

// 유사도 점수 threshold (이 값 이하는 관련 없는 것으로 간주)
// Qdrant 코사인 유사도: 0 = 무관, 1 = 동일
const RELEVANCE_THRESHOLD = 0.3

export class VectorStore {
  private vectorStore: QdrantVectorStore | null = null
  private embeddings: OpenAIEmbeddings | null = null
  private qdrantClient: QdrantClient | null = null
  private _initialized = false
  private collectionName = 'persona_documents'

  get initialized(): boolean {
    return this._initialized
  }

  constructor() {
    // OpenAI text-embedding-3-large: 강력한 시맨틱 이해력
    if (env.OPENAI_API_KEY) {
      this.embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-large',
        dimensions: 3072
      })
    }
  }

  async initialize(): Promise<void> {
    try {
      // Mock 모드 체크
      if (env.USE_VECTOR_STORE === 'false' || env.MOCK_MODE === 'true') {
        console.log('Vector store disabled - using mock mode')
        this._initialized = true
        return
      }

      const qdrantUrl = env.QDRANT_URL
      if (!qdrantUrl) {
        console.warn('QDRANT_URL not set - vector store will use mock mode')
        this._initialized = true
        return
      }

      if (!this.embeddings) {
        throw new Error('Embeddings not initialized')
      }

      // Qdrant 클라이언트 설정
      const url = new URL(qdrantUrl)
      const isHttps = url.protocol === 'https:'
      // HTTPS 외부 접근시 포트 443 사용, 내부/로컬은 URL에서 추출
      const port = isHttps ? 443 : parseInt(url.port || '6333', 10)

      console.log(`Connecting to Qdrant: ${url.hostname}:${port} (${isHttps ? 'HTTPS' : 'HTTP'})`)

      // QdrantClient 직접 생성 (포트 명시)
      this.qdrantClient = new QdrantClient({
        host: url.hostname,
        port,
        https: isHttps,
        apiKey: env.QDRANT_API_KEY,
        checkCompatibility: false // 버전 체크 스킵
      })

      const qdrantConfig = {
        client: this.qdrantClient,
        collectionName: this.collectionName,
        // initQdrantData.ts에서 'dense' named vector로 컬렉션 생성하므로 매칭 필요
        contentVector: 'dense'
      }

      // 기존 컬렉션 연결 시도
      try {
        this.vectorStore = await QdrantVectorStore.fromExistingCollection(
          this.embeddings,
          qdrantConfig
        )
        console.log('Vector store initialized with Qdrant (existing collection)')
      } catch (existingError) {
        console.log('fromExistingCollection failed:', existingError)
        console.log('Creating new collection...')
        this.vectorStore = await QdrantVectorStore.fromDocuments([], this.embeddings, qdrantConfig)
        console.log('Vector store initialized with Qdrant (new collection)')
      }
      this._initialized = true
    } catch (error) {
      console.error('Failed to initialize vector store:', error)

      // 프로덕션에서는 실패하도록 (silent failure 방지)
      if (env.NODE_ENV === 'production') {
        throw new Error(`Vector store initialization failed: ${error}`)
      }

      // 개발 환경에서만 mock 모드 허용
      console.warn('Falling back to mock mode (development only)')
      this._initialized = true
    }
  }

  async addDocument(document: Document): Promise<void> {
    // 단일 문서는 addDocuments로 위임
    await this.addDocuments([document])
  }

  async addDocuments(documents: Document[]): Promise<void> {
    // Qdrant 클라이언트를 직접 사용 (LangChain은 named vector 미지원)
    if (!this.qdrantClient || !this.embeddings) {
      console.warn('Vector store not available - skipping documents add')
      return
    }

    try {
      // 1. Dense 임베딩 생성
      const contents = documents.map((doc) => doc.content)
      const denseVectors = await this.embeddings.embedDocuments(contents)
      console.log(`Embedded ${denseVectors.length}/${documents.length} documents`)

      // 2. Qdrant에 직접 업서트 (named vector 'dense' 사용)
      const points = documents.map((doc, idx) => ({
        id: idx, // 임시 integer ID (Qdrant 요구사항)
        vector: {
          dense: denseVectors[idx]
          // Note: sparse vector는 생략 (BM25 재인덱싱 시 전체 컬렉션 대상으로 수행)
        },
        payload: {
          content: doc.content,
          ...doc.metadata,
          docId: doc.id
        }
      }))

      // UUID 기반 ID로 변환 (문자열 ID 지원)
      const pointsWithUUID = points.map((point, idx) => ({
        ...point,
        id: documents[idx].id // 원래 문자열 UUID 사용
      }))

      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: pointsWithUUID
      })

      console.log(`${documents.length} documents added`)
    } catch (error) {
      console.error('Failed to add documents:', error)
      throw new Error('Failed to add documents to vector store')
    }
  }

  /**
   * 다양성 검색 (키워드 부스팅 + 중복 제거 + 유사도 필터링)
   *
   * 한국어 임베딩 모델의 의미 매칭 한계를 보완:
   * 1. 넓은 범위의 similarity search with score
   * 2. 유사도 threshold 이하는 제외 (관련 없는 문서 필터링)
   * 3. 제목에 쿼리 키워드 포함된 문서 우선
   * 4. 동일 문서의 중복 청크 제거
   */
  async searchDiverse(
    query: string,
    topK: number = 5,
    _filter?: Record<string, unknown>
  ): Promise<Document[]> {
    // Qdrant 클라이언트를 직접 사용 (LangChain은 named vector 미지원)
    if (!this.qdrantClient || !this.embeddings) {
      console.warn('Vector store not available - returning mock results')
      return this.getMockResults(query)
    }

    try {
      // 1. Dense 벡터 생성 및 검색
      const fetchK = Math.max(topK * 5, 30)
      const denseVector = await this.embeddings.embedQuery(query)

      const results = await this.qdrantClient.query(this.collectionName, {
        query: denseVector,
        using: 'dense',
        limit: fetchK,
        with_payload: true,
        score_threshold: RELEVANCE_THRESHOLD
      })

      console.log(`VectorStore: Fetched ${results.points.length} candidates for query: "${query}"`)

      if (results.points.length === 0) {
        console.log('VectorStore: No relevant results found')
        return []
      }

      // 2. 키워드 부스팅: 제목에 쿼리 포함된 문서 우선
      const queryLower = query.toLowerCase()
      const boostedResults = [...results.points].sort((a, b) => {
        const aPayload = a.payload as Record<string, unknown>
        const bPayload = b.payload as Record<string, unknown>
        const aTitle = ((aPayload?.title as string) || '').toLowerCase()
        const bTitle = ((bPayload?.title as string) || '').toLowerCase()
        const aMatch = aTitle.includes(queryLower) ? 1 : 0
        const bMatch = bTitle.includes(queryLower) ? 1 : 0
        return bMatch - aMatch
      })

      // 3. 동일 문서 중복 제거 (첫 번째 청크만 유지)
      const seen = new Set<string>()
      const diverseResults = boostedResults
        .filter((point) => {
          const payload = point.payload as Record<string, unknown>
          const key =
            (payload?.title as string) ||
            (payload?.docId as string) ||
            ((payload?.content as string) || '').slice(0, 50)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .slice(0, topK)

      console.log(`VectorStore: Returning ${diverseResults.length} diverse results`)
      return this.mapQdrantResults(diverseResults)
    } catch (error) {
      console.error('Diverse search failed:', error)
      return this.getMockResults(query)
    }
  }

  /**
   * Hybrid 검색 (Dense + Sparse with RRF Fusion)
   *
   * Dense (Voyage) + Sparse (BM25)를 결합하여 검색
   * - Dense: 의미적 유사성 (semantic similarity)
   * - Sparse: 키워드 매칭 (고유명사, 정확한 용어)
   * - RRF: Reciprocal Rank Fusion으로 점수 융합
   *
   * @see https://qdrant.tech/documentation/concepts/hybrid-queries/
   */
  async searchHybrid(
    query: string,
    topK: number = 5,
    options?: {
      prefetchLimit?: number // prefetch 후보 수 (기본: topK * 2)
      denseFallback?: boolean // BM25 실패 시 Dense only 폴백 (기본: true)
    }
  ): Promise<Document[]> {
    // Mock 모드 체크
    if (!this.qdrantClient || !this.embeddings) {
      console.warn('Vector store not available - returning mock results')
      return this.getMockResults(query)
    }

    try {
      const prefetchLimit = options?.prefetchLimit ?? topK * 2
      const denseFallback = options?.denseFallback ?? true

      // 1. Dense vector 생성
      const denseVector = await this.embeddings.embedQuery(query)

      // 2. Sparse vector 생성 (BM25)
      const bm25Engine = getBM25Engine()
      let sparseVector: SparseVector | null = null

      if (bm25Engine.isInitialized()) {
        sparseVector = bm25Engine.generateSparseVector(query)
        // 빈 sparse vector는 null 처리
        if (sparseVector.indices.length === 0) {
          console.log(`VectorStore: Query "${query}" has no BM25 tokens (OOV)`)
          sparseVector = null
        }
      } else {
        console.warn('VectorStore: BM25 engine not initialized, using dense only')
      }

      // 3. Hybrid 또는 Dense only 검색
      let results

      if (sparseVector) {
        // Hybrid Search with RRF
        console.log(`VectorStore: Hybrid searching for: "${query}"`)
        results = await this.qdrantClient.query(this.collectionName, {
          prefetch: [
            {
              query: sparseVector,
              using: 'sparse',
              limit: prefetchLimit
            },
            {
              query: denseVector,
              using: 'dense',
              limit: prefetchLimit
            }
          ],
          query: { fusion: 'rrf' },
          limit: topK,
          with_payload: true
        })
      } else if (denseFallback) {
        // Dense only fallback
        console.log(`VectorStore: Dense-only searching for: "${query}"`)
        results = await this.qdrantClient.query(this.collectionName, {
          query: denseVector,
          using: 'dense',
          limit: topK,
          with_payload: true
        })
      } else {
        console.warn('VectorStore: No sparse vector and fallback disabled')
        return []
      }

      console.log(`VectorStore: Hybrid returned ${results.points.length} results`)

      // 4. 결과 매핑
      return this.mapQdrantResults(results.points)
    } catch (error) {
      console.error('Hybrid search failed:', error)
      // 에러 시 기존 searchDiverse로 폴백
      return this.searchDiverse(query, topK)
    }
  }

  /**
   * Qdrant 직접 쿼리 결과를 Document로 매핑
   */
  private mapQdrantResults(
    points: Array<{
      id: string | number
      score?: number
      payload?: Record<string, unknown> | null
    }>
  ): Document[] {
    return points.map((point, index) => {
      const payload = point.payload || {}
      return {
        id: (payload.docId as string) || `result-${index}`,
        content: (payload.content as string) || '',
        metadata: {
          type: (payload.type as DocumentType) || 'experience',
          title: payload.title as string | undefined,
          category: payload.category as string | undefined,
          source: payload.source as DocumentSource | undefined,
          pubDate: payload.pubDate as string | undefined,
          keywords: payload.keywords as string[] | undefined,
          chunkIndex: payload.chunkIndex as number | undefined,
          totalChunks: payload.totalChunks as number | undefined,
          createdAt: payload.createdAt as string | undefined,
          path: payload.path as string | undefined,
          tags: payload.tags as string[] | undefined
        },
        score: point.score ? Math.round(point.score * 1000) / 1000 : undefined
      }
    })
  }

  private getMockResults(query: string): Document[] {
    return [
      {
        id: 'mock-1',
        content: `dwkim은 풀스택 개발자로서 다양한 기술 스택을 활용합니다. 질문: "${query}"`,
        metadata: {
          type: 'experience',
          title: 'Mock Response'
        }
      }
    ]
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - skipping delete')
      return
    }

    try {
      await this.vectorStore.delete({ ids: [id] })
      console.log(`Document deleted: ${id}`)
    } catch (error) {
      console.error('Failed to delete document:', error)
      throw new Error('Failed to delete document from vector store')
    }
  }

  /**
   * 컬렉션 초기화 (기존 데이터 삭제 후 재생성)
   */
  async resetCollection(): Promise<void> {
    if (!this.embeddings) {
      throw new Error('Embeddings not initialized')
    }

    const qdrantUrl = env.QDRANT_URL
    if (!qdrantUrl) {
      throw new Error('QDRANT_URL not set')
    }

    try {
      // 새 컬렉션으로 초기화 (기존 데이터 덮어쓰기)
      const qdrantConfig: {
        url: string
        collectionName: string
        apiKey?: string
        contentVector?: string
      } = {
        url: qdrantUrl,
        collectionName: this.collectionName,
        // initQdrantData.ts에서 'dense' named vector로 컬렉션 생성하므로 매칭 필요
        contentVector: 'dense'
      }

      if (env.QDRANT_API_KEY) {
        qdrantConfig.apiKey = env.QDRANT_API_KEY
      }

      // 빈 문서로 새 컬렉션 생성 (기존 컬렉션 덮어쓰기)
      this.vectorStore = await QdrantVectorStore.fromDocuments([], this.embeddings, qdrantConfig)

      console.log('Collection reset successfully')
    } catch (error) {
      console.error('Failed to reset collection:', error)
      throw error
    }
  }

  async getCollectionInfo(): Promise<{
    initialized: boolean
    hasVectorStore: boolean
    provider: string
    collectionName: string
  }> {
    return {
      initialized: this.initialized,
      hasVectorStore: this.vectorStore !== null,
      provider: 'qdrant',
      collectionName: this.collectionName
    }
  }

  /**
   * 파일 경로 기반으로 문서 삭제
   * Cogni 노트 동기화에서 사용
   */
  async deleteDocumentsByPath(path: string): Promise<number> {
    if (!this.qdrantClient) {
      console.warn('Qdrant client not available - skipping delete by path')
      return 0
    }

    try {
      // 해당 path를 가진 모든 포인트 조회
      const scrollResult = await this.qdrantClient.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: 'path',
              match: { value: path }
            }
          ]
        },
        limit: 100,
        with_payload: false,
        with_vector: false
      })

      if (scrollResult.points.length === 0) {
        console.log(`No documents found for path: ${path}`)
        return 0
      }

      // 포인트 ID 추출 및 삭제
      const pointIds = scrollResult.points.map((p) => p.id)
      await this.qdrantClient.delete(this.collectionName, {
        points: pointIds as string[]
      })

      console.log(`Deleted ${pointIds.length} chunks for path: ${path}`)
      return pointIds.length
    } catch (error) {
      console.error('Failed to delete documents by path:', error)
      throw new Error(`Failed to delete documents for path: ${path}`)
    }
  }

  /**
   * 문서 업서트 (기존 경로의 문서 삭제 후 새 문서 추가)
   * Cogni 노트 동기화에서 사용
   */
  async upsertDocuments(documents: Document[], path: string): Promise<void> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - skipping upsert')
      return
    }

    try {
      // 1. 기존 문서 삭제
      await this.deleteDocumentsByPath(path)

      // 2. 새 문서 추가
      if (documents.length > 0) {
        await this.addDocuments(documents)
        console.log(`Upserted ${documents.length} chunks for path: ${path}`)
      }
    } catch (error) {
      console.error('Failed to upsert documents:', error)
      throw new Error(`Failed to upsert documents for path: ${path}`)
    }
  }

  /**
   * 모든 문서 조회 (BM25 인덱싱용)
   * Qdrant에서 전체 문서를 가져옴
   */
  async getAllDocuments(limit: number = 500): Promise<Array<{ id: string; content: string }>> {
    if (!this.qdrantClient) {
      console.warn('Qdrant client not available')
      return []
    }

    try {
      const scrollResult = await this.qdrantClient.scroll(this.collectionName, {
        limit,
        with_payload: true,
        with_vector: false
      })

      const documents = scrollResult.points.map((point) => {
        const payload = point.payload as Record<string, unknown>
        return {
          id: String(point.id),
          content: (payload.content as string) || ''
        }
      })

      console.log(`VectorStore: Loaded ${documents.length} documents for BM25 indexing`)
      return documents
    } catch (error) {
      console.error('Failed to get all documents:', error)
      return []
    }
  }

  /**
   * 특정 태그를 가진 문서 목록 조회 (Cogni 동기화 상태 확인용)
   */
  async getDocumentsByTag(tag: string, limit: number = 100): Promise<Document[]> {
    if (!this.qdrantClient) {
      console.warn('Qdrant client not available')
      return []
    }

    try {
      const scrollResult = await this.qdrantClient.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: 'tags',
              match: { any: [tag] }
            }
          ]
        },
        limit,
        with_payload: true,
        with_vector: false
      })

      return scrollResult.points.map((point) => {
        const payload = point.payload as Record<string, unknown>
        return {
          id: point.id as string,
          content: (payload.content as string) || '',
          metadata: {
            type: (payload.type as DocumentType) || 'cogni',
            title: payload.title as string | undefined,
            path: payload.path as string | undefined,
            tags: payload.tags as string[] | undefined,
            source: payload.source as DocumentSource | undefined
          }
        }
      })
    } catch (error) {
      console.error('Failed to get documents by tag:', error)
      return []
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Pattern
// ─────────────────────────────────────────────────────────────

let instance: VectorStore | null = null
let initializationPromise: Promise<void> | null = null

/**
 * VectorStore 싱글턴 인스턴스 반환
 * 여러 모듈에서 동일한 인스턴스를 공유하여 리소스 절약
 */
export function getVectorStore(): VectorStore {
  if (!instance) {
    instance = new VectorStore()
  }
  return instance
}

/**
 * VectorStore 초기화 (race condition 방지)
 * 여러 곳에서 동시에 호출해도 한 번만 초기화됨
 */
export async function initVectorStore(): Promise<void> {
  if (initializationPromise) {
    // 이미 초기화 중이면 기존 Promise 재사용
    return initializationPromise
  }

  const store = getVectorStore()
  if (store.initialized) {
    // 이미 초기화 완료됨
    return
  }

  // 초기화 시작
  initializationPromise = store.initialize().finally(() => {
    initializationPromise = null
  })

  return initializationPromise
}

/**
 * 테스트용 싱글턴 리셋
 * 프로덕션 코드에서는 사용하지 말 것
 */
export function resetVectorStore(): void {
  instance = null
  initializationPromise = null
}
