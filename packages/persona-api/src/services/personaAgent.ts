/**
 * Persona Agent - deepagents 기반 간소화된 에이전트
 *
 * DeepAgentService 클래스 대신 모듈 함수로 구현
 * deepagents 공식 가이드 스타일 따름
 *
 * Features:
 * - RAG 검색 (search_documents)
 * - 연락처 수집 (collect_contact) with HITL interrupt
 *
 * ⚠️ 타입 캐스트 사용 이유:
 * - LangChain의 복잡한 제네릭 타입으로 TS2589 (무한 타입 재귀) 발생
 * - deepagents의 ReactAgent가 Runnable 인터페이스를 완전히 구현하지 않음
 * - 런타임에서는 정상 동작하므로 `as any`로 타입 호환성 확보
 */
import { createDeepAgent } from 'deepagents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import type { Runnable } from '@langchain/core/runnables';
import type { BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import { VectorStore, Document } from './vectorStore';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

// DeepAgent 입출력 타입
interface AgentInput {
  messages: Array<{ role: string; content: string }>;
}

interface AgentOutput {
  messages: BaseMessage[];
}

// DeepAgent 타입: Runnable로 정의
type DeepAgentType = Runnable<AgentInput, AgentOutput>;

export interface AgentResponse {
  answer: string;
  sources: Document[];
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  metadata: { searchQuery: string; searchResults: number; processingTime: number };
}

// Discriminated Union: 각 이벤트 타입에 맞는 필드만 허용
export type AgentStreamEvent =
  | {
      type: 'status';
      tool: string;
      message: string;
      icon: string;
      phase?: 'started' | 'progress' | 'completed';
      details?: Record<string, unknown>;
    }
  | {
      type: 'tool_call';
      tool: 'search_documents' | 'collect_contact';
      phase: 'started' | 'executing' | 'completed' | 'error';
      displayName: string;
      icon: string;
      metadata?: { query?: string; resultCount?: number; error?: string };
    }
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

### search_documents
dwkim의 이력서, 경험, 생각, FAQ 등을 검색해요.

**검색 전략** (중요!):
- "어떤 사람이야?", "자기소개 해줘" 같은 일반 질문
  → 여러 검색 실행: "이력서", "경력 요약", "개발 철학" 등
- "React 경험?" 같은 특정 질문
  → 타겟 검색: "React 프로젝트", "프론트엔드 경험"
- 원본 질문이 모호하면 더 구체적인 검색어로 변환해서 검색해요

### collect_contact
사용자가 연락처를 제공하면 수집해요. 강요하지 마세요.
대화가 5회 이상이고 사용자가 관심을 보이면 자연스럽게 연락처를 물어볼 수 있어요.

## 메타 질문 처리 (대화 자체에 대한 질문)
- "내가 뭘 물어봤지?", "우리 대화 요약해줘" 같은 질문
  → 문서 검색하지 말고 대화 기록을 참고해서 답변해요
- 이런 질문에 FAQ나 문서 내용으로 답하면 안 돼요!
`;

// ─────────────────────────────────────────────────────────────
// Agent 생성 (싱글턴)
// ─────────────────────────────────────────────────────────────

const vectorStore = new VectorStore();
const checkpointer = new MemorySaver();

// DeepAgent 타입: Runnable로 정의 (langchain/core 버전 충돌로 인해 런타임 타입으로 유지)
let agent: DeepAgentType | null = null;
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
  // Note: `as any` required due to LangChain's complex generic types causing TS2589
  // (infinite type instantiation). This is a known LangChain type system limitation.
  const searchDocuments = new (DynamicStructuredTool as any)({
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
  });

  // 연락처 수집 도구 (HITL 대상)
  // Note: Same TS2589 workaround as above
  const collectContact = new (DynamicStructuredTool as any)({
    name: 'collect_contact',
    description: '사용자가 자발적으로 연락처를 제공할 때 수집합니다. dwkim에게 전달됩니다.',
    schema: z.object({
      email: z.string().email().describe('사용자 이메일'),
      name: z.string().optional().describe('사용자 이름 (선택)'),
      message: z.string().optional().describe('전달할 메시지 (선택)'),
    }),
    func: async (input: { email: string; name?: string; message?: string }): Promise<string> => {
      try {
        console.log('📧 Contact collected via tool:', input.email);
        return `감사합니다! ${input.name || ''}님의 연락처(${input.email})를 dwkim에게 전달할게요. 24시간 내로 연락드릴게요! 😊`;
      } catch (error) {
        console.error('Contact collection failed:', error);
        return '연락처 저장 중 문제가 발생했어요. 다시 시도해주세요.';
      }
    },
  });

  // Deep Agent 생성
  // Note: ReactAgent from deepagents doesn't fully implement Runnable interface,
  // but runtime behavior is correct. Using `as any` for type compatibility.
  agent = (createDeepAgent as any)({
    model,
    tools: [searchDocuments, collectContact],
    systemPrompt: loadSystemPrompt() + TOOL_GUIDE,
    checkpointer,
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
  let sources: Document[] = [];

  // Agent가 검색 전략을 결정하도록 함 (사전 검색 제거)
  yield { type: 'status', tool: 'thinking', message: '질문 분석 중...', icon: '🤔' };

  // Agent 스트리밍 실행
  const config = sessionId ? { configurable: { thread_id: sessionId } } : undefined;
  const stream = await agent.stream(
    { messages: [{ role: 'user', content: message }] },
    config
  );

  for await (const chunk of stream) {
    if (chunk && typeof chunk === 'object') {
      for (const [nodeKey, value] of Object.entries(chunk)) {
        // Agent 노드: Tool 호출 시작 감지
        if (nodeKey === 'agent' && value && typeof value === 'object') {
          const messages = (value as { messages?: unknown[] }).messages;
          if (Array.isArray(messages)) {
            for (const msg of messages) {
              if (msg && typeof msg === 'object' && 'tool_calls' in msg) {
                const toolCalls = (msg as { tool_calls?: unknown[] }).tool_calls;
                if (Array.isArray(toolCalls)) {
                  for (const toolCall of toolCalls) {
                    if (toolCall && typeof toolCall === 'object' && 'name' in toolCall) {
                      const toolName = (toolCall as { name: string }).name;
                      const toolArgs = (toolCall as { args?: Record<string, unknown> }).args;

                      if (toolName === 'search_documents') {
                        const query = toolArgs?.query as string | undefined;
                        yield {
                          type: 'tool_call',
                          tool: 'search_documents',
                          phase: 'started',
                          displayName: '문서 검색',
                          icon: '🔍',
                          metadata: { query },
                        };
                      } else if (toolName === 'collect_contact') {
                        yield {
                          type: 'tool_call',
                          tool: 'collect_contact',
                          phase: 'started',
                          displayName: '연락처 수집',
                          icon: '📧',
                        };
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // Tools 노드: Tool 실행 완료 감지
        if (nodeKey === 'tools' && value && typeof value === 'object') {
          const toolMessages = (value as { messages?: unknown[] }).messages;
          if (Array.isArray(toolMessages)) {
            for (const toolMsg of toolMessages) {
              if (toolMsg && typeof toolMsg === 'object' && 'name' in toolMsg) {
                const toolName = (toolMsg as { name: string }).name;
                const content = (toolMsg as { content?: string }).content;

                if (toolName === 'search_documents') {
                  if (content && content !== '관련 문서를 찾지 못했습니다.') {
                    // 결과 수 추정 (문서 구분자 기준)
                    const resultCount = content.split('\n\n---\n\n').length;
                    yield {
                      type: 'tool_call',
                      tool: 'search_documents',
                      phase: 'completed',
                      displayName: '문서 검색',
                      icon: '✓',
                      metadata: { resultCount },
                    };
                  } else {
                    yield {
                      type: 'tool_call',
                      tool: 'search_documents',
                      phase: 'completed',
                      displayName: '문서 검색',
                      icon: '✓',
                      metadata: { resultCount: 0 },
                    };
                  }
                } else if (toolName === 'collect_contact') {
                  if (content && !content.includes('문제가 발생')) {
                    yield {
                      type: 'tool_call',
                      tool: 'collect_contact',
                      phase: 'completed',
                      displayName: '연락처 수집',
                      icon: '✓',
                    };
                  } else {
                    yield {
                      type: 'tool_call',
                      tool: 'collect_contact',
                      phase: 'error',
                      displayName: '연락처 수집',
                      icon: '✗',
                      metadata: { error: content || 'Unknown error' },
                    };
                  }
                }
              }
            }
          }
        }

        // 최종 응답 추출
        if (value && typeof value === 'object' && 'content' in value) {
          const content = (value as { content: unknown }).content;
          if (typeof content === 'string' && content.length > 0) {
            // 첫 콘텐츠 전에 sources 조회 (UI용)
            if (sources.length === 0) {
              sources = await vectorStore.searchDiverse(message, 3);
              if (sources.length > 0) {
                yield { type: 'sources', sources };
              }
              yield {
                type: 'status',
                tool: 'generate',
                message: '답변 생성 중...',
                icon: '✍️',
                phase: 'started',
              };
            }
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
