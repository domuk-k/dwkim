import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

// 메시지 컴포넌트를 메모이제이션
const MessageItem = React.memo(({ message }: { message: Message }) => (
  <Box marginBottom={1}>
    <Text color={message.role === 'user' ? 'green' : 'cyan'}>
      {message.role === 'user' ? '💬 질문: ' : '🤖 답변: '}
      {message.content}
    </Text>
  </Box>
));

MessageItem.displayName = 'MessageItem';

// 입력 박스 컴포넌트를 메모이제이션 - 더 세밀한 최적화
const InputBox = React.memo(({ input, onInputChange, onSubmit }: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (value: string) => void;
}) => {
  const inputBoxStyle = useMemo(() => ({
    flexDirection: 'column' as const,
  }), []);

  const borderBoxStyle = useMemo(() => ({
    borderStyle: 'round' as const,
    borderColor: 'blue' as const,
    paddingX: 1,
    paddingY: 1,
  }), []);

  const innerBoxStyle = useMemo(() => ({
    flexDirection: 'column' as const,
    width: '100%' as const,
  }), []);

  return (
    <Box {...inputBoxStyle}>
      <Box {...borderBoxStyle}>
        <Box {...innerBoxStyle}>
          <Text color="blue">💬 질문을 입력하세요...</Text>
          <TextInput 
            value={input} 
            onChange={onInputChange} 
            onSubmit={onSubmit}
            placeholder=""
          />
        </Box>
      </Box>
    </Box>
  );
});

InputBox.displayName = 'InputBox';

// 더 효율적인 상태 관리를 위한 reducer
const initialState = {
  messages: [] as Message[],
  input: '',
  isLoading: false,
  showInput: true,
};

type State = typeof initialState;
type Action = 
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_MESSAGES'; payload: Message[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SHOW_INPUT'; payload: boolean }
  | { type: 'RESET_INPUT' };

const chatReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'ADD_MESSAGES':
      return { ...state, messages: [...state.messages, ...action.payload] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SHOW_INPUT':
      return { ...state, showInput: action.payload };
    case 'RESET_INPUT':
      return { ...state, input: '' };
    default:
      return state;
  }
};

