/**
 * ChatPanel Component
 *
 * 채팅 패널 컨테이너 (헤더 + 컨텐츠 영역)
 */

import type { ReactNode } from 'react'

interface ChatPanelProps {
  children: ReactNode
  onClose: () => void
  title?: string
  subtitle?: string
}

export function ChatPanel({
  children,
  onClose,
  title = '김동욱에게 물어보세요',
  subtitle = 'AI 기반 개인 에이전트'
}: ChatPanelProps) {
  return (
    <div className="chat-panel" role="dialog" aria-label="채팅 패널">
      <header className="chat-header">
        <div>
          <h2 className="chat-header-title">{title}</h2>
          <p className="chat-header-subtitle">{subtitle}</p>
        </div>
        <button
          type="button"
          className="chat-close-button"
          onClick={onClose}
          aria-label="채팅 닫기"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6L18 18" />
          </svg>
        </button>
      </header>
      {children}
    </div>
  )
}
