/**
 * MessageBubble Component
 *
 * 개별 메시지 버블 렌더링 (DOMPurify로 XSS 방지)
 */

import type { UIMessage } from '@ai-sdk/react'
import DOMPurify from 'dompurify'

interface MessageBubbleProps {
  message: UIMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  // AI SDK v6: message.parts에서 텍스트 추출
  const textContent =
    message.parts
      ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('') ?? ''

  const sanitizedContent = DOMPurify.sanitize(formatMessage(textContent))

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div
        className="chat-bubble"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurify로 sanitize됨
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </div>
  )
}

/**
 * 간단한 마크다운 변환 (bold, italic, code, links)
 */
function formatMessage(content: string): string {
  return (
    content
      // 코드 블록 (```)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // 인라인 코드 (`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold (**)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic (*)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br />')
  )
}
