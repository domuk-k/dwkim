/**
 * SuggestedQuestions Component
 *
 * 클릭 가능한 추천 질문 칩
 */

interface SuggestedQuestionsProps {
  questions: string[]
  type: 'clarification' | 'followup' | null
  onSelect: (question: string) => void
  disabled?: boolean
}

const TYPE_LABELS = {
  clarification: '혹시 이런 질문이신가요?',
  followup: '이어서 물어보세요'
}

export function SuggestedQuestions({
  questions,
  type,
  onSelect,
  disabled = false
}: SuggestedQuestionsProps) {
  if (questions.length === 0 || !type) {
    return null
  }

  return (
    <div className="chat-suggestions">
      <p className="chat-suggestions-label">{TYPE_LABELS[type]}</p>
      <div className="chat-suggestions-list">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            className="chat-suggestion-button"
            onClick={() => onSelect(question)}
            disabled={disabled}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}
