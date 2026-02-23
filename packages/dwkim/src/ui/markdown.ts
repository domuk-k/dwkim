import { Markdown } from '@mariozechner/pi-tui'
import chalk from 'chalk'
import { c } from './theme.js'

export const markdownTheme = {
  heading: (s: string) => c.primary.bold(s),
  link: c.info,
  linkUrl: (s: string) => c.info.underline(s),
  code: c.lavender,
  codeBlock: c.lavender,
  codeBlockBorder: c.surface,
  quote: c.muted,
  quoteBorder: c.surface,
  hr: c.surface,
  listBullet: c.muted,
  bold: chalk.bold,
  italic: chalk.italic,
  strikethrough: (s: string) => c.muted(chalk.strikethrough(s)),
  underline: chalk.underline
}

/**
 * Render markdown to ANSI-styled terminal string
 * Uses pi-tui native Markdown component (replaces marked + marked-terminal)
 */
export function renderMarkdown(content: string, width = 78): string {
  if (!content) return ''
  try {
    const md = new Markdown(content, 0, 0, markdownTheme)
    const lines = md.render(width)
    return lines.join('\n').replace(/\n+$/, '')
  } catch {
    return content
  }
}
