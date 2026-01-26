import { Box, Text } from 'ink'
import { theme } from './theme.js'

interface Props {
  questions: string[]
  selectedIndex: number
}

export function SuggestedQuestions({ questions, selectedIndex }: Props) {
  if (questions.length === 0) return null

  return (
    <Box flexDirection="column" marginTop={1} marginLeft={2}>
      <Text color={theme.muted} dimColor>
        ? 더 구체적으로 물어보시겠어요?
      </Text>
      {questions.map((q, idx) => (
        <Box key={`suggestion-${idx}`} marginLeft={2}>
          <Text
            color={idx === selectedIndex ? theme.lavender : theme.muted}
            bold={idx === selectedIndex}
          >
            {idx === selectedIndex ? '› ' : '  '}[{idx + 1}] {q}
          </Text>
        </Box>
      ))}
      <Text color={theme.muted} dimColor>
        {'  '}↑↓ 선택 · Enter 질문 · ESC 닫기
      </Text>
    </Box>
  )
}
