import { NeonPostgres } from '@langchain/community/vectorstores/neon';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document as LangChainDocument } from '@langchain/core/documents';

export interface Document {
  id: string;
  content: string;
  metadata: {
    type: 'resume' | 'faq' | 'thoughts' | 'experience';
    title?: string;
    category?: string;
    createdAt?: string;
  };
}

export class VectorStore {
  private vectorStore: NeonPostgres | null = null;
  private embeddings: GoogleGenerativeAIEmbeddings | null = null;
  private initialized = false;

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

      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        console.warn('DATABASE_URL not set - vector store will use mock mode');
        this.initialized = true;
        return;
      }

      if (!this.embeddings) {
        throw new Error('Google API key required for embeddings');
      }

      this.vectorStore = await NeonPostgres.initialize(this.embeddings, {
        connectionString,
        tableName: 'persona_documents',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'content',
          metadataColumnName: 'metadata',
        },
      });

      console.log('Vector store initialized with Neon Postgres');
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter?: Record<string, any>
  ): Promise<Document[]> {
    if (!this.vectorStore) {
      console.warn('Vector store not available - returning empty results');
      return this.getMockResults(query);
    }

    try {
      console.log('VectorStore: Searching for:', query);

      const results = await this.vectorStore.similaritySearch(query, topK, filter);

      console.log('VectorStore: Found', results.length, 'results');

      return results.map((doc, index) => ({
        id: doc.metadata.docId || `result-${index}`,
        content: doc.pageContent,
        metadata: {
          type: doc.metadata.type || 'experience',
          title: doc.metadata.title,
          category: doc.metadata.category,
          createdAt: doc.metadata.createdAt,
        },
      }));
    } catch (error) {
      console.error('Vector search failed:', error);
      return this.getMockResults(query);
    }
  }

  private getMockResults(query: string): Document[] {
    // Mock 결과 - 실제 데이터 없을 때 기본 응답
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCollectionInfo(): Promise<any> {
    return {
      initialized: this.initialized,
      hasVectorStore: this.vectorStore !== null,
      provider: 'neon-postgres',
    };
  }
}
