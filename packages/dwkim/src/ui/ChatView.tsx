import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, Static, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { theme } from './theme.js';
import { icons, profile } from './data.js';
import { MarkdownText } from './MarkdownText.js';
import {
  PersonaApiClient,
  ApiError,
  type StreamEvent,
  type ProgressItem,
} from '../utils/personaApiClient.js';
import { shouldShowEmailPrompt, setHideEmailPrompt } from '../utils/config.js';

// Extract sources type from discriminated union
type SourcesEvent = Extract<StreamEvent, { type: 'sources' }>;

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'banner';
  content: string;
  sources?: SourcesEvent['sources'];
  processingTime?: number;
  shouldSuggestContact?: boolean;
}

type Status = 'idle' | 'connecting' | 'loading' | 'error';

interface ToolCallState {
  tool: string;
  displayName: string;
  icon: string;
  phase: 'started' | 'executing' | 'completed' | 'error';
  query?: string;
  resultCount?: number;
}

interface LoadingState {
  icon: string;
  message: string;
  toolCalls: ToolCallState[];
}

interface Props {
  apiUrl: string;
}

export function ChatView({ apiUrl }: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 80;
  const [client] = useState(() => new PersonaApiClient(apiUrl));
  // 배너를 첫 번째 메시지로 포함 (Static에서 한 번만 렌더링됨)
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'banner', content: '' },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('connecting');
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const [streamContent, setStreamContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [thinkingStep, setThinkingStep] = useState<{ step: string; detail?: string } | null>(null);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  const messageIdRef = useRef(0);

  const nextId = () => ++messageIdRef.current;

  // 초기 연결 확인 (with cleanup)
  useEffect(() => {
    let mounted = true;

    client
      .checkHealth()
      .then(() => {
        if (!mounted) return;
        setStatus('idle');
        setMessages([
          {
            id: nextId(),
            role: 'system',
            content: `${icons.book} /help 도움말  •  Ctrl+C 종료`,
          },
        ]);
      })
      .catch(() => {
        if (!mounted) return;
        setStatus('error');
        setErrorMessage('API 연결 실패. 잠시 후 다시 시도해주세요.');
      });

    return () => {
      mounted = false;
    };
  }, [client]);

  // 추천 질문 선택 핸들러
  const handleSuggestionSelect = useCallback(
    (question: string) => {
      setSuggestedQuestions([]);
      setInput(question);
    },
    []
  );

  // 키보드 처리 (Ctrl+C, ESC, 추천 질문 선택)
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }

    // 추천 질문 UI 키보드 네비게이션
    if (suggestedQuestions.length > 0 && status === 'idle' && !showEmailInput) {
      if (key.upArrow) {
        setSelectedSuggestionIdx((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedSuggestionIdx((prev) => Math.min(suggestedQuestions.length - 1, prev + 1));
        return;
      }
      if (key.return) {
        handleSuggestionSelect(suggestedQuestions[selectedSuggestionIdx]);
        return;
      }
      // 숫자 키로 직접 선택 (1, 2)
      if (input === '1' && suggestedQuestions.length >= 1) {
        handleSuggestionSelect(suggestedQuestions[0]);
        return;
      }
      if (input === '2' && suggestedQuestions.length >= 2) {
        handleSuggestionSelect(suggestedQuestions[1]);
        return;
      }
    }

    // ESC 처리
    if (key.escape) {
      // 추천 질문 닫기
      if (suggestedQuestions.length > 0) {
        setSuggestedQuestions([]);
        return;
      }
      // 스트리밍 중이면 취소
      if (status === 'loading') {
        client.abort();
        setStatus('idle');
        setLoadingState(null);
        setStreamContent('');
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'system', content: '⏹ 취소됨' },
        ]);
        return;
      }
      // 이메일 입력 중이면 다시보지않기
      if (showEmailInput) {
        setHideEmailPrompt(true);
        setShowEmailInput(false);
        setEmailInput('');
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'system', content: `${icons.info} 이메일 안내를 더 이상 표시하지 않아요.` },
        ]);
      }
    }
  });

  // 커맨드 핸들러
  const handleCommand = useCallback(
    async (command: string) => {
      const [cmd] = command.slice(1).split(' ');

      switch (cmd) {
        case 'help':
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'system',
              content: `
${icons.book} 명령어
  /help     도움말
  /status   서버 상태
  /clear    초기화

${icons.chat} 단축키
  ESC       응답 취소
  Ctrl+C    종료

${icons.chat} 예시 질문
  어떤 기술을 사용하나요?
  경력에 대해 알려주세요`,
            },
          ]);
          break;

        case 'status':
          try {
            const st = await client.getStatus();
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: 'system',
                content: `${icons.check} ${st.status} • 문서 ${st.rag_engine?.total_documents || 0}개`,
              },
            ]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: 'system',
                content: `${icons.error} 상태 조회 실패`,
              },
            ]);
          }
          break;

        case 'clear':
          setSessionId(undefined); // 세션 ID 초기화 (새 대화 시작)
          setMessages([
            {
              id: nextId(),
              role: 'system',
              content: `${icons.check} 초기화 완료`,
            },
          ]);
          break;

        default:
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'system',
              content: `${icons.error} /${cmd} — /help 참고`,
            },
          ]);
      }
    },
    [client]
  );

  // 메시지 제출
  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || status !== 'idle') return;

      setInput('');

      if (trimmed.startsWith('/')) {
        await handleCommand(trimmed);
        return;
      }

      // 사용자 메시지
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', content: trimmed },
      ]);
      setStatus('loading');
      setLoadingState({ icon: '⏳', message: '처리 중...', toolCalls: [] });
      setStreamContent('');

      try {
        let sources: SourcesEvent['sources'] = [];
        let fullContent = '';
        let processingTime = 0;
        let shouldSuggestContact = false;

        for await (const event of client.chatStream(trimmed, sessionId)) {
          switch (event.type) {
            case 'session':
              // 첫 요청 시 서버에서 받은 sessionId 저장 (이후 요청에 사용)
              setSessionId(event.sessionId);
              break;
            case 'status':
              setLoadingState((prev) => ({
                icon: event.icon,
                message: event.message,
                toolCalls: prev?.toolCalls || [],
              }));
              break;
            case 'tool_call':
              setLoadingState((prev) => {
                const toolCalls = [...(prev?.toolCalls || [])];
                const existingIdx = toolCalls.findIndex((t) => t.tool === event.tool);
                const toolState: ToolCallState = {
                  tool: event.tool,
                  displayName: event.displayName,
                  icon: event.icon,
                  phase: event.phase,
                  query: event.metadata?.query,
                  resultCount: event.metadata?.resultCount,
                };
                if (existingIdx >= 0) {
                  toolCalls[existingIdx] = toolState;
                } else {
                  toolCalls.push(toolState);
                }
                return {
                  icon: prev?.icon || '🔧',
                  message: prev?.message || event.displayName,
                  toolCalls,
                };
              });
              break;
            case 'sources':
              sources = event.sources;
              break;
            case 'thinking':
              setThinkingStep({ step: event.step, detail: event.detail });
              break;
            case 'progress':
              setProgressItems(event.items);
              break;
            case 'clarification':
              // A2UI: 모호한 쿼리에 대한 추천 질문 표시
              setSuggestedQuestions(event.suggestedQuestions);
              setSelectedSuggestionIdx(0);
              break;
            case 'content':
              fullContent += event.content;
              setStreamContent(fullContent);
              // 컨텐츠 스트리밍 시작하면 thinking 숨기기
              setThinkingStep(null);
              break;
            case 'done':
              processingTime = event.metadata.processingTime;
              shouldSuggestContact = event.metadata.shouldSuggestContact ?? false;
              // 완료 시 progress, thinking, suggestedQuestions 초기화
              setProgressItems([]);
              setThinkingStep(null);
              // suggestedQuestions는 유지 (사용자가 선택할 수 있도록)
              break;
            case 'error':
              throw new ApiError(event.error);
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            content: fullContent,
            sources,
            processingTime,
            shouldSuggestContact,
          },
        ]);
        setStreamContent('');
        setLoadingState(null);
        setStatus('idle');

        // 5회 이상 대화 시 이메일 입력 UI 표시 (다시보지않기 설정 안 한 경우만)
        if (shouldSuggestContact && shouldShowEmailPrompt()) {
          setShowEmailInput(true);
        }
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : '오류가 발생했습니다.';
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'system',
            content: `${icons.error} ${message}`,
          },
        ]);
        setStreamContent('');
        setLoadingState(null);
        setStatus('idle');
      }
    },
    [client, status, sessionId, handleCommand]
  );

  // 이메일 제출 핸들러
  const handleEmailSubmit = useCallback(
    async (email: string) => {
      const trimmedEmail = email.trim();

      // 빈 입력 시 건너뛰기
      if (!trimmedEmail) {
        setShowEmailInput(false);
        setEmailInput('');
        return;
      }

      if (emailSubmitting) return;

      // 간단한 이메일 형식 검증
      if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'system',
            content: `${icons.error} 올바른 이메일 주소를 입력해주세요.`,
          },
        ]);
        return;
      }

      setEmailSubmitting(true);

      try {
        const response = await fetch(`${apiUrl}/api/v1/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, sessionId }),
        });

        const result = await response.json();

        if (result.success) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'system',
              content: `${icons.check} ${result.message}`,
            },
          ]);
          setShowEmailInput(false);
          setEmailInput('');
        } else {
          throw new Error(result.error || '이메일 전송 실패');
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'system',
            content: `${icons.error} 이메일 전송에 실패했어요. 다시 시도해주세요.`,
          },
        ]);
      } finally {
        setEmailSubmitting(false);
      }
    },
    [apiUrl, emailSubmitting, sessionId]
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* 메시지 히스토리 (Static으로 flicker 방지) */}
      <Static items={messages}>
        {(msg) => <MessageBubble key={msg.id} message={msg} />}
      </Static>

      {/* 스트리밍 응답 */}
      {streamContent && (
        <Box marginTop={1} marginLeft={2}>
          <MarkdownText color={theme.text}>{streamContent}</MarkdownText>
        </Box>
      )}

      {/* Progress 표시 (RAG 파이프라인 진행 상태 with animated spinner) */}
      {progressItems.length > 0 && !streamContent && (
        <Box flexDirection="column" marginY={1} marginLeft={2}>
          {progressItems.map((item) => (
            <Box key={item.id}>
              {item.status === 'in_progress' ? (
                <Text color={theme.lavender}>
                  <Spinner type="dots" /> {item.label}
                </Text>
              ) : (
                <Text
                  color={
                    item.status === 'completed'
                      ? theme.success
                      : theme.muted
                  }
                  dimColor={item.status === 'pending'}
                >
                  {item.status === 'completed' ? '✓' : '○'} {item.label}
                </Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Thinking 표시 (현재 처리 단계 with animated spinner) */}
      {thinkingStep && (
        <Box marginY={1} marginLeft={2}>
          <Text color={theme.lavender}>
            <Spinner type="dots" />
          </Text>
          <Text color={theme.lavender} dimColor>
            {' '}{thinkingStep.step}
            {thinkingStep.detail && (
              <Text color={theme.muted}> — {thinkingStep.detail}</Text>
            )}
          </Text>
        </Box>
      )}

      {/* 상태 표시 (animated spinner + tool_call) */}
      {status !== 'idle' && status !== 'error' && !progressItems.length && (
        <Box flexDirection="column" marginY={1}>
          <Box>
            {status === 'loading' && (
              <Text color={theme.lavender}>
                <Spinner type="dots" />
              </Text>
            )}
            {status === 'connecting' && (
              <Text color={theme.info}>
                <Spinner type="dots" />
              </Text>
            )}
            <Text color={theme.info}>
              {' '}
              {status === 'connecting'
                ? '연결 중...'
                : loadingState?.message || '처리 중...'}
            </Text>
          </Box>
          {loadingState?.toolCalls && loadingState.toolCalls.length > 0 && (
            <Box flexDirection="column" marginLeft={2} marginTop={0}>
              {loadingState.toolCalls.map((tool) => (
                <Box key={tool.tool}>
                  <Text color={tool.phase === 'completed' ? theme.success : theme.muted}>
                    {tool.phase === 'completed' ? '✓' : tool.phase === 'error' ? '✗' : '○'}{' '}
                    {tool.displayName}
                    {tool.query && <Text dimColor> "{tool.query}"</Text>}
                    {tool.resultCount !== undefined && (
                      <Text dimColor> → {tool.resultCount}건</Text>
                    )}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* 에러 */}
      {errorMessage && (
        <Box marginBottom={1}>
          <Text color={theme.error}>
            {icons.error} {errorMessage}
          </Text>
        </Box>
      )}

      {/* 추천 질문 UI (A2UI - 모호한 쿼리) - inline style */}
      {suggestedQuestions.length > 0 && status === 'idle' && !showEmailInput && (
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          <Text color={theme.muted} dimColor>
            ? 더 구체적으로 물어보시겠어요?
          </Text>
          {suggestedQuestions.map((q, idx) => (
            <Box key={idx} marginLeft={2}>
              <Text
                color={idx === selectedSuggestionIdx ? theme.lavender : theme.muted}
                bold={idx === selectedSuggestionIdx}
              >
                {idx === selectedSuggestionIdx ? '› ' : '  '}
                [{idx + 1}] {q}
              </Text>
            </Box>
          ))}
          <Text color={theme.muted} dimColor>
            {'  '}↑↓ 선택 · Enter 질문 · ESC 닫기
          </Text>
        </Box>
      )}

      {/* 이메일 입력 UI (HITL 패턴) */}
      {showEmailInput && status === 'idle' && (
        <Box flexDirection="column" marginTop={1} paddingX={1}>
          <Box
            borderStyle="round"
            borderColor={theme.lavender}
            paddingX={2}
            paddingY={1}
            flexDirection="column"
          >
            <Text color={theme.lavender}>
              📧 더 깊은 이야기가 필요하신 것 같아요!
            </Text>
            <Text color={theme.muted} dimColor>
              이메일 남겨주시면 동욱이 직접 연락드릴게요.
            </Text>
            <Box marginTop={1}>
              <Text color={theme.primary}>이메일: </Text>
              <TextInput
                value={emailInput}
                onChange={setEmailInput}
                onSubmit={handleEmailSubmit}
                placeholder="your@email.com"
              />
            </Box>
            <Box marginTop={1}>
              <Text color={theme.muted} dimColor>
                Enter: 전송 • 빈값 Enter: 넘어가기 • ESC: 다시보지않기
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* 입력 영역 (위아래 선) */}
      {status !== 'connecting' && status !== 'error' && !showEmailInput && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.surface}>{'─'.repeat(termWidth - 2)}</Text>
          <Box paddingX={1}>
            <Text color={theme.primary}>{icons.arrow} </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder="질문을 입력하세요..."
            />
          </Box>
          <Text color={theme.surface}>{'─'.repeat(termWidth - 2)}</Text>
        </Box>
      )}
    </Box>
  );
}

const MessageBubble = React.memo(function MessageBubble({
  message,
}: {
  message: Message;
}) {
  // 배너 렌더링
  if (message.role === 'banner') {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Box>
          <Text bold color={theme.lavender}>
            {profile.name}
          </Text>
          <Text color={theme.muted}> · </Text>
          <Text color={theme.subtext}>{profile.title}</Text>
        </Box>
        <Box>
          <Text color={theme.muted}>{profile.bio}</Text>
        </Box>
        <Box marginTop={1}>
          <Text italic color={theme.success}>
            {profile.quote}
          </Text>
        </Box>
      </Box>
    );
  }

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* 메시지 본문 */}
      <Box marginLeft={isUser ? 0 : 2}>
        {isUser && <Text color={theme.lavender}>{icons.arrow} </Text>}
        {message.role === 'assistant' ? (
          <MarkdownText color={theme.text}>{message.content}</MarkdownText>
        ) : (
          <Text
            color={isUser ? theme.lavender : theme.muted}
            dimColor={isSystem}
          >
            {message.content}
          </Text>
        )}
      </Box>

      {/* 소스 (간략화) */}
      {message.sources && message.sources.length > 0 && (
        <Box marginLeft={4} marginTop={0}>
          <Text color={theme.muted} dimColor>
            {icons.book} {message.sources.length}개 문서 참조
          </Text>
        </Box>
      )}

      {/* 처리 시간 */}
      {message.processingTime && (
        <Box marginLeft={4}>
          <Text color={theme.muted} dimColor>
            {icons.clock} {message.processingTime}ms
          </Text>
        </Box>
      )}
    </Box>
  );
});
