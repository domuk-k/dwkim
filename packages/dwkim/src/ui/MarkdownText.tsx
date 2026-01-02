import React from 'react';
import { Text } from 'ink';
import { theme } from './theme.js';

interface Props {
  children: string;
  color?: string;
}

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

/**
 * Simple markdown renderer for Ink
 * Supports: **bold**, *italic*, `code`
 */
export function MarkdownText({ children, color }: Props) {
  const segments = parseMarkdown(children);

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
  );
}

function parseMarkdown(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    const matched = match[0];

    if (matched.startsWith('**') && matched.endsWith('**')) {
      segments.push({ text: matched.slice(2, -2), bold: true });
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      segments.push({ text: matched.slice(1, -1), italic: true });
    } else if (matched.startsWith('`') && matched.endsWith('`')) {
      segments.push({ text: matched.slice(1, -1), code: true });
    }

    lastIndex = match.index + matched.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}
