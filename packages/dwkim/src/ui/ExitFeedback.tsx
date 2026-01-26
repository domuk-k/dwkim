import { Box, Text } from 'ink'
import { icons } from './data.js'
import { theme } from './theme.js'

export function ExitFeedback() {
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box
        borderStyle="round"
        borderColor={theme.lavender}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text color={theme.lavender} bold>
          {icons.chat} 떠나시기 전에...
        </Text>
        <Box marginTop={1}>
          <Text color={theme.subtext}>오늘 대화가 도움이 됐나요?</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.success}>[1]</Text>
          <Text color={theme.subtext}> 매우 도움됨 </Text>
          <Text color={theme.warning}>[2]</Text>
          <Text color={theme.subtext}> 조금 도움됨 </Text>
          <Text color={theme.error}>[3]</Text>
          <Text color={theme.subtext}> 별로... </Text>
          <Text color={theme.muted}>[d]</Text>
          <Text color={theme.subtext}> 스킵</Text>
        </Box>
      </Box>
    </Box>
  )
}
