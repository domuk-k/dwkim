/**
 * Chat Service - 채팅 비즈니스 로직 분리
 *
 * chat.ts의 핸들러 로직을 서비스로 분리하여:
 * - 테스트 용이성 향상
 * - 라우트 파일 슬림화
 * - 재사용 가능한 비즈니스 로직
 */

import { z } from 'zod'
import { type ChatLogEntry, generateRequestId, logChatResponse } from './chatLogger'
import type { ContactInfo, ContactService } from './contactService'
import { type ConversationLimiter, THRESHOLDS } from './conversationLimiter'
import { ConversationStore } from './conversationStore'
import type { ChatMessage } from './llmService'
import { PersonaEngine, type RAGResponse, type RAGStreamEvent } from './personaAgent'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      })
    )
    .optional(),
  options: z
    .object({
      maxSearchResults: z.number().min(1).max(10).optional(),
      includeSources: z.boolean().optional()
    })
    .optional()
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

export interface ChatResponse {
  success: boolean
  data: {
    answer: string
    sessionId: string
    shouldSuggestContact?: boolean
    conversationLimitReached?: boolean
    contactSuggestionMessage?: string
    sources: unknown[]
    usage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    metadata: {
      searchQuery: string
      searchResults: number
      processingTime: number
    }
  }
}

export interface BlockedResponse {
  success: false
  error: 'conversation_limit_exceeded'
  message: string
  expiresAt?: string
  canProvideContact: boolean
}

export type ChatStreamEvent = { type: 'session'; sessionId: string } | RAGStreamEvent

export interface ChatContext {
  clientIp: string
  userAgent?: string
  deviceId?: string
}

// ─────────────────────────────────────────────────────────────
// ChatService
// ─────────────────────────────────────────────────────────────

export class ChatService {
  private personaEngine: PersonaEngine
  private conversationStore: ConversationStore
  private conversationLimiter: ConversationLimiter
  private contactService: ContactService
  private initialized = false

  constructor(
    conversationStore: ConversationStore,
    conversationLimiter: ConversationLimiter,
    contactService: ContactService
  ) {
    this.personaEngine = new PersonaEngine()
    this.conversationStore = conversationStore
    this.conversationLimiter = conversationLimiter
    this.contactService = contactService
  }

  /**
   * 서비스 초기화
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await this.personaEngine.initialize()
      console.log('ChatService: RAG Engine initialized')
      this.initialized = true
    } catch (error) {
      console.error('ChatService initialization failed:', error)
      // 초기화 실패 시에도 서버는 계속 실행
    }
  }

  /**
   * IP 차단 확인
   */
  async checkBlocked(clientIp: string): Promise<BlockedResponse | null> {
    const blockStatus = await this.conversationLimiter.isBlocked(clientIp)
    if (blockStatus.blocked) {
      return {
        success: false,
        error: 'conversation_limit_exceeded',
        message: this.conversationLimiter.generateFriendlyBlockMessage(),
        expiresAt: blockStatus.expiresAt,
        canProvideContact: true
      }
    }
    return null
  }

  /**
   * 세션 ID 결정
   */
  getSessionId(inputSessionId: string | undefined, clientIp: string): string {
    return inputSessionId || ConversationStore.generateSessionId(clientIp)
  }

  /**
   * 히스토리 로드
   */
  async getHistory(
    sessionId: string,
    inputSessionId: string | undefined,
    clientHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<ChatMessage[]> {
    if (inputSessionId) {
      return this.conversationStore.getHistory(sessionId)
    }
    if (clientHistory.length > 0) {
      return clientHistory.map((msg) => ({
        role: msg.role,
        content: msg.content
      }))
    }
    return []
  }

  /**
   * 채팅 처리 (non-streaming)
   */
  async handleChat(request: ChatRequest, context: ChatContext): Promise<ChatResponse> {
    const requestId = generateRequestId()
    const startTime = Date.now()
    const {
      message,
      sessionId: inputSessionId,
      conversationHistory: clientHistory = [],
      options = {}
    } = request

    const sessionId = this.getSessionId(inputSessionId, context.clientIp)
    const history = await this.getHistory(sessionId, inputSessionId, clientHistory)

    // 사용자 메시지 저장
    await this.conversationStore.addMessage(sessionId, 'user', message)

    // 로그 엔트리
    const logEntry: ChatLogEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      request: {
        message,
        historyLength: history.length
      },
      engine: 'rag'
    }

    let answer: string
    let sources: unknown[]
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number }
    let metadata: { searchQuery: string; searchResults: number; processingTime: number }

    // LangGraph RAG 엔진 사용
    if (this.personaEngine) {
      const response: RAGResponse = await this.personaEngine.processQuery(message, history)
      answer = response.answer
      sources = response.sources
      usage = response.usage
      metadata = response.metadata
    } else {
      logEntry.engine = 'mock'
      answer = `안녕하세요! dwkim의 AI 어시스턴트입니다. 현재 엔진이 초기화 중이므로 Mock 응답을 드립니다.\n\n질문: ${message}`
      sources = []
      usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      metadata = { searchQuery: message, searchResults: 0, processingTime: 0 }
    }

    // 어시스턴트 응답 저장
    await this.conversationStore.addMessage(sessionId, 'assistant', answer)

