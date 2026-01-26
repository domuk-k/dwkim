import { Box, Text } from 'ink'
import React from 'react'
import type { StreamEvent } from '../utils/personaApiClient.js'
import { icons } from './data.js'
import { MarkdownText } from './MarkdownText.js'
import { ProfileBanner } from './ProfileCard.js'
import { theme } from './theme.js'

type SourcesEvent = Extract<StreamEvent, { type: 'sources' }>

export interface Message {
  id: number
  role: 'user' | 'assistant' | 'system' | 'banner'
  content: string
  sources?: SourcesEvent['sources']
  processingTime?: number
  shouldSuggestContact?: boolean
}

export const MessageBubble = React.memo(function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'banner') {
    return <ProfileBanner />
  }

  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box marginLeft={isUser ? 0 : 2}>
        {isUser && <Text color={theme.lavender}>{icons.arrow} </Text>}
        {message.role === 'assistant' ? (
          <MarkdownText color={theme.text}>{message.content}</MarkdownText>
        ) : (
          <Text color={isUser ? theme.lavender : theme.muted} dimColor={isSystem}>
            {message.content}
          </Text>
        )}
      </Box>

      {message.sources && message.sources.length > 0 && (
        <Box marginLeft={4} marginTop={0}>
          <Text color={theme.muted} dimColor>
            {icons.book} {message.sources.length}개 문서 참조
          </Text>
        </Box>
      )}

      {message.processingTime !== undefined && message.processingTime > 0 && (
        <Box marginLeft={4}>
          <Text color={theme.muted} dimColor>
            {icons.clock} {message.processingTime}ms
          </Text>
        </Box>
      )}
    </Box>
  )
})
