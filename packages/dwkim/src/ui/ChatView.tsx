import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, Static, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { theme } from './theme.js';
import { icons, profile } from './data.js';
import {
  PersonaApiClient,
  ApiError,
  type StreamEvent,
} from '../utils/personaApiClient.js';

// Extract sources type from discriminated union
type SourcesEvent = Extract<StreamEvent, { type: 'sources' }>;

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'banner';
  content: string;
  sources?: SourcesEvent['sources'];
  processingTime?: number;
}

type Status = 'idle' | 'connecting' | 'loading' | 'error';

interface LoadingState {
  icon: string;
  message: string;
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

  // Ctrl+C 처리
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
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
      setLoadingState({ icon: '⏳', message: '처리 중...' });
      setStreamContent('');

      try {
        let sources: SourcesEvent['sources'] = [];
        let fullContent = '';
        let processingTime = 0;

        for await (const event of client.chatStream(trimmed)) {
          switch (event.type) {
            case 'status':
              setLoadingState({ icon: event.icon, message: event.message });
              break;
            case 'sources':
              sources = event.sources;
              break;
            case 'content':
              fullContent += event.content;
              setStreamContent(fullContent);
              break;
            case 'done':
              processingTime = event.metadata.processingTime;
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
          },
        ]);
        setStreamContent('');
        setLoadingState(null);
        setStatus('idle');
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
    [client, status, handleCommand]
  );

  const statusIndicator: Record<Status, string> = {
    connecting: `${icons.spinner} 연결 중...`,
    loading: loadingState ? `${loadingState.icon} ${loadingState.message}` : '',
    idle: '',
    error: '',
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* 메시지 히스토리 (Static으로 flicker 방지) */}
      <Static items={messages}>
        {(msg) => <MessageBubble key={msg.id} message={msg} />}
      </Static>

      {/* 스트리밍 응답 */}
      {streamContent && (
        <Box marginTop={1} marginLeft={2}>
          <Text color={theme.text}>{streamContent}</Text>
        </Box>
      )}

      {/* 상태 표시 */}
      {status !== 'idle' && status !== 'error' && (
        <Box marginY={1}>
          <Text color={theme.info}>{statusIndicator[status]}</Text>
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

      {/* 입력 영역 (위아래 선) */}
      {status !== 'connecting' && status !== 'error' && (
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
        <Text
          color={isUser ? theme.lavender : isSystem ? theme.muted : theme.text}
          dimColor={isSystem}
        >
          {message.content}
        </Text>
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
