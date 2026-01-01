import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { Document as LangChainDocument } from '@langchain/core/documents';
import { VoyageEmbeddings } from './voyageEmbeddings';

export type DocumentType =
  | 'resume'
  | 'faq'
  | 'thoughts'
  | 'experience'
  | 'about'
  | 'post'
  | 'cogni';  // Cogni 노트 타입 추가

export type DocumentSource = 'persona-api' | 'blog' | 'cogni';

export interface Document {
  id: string;
  content: string;
  metadata: {
    type: DocumentType;
    title?: string;
    category?: string;
    source?: DocumentSource;
    pubDate?: string;
    keywords?: string[];
    chunkIndex?: number;
    totalChunks?: number;
    createdAt?: string;
    path?: string;        // Cogni 노트 파일 경로
    tags?: string[];      // Cogni 노트 태그
  };
  score?: number;  // 유사도 점수 (0~1, 높을수록 관련성 높음)
}

// 유사도 점수 threshold (이 값 이하는 관련 없는 것으로 간주)
// Qdrant 코사인 유사도: 0 = 무관, 1 = 동일
const RELEVANCE_THRESHOLD = 0.3;

export class VectorStore {
  private vectorStore: QdrantVectorStore | null = null;
  private embeddings: VoyageEmbeddings | null = null;
  private qdrantClient: QdrantClient | null = null;
  private initialized = false;
  private collectionName = 'persona_documents';

  constructor() {
    // Voyage multilingual-2: 한국어에 최적화된 API 기반 임베딩
    if (process.env.VOYAGE_API_KEY) {
      this.embeddings = new VoyageEmbeddings({
        modelName: 'voyage-multilingual-2',
      });
    }
  }

  async initialize(): Promise<void> {
    try {
      // Mock 모드 체크
      if (process.env.USE_VECTOR_STORE === 'false' || process.env.MOCK_MODE === 'true') {
        console.log('Vector store disabled - using mock mode');
        this.initialized = true;
        return;
      }

      const qdrantUrl = process.env.QDRANT_URL;
      if (!qdrantUrl) {
        console.warn('QDRANT_URL not set - vector store will use mock mode');
        this.initialized = true;
        return;
      }

      if (!this.embeddings) {
        throw new Error('Embeddings not initialized');
      }

      // Qdrant 클라이언트 설정
      const url = new URL(qdrantUrl);
      const isHttps = url.protocol === 'https:';
      // HTTPS 외부 접근시 포트 443 사용, 내부/로컬은 URL에서 추출
      const port = isHttps ? 443 : parseInt(url.port || '6333');

      console.log(`Connecting to Qdrant: ${url.hostname}:${port} (${isHttps ? 'HTTPS' : 'HTTP'})`);

      // QdrantClient 직접 생성 (포트 명시)
      this.qdrantClient = new QdrantClient({
        host: url.hostname,
        port,
        https: isHttps,
        apiKey: process.env.QDRANT_API_KEY,
        checkCompatibility: false, // 버전 체크 스킵
      });

      const qdrantConfig = {
        client: this.qdrantClient,
        collectionName: this.collectionName,
      };

      // 기존 컬렉션 연결 시도
      try {
        this.vectorStore = await QdrantVectorStore.fromExistingCollection(
          this.embeddings,
          qdrantConfig
        );
        console.log('Vector store initialized with Qdrant (existing collection)');
      } catch (existingError) {
        console.log('fromExistingCollection failed:', existingError);
        console.log('Creating new collection...');
        this.vectorStore = await QdrantVectorStore.fromDocuments(
          [],
          this.embeddings,
          qdrantConfig
        );
        console.log('Vector store initialized with Qdrant (new collection)');
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      // 초기화 실패해도 mock 모드로 계속 진행
      this.initialized = true;
      console.warn('Falling back to mock mode');
    }
  }

  async addDocument(document: Document): Promise<void> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - skipping document add');
      return;
    }

