/**
 * Local Search Engine (BM25)
 *
 * Qdrant + OpenAI embeddings를 대체하는 로컬 검색 엔진.
 * 빌드타임에 생성된 searchIndex.json을 로드하여 BM25 키워드 검색 수행.
 *
 * 기존 VectorStore 인터페이스를 유지하여 personaAgent.ts 변경 최소화.
 */

import fs from 'node:fs'
import path from 'node:path'

// ─────────────────────────────────────────────────────────────
// Types (기존 인터페이스 유지)
// ─────────────────────────────────────────────────────────────

export type DocumentType =
  | 'resume'
  | 'resume-en'
  | 'faq'
  | 'thoughts'
  | 'experience'
  | 'about'
  | 'post'
  | 'blog'
  | 'knowledge'
  | 'cogni'
  | '100-questions'
  | string // persona 태그 파일의 slug

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
    path?: string
    tags?: string[]
  }
  score?: number
}

// ─────────────────────────────────────────────────────────────
// Korean/English Stopwords
// ─────────────────────────────────────────────────────────────

const KOREAN_STOPWORDS = new Set([
  '은',
  '는',
  '이',
  '가',
  '을',
  '를',
  '의',
  '에',
  '에서',
  '로',
  '으로',
  '와',
  '과',
  '도',
  '만',
  '부터',
  '까지',
  '에게',
  '한테',
  '께',
  '다',
  '요',
  '죠',
  '네',
  '군',
  '구나',
  '그리고',
  '그래서',
  '그러나',
  '하지만',
  '또한',
  '그런데',
  '즉',
  '왜냐하면',
  '나',
  '너',
  '우리',
  '저',
  '이것',
  '그것',
  '저것',
  '있다',
  '없다',
  '하다',
  '되다',
  '이다',
  '것',
  '수',
  '등',
  '때',
  '중'
])

const ENGLISH_STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'should',
  'could',
  'may',
  'might',
  'can',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'what',
  'which',
  'who',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  's',
  't',
  'just'
])

// ─────────────────────────────────────────────────────────────
// BM25 Search Engine
// ─────────────────────────────────────────────────────────────

/** BM25 parameters */
const K1 = 1.2
const B = 0.75

interface IndexedDoc {
  id: string
  content: string
  metadata: Document['metadata']
  tokens: string[]
  tokenCount: number
}

function tokenize(text: string): string[] {
  let normalized = text.toLowerCase()

  // 한글 조사 분리
  normalized = normalized
    .replace(
      /([가-힣]+)(이|가|은|는|을|를|의|에|에서|로|으로|와|과|도)(?=\s|$|[^가-힣])/g,
      '$1 $2 '
    )
    .replace(/([가-힣]+)(했|했던|하는|한|할|합니다|해요|하고|하면)(?=\s|$|[^가-힣])/g, '$1 $2 ')

  const tokens = normalized
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0)

  return tokens.filter((token) => {
    if (token.length < 2) return false
    if (KOREAN_STOPWORDS.has(token)) return false
    if (ENGLISH_STOPWORDS.has(token)) return false
    return true
  })
}

export class VectorStore {
  private documents: IndexedDoc[] = []
  private documentFrequency: Map<string, number> = new Map()
  private avgDocLength: number = 0
  private _initialized = false

  get initialized(): boolean {
    return this._initialized
  }

  async initialize(): Promise<void> {
    try {
      // searchIndex.json 로드
      // process.cwd()는 persona-api 루트를 기대
      const indexPath = path.join(process.cwd(), 'data', 'searchIndex.json')

      if (!fs.existsSync(indexPath)) {
        console.warn(`Search index not found at ${indexPath} — using empty index`)
        this._initialized = true
        return
      }

      const raw = fs.readFileSync(indexPath, 'utf-8')
      const chunks: Array<{
        id: string
        content: string
        metadata: Document['metadata']
      }> = JSON.parse(raw)

      // BM25 인덱스 구축
      this.documents = chunks.map((chunk) => {
        const tokens = tokenize(chunk.content)
        return {
          id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata,
          tokens,
          tokenCount: tokens.length
        }
      })

      // 평균 문서 길이
      const totalTokens = this.documents.reduce((sum, doc) => sum + doc.tokenCount, 0)
      this.avgDocLength = totalTokens / (this.documents.length || 1)

      // Document Frequency 계산
      this.documentFrequency.clear()
      for (const doc of this.documents) {
        const uniqueTokens = new Set(doc.tokens)
        for (const token of uniqueTokens) {
          this.documentFrequency.set(token, (this.documentFrequency.get(token) || 0) + 1)
        }
      }

      console.log(
        `VectorStore: Loaded ${this.documents.length} chunks, ` +
          `${this.documentFrequency.size} unique tokens, ` +
          `avg doc length: ${this.avgDocLength.toFixed(1)}`
      )

      this._initialized = true
    } catch (error) {
      console.error('Failed to initialize search engine:', error)
      this._initialized = true // allow fallback to mock
    }
  }

