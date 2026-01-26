import chalk from 'chalk'
import { Text } from 'ink'
import { marked } from 'marked'
import { markedTerminal } from 'marked-terminal'
import { useMemo } from 'react'

import { theme } from './theme.js'

interface Props {
  children: string
  /** 기본 텍스트 색상 (marked-terminal이 오버라이드할 수 있음) */
  color?: string
}

// hex 색상을 chalk 함수로 변환
const hex = (color: string) => chalk.hex(color)

// 인라인 인용 패턴: [이력서], [100문100답], [블로그: 제목], [지식: 제목] 등
const CITATION_PATTERN = /\[(이력서|100문100답|블로그:\s*[^\]]+|[^\]]{2,30})\]/g
const citationStyle = chalk.hex(theme.muted).dim

// marked-terminal 설정 (marked v12 새 API)
marked.use(
  markedTerminal({
    // 색상은 chalk 함수로 전달해야 함
    code: hex(theme.lavender),
    blockquote: hex(theme.muted),
    html: hex(theme.muted),
    heading: hex(theme.primary).bold,
    firstHeading: hex(theme.primary).bold,
    hr: hex(theme.surface),
    listitem: hex(theme.text),
    paragraph: hex(theme.text),
    // 핵심: strong/em은 반드시 함수여야 함
    strong: chalk.bold,
    em: chalk.italic,
    codespan: hex(theme.lavender),
    del: hex(theme.muted).strikethrough,
    link: hex(theme.info),
    href: hex(theme.info).underline,
    // 옵션
    showSectionPrefix: false,
    reflowText: true,
    width: 80,
    emoji: true,
    tab: 2
  })
)

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
      let result = marked.parse(children, { async: false }) as string
      // 끝의 불필요한 줄바꿈 제거
      result = result.replace(/\n+$/, '')
      // 인라인 인용 스타일링: [이력서] → dim muted 색상
      result = result.replace(CITATION_PATTERN, (match) => citationStyle(match))
      return result
    } catch {
      // 파싱 실패 시 원본 반환
      return children
    }
  }, [children])

  return <Text color={color}>{rendered}</Text>
}