    // 메시지 카운트로 상태 결정
    const messageCount = await this.conversationStore.getMessageCount(sessionId)
    const shouldSuggestContact = messageCount >= THRESHOLDS.SUGGEST_CONTACT
    const shouldBlockAfterThis = messageCount >= THRESHOLDS.BLOCK_IP

    // 30회 도달 시 IP 차단 예약
    if (shouldBlockAfterThis) {
      await this.conversationLimiter.blockIp(context.clientIp)
      console.log(`Conversation limit reached for ${context.clientIp} (${messageCount} messages)`)
    }

    // 로깅
    const processingTimeMs = Date.now() - startTime
    logEntry.response = {
      answerPreview: answer.slice(0, 100),
      sourcesCount: Array.isArray(sources) ? sources.length : 0,
      processingTimeMs
    }
    logChatResponse(logEntry)

    return {
      success: true,
      data: {
        answer,
        sessionId,
        shouldSuggestContact,
        ...(shouldBlockAfterThis && {
          conversationLimitReached: true,
          contactSuggestionMessage: this.conversationLimiter.generateFriendlyBlockMessage()
        }),
        sources: options.includeSources !== false ? sources : [],
        usage,
        metadata
      }
    }
  }

  /**
   * 스트리밍 채팅 처리
   */
  async *handleStreamChat(
    request: ChatRequest,
    context: ChatContext
  ): AsyncGenerator<ChatStreamEvent> {
    const { message, sessionId: inputSessionId, conversationHistory: clientHistory = [] } = request

    const sessionId = this.getSessionId(inputSessionId, context.clientIp)
    const history = await this.getHistory(sessionId, inputSessionId, clientHistory)

    // 사용자 메시지 저장
    await this.conversationStore.addMessage(sessionId, 'user', message)
    let fullAnswer = ''

    // 세션 시작 이벤트
    yield { type: 'session', sessionId }

    // LangGraph RAG 엔진 사용
    if (this.personaEngine) {
      for await (const event of this.personaEngine.processQueryStream(message, history)) {
        if (event.type === 'content') {
          fullAnswer += event.content
        }
        // done 이벤트에 shouldSuggestContact 추가
        if (event.type === 'done' && event.metadata) {
          const messageCount = await this.conversationStore.getMessageCount(sessionId)
          const shouldSuggestContact = messageCount >= THRESHOLDS.SUGGEST_CONTACT
          console.log(
            `[A2UI] sessionId=${sessionId}, messageCount=${messageCount}, threshold=${THRESHOLDS.SUGGEST_CONTACT}, shouldSuggestContact=${shouldSuggestContact}`
          )
          yield {
            type: 'done',
            metadata: {
              ...event.metadata,
              shouldSuggestContact,
              messageCount
            }
          }
          continue
        }
        yield event
      }
    } else {
      yield { type: 'error', error: '엔진이 초기화되지 않았습니다.' }
    }

    // 어시스턴트 응답 저장
    if (fullAnswer) {
      await this.conversationStore.addMessage(sessionId, 'assistant', fullAnswer)
    }
  }

  /**
   * 문서 검색
   */
  async searchDocuments(query: string, limit = 5): Promise<unknown[]> {
    if (!this.personaEngine) {
      throw new Error('RAG 엔진이 초기화되지 않았습니다.')
    }
    return this.personaEngine.searchDocuments(query, limit)
  }

  /**
   * 엔진 상태 확인
   */
  async getEngineStatus(): Promise<{ status: string; components?: unknown }> {
    if (!this.personaEngine) {
      return {
        status: 'not_initialized'
      }
    }
    const components = await this.personaEngine.getEngineStatus()
    return {
      status: 'ready',
      components
    }
  }

  /**
   * 연락처 수집
   */
  async collectContact(
    email: string,
    context: ChatContext,
    options: {
      name?: string
      message?: string
      sessionId?: string
    } = {}
  ): Promise<{ success: boolean; message: string }> {
    const sessionId = this.getSessionId(options.sessionId, context.clientIp)
    const messageCount = await this.conversationStore.getMessageCount(sessionId)
    const blockStatus = await this.conversationLimiter.isBlocked(context.clientIp)
    const trigger = blockStatus.blocked ? 'block_interrupt' : 'engagement'

    const contactInfo: ContactInfo = {
      email,
      name: options.name,
      message: options.message,
      sessionId,
      deviceId: context.deviceId,
      clientIp: context.clientIp,
      messageCount,
      collectedAt: new Date().toISOString(),
      trigger
    }

    await this.contactService.saveContact(contactInfo)

    // 차단 중이었다면 해제
    if (blockStatus.blocked) {
      await this.conversationLimiter.unblockIp(context.clientIp)
      console.log(`IP unblocked after contact collection: ${context.clientIp}`)
    }

    return {
      success: true,
      message: `감사합니다! ${options.name || ''}님, dwkim이 24시간 내로 ${email}로 연락드릴게요!`
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Factory Function (DI 패턴)
// ─────────────────────────────────────────────────────────────

/**
 * ChatService 인스턴스 생성 및 초기화
 * 싱글턴 대신 DI 패턴 사용 - 라우트에서 인스턴스를 직접 관리
 */
export async function createChatService(
  conversationStore: ConversationStore,
  conversationLimiter: ConversationLimiter,
  contactService: ContactService
): Promise<ChatService> {
  const service = new ChatService(conversationStore, conversationLimiter, contactService)
  await service.initialize()
  return service
}
