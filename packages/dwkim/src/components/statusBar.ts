import { CancellableLoader, Text, type TUI } from '@mariozechner/pi-tui'
import type { LoadingState } from '../state/types.js'
import { c } from '../ui/theme.js'

/**
 * Status indicator using pi-tui's CancellableLoader.
 * Shows spinner + message during loading, with tool call details.
 */
export function createStatusLoader(tui: TUI): CancellableLoader {
  return new CancellableLoader(tui, c.lavender, c.info, '연결 중...')
}

/**
 * Render tool call details as a Text component below the loader.
 */
export function createToolCallsView(): Text {
  return new Text('', 2, 0)
}

export function updateToolCallsView(view: Text, loadingState: LoadingState | null): void {
  if (!loadingState?.toolCalls || loadingState.toolCalls.length === 0) {
    view.setText('')
    return
  }

  const lines = loadingState.toolCalls.map((tool) => {
    const icon =
      tool.phase === 'completed'
        ? c.success('✓')
        : tool.phase === 'error'
          ? c.error('✗')
          : c.muted('○')
    const name =
      tool.phase === 'completed' ? c.success(tool.displayName) : c.muted(tool.displayName)
    const query = tool.query ? c.dim(` "${tool.query}"`) : ''
    const count = tool.resultCount !== undefined ? c.dim(` → ${tool.resultCount}건`) : ''
    return `${icon} ${name}${query}${count}`
  })

  view.setText(lines.join('\n'))
}
