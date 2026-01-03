import { RAGEngine } from '../services/ragEngine';
import { Document } from '../services/vectorStore';
import * as vectorStoreModule from '../services/vectorStore';

// Mock dependencies
jest.mock('../services/vectorStore', () => {
  const actual = jest.requireActual('../services/vectorStore');
  return {
    ...actual,
    getVectorStore: jest.fn(),
    initVectorStore: jest.fn(),
    resetVectorStore: jest.fn(),
  };
});
jest.mock('../services/llmService');

describe('RAGEngine', () => {
  let ragEngine: RAGEngine;
  let mockVectorStore: any;

  beforeEach(() => {
    // Mock vector store instance
    mockVectorStore = {
      initialize: jest.fn().mockResolvedValue(undefined),
      searchDiverse: jest.fn().mockResolvedValue([]),
      searchHybrid: jest.fn().mockResolvedValue([]), // Hybrid Search
      addDocument: jest.fn().mockResolvedValue(undefined),
      deleteDocument: jest.fn().mockResolvedValue(undefined),
    };

    (vectorStoreModule.getVectorStore as jest.Mock).mockReturnValue(mockVectorStore);
    (vectorStoreModule.initVectorStore as jest.Mock).mockResolvedValue(undefined);

    ragEngine = new RAGEngine();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(ragEngine.initialize()).resolves.not.toThrow();
      expect(vectorStoreModule.initVectorStore).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      (vectorStoreModule.initVectorStore as jest.Mock).mockRejectedValue(
        new Error('Vector store error')
      );

      await expect(ragEngine.initialize()).rejects.toThrow(
        'Vector store error'
      );
    });
  });

  describe('processQuery', () => {
    beforeEach(async () => {
      await ragEngine.initialize();
    });

    it('should process query successfully', async () => {
      const mockDocuments: Document[] = [
        {
          id: 'doc1',
          content: 'This is a test document about AI',
          metadata: {
            type: 'thoughts',
            title: 'AI Thoughts',
            category: 'technology',
          },
        },
      ];

      const mockLLMResponse = {
        content: 'Based on the document, AI is an important technology.',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      };

      // Mock vector store search (Hybrid Search)
      mockVectorStore.searchHybrid.mockResolvedValue(mockDocuments);

      // Mock LLM service
      jest
        .spyOn(ragEngine['llmService'], 'chat')
        .mockResolvedValue(mockLLMResponse);

      const result = await ragEngine.processQuery('Tell me about AI');

      expect(result.answer).toBe(mockLLMResponse.content);
      expect(result.sources).toEqual(mockDocuments);
      expect(result.usage).toEqual(mockLLMResponse.usage);
      // QueryRewriter adds "김동욱" context when not present
      expect(result.metadata.searchQuery).toBe('김동욱 Tell me about AI');
      expect(result.metadata.searchResults).toBe(1);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle empty search results', async () => {
      const mockLLMResponse = {
        content: 'I could not find specific information about that topic.',
        usage: {
          promptTokens: 50,
          completionTokens: 25,
          totalTokens: 75,
        },
      };

      // Mock empty search results
      mockVectorStore.searchHybrid.mockResolvedValue([]);
      jest
        .spyOn(ragEngine['llmService'], 'chat')
        .mockResolvedValue(mockLLMResponse);

      const result = await ragEngine.processQuery('Unknown topic');

      expect(result.answer).toBe(mockLLMResponse.content);
      expect(result.sources).toEqual([]);
      expect(result.metadata.searchResults).toBe(0);
    });

    it('should handle processing errors', async () => {
      mockVectorStore.searchHybrid.mockRejectedValue(new Error('Search failed'));

      await expect(ragEngine.processQuery('Test query')).rejects.toThrow(
        'Failed to process query with RAG engine'
      );
    });
  });

  describe('document management', () => {
    beforeEach(async () => {
      await ragEngine.initialize();
    });

    it('should add document successfully', async () => {
      const document: Document = {
        id: 'test-doc',
        content: 'Test content',
        metadata: {
          type: 'thoughts',
          title: 'Test Document',
        },
      };

      await expect(ragEngine.addDocument(document)).resolves.not.toThrow();
      expect(mockVectorStore.addDocument).toHaveBeenCalledWith(document);
    });

    it('should delete document successfully', async () => {
      await expect(ragEngine.deleteDocument('test-doc')).resolves.not.toThrow();
      expect(mockVectorStore.deleteDocument).toHaveBeenCalledWith('test-doc');
    });

    it('should search documents successfully', async () => {
      const mockDocuments: Document[] = [
        {
          id: 'doc1',
          content: 'Search result 1',
          metadata: { type: 'thoughts' },
        },
      ];

      mockVectorStore.searchHybrid.mockResolvedValue(mockDocuments);

      const result = await ragEngine.searchDocuments('test query', 5);

      expect(result).toEqual(mockDocuments);
      expect(mockVectorStore.searchHybrid).toHaveBeenCalledWith('test query', 5);
    });
  });

  describe('engine status', () => {
    it('should return engine status', async () => {
      const mockModelInfo = {
        model: 'gpt-4o-mini',
        maxTokens: 4096,
      };

      jest
        .spyOn(ragEngine['llmService'], 'getModelInfo')
        .mockReturnValue(mockModelInfo);

      const status = await ragEngine.getEngineStatus();

      expect(status.vectorStore).toBe(true);
      expect(status.llmService).toBe(true);
      expect(status.modelInfo).toEqual(mockModelInfo);
    });
  });

  describe('context building', () => {
    it('should build context from documents', () => {
      const documents: Document[] = [
        {
          id: 'doc1',
          content: 'First document content',
          metadata: {
            type: 'thoughts',
            title: 'First Document',
          },
        },
        {
          id: 'doc2',
          content: 'Second document content',
          metadata: {
            type: 'experience',
            title: 'Second Document',
          },
        },
      ];

      const query = 'Test query';

      // Access private method for testing
      const buildContext = (ragEngine as any).buildContext.bind(ragEngine);
      const context = buildContext(documents, query);

      expect(context).toContain('사용자 질문: Test query');
      expect(context).toContain('[thoughts] First Document');
      expect(context).toContain('First document content');
      expect(context).toContain('[experience] Second Document');
      expect(context).toContain('Second document content');
    });

    it('should handle empty documents', () => {
      const query = 'Test query';

      const buildContext = (ragEngine as any).buildContext.bind(ragEngine);
      const context = buildContext([], query);

      expect(context).toContain('관련된 문서를 찾을 수 없습니다');
    });
  });
});
