import * as readline from 'readline';
import { PersonaApiClient, ApiError } from './utils/personaApiClient';
import type { StreamEvent } from './utils/personaApiClient';
import ora from 'ora';

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

const DEFAULT_API_URL = 'https://persona-api.fly.dev';
const API_URL = process.env.DWKIM_API_URL || DEFAULT_API_URL;

export async function startChat(): Promise<void> {
  const client = new PersonaApiClient(API_URL);
  const useStreaming = process.env.DWKIM_NO_STREAM !== '1';

  // API 연결을 백그라운드에서 시작
  const healthCheckPromise = client.checkHealth().then(
    () => ({ success: true as const }),
    () => ({ success: false as const })
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // API 연결 (백그라운드에서 이미 시작됨)
  const healthSpinner = ora({
    text: '연결 중...',
    spinner: 'dots',
    discardStdin: false,
  }).start();

  const healthResult = await healthCheckPromise;

  if (healthResult.success) {
    healthSpinner.stop();
    console.log('🤖 dwkim AI — 기술스택, 경력, 프로젝트 등 무엇이든 물어보세요');
    console.log('   /help 도움말 • Ctrl+C 종료\n');
  } else {
    healthSpinner.fail('API 연결 실패');
    if (API_URL === DEFAULT_API_URL) {
      console.log('💡 서버가 깨어나는 중일 수 있어요. 잠시 후 다시 시도해주세요.\n');
    } else {
      console.log(`💡 API 주소 확인: ${API_URL}\n`);
    }
  }

  let isClosing = false;

  rl.on('close', () => {
    if (!isClosing) {
      isClosing = true;
      console.log('\nBye!');
      process.exit(0);
    }
  });

  process.on('SIGINT', () => {
    isClosing = true;
    console.log('\nBye!');
    rl.close();
    process.exit(0);
  });

  // REPL 루프
  while (!isClosing) {
    try {
      const input = await question(rl, '💬 You: ');
      const userQuestion = input.trim();

      if (!userQuestion) {
        continue;
      }

      if (userQuestion.startsWith('/')) {
        await handleCommand(userQuestion, client);
        continue;
      }

      if (useStreaming) {
        await handleStreamingChat(client, userQuestion);
      } else {
        await handleRegularChat(client, userQuestion);
      }
    } catch (error) {
      if (isClosing) break;
      console.error('❌ 오류:', error);
    }
  }
}

async function handleRegularChat(
  client: PersonaApiClient,
  question: string
): Promise<void> {
  const spinner = ora({
    text: '생각 중...',
    spinner: 'dots',
    discardStdin: false,
  }).start();

  try {
    const response = await client.chat(question);
    spinner.stop();

    console.log(`\n🤖 Assistant: ${response.answer}\n`);

    if (response.sources && response.sources.length > 0) {
      console.log('📚 Sources:');
      response.sources.forEach((source, index) => {
        console.log(`  ${index + 1}. [${source.type}] ${source.title}`);
      });
      console.log('');
    }

    if (response.processingTime) {
      console.log(`⏱️  ${response.processingTime}ms\n`);
    }
  } catch (error) {
    spinner.fail('Failed to get response');
    if (error instanceof ApiError) {
      console.log(`❌ ${error.message}`);
      if (error.isRetryable) {
        console.log('💡 다시 시도해보세요.\n');
      } else {
        console.log('');
      }
    } else {
      console.log(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`
      );
    }
  }
}

async function handleStreamingChat(
  client: PersonaApiClient,
  question: string
): Promise<void> {
  const spinner = ora({
    text: '검색 중...',
    spinner: 'dots',
    discardStdin: false, // stdin 건드리지 않음
  }).start();

  let sources: StreamEvent['sources'] = [];
  let fullAnswer = '';
  let startedPrinting = false;

  try {
    for await (const event of client.chatStream(question)) {
      switch (event.type) {
        case 'sources':
          sources = event.sources || [];
          spinner.text = sources.length > 0
            ? `${sources.length}개 문서로 답변 생성 중...`
            : '답변 생성 중...';
          break;

        case 'content':
          if (!startedPrinting) {
            spinner.stop();
            process.stdout.write('\n🤖 Assistant: ');
            startedPrinting = true;
          }
          process.stdout.write(event.content || '');
          fullAnswer += event.content || '';
          break;

        case 'done':
          console.log('\n');
          if (sources.length > 0) {
            console.log('📚 Sources:');
            sources.forEach((source, index) => {
              console.log(
                `  ${index + 1}. [${source.metadata.type}] ${source.metadata.title || source.id}`
              );
            });
            console.log('');
          }
          if (event.metadata?.processingTime) {
            console.log(`⏱️  ${event.metadata.processingTime}ms\n`);
          }
          break;

        case 'error':
          spinner.fail('Failed to get response');
          console.log(`❌ ${event.error}\n`);
          break;
      }
    }
  } catch (error) {
    spinner.stop();
    if (error instanceof ApiError) {
      console.log(`\n❌ ${error.message}`);
      if (error.isRetryable) {
        console.log('💡 다시 시도해보세요.\n');
      } else {
        console.log('');
      }
    } else {
      console.log(
        `\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`
      );
    }
  }
}

async function handleCommand(command: string, client: PersonaApiClient) {
  const [cmd, ...args] = command.slice(1).split(' ');

  switch (cmd) {
    case 'help':
      console.log(`
╭─────────────────────────────────────────────────╮
│  📋 사용 가능한 명령어                           │
╰─────────────────────────────────────────────────╯

  /help           도움말 표시
  /status         API 서버 상태 확인
  /search <검색어> 문서 직접 검색
  /clear          대화 기록 초기화

╭─────────────────────────────────────────────────╮
│  💬 질문 예시                                    │
╰─────────────────────────────────────────────────╯

  • 어떤 기술을 사용하나요?
  • 경력에 대해 알려주세요
  • 어떤 프로젝트를 했나요?
  • AI에 대한 생각은?
`);
      break;

    case 'status':
      try {
        const status = await client.getStatus();
        console.log('\n📊 API 상태:');
        console.log(`  서비스: ${status.status}`);
        console.log(`  문서 수: ${status.rag_engine?.total_documents || 'N/A'}`);
        console.log(`  컬렉션: ${status.rag_engine?.collections || 'N/A'}`);
        if (status.timestamp) {
          const uptimeSecs = Math.round((Date.now() - new Date(status.timestamp).getTime()) / 1000);
          console.log(`  업타임: ${uptimeSecs}초 전`);
        }
      } catch (error) {
        console.log(`❌ 상태 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
      break;

    case 'search':
      const query = args.join(' ');
      if (!query) {
        console.log('❌ 검색어를 입력하세요: /search <검색어>');
        break;
      }

      try {
        const results = await client.search(query);
        console.log(`\n🔍 "${query}" 검색 결과:`);

        if (results.length === 0) {
          console.log('📭 검색 결과 없음');
        } else {
          results.forEach((result, index) => {
            console.log(`\n${index + 1}. [${result.type}/${result.filename}]`);
            console.log(`   ${result.content.substring(0, 150)}...`);
            console.log(`   관련도: ${result.score?.toFixed(3)}`);
          });
        }
      } catch (error) {
        console.log(`❌ 검색 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
      break;

    case 'clear':
      console.log('🧹 대화 기록이 초기화되었습니다');
      break;

    default:
      console.log(`❌ 알 수 없는 명령어: /${cmd}`);
      console.log('/help 로 사용 가능한 명령어를 확인하세요');
  }
}