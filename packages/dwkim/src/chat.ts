import { createReadlineInterface } from './utils/readline';
import { PersonaApiClient } from './utils/personaApiClient';

const API_URL = 'http://localhost:3000';

export async function startChat() {
  console.log(`
🤖 AI Assistant Chat

Connected to: ${API_URL}
Type your questions about dwkim or '/help' for commands
Press Ctrl+C to exit
`);

  const client = new PersonaApiClient(API_URL);
  const rl = createReadlineInterface();

  // Check API connection
  try {
    await client.checkHealth();
    console.log('✅ Connected to persona-api\n');
  } catch (error) {
    console.log('❌ Failed to connect to persona-api');
    console.log('💡 Make sure the API server is running: cd packages/persona-api && npm run docker:up\n');
  }

  const askQuestion = () => {
    rl.question('💬 You: ', async (input) => {
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
      try {
        console.log('\n🤔 Thinking...');
        const response = await client.chat(question);
        
        console.log(`\n🤖 Assistant: ${response.answer}\n`);
        
        if (response.sources && response.sources.length > 0) {
          console.log('📚 Sources:');
          response.sources.forEach((source, index) => {
            console.log(`  ${index + 1}. ${source.type}/${source.filename} (relevance: ${source.score?.toFixed(2)})`);
          });
          console.log('');
        }
        
      } catch (error) {
        console.log(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

async function handleCommand(command: string, client: PersonaApiClient) {
  const [cmd, ...args] = command.slice(1).split(' ');

  switch (cmd) {
    case 'help':
      console.log(`
📋 Available Commands:

Chat Commands:
  /help          Show this help message
  /status        Check API server status
  /search <query>    Search documents directly
  /clear         Clear conversation history (if supported)
  
Examples:
  What technologies do you use?
  Tell me about your experience
  What are your thoughts on AI?
  /search typescript
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