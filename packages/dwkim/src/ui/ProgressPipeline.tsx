import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import type { ProgressItem } from '../utils/personaApiClient.js'
import { theme } from './theme.js'

interface Props {
  items: ProgressItem[]
  hidden?: boolean
}

export function ProgressPipeline({ items, hidden }: Props) {
  if (items.length === 0 || hidden) return null

  return (
    <Box flexDirection="column" marginY={1} marginLeft={2}>
      {items.map((item) => (
        <Box key={item.id}>
          {item.status === 'in_progress' ? (
            <Text color={theme.lavender}>
              <Spinner type="dots" /> {item.label}
              {item.detail ? <Text color={theme.muted}> — {item.detail}</Text> : null}
            </Text>
          ) : (
            <Text
              color={item.status === 'completed' ? theme.success : theme.muted}
              dimColor={item.status === 'pending'}
            >
              {item.status === 'completed' ? '✓' : '○'} {item.label}
              {item.status === 'completed' && item.detail ? (
                <Text color={theme.muted}> — {item.detail}</Text>
              ) : null}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  )
}
