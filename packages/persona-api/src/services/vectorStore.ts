import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document as LangChainDocument } from '@langchain/core/documents';

export type DocumentType =
  | 'resume'
  | 'faq'
  | 'thoughts'
  | 'experience'
  | 'about'
  | 'post';

export type DocumentSource = 'persona-api' | 'blog';

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
  };
}

export class VectorStore {
  private vectorStore: QdrantVectorStore | null = null;
  private embeddings: GoogleGenerativeAIEmbeddings | null = null;
  private initialized = false;
  private collectionName = 'persona_documents';

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey,
        model: 'text-embedding-004',
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
        throw new Error('Google API key required for embeddings');
      }

      // Qdrant 클라이언트 설정
      const url = new URL(qdrantUrl);
      const isHttps = url.protocol === 'https:';
      // HTTPS 외부 접근시 포트 443 사용, 내부/로컬은 URL에서 추출
      const port = isHttps ? 443 : parseInt(url.port || '6333');

      console.log(`Connecting to Qdrant: ${url.hostname}:${port} (${isHttps ? 'HTTPS' : 'HTTP'})`);

      // QdrantClient 직접 생성 (포트 명시)
      const qdrantClient = new QdrantClient({
        host: url.hostname,
        port,
        https: isHttps,
        apiKey: process.env.QDRANT_API_KEY,
        checkCompatibility: false, // 버전 체크 스킵
      });

      const qdrantConfig = {
        client: qdrantClient,
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
   * 다양성 검색 (키워드 부스팅 + 중복 제거)
   *
   * 한국어 임베딩 모델의 의미 매칭 한계를 보완:
   * 1. 넓은 범위의 similarity search
   * 2. 제목에 쿼리 키워드 포함된 문서 우선
   * 3. 동일 문서의 중복 청크 제거
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
      // 1. 넓은 범위에서 후보 검색 (한국어 임베딩 한계 보완)
      const fetchK = Math.max(topK * 5, 30);
      const results = await this.vectorStore.similaritySearch(query, fetchK, filter);

      console.log(`VectorStore: Fetched ${results.length} candidates for query: ${query}`);

      // 2. 키워드 부스팅: 제목에 쿼리 포함된 문서 우선
      const queryLower = query.toLowerCase();
      const boostedResults = [...results].sort((a, b) => {
        const aTitle = (a.metadata.title || '').toLowerCase();
        const bTitle = (b.metadata.title || '').toLowerCase();
        const aMatch = aTitle.includes(queryLower) ? 1 : 0;
        const bMatch = bTitle.includes(queryLower) ? 1 : 0;
        return bMatch - aMatch;
      });

      // 3. 동일 문서 중복 제거 (첫 번째 청크만 유지)
      const seen = new Set<string>();
      const diverseResults = boostedResults.filter((doc) => {
        const key = doc.metadata.title || doc.metadata.docId || doc.pageContent.slice(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, topK);

      console.log(`VectorStore: Returning ${diverseResults.length} diverse results`);
      return this.mapResults(diverseResults);
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
      },
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
}
