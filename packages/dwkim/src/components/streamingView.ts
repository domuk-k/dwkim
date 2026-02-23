import { Text } from '@mariozechner/pi-tui'
import { renderMarkdown } from '../ui/markdown.js'

/**
 * Streaming response view.
 * Uses setText() for incremental content updates — pi-tui only re-renders changed lines.
 */
export function createStreamingView(): Text {
  return new Text('', 2, 0)
}

export function updateStreamingContent(view: Text, content: string): void {
  if (!content) {
    view.setText('')
    return
  }
  view.setText(renderMarkdown(content))
}
