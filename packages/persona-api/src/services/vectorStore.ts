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
      // 컬렉션이 존재하는지 확인
      const collections = await this.client.listCollections();
      const exists = collections.some(
        (col) => col.name === this.collectionName
      );

      if (exists) {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
        });
      } else {
        // 새 컬렉션 생성
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: 'Personal documents for dwkim persona chatbot',
          },
        });
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
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: topK,
        where: filter,
      });

      if (!results.documents || !results.metadatas || !results.ids) {
        return [];
      }

      const documents: Document[] = [];
      for (let i = 0; i < results.ids[0].length; i++) {
        documents.push({
          id: results.ids[0][i],
          content: results.documents[0][i],
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