    try {
      const langchainDoc = new LangChainDocument({
        pageContent: document.content,
        metadata: {
          ...document.metadata,
          docId: document.id,
        },
      });

      await this.vectorStore.addDocuments([langchainDoc], {
        ids: [document.id],
      });

      console.log(`Document added: ${document.id}`);
    } catch (error) {
      console.error('Failed to add document:', error);
      throw new Error('Failed to add document to vector store');
    }
  }

  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - skipping documents add');
      return;
    }

    try {
      const langchainDocs = documents.map(
        (doc) =>
          new LangChainDocument({
            pageContent: doc.content,
            metadata: {
              ...doc.metadata,
              docId: doc.id,
            },
          })
      );

      await this.vectorStore.addDocuments(langchainDocs, {
        ids: documents.map((d) => d.id),
      });

      console.log(`${documents.length} documents added`);
    } catch (error) {
      console.error('Failed to add documents:', error);
      throw new Error('Failed to add documents to vector store');
    }
  }

  async search(
    query: string,
    topK: number = 5,
    filter?: Record<string, unknown>
  ): Promise<Document[]> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - returning empty results');
      return this.getMockResults(query);
    }

    try {
      console.log('VectorStore: Searching for:', query);

      const results = await this.vectorStore.similaritySearch(query, topK, filter);

      console.log('VectorStore: Found', results.length, 'results');

      return this.mapResults(results);
    } catch (error) {
      console.error('Vector search failed:', error);
      return this.getMockResults(query);
    }
  }

  /**
   * MMR 검색: 관련성과 다양성을 동시에 최적화
   * Qdrant 네이티브 MMR 지원 활용
   */
  async searchMMR(
    query: string,
    topK: number = 5,
    options?: {
      fetchK?: number;  // 리랭킹 전 후보 수
      lambda?: number;  // 0=다양성 중심, 1=관련성 중심 (기본 0.5)
    }
  ): Promise<Document[]> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - returning mock results');
      return this.getMockResults(query);
    }

    try {
      console.log('VectorStore: MMR searching for:', query);

      const fetchK = options?.fetchK || topK * 3;
      const lambda = options?.lambda || 0.5;

      const results = await this.vectorStore.maxMarginalRelevanceSearch(query, {
        k: topK,
        fetchK,
        lambda,
      });

      console.log(`VectorStore: MMR returned ${results.length} diverse results`);

      return this.mapResults(results);
    } catch (error) {
      console.error('MMR search failed, falling back to similarity search:', error);
      return this.search(query, topK);
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
    filter?: Record<string, unknown>
  ): Promise<Document[]> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - returning mock results');
      return this.getMockResults(query);
    }

    try {
      // 1. 넓은 범위에서 후보 검색 (점수 포함)
      const fetchK = Math.max(topK * 5, 30);
      const resultsWithScore = await this.vectorStore.similaritySearchWithScore(query, fetchK, filter);

      console.log(`VectorStore: Fetched ${resultsWithScore.length} candidates for query: "${query}"`);

      // 2. 유사도 threshold 필터링 (관련 없는 문서 제외)
      const relevantResults = resultsWithScore.filter(([, score]) => score >= RELEVANCE_THRESHOLD);
      console.log(`VectorStore: ${relevantResults.length}/${resultsWithScore.length} passed threshold (>=${RELEVANCE_THRESHOLD})`);

      if (relevantResults.length === 0) {
        console.log('VectorStore: No relevant results found');
        return [];
      }

      // 3. 키워드 부스팅: 제목에 쿼리 포함된 문서 우선
      const queryLower = query.toLowerCase();
      const boostedResults = [...relevantResults].sort(([a], [b]) => {
        const aTitle = (a.metadata.title || '').toLowerCase();
        const bTitle = (b.metadata.title || '').toLowerCase();
        const aMatch = aTitle.includes(queryLower) ? 1 : 0;
        const bMatch = bTitle.includes(queryLower) ? 1 : 0;
        return bMatch - aMatch;
      });

      // 4. 동일 문서 중복 제거 (첫 번째 청크만 유지)
      const seen = new Set<string>();
      const diverseResults = boostedResults.filter(([doc]) => {
        const key = doc.metadata.title || doc.metadata.docId || doc.pageContent.slice(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, topK);

      console.log(`VectorStore: Returning ${diverseResults.length} diverse results`);
      return this.mapResultsWithScore(diverseResults);
    } catch (error) {
      console.error('Diverse search failed:', error);
      return this.getMockResults(query);
    }
  }

  /**
   * 필터가 필요할 때 사용하는 폴백 다양성 검색
   */
  private async searchDiverseFallback(
    query: string,
    topK: number = 5,
    filter?: Record<string, unknown>
  ): Promise<Document[]> {
    if (!this.vectorStore) {
      return this.getMockResults(query);
    }

    try {
      console.log('VectorStore: Diverse fallback searching for:', query);

      const fetchK = topK * 3;
      const results = await this.vectorStore.similaritySearch(query, fetchK, filter);

      // 문서 제목별로 그룹화, 첫 번째(가장 유사한) 청크만 유지
      const seen = new Set<string>();
      const diverseResults = results.filter((doc) => {
        const key = doc.metadata.title || doc.metadata.docId || doc.pageContent.slice(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, topK);

      console.log(`VectorStore: ${results.length} candidates → ${diverseResults.length} diverse results`);

      return this.mapResults(diverseResults);
    } catch (error) {
      console.error('Diverse fallback search failed:', error);
      return this.search(query, topK, filter);
    }
  }

  private mapResults(results: LangChainDocument[]): Document[] {
    return results.map((doc, index) => ({
      id: doc.metadata.docId || `result-${index}`,
      content: doc.pageContent,
      metadata: {
        type: doc.metadata.type || 'experience',
        title: doc.metadata.title,
        category: doc.metadata.category,
        source: doc.metadata.source,
        pubDate: doc.metadata.pubDate,
        keywords: doc.metadata.keywords,
        chunkIndex: doc.metadata.chunkIndex,
        totalChunks: doc.metadata.totalChunks,
        createdAt: doc.metadata.createdAt,
        path: doc.metadata.path,
        tags: doc.metadata.tags,
      },
    }));
  }

  private mapResultsWithScore(results: [LangChainDocument, number][]): Document[] {
    return results.map(([doc, score], index) => ({
      id: doc.metadata.docId || `result-${index}`,
      content: doc.pageContent,
      metadata: {
        type: doc.metadata.type || 'experience',
        title: doc.metadata.title,
        category: doc.metadata.category,
        source: doc.metadata.source,
        pubDate: doc.metadata.pubDate,
        keywords: doc.metadata.keywords,
        chunkIndex: doc.metadata.chunkIndex,
        totalChunks: doc.metadata.totalChunks,
        createdAt: doc.metadata.createdAt,
        path: doc.metadata.path,
        tags: doc.metadata.tags,
      },
      score: Math.round(score * 100) / 100,  // 소수점 2자리
    }));
  }

  private getMockResults(query: string): Document[] {
    return [
      {
        id: 'mock-1',
        content: `dwkim은 풀스택 개발자로서 다양한 기술 스택을 활용합니다. 질문: "${query}"`,
        metadata: {
          type: 'experience',
          title: 'Mock Response',
        },
      },
    ];
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - skipping delete');
      return;
    }

    try {
      await this.vectorStore.delete({ ids: [id] });
      console.log(`Document deleted: ${id}`);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw new Error('Failed to delete document from vector store');
    }
  }

  /**
   * 컬렉션 초기화 (기존 데이터 삭제 후 재생성)
   */
  async resetCollection(): Promise<void> {
    if (!this.embeddings) {
      throw new Error('Embeddings not initialized');
    }

    const qdrantUrl = process.env.QDRANT_URL;
    if (!qdrantUrl) {
      throw new Error('QDRANT_URL not set');
    }

    try {
      // 새 컬렉션으로 초기화 (기존 데이터 덮어쓰기)
      const qdrantConfig: {
        url: string;
        collectionName: string;
        apiKey?: string;
      } = {
        url: qdrantUrl,
        collectionName: this.collectionName,
      };

      if (process.env.QDRANT_API_KEY) {
        qdrantConfig.apiKey = process.env.QDRANT_API_KEY;
      }

      // 빈 문서로 새 컬렉션 생성 (기존 컬렉션 덮어쓰기)
      this.vectorStore = await QdrantVectorStore.fromDocuments(
        [],
        this.embeddings,
        qdrantConfig
      );

      console.log('Collection reset successfully');
    } catch (error) {
      console.error('Failed to reset collection:', error);
      throw error;
    }
  }

  async getCollectionInfo(): Promise<{
    initialized: boolean;
    hasVectorStore: boolean;
    provider: string;
    collectionName: string;
  }> {
    return {
      initialized: this.initialized,
      hasVectorStore: this.vectorStore !== null,
      provider: 'qdrant',
      collectionName: this.collectionName,
    };
  }


  /**
   * 파일 경로 기반으로 문서 삭제
   * Cogni 노트 동기화에서 사용
   */
  async deleteDocumentsByPath(path: string): Promise<number> {
    if (!this.qdrantClient) {
      console.warn('Qdrant client not available - skipping delete by path');
      return 0;
    }

    try {
      // 해당 path를 가진 모든 포인트 조회
      const scrollResult = await this.qdrantClient.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: 'path',
              match: { value: path },
            },
          ],
        },
        limit: 100,
        with_payload: false,
        with_vector: false,
      });

      if (scrollResult.points.length === 0) {
        console.log(`No documents found for path: ${path}`);
        return 0;
      }

      // 포인트 ID 추출 및 삭제
      const pointIds = scrollResult.points.map((p) => p.id);
      await this.qdrantClient.delete(this.collectionName, {
        points: pointIds as string[],
      });

      console.log(`Deleted ${pointIds.length} chunks for path: ${path}`);
      return pointIds.length;
    } catch (error) {
      console.error('Failed to delete documents by path:', error);
      throw new Error(`Failed to delete documents for path: ${path}`);
    }
  }

  /**
   * 문서 업서트 (기존 경로의 문서 삭제 후 새 문서 추가)
   * Cogni 노트 동기화에서 사용
   */
  async upsertDocuments(documents: Document[], path: string): Promise<void> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - skipping upsert');
      return;
    }

    try {
      // 1. 기존 문서 삭제
      await this.deleteDocumentsByPath(path);

      // 2. 새 문서 추가
      if (documents.length > 0) {
        await this.addDocuments(documents);
        console.log(`Upserted ${documents.length} chunks for path: ${path}`);
      }
    } catch (error) {
      console.error('Failed to upsert documents:', error);
      throw new Error(`Failed to upsert documents for path: ${path}`);
    }
  }

  /**
   * 특정 태그를 가진 문서 목록 조회 (Cogni 동기화 상태 확인용)
   */
  async getDocumentsByTag(tag: string, limit: number = 100): Promise<Document[]> {
    if (!this.qdrantClient) {
      console.warn('Qdrant client not available');
      return [];
    }

    try {
      const scrollResult = await this.qdrantClient.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: 'tags',
              match: { any: [tag] },
            },
          ],
        },
        limit,
        with_payload: true,
        with_vector: false,
      });

      return scrollResult.points.map((point) => {
        const payload = point.payload as Record<string, unknown>;
        return {
          id: point.id as string,
          content: (payload.content as string) || '',
          metadata: {
            type: (payload.type as DocumentType) || 'cogni',
            title: payload.title as string | undefined,
            path: payload.path as string | undefined,
            tags: payload.tags as string[] | undefined,
            source: payload.source as DocumentSource | undefined,
          },
        };
      });
    } catch (error) {
      console.error('Failed to get documents by tag:', error);
      return [];
    }
  }
}
