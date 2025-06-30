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
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      apiKey: apiKey,
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
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
      // 컨텍스트가 있으면 시스템 메시지에 추가
      const systemMessage: ChatMessage = {
        role: 'system',
        content: context
          ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
          : this.systemPrompt,
      };

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
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
    } catch (error) {
      console.error('LLM API call failed:', error);
      throw new Error('Failed to generate response from LLM');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0]?.embedding || [];
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async summarizeText(text: string): Promise<string> {
    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: '주어진 텍스트를 간결하고 핵심적인 내용으로 요약해주세요.',
        },
        {
          role: 'user',
          content: text,
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
      maxTokens: this.model.includes('gpt-4') ? 8192 : 4096,
    };
  }
}