export default function ChatApp() {
  const [state, dispatch] = React.useReducer(chatReducer, initialState);
  const { messages, input, isLoading, showInput } = state;
  const { exit } = useApp();

  // 개발 모드에서만 devtools 설정
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // devtools 설정은 개발 모드에서만
    }

    // 프로세스 종료 시그널 처리
    const handleExit = (signal: string) => {
      console.log(`\n👋 안녕히 가세요! (${signal})`);
      process.exit(0);
    };

    // Raw mode 지원 확인 후 처리
    let isRawModeSupported = false;
    try {
      if (process.stdin.isTTY) {
        isRawModeSupported = true;
      }
    } catch (error) {
      // Raw mode 지원하지 않는 환경
      isRawModeSupported = false;
    }

    if (isRawModeSupported) {
      process.on('SIGINT', () => handleExit('SIGINT'));
      process.on('SIGTERM', () => handleExit('SIGTERM'));
      process.on('SIGHUP', () => handleExit('SIGHUP'));
    } else {
      // Raw mode 지원하지 않는 환경에서는 5초 후 자동 종료
      const autoExitTimer = setTimeout(() => {
        console.log('\n⚠️  Raw mode를 지원하지 않는 환경입니다.');
        console.log('👋 프로그램을 종료합니다.');
        process.exit(0);
      }, 5000);

      return () => clearTimeout(autoExitTimer);
    }

    return () => {
      if (isRawModeSupported) {
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGTERM');
        process.removeAllListeners('SIGHUP');
      }
    };
  }, []);

  // Check OpenAI API key - 최초 한 번만 체크
  const [apiKeyChecked, setApiKeyChecked] = React.useState(false);

  React.useEffect(() => {
    if (!process.env.OPENAI_API_KEY && !apiKeyChecked) {
      setApiKeyChecked(true);
      console.log('\n❌ OpenAI API 키를 찾을 수 없어요');
      console.log('💡 OPENAI_API_KEY 환경변수를 설정해주세요');
      console.log('👋 프로그램을 종료합니다.');
      
      // 즉시 종료
      setTimeout(() => {
        process.exit(0);
      }, 100);
    }
  }, [apiKeyChecked]);

  if (!process.env.OPENAI_API_KEY) {
    return null; // 렌더링하지 않음
  }

  // Handle Ctrl+C - 메모이제이션
  useInput(useCallback((input, key) => {
    if (key.ctrl && input === 'c') {
      console.log('\n👋 안녕히 가세요!');
      exit();
      // 강제 종료 보장
      setTimeout(() => process.exit(0), 100);
    }
  }, [exit]));

  // 핸들러 함수들을 메모이제이션
  const handleInputChange = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', payload: value });
  }, []);

  const handleSubmit = useCallback(async (value: string) => {
    const question = value.trim();
    if (!question) return;

    // Handle exit commands
    if (question.toLowerCase() === 'exit' || question.toLowerCase() === 'quit') {
      console.log('\n👋 안녕히 가세요!');
      exit();
      // 강제 종료 보장
      setTimeout(() => process.exit(0), 100);
      return;
    }

    const messageId = Date.now().toString();

    // Handle help command
    if (question === '/help') {
      console.log(`\n💬 질문: ${question}`);
      console.log('\n📋 명령어:');
      console.log('  /help     도움말 보기');
      console.log('  /status   연결 상태 확인');
      console.log('\n종료: Ctrl+C\n');
      dispatch({ type: 'RESET_INPUT' });
      return;
    }

    // Handle status command
    if (question === '/status') {
      console.log(`\n💬 질문: ${question}`);
      console.log('\n📊 상태:');
      console.log('  OpenAI API: ✅');
      console.log('  모델: gpt-3.5-turbo\n');
      dispatch({ type: 'RESET_INPUT' });
      return;
    }

    // Add user message
    console.log(`\n💬 질문: ${question}`);
    dispatch({ type: 'ADD_MESSAGE', payload: { role: 'user', content: question, id: messageId + '_user' } });
    dispatch({ type: 'RESET_INPUT' });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_SHOW_INPUT', payload: false });

    console.log('🤔 잠깐만요...');

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant helping users learn about dwkim (김동욱), a Software Engineer at BHSN.ai. 
            
Profile info:
- Name: 김동욱 (dwkim)
- Role: Software Engineer at BHSN.ai
- Email: dannyworks102@gmail.com
- GitHub: https://github.com/domuk-k
- Website: https://domuk-k.vercel.app
- Project: https://github.com/domuk-k/dwkim
- Bio: Problem Solver 🤹, Marathon Runner 🏃, Opensource committer 💻, casual Yogi 🧘
- Quote: "Customer Centric, Focus on what you can control"

Answer questions about dwkim professionally and friendly. For general questions, provide helpful responses.`
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const answer = response.choices[0]?.message?.content || '죄송해요, 답변을 생성할 수 없어요.';
      console.log(`\n🤖 답변: ${answer}\n`);
      dispatch({ type: 'ADD_MESSAGE', payload: { role: 'assistant', content: answer, id: messageId + '_assistant' } });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.log(`\n❌ 오류: ${errorMessage}\n`);
      dispatch({ type: 'ADD_MESSAGE', payload: { role: 'assistant', content: `❌ 오류: ${errorMessage}`, id: messageId + '_assistant' } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_SHOW_INPUT', payload: true });
    }
  }, [exit]);

  // 헤더는 최초 한 번만 출력되도록 제어
  const [headerShown, setHeaderShown] = React.useState(false);
  
  React.useEffect(() => {
    if (!headerShown) {
      setHeaderShown(true);
      console.log('🤖 dwkim AI 어시스턴트 (Ctrl+C로 종료)\n');
    }
  }, [headerShown]);

  const loadingComponent = useMemo(() => (
    <Box marginBottom={1}>
      <Text color="yellow">🤔 잠깐만요...</Text>
    </Box>
  ), []);

  const messageList = useMemo(() => (
    <Box flexDirection="column" marginBottom={1}>
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </Box>
  ), [messages]);

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Input Box */}
      {showInput && (
        <InputBox 
          input={input}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />
      )}
    </Box>
  );
}