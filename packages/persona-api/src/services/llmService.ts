import Anthropic from '@anthropic-ai/sdk';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatStreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  usage?: ChatResponse['usage'];
  error?: string;
}

export class LLMService {
  private anthropicClient?: Anthropic;
  private geminiClient?: ChatGoogleGenerativeAI;
  private model: string = 'gemini-2.5-flash-preview-05-20';
  private systemPrompt: string = '';
  private llmProvider: 'gemini' | 'anthropic' | 'mock';

  constructor() {
    const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // LLM 제공자 우선순위: Gemini > Anthropic > Mock
    if (googleKey) {
      this.geminiClient = new ChatGoogleGenerativeAI({
        model: this.model,
        apiKey: googleKey,
        temperature: 0.7,
      });
      this.llmProvider = 'gemini';
      console.log('LLM Service: Using Google Gemini');
    } else if (anthropicKey) {
      this.anthropicClient = new Anthropic({
        apiKey: anthropicKey,
      });
      this.llmProvider = 'anthropic';
      console.log('LLM Service: Using Anthropic Claude');
    } else {
      this.llmProvider = 'mock';
      console.log('LLM Service: Using Mock mode');
    }

    this.systemPrompt =
      process.env.SYSTEM_PROMPT ||
      `당신은 dwkim의 개인화된 AI 어시스턴트입니다.

다음 지침을 따라 답변해주세요:
1. dwkim의 경험과 생각을 바탕으로 개인화된 답변을 제공
2. 전문적이면서도 친근한 톤 유지
3. 한국어로 답변하며, 필요시 영어 용어도 적절히 사용
4. 구체적이고 실용적인 조언 제공
5. 개인정보 보호를 위해 민감한 정보는 공유하지 않음

제공된 컨텍스트 정보를 활용하여 정확하고 유용한 답변을 생성해주세요.`;
  }

  async chat(messages: ChatMessage[], context?: string): Promise<ChatResponse> {
    try {
      console.log(`LLM Service: Processing chat with ${this.llmProvider} provider`);

      // Gemini 사용
      if (this.llmProvider === 'gemini' && this.geminiClient) {
        const systemMessage = context
          ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
          : this.systemPrompt;

        const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
        const fullPrompt = `${systemMessage}\n\n사용자: ${userMessage}`;

        const response = await this.geminiClient.invoke(fullPrompt);
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        return {
          content,
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
        };
      }

      // Anthropic Claude 사용
      if (this.llmProvider === 'anthropic' && this.anthropicClient) {
        const systemMessage = context
          ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
          : this.systemPrompt;

        const conversationMessages = messages.filter(msg => msg.role !== 'system');

        const response = await this.anthropicClient.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          temperature: 0.7,
          system: systemMessage,
          messages: conversationMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
        });

        const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
        const usage = response.usage || {
          input_tokens: 0,
          output_tokens: 0,
        };

        return {
          content,
          usage: {
            promptTokens: usage.input_tokens,
            completionTokens: usage.output_tokens,
            totalTokens: usage.input_tokens + usage.output_tokens,
          },
        };
      }

      // Mock 모드
      console.log('Using mock mode for chat');
      const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
      return {
        content: `안녕하세요! 현재 Mock 모드로 실행 중입니다. API 키를 설정하면 정상적으로 작동합니다.\n\n질문: "${userMessage}"\n\n설정 방법:\n- Google: GOOGLE_API_KEY 설정\n- Claude: ANTHROPIC_API_KEY 설정`,
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      };

    } catch (error) {
      console.error('LLM API call failed:', error);
      throw new Error('Failed to generate response from LLM');
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    context?: string
  ): AsyncGenerator<ChatStreamChunk> {
    try {
      console.log(`LLM Service: Processing stream with ${this.llmProvider} provider`);

      // Gemini streaming
      if (this.llmProvider === 'gemini' && this.geminiClient) {
        const systemMessage = context
          ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
          : this.systemPrompt;

        const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
        const fullPrompt = `${systemMessage}\n\n사용자: ${userMessage}`;

        const stream = await this.geminiClient.stream(fullPrompt);

        for await (const chunk of stream) {
          const content = typeof chunk.content === 'string'
            ? chunk.content
            : '';
          if (content) {
            yield { type: 'content', content };
          }
        }

        yield {
          type: 'done',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
        return;
      }

      // Anthropic streaming
      if (this.llmProvider === 'anthropic' && this.anthropicClient) {
        const systemMessage = context
          ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
          : this.systemPrompt;

        const conversationMessages = messages.filter((msg) => msg.role !== 'system');

        const stream = this.anthropicClient.messages.stream({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          temperature: 0.7,
          system: systemMessage,
          messages: conversationMessages.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            yield { type: 'content', content: event.delta.text };
          }
        }

        yield {
          type: 'done',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
        return;
      }

      // Mock mode - simulate streaming
      const mockResponse = `안녕하세요! Mock 스트리밍 모드입니다.`;
      for (const char of mockResponse) {
        yield { type: 'content', content: char };
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      yield {
        type: 'done',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };
    } catch (error) {
      console.error('LLM streaming failed:', error);
      yield {
        type: 'error',
        error: 'Failed to generate streaming response',
      };
    }
  }

  async summarizeText(text: string): Promise<string> {
    try {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: `다음 텍스트를 간결하고 핵심적인 내용으로 요약해주세요:\n\n${text}`,
        },
      ];

      const response = await this.chat(messages);
      return response.content;
    } catch (error) {
      console.error('Text summarization failed:', error);
      throw new Error('Failed to summarize text');
    }
  }

  getModelInfo(): { model: string; maxTokens: number } {
    return {
      model: this.model,
      maxTokens: 100000,
    };
  }
}
