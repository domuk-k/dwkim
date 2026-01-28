/**
 * ChatWidget Component
 *
 * 플로팅 채팅 위젯 (버튼 + 패널)
 * 모든 하위 컴포넌트를 조합하는 루트 컴포넌트
 */

import { ChatProvider } from '../contexts/ChatContext'
import { useBlogContext } from '../hooks/useBlogContext'
import { useChatVisibility } from '../hooks/useChatVisibility'
import { usePersonaChat } from '../hooks/usePersonaChat'
import { ChatButton } from './ChatButton'
import { ChatInput } from './ChatInput'
import { ChatPanel } from './ChatPanel'
import { MessageList } from './MessageList'
import { SourcesPanel } from './SourcesPanel'
import { SuggestedQuestions } from './SuggestedQuestions'

import '../chat.css'

export function ChatWidget() {
  const blogContext = useBlogContext()

  return (
    <ChatProvider blogContext={blogContext}>
      <ChatWidgetInner />
    </ChatProvider>
  )
}

function ChatWidgetInner() {
  const blogContext = useBlogContext()
  const { isOpen, open, close } = useChatVisibility()

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
  } = usePersonaChat({
    initialContext: blogContext
  })

  return (
    <>
      {/* Backdrop - 클릭 시 패널 닫기 */}
      {isOpen && (
        <button
          type="button"
          className="chat-backdrop"
          onClick={close}
          onKeyDown={(e) => e.key === 'Escape' && close()}
          aria-label="채팅 닫기"
        />
      )}

      {/* Chat Panel */}
      {isOpen && (
        <ChatPanel onClose={close}>
          <MessageList
            messages={messages}
            isLoading={isLoading}
            progress={progress}
            error={error}
            onRetry={reload}
          />

          {/* Sources - 마지막 응답에 대한 소스 */}
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
        </ChatPanel>
      )}

      {/* Floating Button */}
      <ChatButton isOpen={isOpen} onClick={isOpen ? close : open} />
    </>
  )
}
