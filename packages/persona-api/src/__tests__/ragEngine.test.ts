import { buildContext, PersonaEngine } from '../services/personaAgent'
import type { Document } from '../services/vectorStore'
import * as vectorStoreModule from '../services/vectorStore'

// Mock dependencies
jest.mock('../services/vectorStore', () => {
  const actual = jest.requireActual('../services/vectorStore')
  return {
    ...actual,
    getVectorStore: jest.fn(),
    initVectorStore: jest.fn(),
    resetVectorStore: jest.fn()
  }
})

// LLMService mock (파일 상단에서 설정)
jest.mock('../services/llmService', () => {
  return {
    LLMService: jest.fn().mockImplementation(() => ({
      chat: jest.fn().mockResolvedValue({
        content: 'Based on the document, AI is an important technology.',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      }),
      chatStream: jest.fn().mockReturnValue(
        (async function* () {
          yield {
            type: 'content',
            content: 'Based on the document, AI is an important technology.'
          }
        })()
      ),
      getModelInfo: jest.fn().mockReturnValue({
        model: 'gpt-4o-mini',
        maxTokens: 4096
      })
    }))
  }
})

// BM25 mock
jest.mock('../services/bm25Engine', () => ({
  initBM25Engine: jest.fn().mockResolvedValue(undefined),
  getBM25Engine: jest.fn().mockReturnValue(null)
}))

// QueryRewriter mock
jest.mock('../services/queryRewriter', () => ({
  getQueryRewriter: jest.fn().mockReturnValue({
    rewrite: jest.fn().mockReturnValue({
      rewritten: '김동욱 Tell me about AI',
      method: 'rule',
      changes: ['added context'],
      needsClarification: false
    }),
    generateSuggestedQuestions: jest.fn().mockResolvedValue([]),
    generateFollowupQuestions: jest.fn().mockResolvedValue([])
  })
}))

// SEU mock
jest.mock('../services/seuService', () => ({
  getSEUService: jest.fn().mockReturnValue({
    measureUncertainty: jest.fn().mockResolvedValue({
      uncertainty: 0.2,
      avgSimilarity: 0.8,
      responses: [],
      isUncertain: false,
      shouldEscalate: false
    })
  })
}))

describe('RAGEngine', () => {
  let personaEngine: PersonaEngine
  let mockVectorStore: any

  beforeEach(() => {
    // Mock vector store instance
    mockVectorStore = {
      initialize: jest.fn().mockResolvedValue(undefined),
      searchDiverse: jest.fn().mockResolvedValue([]),
      searchHybrid: jest.fn().mockResolvedValue([]),
      addDocument: jest.fn().mockResolvedValue(undefined),
      deleteDocument: jest.fn().mockResolvedValue(undefined),
      getAllDocuments: jest.fn().mockResolvedValue([])
    }

    ;(vectorStoreModule.getVectorStore as jest.Mock).mockReturnValue(mockVectorStore)
    ;(vectorStoreModule.initVectorStore as jest.Mock).mockResolvedValue(undefined)

    personaEngine = new PersonaEngine()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(personaEngine.initialize()).resolves.not.toThrow()
      expect(vectorStoreModule.initVectorStore).toHaveBeenCalled()
    })

    it('should handle initialization errors', async () => {
      ;(vectorStoreModule.initVectorStore as jest.Mock).mockRejectedValue(
        new Error('Vector store error')
      )

      await expect(personaEngine.initialize()).rejects.toThrow('Vector store error')
    })
  })

  describe('processQuery', () => {
    beforeEach(async () => {
      await personaEngine.initialize()
    })

    it('should process query successfully', async () => {
      const mockDocuments: Document[] = [
        {
          id: 'doc1',
          content: 'This is a test document about AI',
          metadata: {
            type: 'thoughts',
            title: 'AI Thoughts',
            category: 'technology'
          }
        }
      ]

      // Mock vector store search (Hybrid Search)
      mockVectorStore.searchHybrid.mockResolvedValue(mockDocuments)

      const result = await personaEngine.processQuery('Tell me about AI')

      // LangGraph mock returns "Mock answer"
      expect(result.answer).toBeDefined()
      expect(result.metadata.searchQuery).toBeDefined()
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty search results', async () => {
      // Mock empty search results
      mockVectorStore.searchHybrid.mockResolvedValue([])

      const result = await personaEngine.processQuery('Unknown topic')

      expect(result.sources).toEqual([])
      expect(result.metadata.searchResults).toBe(0)
    })

    it('should handle processing with mocked graph', async () => {
      // LangGraph is mocked, so it returns mock response regardless of vectorStore errors
      // This test verifies that mocked graph returns expected structure
      const result = await personaEngine.processQuery('Test query')

      expect(result).toHaveProperty('answer')
      expect(result).toHaveProperty('sources')
      expect(result).toHaveProperty('metadata')
    })
  })

  describe('document management', () => {
    beforeEach(async () => {
      await personaEngine.initialize()
    })

    it('should add document successfully', async () => {
      const document: Document = {
        id: 'test-doc',
        content: 'Test content',
        metadata: {
          type: 'thoughts',
          title: 'Test Document'
        }
      }

      await expect(personaEngine.addDocument(document)).resolves.not.toThrow()
      expect(mockVectorStore.addDocument).toHaveBeenCalledWith(document)
    })

    it('should delete document successfully', async () => {
      await expect(personaEngine.deleteDocument('test-doc')).resolves.not.toThrow()
      expect(mockVectorStore.deleteDocument).toHaveBeenCalledWith('test-doc')
    })

    it('should search documents successfully', async () => {
      const mockDocuments: Document[] = [
        {
          id: 'doc1',
          content: 'Search result 1',
          metadata: { type: 'thoughts' }
        }
      ]

      mockVectorStore.searchHybrid.mockResolvedValue(mockDocuments)

      const result = await personaEngine.searchDocuments('test query', 5)

      expect(result).toEqual(mockDocuments)
      expect(mockVectorStore.searchHybrid).toHaveBeenCalledWith('test query', 5)
    })
  })

  describe('engine status', () => {
    beforeEach(async () => {
      await personaEngine.initialize()
    })

    it('should return engine status', async () => {
      const status = await personaEngine.getEngineStatus()

      expect(status.vectorStore).toBe(true)
      expect(status.llmService).toBe(true)
      expect(status.modelInfo).toEqual({
        model: 'gpt-4o-mini',
        maxTokens: 4096
      })
    })
  })

  describe('context building', () => {
    it('should build context from documents', () => {
      const documents: Document[] = [
        {
          id: 'doc1',
          content: 'First document content',
          metadata: {
            type: 'thoughts',
            title: 'First Document'
          }
        },
        {
          id: 'doc2',
          content: 'Second document content',
          metadata: {
            type: 'experience',
            title: 'Second Document'
          }
        }
      ]

      const query = 'Test query'

      // Use exported buildContext function directly
      const context = buildContext(documents, query)

      expect(context).toContain('사용자 질문: Test query')
      expect(context).toContain('[thoughts] First Document')
      expect(context).toContain('First document content')
      expect(context).toContain('[experience] Second Document')
      expect(context).toContain('Second document content')
    })

    it('should handle empty documents', () => {
      const query = 'Test query'

      const context = buildContext([], query)

      expect(context).toContain('관련된 문서를 찾을 수 없습니다')
    })
  })
})
