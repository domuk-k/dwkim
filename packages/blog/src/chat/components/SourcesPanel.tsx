/**
 * SourcesPanel Component
 *
 * 참조 문서 표시 (접을 수 있는 패널)
 */

import { useState } from 'react'
import type { Document } from '../types'

interface SourcesPanelProps {
  sources: Document[]
}

const TYPE_LABELS: Record<string, string> = {
  resume: '이력서',
  faq: 'FAQ',
  blog: '블로그',
  knowledge: '지식',
  cogni: '노트',
  post: '게시글'
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (sources.length === 0) {
    return null
  }

  return (
    <div className={`chat-sources ${isOpen ? 'open' : ''}`}>
      <button
        type="button"
        className="chat-sources-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span>참조 문서 {sources.length}개</span>
      </button>

      <div className="chat-sources-list">
        {sources.map((source, index) => (
          <div key={source.id || index} className="chat-source-item">
            <p className="chat-source-title">{source.metadata.title || `문서 ${index + 1}`}</p>
            <span className="chat-source-type">
              {TYPE_LABELS[source.metadata.type] || source.metadata.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
