/**
 * usePersonaChat Hook
 *
 * Vercel AI SDK useChat 래퍼 (v6 idiomatic patterns)
 * - persona-api v2 엔드포인트 연동
 * - onData 콜백으로 transient/persistent 데이터 파트 처리
 * - 블로그 컨텍스트 주입
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data
 */

import { type Message, useChat } from '@ai-sdk/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type BlogContext,
  type ChatState,
  type CustomDataPart,
  type Document,
  type DoneMetadata,
  initialChatState,
  type ProgressItem
} from '../types'
import { getChatStreamUrl } from '../utils/api'
import { getOrCreateDeviceId } from '../utils/deviceId'

export interface UsePersonaChatOptions {
  initialContext?: BlogContext | null
  onError?: (error: Error) => void
  onFinish?: (message: Message) => void
}

export interface UsePersonaChatReturn {
  // AI SDK useChat 기본 반환값
  messages: Message[]
  input: string
  isLoading: boolean
  error: Error | undefined
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent) => void
  setInput: (value: string) => void
  reload: () => void
  stop: () => void

  // 커스텀 상태
  sessionId: string | null
  sources: Document[]
  progress: ProgressItem[]
  suggestedQuestions: string[]
  suggestionType: 'clarification' | 'followup' | null
  metadata: DoneMetadata | null
  escalation: { reason: string; uncertainty: number } | null

  // 유틸리티
  clearChat: () => void
  askQuestion: (question: string) => void
}

/**
 * Persona Chat 훅
 */
export function usePersonaChat(options: UsePersonaChatOptions = {}): UsePersonaChatReturn {
  const { initialContext, onError, onFinish } = options

  // 커스텀 상태
  const [chatState, setChatState] = useState<ChatState>(initialChatState)

  // Device ID (클라이언트 사이드에서만)
  const deviceIdRef = useRef<string>('')

  useEffect(() => {
    deviceIdRef.current = getOrCreateDeviceId()
  }, [])

  // Vercel AI SDK useChat with onData callback (v6 idiomatic pattern)
  // onData handles all data parts as they stream in, including transient parts
  const chat = useChat({
    api: getChatStreamUrl(),
    streamProtocol: 'data',
    headers: {
      'x-device-id': deviceIdRef.current || getOrCreateDeviceId()
    },
    body: initialContext
      ? {
          blogContext: {
            title: initialContext.title,
            slug: initialContext.slug
          }
        }
      : undefined,
    // AI SDK v6: onData callback for handling all data parts (transient + persistent)
    onData: (dataPart) => {
      const part = dataPart as CustomDataPart
      switch (part.type) {
        // Transient parts (UI 상태만, 메시지에 저장 안 됨)
        case 'data-session':
          setChatState((prev) => ({ ...prev, sessionId: part.sessionId }))
          break

        case 'data-progress':
          setChatState((prev) => ({ ...prev, progress: part.items }))
          break

        case 'data-escalation':
          setChatState((prev) => ({
            ...prev,
            escalation: {
              reason: part.reason,
              uncertainty: part.uncertainty
            }
          }))
          break

        case 'data-done':
          setChatState((prev) => ({
            ...prev,
            metadata: part.metadata,
            progress: [] // 완료 시 progress 초기화
          }))
          break

        case 'data-error':
          console.error('[usePersonaChat] API Error:', part.error)
          break

        // Persistent parts (메시지에도 저장됨, 상태로도 관리)
        case 'data-sources':
          setChatState((prev) => ({ ...prev, sources: part.sources }))
          break

        case 'data-clarification':
          setChatState((prev) => ({
            ...prev,
            suggestedQuestions: part.suggestedQuestions,
            suggestionType: 'clarification'
          }))
          break

        case 'data-followup':
          setChatState((prev) => ({
            ...prev,
            suggestedQuestions: part.suggestedQuestions,
            suggestionType: 'followup'
          }))
          break
      }
    },
    onError: (error) => {
      console.error('[usePersonaChat] Error:', error)
      onError?.(error)
    },
    onFinish: (message) => {
      onFinish?.(message)
    },
    // 응답 시작 시 이전 상태 초기화
    onResponse: async (_response) => {
      setChatState((prev) => ({
        ...prev,
        sources: [],
        progress: [],
        suggestedQuestions: [],
        suggestionType: null,
        escalation: null
      }))
    }
  })

  // 채팅 초기화
  const clearChat = useCallback(() => {
    chat.setMessages([])
    setChatState(initialChatState)
  }, [chat])

  // 질문 바로 보내기 (suggested question 클릭 시)
  const askQuestion = useCallback(
    (question: string) => {
      chat.setInput(question)
      // 다음 틱에서 submit
      setTimeout(() => {
        const form = document.querySelector('form[data-chat-form]') as HTMLFormElement
        if (form) {
          form.requestSubmit()
        }
      }, 0)
    },
    [chat]
  )

  return {
    // AI SDK 기본
    messages: chat.messages,
    input: chat.input,
    isLoading: chat.isLoading,
    error: chat.error,
    handleInputChange: chat.handleInputChange,
    handleSubmit: chat.handleSubmit,
    setInput: chat.setInput,
    reload: chat.reload,
    stop: chat.stop,

    // 커스텀 상태
    sessionId: chatState.sessionId,
    sources: chatState.sources,
    progress: chatState.progress,
    suggestedQuestions: chatState.suggestedQuestions,
    suggestionType: chatState.suggestionType,
    metadata: chatState.metadata,
    escalation: chatState.escalation,

    // 유틸리티
    clearChat,
    askQuestion
  }
}
