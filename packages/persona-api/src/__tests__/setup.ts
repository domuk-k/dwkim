// Jest 테스트 설정
import dotenv from 'dotenv'

// 환경변수 로드
dotenv.config({ path: '.env.test' })

// LangGraph mock (ESM 호환성 문제 해결)
jest.mock('@langchain/langgraph', () => {
  const mockGraph = {
    addNode: jest.fn().mockReturnThis(),
    addEdge: jest.fn().mockReturnThis(),
    addConditionalEdges: jest.fn().mockReturnThis(),
    compile: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue({
        answer: 'Mock answer',
        sources: [],
        rewrittenQuery: 'Mock query',
        metrics: { nodeExecutions: 1, totalTokens: 100 }
      }),
      stream: jest.fn().mockReturnValue(
        (async function* () {
          yield { type: 'content', content: 'Mock answer' }
          yield { type: 'done', metadata: {} }
        })()
      )
    })
  }

  return {
    StateGraph: jest.fn().mockImplementation(() => mockGraph),
    START: 'START',
    END: 'END'
  }
})

jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({})),
  GoogleGenerativeAIEmbeddings: jest.fn().mockImplementation(() => ({}))
}))

jest.mock('@langchain/core/tools', () => ({
  DynamicStructuredTool: jest.fn().mockImplementation(() => ({}))
}))

jest.mock('@langchain/core/documents', () => ({
  Document: jest.fn().mockImplementation((data) => data)
}))

jest.mock('@langchain/community/vectorstores/neon', () => ({
  NeonPostgres: {
    initialize: jest.fn().mockResolvedValue({
      addDocuments: jest.fn().mockResolvedValue([]),
      similaritySearch: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined)
    })
  }
}))

// VectorStore mock (Qdrant 없이 테스트 가능)
const mockSearchResults = [
  {
    id: 'test-doc-1',
    content: '테스트 문서 내용',
    metadata: { type: 'faq', title: '테스트 문서' }
  }
]

jest.mock('../services/vectorStore', () => ({
  VectorStore: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue(mockSearchResults),
    searchDiverse: jest.fn().mockResolvedValue(mockSearchResults),
    searchMMR: jest.fn().mockResolvedValue(mockSearchResults),
    addDocument: jest.fn().mockResolvedValue(undefined),
    addDocuments: jest.fn().mockResolvedValue(undefined),
    deleteDocument: jest.fn().mockResolvedValue(undefined),
    getCollectionInfo: jest.fn().mockResolvedValue({
      initialized: true,
      hasVectorStore: true,
      provider: 'qdrant',
      collectionName: 'persona_documents'
    })
  }))
}))

// 테스트 타임아웃 설정
jest.setTimeout(10000)

// 전역 테스트 설정
beforeAll(async () => {
  // 테스트 시작 전 공통 설정
})

afterAll(async () => {
  // 테스트 종료 후 정리 작업
})
