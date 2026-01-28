/**
 * ChatButton Component
 *
 * 플로팅 채팅 버튼 (FAB)
 */

interface ChatButtonProps {
  isOpen: boolean
  onClick: () => void
}

export function ChatButton({ isOpen, onClick }: ChatButtonProps) {
  return (
    <button
      type="button"
      className={`chat-button ${isOpen ? 'open' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? '채팅 닫기' : '채팅 열기'}
      aria-expanded={isOpen}
    >
      {isOpen ? (
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
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  )
}
