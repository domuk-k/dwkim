import { createReadlineInterface } from './utils/readline';
import { PersonaApiClient, ApiError } from './utils/personaApiClient';
import type { StreamEvent } from './utils/personaApiClient';
import ora from 'ora';

const USE_STREAMING = process.env.DWKIM_NO_STREAM !== '1';

const DEFAULT_API_URL = 'https://dwkim.onrender.com';
const API_URL = process.env.DWKIM_API_URL || DEFAULT_API_URL;

export async function startChat() {
  console.log(`
╭────────────────────────────────────────────────╮
│  🤖  dwkim AI Assistant                        │
│                                                │
│  Ask me anything about dwkim's experience,     │
│  skills, projects, or thoughts on tech!        │
╰────────────────────────────────────────────────╯

${USE_STREAMING ? '⚡ Streaming mode enabled' : '📦 Batch mode'}
Type ${'/help'} for commands • Press Ctrl+C to exit
`);

  const client = new PersonaApiClient(API_URL);
  const rl = createReadlineInterface();

  // Check API connection
  const healthSpinner = ora({
    text: 'Connecting to persona-api...',
    spinner: 'dots',
  }).start();

  try {
    await client.checkHealth();
    healthSpinner.succeed('Connected to persona-api');
    console.log('');
    console.log('💡 Try asking:');
    console.log('   • What technologies do you use?');
    console.log('   • Tell me about your experience');
    console.log('   • What are your thoughts on AI?');
    console.log('');
  } catch (error) {
    healthSpinner.fail('Failed to connect to persona-api');
    if (API_URL === DEFAULT_API_URL) {
      console.log('💡 The API server might be waking up. Please try again in a moment.\n');
    } else {
      console.log(`💡 Check if the API is running at: ${API_URL}\n`);
    }
  }

  const askQuestion = () => {
    rl.question('💬 You: ', async (input: string) => {
      const question = input.trim();

      if (!question) {
        askQuestion();
        return;
      }

      // Handle special commands
      if (question.startsWith('/')) {
        await handleCommand(question, client);
        askQuestion();
        return;
      }

      // Send question to API
      if (USE_STREAMING) {
        await handleStreamingChat(client, question);
      } else {
        await handleRegularChat(client, question);
      }

      askQuestion();
    });
  };

  askQuestion();
}

async function handleRegularChat(
  client: PersonaApiClient,
  question: string
): Promise<void> {
  const spinner = ora({
    text: 'Thinking...',
    spinner: 'dots',
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
    text: 'Searching...',
    spinner: 'dots',
  }).start();

  let sources: StreamEvent['sources'] = [];
  let fullAnswer = '';
  let startedPrinting = false;

  try {
    for await (const event of client.chatStream(question)) {
      switch (event.type) {
        case 'sources':
          spinner.text = 'Generating...';
          sources = event.sources || [];
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
│  📋 Available Commands                          │
╰─────────────────────────────────────────────────╯

  /help           Show this help message
  /status         Check API server status
  /search <query> Search documents directly
  /clear          Clear conversation history

╭─────────────────────────────────────────────────╮
│  💬 Example Questions                           │
╰─────────────────────────────────────────────────╯

  • What technologies do you use?
  • Tell me about your work experience
  • What projects have you worked on?
  • What are your thoughts on AI?
`);
      break;

    case 'status':
      try {
        const status = await client.getStatus();
        console.log('\n📊 API Status:');
        console.log(`  Service: ${status.status}`);
        console.log(`  Documents: ${status.rag_engine?.total_documents || 'N/A'}`);
        console.log(`  Collections: ${status.rag_engine?.collections || 'N/A'}`);
        console.log(`  Uptime: ${Math.round((Date.now() - new Date(status.timestamp || 0).getTime()) / 1000)}s ago`);
      } catch (error) {
        console.log(`❌ Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      break;

    case 'search':
      const query = args.join(' ');
      if (!query) {
        console.log('❌ Please provide a search query: /search <your query>');
        break;
      }
      
      try {
        const results = await client.search(query);
        console.log(`\n🔍 Search results for: "${query}"`);
        
        if (results.length === 0) {
          console.log('📭 No results found');
        } else {
          results.forEach((result, index) => {
            console.log(`\n${index + 1}. [${result.type}/${result.filename}]`);
            console.log(`   ${result.content.substring(0, 150)}...`);
            console.log(`   Relevance: ${result.score?.toFixed(3)}`);
          });
        }
      } catch (error) {
        console.log(`❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      break;

    case 'clear':
      console.log('🧹 Conversation history cleared (if supported by API)');
      break;

    default:
      console.log(`❌ Unknown command: /${cmd}`);
      console.log('Type /help for available commands');
  }
}