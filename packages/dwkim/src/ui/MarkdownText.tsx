import { Text } from 'ink'
import { marked } from 'marked'
import { useMemo } from 'react'

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const TerminalRenderer = require('marked-terminal').default

import { theme } from './theme.js'

interface Props {
  children: string
  /** 기본 텍스트 색상 (marked-terminal이 오버라이드할 수 있음) */
  color?: string
}

// marked-terminal 설정 (marked@12 API)
marked.setOptions({
  renderer: new TerminalRenderer({
    // 색상 커스터마이징 (Catppuccin 테마와 조화)
    code: theme.lavender,
    blockquote: theme.muted,
    html: theme.muted,
    heading: theme.primary,
    firstHeading: theme.primary,
    hr: theme.surface,
    listitem: theme.text,
    strong: theme.text,
    em: theme.subtext,
    codespan: theme.lavender,
    del: theme.muted,
    link: theme.info,
    href: theme.info,
    // 추가 옵션
    showSectionPrefix: false,
    reflowText: true,
    width: 80,
    // 이모지 지원
    emoji: true,
    // 탭 크기
    tab: 2
  })
})

/**
 * Markdown renderer for Ink using marked + marked-terminal
 *
 * Supports:
 * - **bold**, *italic*, `code`
 * - Lists (- item, * item, 1. item)
 * - Headers (# ## ###)
 * - Code blocks
 * - Blockquotes (>)
 * - Links [text](url)
 * - Horizontal rules (---)
 */
export function MarkdownText({ children, color }: Props) {
  const rendered = useMemo(() => {
    if (!children) return ''

    try {
      // marked-terminal은 ANSI escape code가 포함된 문자열을 반환
      const result = marked.parse(children, { async: false }) as string
      // 끝의 불필요한 줄바꿈 제거
      return result.replace(/\n+$/, '')
    } catch {
      // 파싱 실패 시 원본 반환
      return children
    }
  }, [children])

  return <Text color={color}>{rendered}</Text>
}

/**
 * 기존 심플 버전 (fallback용 또는 가벼운 사용)
 * marked-terminal 없이 기본 스타일만 적용
 */
export function SimpleMarkdownText({ children, color }: { children: string; color?: string }) {
  const segments = parseSimpleMarkdown(children)

  return (
    <Text>
      {segments.map((seg, i) => (
        <Text
          key={i}
          bold={seg.bold}
          italic={seg.italic}
          color={seg.code ? theme.lavender : color}
          backgroundColor={seg.code ? theme.surface : undefined}
        >
          {seg.code ? ` ${seg.text} ` : seg.text}
        </Text>
      ))}
    </Text>
  )
}

interface TextSegment {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

function parseSimpleMarkdown(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) })
    }

    const matched = match[0]

    if (matched.startsWith('**') && matched.endsWith('**')) {
      segments.push({ text: matched.slice(2, -2), bold: true })
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      segments.push({ text: matched.slice(1, -1), italic: true })
    } else if (matched.startsWith('`') && matched.endsWith('`')) {
      segments.push({ text: matched.slice(1, -1), code: true })
    }

    lastIndex = match.index + matched.length
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ text }]
}
