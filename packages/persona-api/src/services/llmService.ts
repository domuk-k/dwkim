import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import OpenAI from 'openai'
import { env } from '../config/env'
import { getModel, getFallbackModel, type ModelPurpose } from '../config/models'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  /** 에러 발생 시 true, 정상 응답과 구분하기 위함 */
  isError?: boolean
}

export interface ChatStreamChunk {
  type: 'content' | 'done' | 'error'
  content?: string
  usage?: ChatResponse['usage']
  error?: string
}

// LLM 제공자 타입
type LLMProvider = 'openrouter' | 'gemini' | 'none'

export interface LLMServiceOptions {
  /** 모델 용도: generation(사용자 대면) | utility(내부 처리) */
  purpose?: ModelPurpose
  /** 모델 직접 지정 (프로필 무시) */
  model?: string
}

export class LLMService {
  private geminiClient?: ChatGoogleGenerativeAI
  private openRouterClient?: OpenAI
  private model: string = ''
  private systemPrompt: string = ''
  private llmProvider: LLMProvider
  private purpose: ModelPurpose

  constructor(options: LLMServiceOptions = {}) {
    this.purpose = options.purpose || 'generation'

    const openRouterKey = env.OPENROUTER_API_KEY
    const googleKey = env.GOOGLE_API_KEY || env.GEMINI_API_KEY

    // OpenRouter 우선 (OpenAI SDK 직접 사용)
    if (openRouterKey) {
      // 모델 우선순위: 직접 지정 > 환경변수 오버라이드 > 프로필
      this.model = options.model || this.resolveModel()
      this.openRouterClient = new OpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1'
      })
      this.llmProvider = 'openrouter'
      console.log(`LLM Service [${this.purpose}]: Using OpenRouter (${this.model})`)
    } else if (googleKey) {
      this.model = 'gemini-2.0-flash'
      this.geminiClient = new ChatGoogleGenerativeAI({
        model: this.model,
        apiKey: googleKey,
        temperature: 0.7
      })
      this.llmProvider = 'gemini'
      console.log(`LLM Service [${this.purpose}]: Using Google Gemini`)
    } else {
      this.llmProvider = 'none'
      console.warn('LLM Service: No API key configured. Set OPENROUTER_API_KEY or GOOGLE_API_KEY.')
    }

    this.systemPrompt =
      env.SYSTEM_PROMPT ||
      `당신은 김동욱(dwkim)입니다. 1인칭으로 답변하세요.

## 페르소나
- "저는", "제가" 등 1인칭 사용 (절대 "dwkim은", "김동욱님은" 3인칭 사용 금지)
- 자연스러운 대화체로 답변
- 질문자의 맥락(채용담당자, 개발자, 스타트업 등)에 맞춰 응대

## 응답 언어
**사용자의 질문 언어와 동일한 언어로 답변하세요.**
- Korean → Korean (해요체)
- English → English (casual, friendly)
- 컨텍스트가 한국어여도 질문이 영어면 영어로 답변

## 답변 원칙
- 핵심만 전달 (불필요한 장황함 금지)
- 사실 기반, 과장 표현 금지
- 모르면 솔직하게 "잘 모르겠어요" 또는 "경험이 없어요"
- 컨텍스트에 없는 내용은 추측하지 않음

## 톤
- Low ego: 자기 과시 없이 정보 전달에 집중
- Direct: 돌려 말하지 않고 바로 핵심
- 친절하되 과하게 친절하지 않음

## 형식
- 질문에 맞는 분량 (단답 가능하면 단답)
- 리스트는 3-5개 항목으로 제한

컨텍스트를 기반으로 1인칭(저, 제가)으로 답변하세요.`
  }

  async chat(messages: ChatMessage[], context?: string): Promise<ChatResponse> {
    // LLM 미설정 시 안내 메시지
    if (this.llmProvider === 'none') {
      return {
        content: '현재 AI 서비스가 설정되지 않았습니다. 관리자에게 문의해주세요.',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        isError: true
      }
    }

    try {
      console.log(`LLM Service: Processing chat with ${this.llmProvider}`)

      const systemMessage = context
        ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
        : this.systemPrompt

      // 전체 대화 히스토리를 LLM 메시지 형식으로 변환
      const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemMessage },
        ...messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ]

      if (this.llmProvider === 'openrouter' && this.openRouterClient) {
        const response = await this.openRouterClient.chat.completions.create({
          model: this.model,
          messages: llmMessages
        })

        const content = response.choices[0]?.message?.content || ''
        console.log('LLM response received, content length:', content.length)

        return {
          content,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          }
        }
      }

      // Gemini fallback (대화 히스토리를 텍스트로 변환)
      if (this.geminiClient) {
        const conversationText = messages
          .map((msg) => `${msg.role === 'user' ? '사용자' : '어시스턴트'}: ${msg.content}`)
          .join('\n\n')
        const fullPrompt = `${systemMessage}\n\n${conversationText}`
        const response = await this.geminiClient.invoke(fullPrompt)
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        return {
          content,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        }
      }

      throw new Error('No LLM client available')
    } catch (error) {
      console.error('LLM API call failed:', error)
      return {
        content: this.getErrorMessage(error),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        isError: true
      }
    }
  }

  private getErrorMessage(error: unknown): string {
    // OpenAI/OpenRouter 에러 타입 분석
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      const errorObj = error as { status?: number; code?: string }

      // Rate limit 에러
      if (
        errorObj.status === 429 ||
        message.includes('rate limit') ||
        message.includes('too many requests')
      ) {
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
      }

      // 인증 에러
      if (
        errorObj.status === 401 ||
        message.includes('invalid api key') ||
        message.includes('authentication')
      ) {
        console.error('LLM API key issue detected')
        return '서비스 설정에 문제가 있습니다. 관리자에게 문의해주세요.'
      }

      // 결제/할당량 에러
      if (
        errorObj.status === 402 ||
        message.includes('insufficient') ||
        message.includes('quota') ||
        message.includes('billing')
      ) {
        console.error('LLM billing/quota issue detected')
        return '서비스 이용량이 초과되었습니다. 관리자에게 문의해주세요.'
      }

      // 콘텐츠 정책 위반
      if (
        message.includes('content policy') ||
        message.includes('safety') ||
        message.includes('blocked')
      ) {
        return '입력 내용을 확인해주세요. 일부 내용이 제한될 수 있습니다.'
      }

      // 모델 관련 에러
      if (
        message.includes('model') &&
        (message.includes('not found') || message.includes('unavailable'))
      ) {
        console.error('LLM model configuration issue')
        return '서비스 설정에 문제가 있습니다. 관리자에게 문의해주세요.'
      }

      // 타임아웃
      if (message.includes('timeout') || message.includes('timed out')) {
        return '응답 시간이 초과되었습니다. 다시 시도해주세요.'
      }

      // 네트워크 에러
      if (
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('econnrefused')
      ) {
        return '네트워크 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.'
      }
    }

    // 기본 에러 메시지
    return '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }

  async *chatStream(messages: ChatMessage[], context?: string): AsyncGenerator<ChatStreamChunk> {
    // LLM 미설정 시
    if (this.llmProvider === 'none') {
      yield {
        type: 'error',
        error: '현재 AI 서비스가 설정되지 않았습니다.'
      }
      return
    }

    try {
      console.log(`LLM Service: Processing stream with ${this.llmProvider}`)

      const systemMessage = context
        ? `${this.systemPrompt}\n\n관련 컨텍스트:\n${context}`
        : this.systemPrompt

      // 전체 대화 히스토리를 LLM 메시지 형식으로 변환
      const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemMessage },
        ...messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ]

      if (this.llmProvider === 'openrouter' && this.openRouterClient) {
        const stream = await this.openRouterClient.chat.completions.create({
          model: this.model,
          messages: llmMessages,
          stream: true
        })

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            yield { type: 'content', content }
          }
        }

        yield {
          type: 'done',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        }
        return
      }

      // Gemini fallback (대화 히스토리를 텍스트로 변환)
      if (this.geminiClient) {
        const conversationText = messages
          .map((msg) => `${msg.role === 'user' ? '사용자' : '어시스턴트'}: ${msg.content}`)
          .join('\n\n')
        const fullPrompt = `${systemMessage}\n\n${conversationText}`
        const stream = await this.geminiClient.stream(fullPrompt)

        for await (const chunk of stream) {
          const content = typeof chunk.content === 'string' ? chunk.content : ''
          if (content) {
            yield { type: 'content', content }
          }
        }

        yield {
          type: 'done',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        }
        return
      }

      yield { type: 'error', error: 'No LLM client available' }
    } catch (error) {
      console.error('LLM streaming failed:', error)
      yield {
        type: 'error',
        error: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      }
    }
  }

  async summarizeText(text: string): Promise<string> {
    try {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: `다음 텍스트를 간결하고 핵심적인 내용으로 요약해주세요:\n\n${text}`
        }
      ]

      const response = await this.chat(messages)
      return response.content
    } catch (error) {
      console.error('Text summarization failed:', error)
      throw new Error('Failed to summarize text')
    }
  }

  getModelInfo(): { model: string; maxTokens: number; purpose: ModelPurpose } {
    return {
      model: this.model,
      maxTokens: 100000,
      purpose: this.purpose
    }
  }

  /**
   * 환경 및 용도에 맞는 모델 결정
   * 우선순위: 환경변수 오버라이드 > deprecated OPENROUTER_MODEL > 프로필
   */
  private resolveModel(): string {
    // 환경변수 오버라이드 확인
    if (this.purpose === 'generation' && env.LLM_GENERATION_MODEL) {
      return env.LLM_GENERATION_MODEL
    }
    if (this.purpose === 'utility' && env.LLM_UTILITY_MODEL) {
      return env.LLM_UTILITY_MODEL
    }

    // deprecated OPENROUTER_MODEL (하위 호환성)
    if (env.OPENROUTER_MODEL) {
      return env.OPENROUTER_MODEL
    }

    // 프로필 기반 모델 선택
    return getModel(this.purpose, {
      nodeEnv: env.NODE_ENV
    })
  }

  /**
   * Fallback 모델로 전환 (에러 시 사용)
   */
  switchToFallback(): void {
    const fallback = getFallbackModel(env.NODE_ENV)
    console.log(`LLM Service [${this.purpose}]: Switching to fallback model (${fallback})`)
    this.model = fallback
  }
}
