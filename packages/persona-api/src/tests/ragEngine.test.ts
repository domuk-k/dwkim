import { RAGEngine } from '../services/ragEngine';
import { Document } from '../services/vectorStore';

// Mock dependencies
jest.mock('../services/vectorStore');
jest.mock('../services/llmService');

describe('RAGEngine', () => {
  let ragEngine: RAGEngine;

  beforeEach(() => {
    ragEngine = new RAGEngine();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const mockInitialize = jest.fn().mockResolvedValue(undefined);
      jest
        .spyOn(ragEngine['vectorStore'], 'initialize')
        .mockImplementation(mockInitialize);

      await expect(ragEngine.initialize()).resolves.not.toThrow();
      expect(mockInitialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const mockInitialize = jest
        .fn()
        .mockRejectedValue(new Error('Vector store error'));
      jest
        .spyOn(ragEngine['vectorStore'], 'initialize')
        .mockImplementation(mockInitialize);

      await expect(ragEngine.initialize()).rejects.toThrow(
        'Vector store error'
      );
    });
  });

  describe('processQuery', () => {
    beforeEach(async () => {
      // Mock successful initialization
      jest
        .spyOn(ragEngine['vectorStore'], 'initialize')
        .mockResolvedValue(undefined);
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

      // Mock vector store search
      jest
        .spyOn(ragEngine['vectorStore'], 'search')
        .mockResolvedValue(mockDocuments);

      // Mock LLM service
      jest
        .spyOn(ragEngine['llmService'], 'chat')
        .mockResolvedValue(mockLLMResponse);

      const result = await ragEngine.processQuery('Tell me about AI');

      expect(result.answer).toBe(mockLLMResponse.content);
      expect(result.sources).toEqual(mockDocuments);
      expect(result.usage).toEqual(mockLLMResponse.usage);
      expect(result.metadata.searchQuery).toBe('Tell me about AI');
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
      jest.spyOn(ragEngine['vectorStore'], 'search').mockResolvedValue([]);
      jest
        .spyOn(ragEngine['llmService'], 'chat')
        .mockResolvedValue(mockLLMResponse);

      const result = await ragEngine.processQuery('Unknown topic');

      expect(result.answer).toBe(mockLLMResponse.content);
      expect(result.sources).toEqual([]);
      expect(result.metadata.searchResults).toBe(0);
    });

    it('should handle processing errors', async () => {
      jest
        .spyOn(ragEngine['vectorStore'], 'search')
        .mockRejectedValue(new Error('Search failed'));

      await expect(ragEngine.processQuery('Test query')).rejects.toThrow(
        'Failed to process query with RAG engine'
      );
    });
  });

  describe('document management', () => {
    beforeEach(async () => {
      jest
        .spyOn(ragEngine['vectorStore'], 'initialize')
        .mockResolvedValue(undefined);
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

      const mockAddDocument = jest.fn().mockResolvedValue(undefined);
      jest
        .spyOn(ragEngine['vectorStore'], 'addDocument')
        .mockImplementation(mockAddDocument);

      await expect(ragEngine.addDocument(document)).resolves.not.toThrow();
      expect(mockAddDocument).toHaveBeenCalledWith(document);
    });

    it('should delete document successfully', async () => {
      const mockDeleteDocument = jest.fn().mockResolvedValue(undefined);
      jest
        .spyOn(ragEngine['vectorStore'], 'deleteDocument')
        .mockImplementation(mockDeleteDocument);

      await expect(ragEngine.deleteDocument('test-doc')).resolves.not.toThrow();
      expect(mockDeleteDocument).toHaveBeenCalledWith('test-doc');
    });

    it('should search documents successfully', async () => {
      const mockDocuments: Document[] = [
        {
          id: 'doc1',
          content: 'Search result 1',
          metadata: { type: 'thoughts' },
        },
      ];

      const mockSearch = jest.fn().mockResolvedValue(mockDocuments);
      jest
        .spyOn(ragEngine['vectorStore'], 'search')
        .mockImplementation(mockSearch);

      const result = await ragEngine.searchDocuments('test query', 5);

      expect(result).toEqual(mockDocuments);
      expect(mockSearch).toHaveBeenCalledWith('test query', 5);
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
