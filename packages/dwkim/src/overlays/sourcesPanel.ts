import { Text } from '@mariozechner/pi-tui'
import { c } from '../ui/theme.js'
import type { StreamEvent } from '../utils/personaApiClient.js'

type SourcesEvent = Extract<StreamEvent, { type: 'sources' }>

const TYPE_LABELS: Record<string, string> = {
  resume: '이력서',
  faq: '100문100답',
  experience: '경험',
  thoughts: '생각',
  about: '소개',
  knowledge: '지식',
  blog: '블로그'
}

export function createSourcesPanel(): Text {
  return new Text('', 2, 0)
}

export function updateSourcesPanel(view: Text, sources: SourcesEvent['sources'] | undefined): void {
  if (!sources || sources.length === 0) {
    view.setText('')
    return
  }

  const border = c.surface('─'.repeat(30))
  const lines: string[] = []

  lines.push(border)
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    const title = source.metadata.title || source.id
    const typeLabel = TYPE_LABELS[source.metadata.type] || source.metadata.type
    lines.push(c.dim(c.muted(`  ${i + 1}. [${typeLabel}] ${title}`)))
  }
  lines.push(border)
  lines.push(c.dim(c.muted('  s 접기')))

  view.setText(lines.join('\n'))
}
