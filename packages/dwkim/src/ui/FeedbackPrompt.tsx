import { Box, Text } from 'ink'
import { theme } from './theme.js'

/**
 * HITL: Response Feedback Prompt (UI Only)
 *
 * Claude Code 스타일 피드백 UI:
 * - 1-3 scale + dismiss
 * - 키보드 입력은 부모 컴포넌트에서 처리
 * - Shift+D: 세션 동안 피드백 비활성화
 *
 * Privacy: 숫자 rating만 수집 (대화 내용, 코드 포함 안함)
 */
export function FeedbackPrompt() {
  return (
    <Box flexDirection="column" marginTop={1} marginLeft={2}>
      <Text color={theme.subtext}>이 답변이 도움이 됐나요?</Text>
      <Text>
        <Text color={theme.success}>[1]</Text>
        <Text color={theme.subtext}> 좋아요 </Text>
        <Text color={theme.warning}>[2]</Text>
        <Text color={theme.subtext}> 그냥 그래요 </Text>
        <Text color={theme.error}>[3]</Text>
        <Text color={theme.subtext}> 별로... </Text>
        <Text color={theme.muted}>[d]</Text>
        <Text color={theme.subtext}> 스킵 </Text>
        <Text color={theme.muted}>[D]</Text>
        <Text color={theme.subtext}> 더 이상 묻지않기</Text>
      </Text>
    </Box>
  )
}
