import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import { theme } from './theme.js'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  showEscalation?: boolean
  escalationReason?: string
}

export function EmailCollector({
  value,
  onChange,
  onSubmit,
  showEscalation,
  escalationReason
}: Props) {
  return (
    <Box flexDirection="column" marginTop={1} paddingX={1}>
      <Box
        borderStyle="round"
        borderColor={showEscalation ? theme.peach : theme.lavender}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text color={showEscalation ? theme.peach : theme.lavender}>
          {showEscalation ? '\u{1F914} ' : '\u{1F4E7} '}
          {showEscalation
            ? escalationReason || '이 질문은 정확한 답변을 위해 직접 연락드리고 싶어요.'
            : '더 깊은 이야기가 필요하신 것 같아요!'}
        </Text>
        <Text color={theme.muted} dimColor>
          이메일 남겨주시면 동욱이 직접 연락드릴게요.
        </Text>
        <Box marginTop={1}>
          <Text color={theme.primary}>이메일: </Text>
          <TextInput
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            placeholder="your@email.com"
          />
        </Box>
        <Box marginTop={1}>
          <Text color={theme.muted} dimColor>
            Enter: 전송 · 빈값 Enter: 넘어가기 · ESC: 다시보지않기
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
