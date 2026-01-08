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
/**
 * marked-terminal 후처리: 리스트 내부 인라인 마크다운 수동 처리
 * marked-terminal이 리스트 아이템 내부의 **bold**, `code` 등을 처리 못하는 버그 우회
 */
function postProcessMarkdown(text: string): string {
  return (
    text
      // **bold** → ANSI bold (\x1b[1m...\x1b[22m)
      .replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[22m')
      // `code` → ANSI yellow (\x1b[33m...\x1b[39m)
      .replace(/`([^`]+)`/g, '\x1b[33m$1\x1b[39m')
  )
}

export function MarkdownText({ children, color }: Props) {
  const rendered = useMemo(() => {
    if (!children) return ''

    try {
      // marked-terminal은 ANSI escape code가 포함된 문자열을 반환
      const result = marked.parse(children, { async: false }) as string
      // 후처리: 리스트 내부 인라인 마크다운 처리
      const processed = postProcessMarkdown(result)
      // 끝의 불필요한 줄바꿈 제거
      return processed.replace(/\n+$/, '')
    } catch {
      // 파싱 실패 시 원본 반환
      return children
    }
  }, [children])

  return <Text color={color}>{rendered}</Text>
}
