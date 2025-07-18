import { ChromaClient, Collection } from 'chromadb';

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
  private client: ChromaClient;
  private collection: Collection | null = null;
  private collectionName: string;

  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
    this.collectionName =
      process.env.CHROMA_COLLECTION_NAME || 'persona_documents';
  }

  async initialize(): Promise<void> {
    try {
      // Mock 모드 체크
      if (process.env.USE_VECTOR_STORE === 'false' || process.env.MOCK_MODE === 'true') {
        console.log('Vector store disabled - using mock mode');
        return;
      }
      
      // 컬렉션이 존재하는지 확인
      const collections = await this.client.listCollections();
      const exists = collections.some(
        (col: any) => col.name === this.collectionName
      );

      if (exists) {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
        } as any);
      } else {
        try {
          // 새 컬렉션 생성
          this.collection = await this.client.createCollection({
            name: this.collectionName,
            metadata: {
              description: 'Personal documents for dwkim persona chatbot',
            },
          });
        } catch (error: any) {
          if (error.message?.includes('already exists')) {
            // 컬렉션이 이미 존재하면 가져오기
            this.collection = await this.client.getCollection({
              name: this.collectionName,
            } as any);
          } else {
            throw error;
          }
        }
      }

      console.log(`Vector store initialized: ${this.collectionName}`);
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      throw new Error('Vector store initialization failed');
    }
  }

  async addDocument(document: Document): Promise<void> {
    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      await this.collection.add({
        ids: [document.id],
        documents: [document.content],
        metadatas: [document.metadata],
      });

      console.log(`Document added: ${document.id}`);
    } catch (error) {
      console.error('Failed to add document:', error);
      throw new Error('Failed to add document to vector store');
    }
  }

  async search(
    query: string,
    topK: number = 5,
    filter?: any
  ): Promise<Document[]> {
    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      console.log('VectorStore: Generating embedding for query:', query);
      
      // 쿼리를 임베딩으로 변환
      const llmService = new (await import('./llmService')).LLMService();
      const queryEmbedding = await llmService.generateEmbedding(query);
      
      console.log('VectorStore: Query embedding generated, length:', queryEmbedding.length);
      
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: filter,
      });
      
      console.log('VectorStore: Query results received:', {
        documentsCount: results.documents?.[0]?.length || 0,
        idsCount: results.ids?.[0]?.length || 0
      });

      if (!results.documents || !results.metadatas || !results.ids) {
        return [];
      }

      const documents: Document[] = [];
      for (let i = 0; i < results.ids[0].length; i++) {
        documents.push({
          id: results.ids[0][i],
          content: results.documents[0][i] || '',
          metadata: results.metadatas[0][i] as Document['metadata'],
        });
      }

      return documents;
    } catch (error) {
      console.error('Vector search failed:', error);
      throw new Error('Document search failed');
    }
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      await this.collection.delete({
        ids: [id],
      });

      console.log(`Document deleted: ${id}`);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw new Error('Failed to delete document from vector store');
    }
  }

  async getCollectionInfo(): Promise<any> {
    if (!this.collection) {
      throw new Error('Vector store not initialized');
    }

    try {
      return await this.collection.get();
    } catch (error) {
      console.error('Failed to get collection info:', error);
      throw new Error('Failed to get collection information');
    }
  }
}
