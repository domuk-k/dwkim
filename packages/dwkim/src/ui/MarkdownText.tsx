import React, { useMemo } from 'react';
import { Text } from 'ink';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { theme } from './theme.js';

interface Props {
  children: string;
  /** 기본 텍스트 색상 (marked-terminal이 오버라이드할 수 있음) */
  color?: string;
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
    tab: 2,
  }),
});

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
    if (!children) return '';

    try {
      // marked-terminal은 ANSI escape code가 포함된 문자열을 반환
      const result = marked.parse(children, { async: false }) as string;
      // 끝의 불필요한 줄바꿈 제거
      return result.replace(/\n+$/, '');
    } catch {
      // 파싱 실패 시 원본 반환
      return children;
    }
  }, [children]);

  return <Text color={color}>{rendered}</Text>;
}

