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

import { type UIMessage, useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type BlogContext,
  type ChatState,
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
  onFinish?: (message: UIMessage) => void
}

export interface UsePersonaChatReturn {
  // AI SDK useChat 기본 반환값
  messages: UIMessage[]
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

  // Input state (AI SDK v6: 직접 관리)
  const [input, setInput] = useState('')

  // Device ID (클라이언트 사이드에서만)
  const deviceIdRef = useRef<string>('')

  useEffect(() => {
    deviceIdRef.current = getOrCreateDeviceId()
  }, [])

  // Transport 설정 (memoized)
  // AI SDK messages → persona-api 형식으로 변환
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: getChatStreamUrl(),
      headers: {
        'x-device-id': deviceIdRef.current || getOrCreateDeviceId()
      },
      // AI SDK v6: 서버로 보낼 body 형식 커스터마이징
      prepareSendMessagesRequest: ({ messages }) => {
        // 마지막 메시지 (사용자 입력)
        const lastMessage = messages[messages.length - 1]
        const messageText =
          lastMessage?.parts
            ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('') ?? ''

        // 이전 대화 히스토리 (마지막 제외)
        const conversationHistory = messages.slice(0, -1).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content:
            m.parts
              ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map((p) => p.text)
              .join('') ?? ''
        }))

        return {
          body: {
            message: messageText,
            sessionId: chatState.sessionId ?? undefined,
            conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
            ...(initialContext && {
              blogContext: {
                title: initialContext.title,
                slug: initialContext.slug
              }
            })
          }
        }
      }
    })
  }, [initialContext, chatState.sessionId])

  // Vercel AI SDK useChat with onData callback (v6 idiomatic pattern)
  // onData handles all data parts as they stream in, including transient parts
  const chat = useChat({
    transport,
    // AI SDK v6: onData callback for handling all data parts (transient + persistent)
    // 서버에서 { type: 'data-xxx', data: {...} } 형식으로 전송
    onData: (dataPart) => {
      const part = dataPart as { type: string; data?: Record<string, unknown> }
      const data = part.data || {}

      switch (part.type) {
        // Transient parts (UI 상태만, 메시지에 저장 안 됨)
        case 'data-session':
          setChatState((prev) => ({ ...prev, sessionId: data.sessionId as string }))
          break

        case 'data-progress':
          setChatState((prev) => ({ ...prev, progress: data.items as ProgressItem[] }))
          break

        case 'data-escalation':
          setChatState((prev) => ({
            ...prev,
            escalation: {
              reason: data.reason as string,
              uncertainty: data.uncertainty as number
            }
          }))
          break

        case 'data-done':
          setChatState((prev) => ({
            ...prev,
            metadata: data.metadata as DoneMetadata,
            progress: [] // 완료 시 progress 초기화
          }))
          break

        case 'data-error':
          console.error('[usePersonaChat] API Error:', data.error)
          break

        // Persistent parts (메시지에도 저장됨, 상태로도 관리)
        case 'data-sources':
          setChatState((prev) => ({ ...prev, sources: data.sources as Document[] }))
          break

        case 'data-clarification':
          setChatState((prev) => ({
            ...prev,
            suggestedQuestions: data.suggestedQuestions as string[],
            suggestionType: 'clarification'
          }))
          break

        case 'data-followup':
          setChatState((prev) => ({
            ...prev,
            suggestedQuestions: data.suggestedQuestions as string[],
            suggestionType: 'followup'
          }))
          break
      }
    },
    onError: (error) => {
      console.error('[usePersonaChat] Error:', error)
      onError?.(error)
    },
    onFinish: ({ message }) => {
      onFinish?.(message)
    }
  })

  // Input change handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value)
    },
    []
  )

  // Submit handler
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim()) return

      // 응답 시작 시 이전 상태 초기화
      setChatState((prev) => ({
        ...prev,
        sources: [],
        progress: [],
        suggestedQuestions: [],
        suggestionType: null,
        escalation: null
      }))

      chat.sendMessage({ text: input })
      setInput('')
    },
    [input, chat]
  )

  // 채팅 초기화
  const clearChat = useCallback(() => {
    chat.setMessages([])
    setChatState(initialChatState)
    setInput('')
  }, [chat])

  // 질문 바로 보내기 (suggested question 클릭 시)
  const askQuestion = useCallback((question: string) => {
    setInput(question)
    // 다음 틱에서 submit
    setTimeout(() => {
      const form = document.querySelector('form[data-chat-form]') as HTMLFormElement
      if (form) {
        form.requestSubmit()
      }
    }, 0)
  }, [])

  return {
    // AI SDK 기본
    messages: chat.messages,
    input,
    isLoading: chat.status === 'streaming' || chat.status === 'submitted',
    error: chat.error,
    handleInputChange,
    handleSubmit,
    setInput,
    reload: chat.regenerate,
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
