import { Box, Text } from 'ink'
import type { StreamEvent } from '../utils/personaApiClient.js'
import { theme } from './theme.js'

type SourcesEvent = Extract<StreamEvent, { type: 'sources' }>

interface Props {
  sources: SourcesEvent['sources']
}

const TYPE_LABELS: Record<string, string> = {
  resume: '이력서',
  faq: '100문100답',
  experience: '경험',
  thoughts: '생각',
  about: '소개',
  knowledge: '지식',
  blog: '블로그'
}

export function SourcesPanel({ sources }: Props) {
  if (!sources || sources.length === 0) return null

  return (
    <Box flexDirection="column" marginLeft={4} marginTop={0}>
      <Text color={theme.surface}>{'─'.repeat(40)}</Text>
      {sources.map((source, idx) => {
        const title = source.metadata.title || source.id
        const typeLabel = TYPE_LABELS[source.metadata.type] || source.metadata.type
        return (
          <Box key={source.id} marginLeft={1}>
            <Text color={theme.muted} dimColor>
              {idx + 1}. [{typeLabel}] {title}
            </Text>
          </Box>
        )
      })}
      <Text color={theme.muted} dimColor>
        s 키로 접기
      </Text>
    </Box>
  )
}
