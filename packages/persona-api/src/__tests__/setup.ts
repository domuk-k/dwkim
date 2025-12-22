// Jest 테스트 설정
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config({ path: '.env.test' });

// ESM 패키지 mock (Jest에서 ESM 직접 처리 불가)
jest.mock('deepagents', () => ({
  createDeepAgent: jest.fn(() => ({
    invoke: jest.fn().mockResolvedValue({ messages: [] }),
    stream: jest.fn().mockReturnValue({ [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true }) }) }),
  })),
}));

jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({})),
  GoogleGenerativeAIEmbeddings: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@langchain/core/tools', () => ({
  DynamicStructuredTool: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@langchain/core/documents', () => ({
  Document: jest.fn().mockImplementation((data) => data),
}));

jest.mock('@langchain/community/vectorstores/neon', () => ({
  NeonPostgres: {
    initialize: jest.fn().mockResolvedValue({
      addDocuments: jest.fn().mockResolvedValue([]),
      similaritySearch: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// VectorStore mock (Neon DB 없이 테스트 가능)
jest.mock('../services/vectorStore', () => ({
  VectorStore: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([
      {
        id: 'test-doc-1',
        content: '테스트 문서 내용',
        metadata: { type: 'faq', title: '테스트 문서' },
      },
    ]),
  })),
}));

// 테스트 타임아웃 설정
jest.setTimeout(10000);

// 전역 테스트 설정
beforeAll(async () => {
  // 테스트 시작 전 공통 설정
});

afterAll(async () => {
  // 테스트 종료 후 정리 작업
});
