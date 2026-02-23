import { Text } from '@mariozechner/pi-tui'
import type { Message } from '../state/types.js'
import { renderMarkdown } from '../ui/markdown.js'
import { c } from '../ui/theme.js'

export function renderMessage(msg: Message): string {
  switch (msg.role) {
    case 'user':
      return `\n${c.lavender(`> ${msg.content}`)}`
    case 'assistant': {
      const lines: string[] = ['']
      lines.push(`  ${renderMarkdown(msg.content)}`)

      // Consolidated metadata line
      const meta: string[] = []
      if (msg.sources && msg.sources.length > 0) {
        meta.push(`${msg.sources.length} sources · s 상세`)
      }
      if (msg.processingTime && msg.processingTime > 0) {
        meta.push(`${msg.processingTime}ms`)
      }
      if (meta.length > 0) {
        lines.push(`  ${c.dim(c.muted(meta.join(' · ')))}`)
      }
      return lines.join('\n')
    }
    case 'banner': {
      const [header, bio] = msg.content.split('\n')
      return [`${c.lavender.bold(header)}`, c.muted(bio || '')].join('\n')
    }
    case 'system':
      return `\n  ${c.dim(c.muted(msg.content))}`
    default:
      return ''
  }
}

export function createChatHistoryText(): Text {
  return new Text('', 1, 0)
}

export function renderAllMessages(messages: Message[]): string {
  if (messages.length === 0) return ''
  return messages.map(renderMessage).join('\n')
}
