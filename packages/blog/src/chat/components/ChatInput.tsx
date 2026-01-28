/**
 * ChatInput Component
 *
 * 자동 리사이즈 텍스트 입력 + 전송 버튼
 */

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef } from 'react'

interface ChatInputProps {
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: FormEvent) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = '김동욱에게 질문해보세요...'
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 자동 높이 조절 - value 변경 시 트리거 (lint에서 경고하지만 의도된 동작)
  // biome-ignore lint/correctness/useExhaustiveDependencies: value 변경 시 높이 재계산 필요
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`
    }
  }, [value])

  // Enter로 전송, Shift+Enter로 줄바꿈
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!disabled && value?.trim()) {
          onSubmit(e as unknown as FormEvent)
        }
      }
    },
    [disabled, value, onSubmit]
  )

  return (
    <form onSubmit={onSubmit} className="chat-input-container" data-chat-form>
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        maxLength={1000}
        aria-label="메시지 입력"
      />
      <button
        type="submit"
        className="chat-send-button"
        disabled={disabled || !value?.trim()}
        aria-label="메시지 전송"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      </button>
    </form>
  )
}
