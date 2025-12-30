/**
 * Persona Agent - deepagents 기반 간소화된 에이전트
 *
 * DeepAgentService 클래스 대신 모듈 함수로 구현
 * deepagents 공식 가이드 스타일 따름
 *
 * Features:
 * - RAG 검색 (search_documents)
 * - 연락처 수집 (collect_contact) with HITL interrupt
 */
import { createDeepAgent } from 'deepagents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import { VectorStore, Document } from './vectorStore';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface AgentResponse {
  answer: string;
  sources: Document[];
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  metadata: { searchQuery: string; searchResults: number; processingTime: number };
}

// Discriminated Union: 각 이벤트 타입에 맞는 필드만 허용
export type AgentStreamEvent =
  | { type: 'status'; tool: string; message: string; icon: string }
  | { type: 'sources'; sources: Document[] }
  | { type: 'content'; content: string }
  | { type: 'done'; metadata: AgentResponse['metadata'] }
  | { type: 'error'; error: string };

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

function loadSystemPrompt(): string {
  try {
    const promptPath = join(__dirname, '../../data/systemPrompt.md');
    return readFileSync(promptPath, 'utf-8');
  } catch {
    return '나는 김동욱이에요. 질문에 답변해드릴게요.';
  }
}

const TOOL_GUIDE = `

## 도구 사용
- search_documents: 나의 이력서, 경험, 생각, FAQ 등을 검색해요.
- collect_contact: 사용자가 연락처를 제공하면 수집해요. 강요하지 마세요.
- 질문에 답하기 전에 관련 문서를 먼저 검색하세요.
- 대화가 5회 이상이고 사용자가 관심을 보이면 자연스럽게 연락처를 물어볼 수 있어요.
`;

// ─────────────────────────────────────────────────────────────
// Agent 생성 (싱글턴)
// ─────────────────────────────────────────────────────────────

const vectorStore = new VectorStore();
const checkpointer = new MemorySaver();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let agent: any = null;
let initialized = false;

/**
 * Persona Agent 초기화
 */
export async function initPersonaAgent(): Promise<void> {
  if (initialized) return;

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY required');
  }

  await vectorStore.initialize();

  const model = new ChatGoogleGenerativeAI({
    model: 'gemini-2.0-flash',
    apiKey,
    temperature: 0.7,
  });

  // RAG 검색 도구
  const searchDocuments = new DynamicStructuredTool({
    name: 'search_documents',
    description: 'dwkim의 이력서, 경험, 생각, FAQ 등 개인 문서를 검색합니다.',
    schema: z.object({
      query: z.string().describe('검색 쿼리'),
      topK: z.number().optional().describe('검색 결과 수 (기본값 5)'),
    }),
    func: async (input: { query: string; topK?: number }): Promise<string> => {
      try {
        const results = await vectorStore.searchDiverse(input.query, input.topK ?? 5);
        if (results.length === 0) return '관련 문서를 찾지 못했습니다.';
        return results
          .map((doc, i) => `[${i + 1}] [${doc.metadata.type}] ${doc.metadata.title || '제목 없음'}\n${doc.content}`)
          .join('\n\n---\n\n');
      } catch (error) {
        console.error('Search failed:', error);
        return '검색 중 오류가 발생했습니다.';
      }
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // 연락처 수집 도구 (HITL 대상)
  const collectContact = new DynamicStructuredTool({
    name: 'collect_contact',
    description: '사용자가 자발적으로 연락처를 제공할 때 수집합니다. dwkim에게 전달됩니다.',
    schema: z.object({
      email: z.string().email().describe('사용자 이메일'),
      name: z.string().optional().describe('사용자 이름 (선택)'),
      message: z.string().optional().describe('전달할 메시지 (선택)'),
    }),
    func: async (input: { email: string; name?: string; message?: string }): Promise<string> => {
      try {
        // 실제 저장은 chat.ts에서 sessionId와 함께 처리
        // 여기서는 도구 호출 확인용
        console.log('📧 Contact collected via tool:', input.email);
        return `감사합니다! ${input.name || ''}님의 연락처(${input.email})를 dwkim에게 전달할게요. 24시간 내로 연락드릴게요! 😊`;
      } catch (error) {
        console.error('Contact collection failed:', error);
        return '연락처 저장 중 문제가 발생했어요. 다시 시도해주세요.';
      }
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // Deep Agent 생성
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent = (createDeepAgent as any)({
    model,
    tools: [searchDocuments, collectContact],
    systemPrompt: loadSystemPrompt() + TOOL_GUIDE,
    checkpointer,
    // HITL: collect_contact 호출 시 사용자 확인 (향후 활성화)
    // interruptOn: { collect_contact: true },
  });

  initialized = true;
  console.log('PersonaAgent initialized (Gemini 2.0 Flash + LangGraph)');
}

/**
 * Persona Agent 쿼리 실행
 */
export async function queryPersona(
  message: string,
  sessionId?: string
): Promise<AgentResponse> {
  if (!agent) throw new Error('PersonaAgent not initialized. Call initPersonaAgent() first.');

  const startTime = Date.now();

  // Agent 실행
  const config = sessionId ? { configurable: { thread_id: sessionId } } : undefined;
  const result = await agent.invoke(
    { messages: [{ role: 'user', content: message }] },
    config
  );

  // 응답 추출
  const lastMessage = result.messages?.[result.messages.length - 1];
  const answer = typeof lastMessage?.content === 'string'
    ? lastMessage.content
    : JSON.stringify(lastMessage?.content);

  // Sources 추출 (검색 결과)
  const sources = await vectorStore.searchDiverse(message, 5);

  return {
    answer,
    sources,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    metadata: {
      searchQuery: message,
      searchResults: sources.length,
      processingTime: Date.now() - startTime,
    },
  };
}

/**
 * Persona Agent 스트리밍 쿼리
 */
export async function* queryPersonaStream(
  message: string,
  sessionId?: string
): AsyncGenerator<AgentStreamEvent> {
  if (!agent) {
    yield { type: 'error', error: 'PersonaAgent not initialized' };
    return;
  }

  const startTime = Date.now();

  // Step 1: 검색 시작
  yield { type: 'status', tool: 'search', message: '관련 문서 검색 중...', icon: '🔍' };

  const sources = await vectorStore.searchDiverse(message, 5);
  yield { type: 'sources', sources };
  yield { type: 'status', tool: 'search', message: `${sources.length}개 문서 발견`, icon: '📄' };

  // Step 2: 답변 생성 시작
  yield { type: 'status', tool: 'generate', message: '답변 생성 중...', icon: '✍️' };

  // Agent 스트리밍 실행
  const config = sessionId ? { configurable: { thread_id: sessionId } } : undefined;
  const stream = await agent.stream(
    { messages: [{ role: 'user', content: message }] },
    config
  );

  for await (const chunk of stream) {
    if (chunk && typeof chunk === 'object') {
      for (const [, value] of Object.entries(chunk)) {
        if (value && typeof value === 'object' && 'content' in value) {
          const content = (value as { content: unknown }).content;
          if (typeof content === 'string' && content.length > 0) {
            yield { type: 'content', content };
          }
        }
      }
    }
  }

  yield {
    type: 'done',
    metadata: {
      searchQuery: message,
      searchResults: sources.length,
      processingTime: Date.now() - startTime,
    },
  };
}

/**
 * Agent 상태 확인
 */
export function isPersonaAgentReady(): boolean {
  return initialized && agent !== null;
}
