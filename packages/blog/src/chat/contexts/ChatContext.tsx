/**
 * ChatContext
 *
 * Chat UI 전역 상태 제공
 * - 블로그 컨텍스트
 * - API 설정
 */

import { createContext, type ReactNode, useContext } from 'react'
import type { BlogContext } from '../types'
import { getApiUrl } from '../utils/api'

interface ChatContextValue {
  blogContext: BlogContext | null
  apiEndpoint: string
}

const ChatContext = createContext<ChatContextValue | null>(null)

interface ChatProviderProps {
  children: ReactNode
  blogContext?: BlogContext | null
}

export function ChatProvider({ children, blogContext = null }: ChatProviderProps) {
  const value: ChatContextValue = {
    blogContext,
    apiEndpoint: getApiUrl()
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
