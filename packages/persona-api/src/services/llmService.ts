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

// LLM 제공자 타입 (추후 vLLM fallback 고려)
type LLMProvider = 'gemini' | 'vllm' | 'none';

export class LLMService {
  private geminiClient?: ChatGoogleGenerativeAI;
  private model: string = 'gemini-1.5-flash-002';
  private systemPrompt: string = '';
  private llmProvider: LLMProvider;

  constructor() {
    const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (googleKey) {
      this.geminiClient = new ChatGoogleGenerativeAI({
        model: this.model,
        apiKey: googleKey,
        temperature: 0.7,
      });
      this.llmProvider = 'gemini';
      console.log('LLM Service: Using Google Gemini');
    } else {
      // TODO: 추후 vLLM fallback 구현
      // const vllmUrl = process.env.VLLM_URL;
      // if (vllmUrl) { ... }
      this.llmProvider = 'none';
      console.warn('LLM Service: No API key configured. Set GOOGLE_API_KEY.');
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
    // LLM 미설정 시 안내 메시지
    if (this.llmProvider === 'none') {
      return {
        content: '현재 AI 서비스가 설정되지 않았습니다. 관리자에게 문의해주세요.',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    try {
      console.log(`LLM Service: Processing chat with ${this.llmProvider}`);

      if (!this.geminiClient) {
        throw new Error('Gemini client not initialized');
      }

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
    } catch (error) {
      console.error('LLM API call failed:', error);
      // 사용자 친화적 에러 메시지
      return {
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    context?: string
  ): AsyncGenerator<ChatStreamChunk> {
    // LLM 미설정 시
    if (this.llmProvider === 'none' || !this.geminiClient) {
      yield {
        type: 'error',
        error: '현재 AI 서비스가 설정되지 않았습니다.',
      };
      return;
    }

    try {
      console.log(`LLM Service: Processing stream with ${this.llmProvider}`);

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
    } catch (error) {
      console.error('LLM streaming failed:', error);
      yield {
        type: 'error',
        error: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
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
