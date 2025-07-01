import Anthropic from '@anthropic-ai/sdk';
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

export class LLMService {
  private client?: Anthropic;
  private openaiClient?: OpenAI;
  private model: string = 'gpt-4o-mini';
  private systemPrompt: string = '';
  private llmProvider: 'openai' | 'anthropic' | 'mock';

  constructor() {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    // LLM 제공자 우선순위: OpenAI > Anthropic > Mock
    if (openaiKey) {
      this.openaiClient = new OpenAI({
        apiKey: openaiKey,
      });
      this.llmProvider = 'openai';
      console.log('LLM Service: Using OpenAI');
    } else if (anthropicKey) {
      this.client = new Anthropic({
        apiKey: anthropicKey,
      });
      this.llmProvider = 'anthropic';
      console.log('LLM Service: Using Anthropic Claude');
    } else {
      this.llmProvider = 'mock';
      console.log('LLM Service: Using Mock mode');
    }

    this.model = process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || 'gpt-4o-mini';
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

      // OpenAI 사용
      if (this.llmProvider === 'openai' && this.openaiClient) {
        const systemMessage = context
          ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
          : this.systemPrompt;

        const chatMessages = [
          { role: 'system' as const, content: systemMessage },
          ...messages.filter(msg => msg.role !== 'system')
        ];

        const response = await this.openaiClient.chat.completions.create({
          model: this.model,
          messages: chatMessages,
          max_tokens: 1000,
          temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content || '';
        const usage = response.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        };

        return {
          content,
          usage: {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          },
        };
      }

      // Anthropic Claude 사용
      if (this.llmProvider === 'anthropic' && this.client) {
        // Claude API는 system 메시지를 별도로 처리
        const systemMessage = context
          ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
          : this.systemPrompt;

        // system 메시지를 제외한 사용자/어시스턴트 메시지만 추출
        const conversationMessages = messages.filter(msg => msg.role !== 'system');

        const response = await this.client.messages.create({
          model: this.model,
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
        content: `안녕하세요! 현재 Mock 모드로 실행 중입니다. API 키를 설정하면 정상적으로 작동합니다.\n\n질문: "${userMessage}"\n\n설정 방법:\n- OpenAI: OPENAI_API_KEY 설정\n- Claude: ANTHROPIC_API_KEY 설정`,
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

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiClient) {
      console.log('Using mock embedding for:', text.substring(0, 50) + '...');
      // Mock embedding - 1536 dimensions with random values
      return Array.from({ length: 1536 }, () => Math.random() - 0.5);
    }

    try {
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0]?.embedding || [];
    } catch (error) {
      console.error('Embedding generation failed:', error);
      console.log('Falling back to mock embedding');
      // Fallback to mock embedding
      return Array.from({ length: 1536 }, () => Math.random() - 0.5);
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
      maxTokens: this.model.includes('claude-3-opus') ? 200000 : 
                this.model.includes('claude-3-sonnet') ? 200000 : 200000,
    };
  }
}