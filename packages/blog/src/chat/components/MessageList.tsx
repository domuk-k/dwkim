/**
 * MessageList Component
 *
 * 스크롤 가능한 메시지 목록
 */

import type { UIMessage } from '@ai-sdk/react'
import { useEffect, useRef } from 'react'
import type { ProgressItem } from '../types'
import { MessageBubble } from './MessageBubble'
import { ProgressIndicator } from './ProgressIndicator'

interface MessageListProps {
  messages: UIMessage[]
  isLoading: boolean
  progress: ProgressItem[]
  error?: Error
  onRetry?: () => void
}

export function MessageList({ messages, isLoading, progress, error, onRetry }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 새 메시지 시 자동 스크롤 - messages/isLoading 변경 시 트리거
  // biome-ignore lint/correctness/useExhaustiveDependencies: 상태 변경 시 스크롤 트리거
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="chat-empty">
        <svg
          className="chat-empty-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p>김동욱에 대해 궁금한 점을 물어보세요</p>
      </div>
    )
  }

  return (
    <div className="chat-messages">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Loading indicator */}
      {isLoading && (!progress || progress.length === 0) && (
        <div className="chat-loading">
          <span className="chat-loading-dot" />
          <span className="chat-loading-dot" />
          <span className="chat-loading-dot" />
        </div>
      )}

      {/* Progress indicator */}
      {progress && progress.length > 0 && <ProgressIndicator items={progress} />}

      {/* Error state */}
      {error && (
        <div className="chat-error">
          <svg
            className="chat-error-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          <span>오류가 발생했습니다. 다시 시도해주세요.</span>
          {onRetry && (
            <button type="button" className="chat-retry-button" onClick={onRetry}>
              다시 시도
            </button>
          )}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
