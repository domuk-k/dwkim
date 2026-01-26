import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { theme } from './theme.js'

interface ToolCallState {
  tool: string
  displayName: string
  icon: string
  phase: 'started' | 'executing' | 'completed' | 'error'
  query?: string
  resultCount?: number
}

interface LoadingState {
  icon: string
  message: string
  toolCalls: ToolCallState[]
}

interface Props {
  status: 'idle' | 'connecting' | 'loading' | 'error'
  loadingState: LoadingState | null
  hasProgress?: boolean
}

export function StatusIndicator({ status, loadingState, hasProgress }: Props) {
  if (status === 'idle' || status === 'error' || hasProgress) return null

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        {status === 'loading' && (
          <Text color={theme.lavender}>
            <Spinner type="dots" />
          </Text>
        )}
        {status === 'connecting' && (
          <Text color={theme.info}>
            <Spinner type="dots" />
          </Text>
        )}
        <Text color={theme.info}>
          {' '}
          {status === 'connecting' ? '연결 중...' : loadingState?.message || '처리 중...'}
        </Text>
      </Box>
      {loadingState?.toolCalls && loadingState.toolCalls.length > 0 && (
        <Box flexDirection="column" marginLeft={2} marginTop={0}>
          {loadingState.toolCalls.map((tool, idx) => (
            <Box key={`${tool.tool}-${idx}`}>
              <Text color={tool.phase === 'completed' ? theme.success : theme.muted}>
                {tool.phase === 'completed' ? '✓' : tool.phase === 'error' ? '✗' : '○'}{' '}
                {tool.displayName}
                {tool.query ? <Text dimColor> "{tool.query}"</Text> : null}
                {tool.resultCount !== undefined ? (
                  <Text dimColor> → {tool.resultCount}건</Text>
                ) : null}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

export type { LoadingState, ToolCallState }
