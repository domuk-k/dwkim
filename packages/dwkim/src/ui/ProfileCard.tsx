import { Box, Text } from 'ink'
import { profile } from './data.js'
import { theme } from './theme.js'

// 웰컴 배너
export function ProfileBanner() {
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box>
        <Text bold color={theme.lavender}>
          {profile.name}
        </Text>
        <Text color={theme.muted}> · </Text>
        <Text color={theme.subtext}>{profile.title}</Text>
      </Box>
      <Box>
        <Text color={theme.muted}>{profile.bio}</Text>
      </Box>

      <Box marginTop={1}>
        <Text italic color={theme.success}>
          "{profile.quote}"
        </Text>
      </Box>
    </Box>
  )
}
