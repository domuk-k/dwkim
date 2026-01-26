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

// 인라인 인용 제거: [이력서], [100문100답] 등 (SourcesPanel에서 이미 표시)
// 앞 공백도 함께 제거하여 "있어요 [이력서]." → "있어요." 로 정리
const CITATION_PATTERN =
  /\s*\[(이력서|100문100답|블로그:\s*[^\]]+|지식:\s*[^\]]+|경험:\s*[^\]]+|소개:\s*[^\]]+)\]/g

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

// TUI: 링크 텍스트만 스타일 유지, URL은 표시하지 않음 (클릭 불가)
// marked-terminal이 classic 시그니처 (href, title, text)로 전달
marked.use({
  renderer: {
    link(...args: unknown[]) {
      const text = args[2] as string
      return hex(theme.info).underline(text)
    }
  }
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
      let result = marked.parse(children, { async: false }) as string
      // 끝의 불필요한 줄바꿈 제거
      result = result.replace(/\n+$/, '')
      // 인라인 인용 제거: [이력서] 등 (SourcesPanel에서 이미 표시)
      result = result.replace(CITATION_PATTERN, '')
      return result
    } catch {
      // 파싱 실패 시 원본 반환
      return children
    }
  }, [children])

  return <Text color={color}>{rendered}</Text>
}
