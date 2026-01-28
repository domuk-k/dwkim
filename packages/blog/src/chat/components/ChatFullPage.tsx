/**
 * ChatFullPage Component
 *
 * 전체 페이지 채팅 인터페이스 (/chat 페이지용)
 */

import { ChatProvider } from '../contexts/ChatContext'
import { usePersonaChat } from '../hooks/usePersonaChat'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { SourcesPanel } from './SourcesPanel'
import { SuggestedQuestions } from './SuggestedQuestions'

import '../chat.css'

export function ChatFullPage() {
  return (
    <ChatProvider>
      <ChatFullPageInner />
    </ChatProvider>
  )
}

function ChatFullPageInner() {
  const {
    messages,
    input,
    isLoading,
    error,
    handleInputChange,
    handleSubmit,
    reload,
    sources,
    progress,
    suggestedQuestions,
    suggestionType,
    askQuestion
  } = usePersonaChat()

  return (
    <div className="chat-fullpage">
      <header className="chat-header">
        <div>
          <h1 className="chat-header-title">김동욱에게 물어보세요</h1>
          <p className="chat-header-subtitle">AI 기반 개인 에이전트와 대화하세요</p>
        </div>
      </header>

      <MessageList
        messages={messages}
        isLoading={isLoading}
        progress={progress}
        error={error}
        onRetry={reload}
      />

      {/* Sources */}
      {sources.length > 0 && <SourcesPanel sources={sources} />}

      {/* Suggested Questions */}
      <SuggestedQuestions
        questions={suggestedQuestions}
        type={suggestionType}
        onSelect={askQuestion}
        disabled={isLoading}
      />

      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  )
}
