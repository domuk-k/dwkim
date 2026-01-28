/**
 * ProgressIndicator Component
 *
 * 진행 상태 표시 (검색 중, 분석 중 등)
 */

import type { ProgressItem } from '../types'

interface ProgressIndicatorProps {
  items: ProgressItem[]
}

export function ProgressIndicator({ items }: ProgressIndicatorProps) {
  return (
    <div className="chat-progress">
      {items.map((item) => (
        <div key={item.label} className={`chat-progress-item ${item.status}`}>
          {item.status === 'completed' && (
            <svg
              className="chat-progress-icon completed"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
          {item.status === 'in_progress' && (
            <svg
              className="chat-progress-icon in_progress"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
          {item.status === 'pending' && (
            <svg
              className="chat-progress-icon pending"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