  /**
   * BM25 검색 (searchHybrid 인터페이스 유지)
   */
  async searchHybrid(
    query: string,
    topK: number = 5,
    _options?: {
      prefetchLimit?: number
      denseFallback?: boolean
    }
  ): Promise<Document[]> {
    if (this.documents.length === 0) {
      console.warn('VectorStore: No documents loaded — returning mock results')
      return this.getMockResults(query)
    }

    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) {
      return this.getMockResults(query)
    }

    const N = this.documents.length

    // 쿼리 토큰 TF
    const queryTF = new Map<string, number>()
    for (const token of queryTokens) {
      queryTF.set(token, (queryTF.get(token) || 0) + 1)
    }

    // 각 문서에 대해 BM25 스코어 계산
    const scored: Array<{ doc: IndexedDoc; score: number }> = []

    for (const doc of this.documents) {
      let score = 0

      // 문서 내 토큰 TF
      const docTF = new Map<string, number>()
      for (const token of doc.tokens) {
        docTF.set(token, (docTF.get(token) || 0) + 1)
      }

      for (const [token] of queryTF) {
        const df = this.documentFrequency.get(token) || 0
        if (df === 0) continue

        const tf = docTF.get(token) || 0
        if (tf === 0) continue

        // IDF
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1)

        // BM25 score
        const tfNorm =
          (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (doc.tokenCount / this.avgDocLength)))
        score += idf * tfNorm
      }

      // 제목에 쿼리 키워드 포함 시 부스트
      const titleLower = (doc.metadata.title || '').toLowerCase()
      const queryLower = query.toLowerCase()
      if (titleLower.includes(queryLower) || queryTokens.some((t) => titleLower.includes(t))) {
        score *= 1.3
      }

      if (score > 0) {
        scored.push({ doc, score })
      }
    }

    // 점수 내림차순 정렬
    scored.sort((a, b) => b.score - a.score)

    // 중복 제거 (같은 문서의 다른 청크)
    const seen = new Set<string>()
    const deduplicated = scored.filter(({ doc }) => {
      const key = doc.metadata.title || doc.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const results = deduplicated.slice(0, topK)

    // 스코어 정규화 (0-1 범위)
    const maxScore = results[0]?.score || 1
    console.log(
      `VectorStore: BM25 returned ${results.length} results (max score: ${maxScore.toFixed(2)})`
    )

    return results.map(({ doc, score }) => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      score: Math.round((score / maxScore) * 1000) / 1000
    }))
  }

  /**
   * searchDiverse — searchHybrid로 위임
   */
  async searchDiverse(query: string, topK: number = 5): Promise<Document[]> {
    return this.searchHybrid(query, topK)
  }

  /**
   * 모든 문서 반환 (BM25 인덱싱 등 내부 용도)
   */
  async getAllDocuments(): Promise<Array<{ id: string; content: string }>> {
    return this.documents.map((doc) => ({
      id: doc.id,
      content: doc.content
    }))
  }

  async addDocument(_document: Document): Promise<void> {
    // 빌드타임 인덱스 — 런타임 추가는 no-op
    console.warn('VectorStore: addDocument is no-op in local mode')
  }

  async addDocuments(_documents: Document[]): Promise<void> {
    console.warn('VectorStore: addDocuments is no-op in local mode')
  }

  async deleteDocument(_id: string): Promise<void> {
    console.warn('VectorStore: deleteDocument is no-op in local mode')
  }

  async deleteDocumentsByPath(_path: string): Promise<number> {
    console.warn('VectorStore: deleteDocumentsByPath is no-op in local mode')
    return 0
  }

  async upsertDocuments(_documents: Document[], _path: string): Promise<void> {
    console.warn('VectorStore: upsertDocuments is no-op in local mode')
  }

  async resetCollection(): Promise<void> {
    console.warn('VectorStore: resetCollection is no-op in local mode')
  }

  async getCollectionInfo() {
    return {
      initialized: this.initialized,
      hasVectorStore: this.documents.length > 0,
      provider: 'local-bm25',
      collectionName: 'searchIndex.json'
    }
  }

  async getDocumentsByTag(_tag: string): Promise<Document[]> {
    // 로컬 모드에서는 지원하지 않음
    return []
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
}

// ─────────────────────────────────────────────────────────────
// Singleton Pattern (기존 인터페이스 유지)
// ─────────────────────────────────────────────────────────────

let instance: VectorStore | null = null
let initializationPromise: Promise<void> | null = null

export function getVectorStore(): VectorStore {
  if (!instance) {
    instance = new VectorStore()
  }
  return instance
}

export async function initVectorStore(): Promise<void> {
  if (initializationPromise) {
    return initializationPromise
  }

  const store = getVectorStore()
  if (store.initialized) {
    return
  }

  initializationPromise = store.initialize().finally(() => {
    initializationPromise = null
  })

  return initializationPromise
}

export function resetVectorStore(): void {
  instance = null
  initializationPromise = null
}
