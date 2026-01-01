import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import OpenAI from 'openai';

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

// LLM 제공자 타입
type LLMProvider = 'openrouter' | 'gemini' | 'none';

export class LLMService {
  private geminiClient?: ChatGoogleGenerativeAI;
  private openRouterClient?: OpenAI;
  private model: string = '';
  private systemPrompt: string = '';
  private llmProvider: LLMProvider;

  constructor() {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    // OpenRouter 우선 (OpenAI SDK 직접 사용)
    if (openRouterKey) {
      this.model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
      this.openRouterClient = new OpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      this.llmProvider = 'openrouter';
      console.log(`LLM Service: Using OpenRouter (${this.model})`);
    } else if (googleKey) {
      this.model = 'gemini-2.0-flash';
      this.geminiClient = new ChatGoogleGenerativeAI({
        model: this.model,
        apiKey: googleKey,
        temperature: 0.7,
      });
      this.llmProvider = 'gemini';
      console.log('LLM Service: Using Google Gemini');
    } else {
      this.llmProvider = 'none';
      console.warn('LLM Service: No API key configured. Set OPENROUTER_API_KEY or GOOGLE_API_KEY.');
    }

    this.systemPrompt =
      process.env.SYSTEM_PROMPT ||
      `당신은 dwkim의 AI 어시스턴트입니다.

## 답변 원칙
- 300자 이내로 핵심만 전달
- 한 문장에 하나의 정보
- 사실 기반, 가치 판단 최소화
- "최고의", "훌륭한" 같은 과장 표현 금지
- 모르면 모른다고 말하기

## 톤
- Low ego: 자기 과시 없이 정보 전달에 집중
- Direct: 돌려 말하지 않고 바로 핵심
- 친절하되 과하게 친절하지 않음

## 형식
- 질문에 맞는 분량 (단답 가능하면 단답)
- 리스트는 3-5개 항목으로 제한
- 컨텍스트에 없는 내용은 추측하지 않음

컨텍스트를 기반으로 dwkim에 대해 정확하게 답변하세요.`;
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

      const systemMessage = context
        ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
        : this.systemPrompt;

      // 전체 대화 히스토리를 LLM 메시지 형식으로 변환
      const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemMessage },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      if (this.llmProvider === 'openrouter' && this.openRouterClient) {
        const response = await this.openRouterClient.chat.completions.create({
          model: this.model,
          messages: llmMessages,
        });

        const content = response.choices[0]?.message?.content || '';
        console.log('LLM response received, content length:', content.length);

        return {
          content,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
        };
      }

      // Gemini fallback (대화 히스토리를 텍스트로 변환)
      if (this.geminiClient) {
        const conversationText = messages
          .map(msg => `${msg.role === 'user' ? '사용자' : '어시스턴트'}: ${msg.content}`)
          .join('\n\n');
        const fullPrompt = `${systemMessage}\n\n${conversationText}`;
        const response = await this.geminiClient.invoke(fullPrompt);
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        return {
          content,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
      }

      throw new Error('No LLM client available');
    } catch (error) {
      console.error('LLM API call failed:', error);
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
    if (this.llmProvider === 'none') {
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

      // 전체 대화 히스토리를 LLM 메시지 형식으로 변환
      const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemMessage },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      if (this.llmProvider === 'openrouter' && this.openRouterClient) {
        const stream = await this.openRouterClient.chat.completions.create({
          model: this.model,
          messages: llmMessages,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
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

      // Gemini fallback (대화 히스토리를 텍스트로 변환)
      if (this.geminiClient) {
        const conversationText = messages
          .map(msg => `${msg.role === 'user' ? '사용자' : '어시스턴트'}: ${msg.content}`)
          .join('\n\n');
        const fullPrompt = `${systemMessage}\n\n${conversationText}`;
        const stream = await this.geminiClient.stream(fullPrompt);

        for await (const chunk of stream) {
          const content = typeof chunk.content === 'string' ? chunk.content : '';
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

      yield { type: 'error', error: 'No LLM client available' };
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
