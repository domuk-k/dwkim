import { Text } from '@mariozechner/pi-tui'
import { c } from '../ui/theme.js'
import type { ProgressItem } from '../utils/personaApiClient.js'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const SPINNER_INTERVAL = 80

let spinnerTimer: ReturnType<typeof setInterval> | null = null
let spinnerFrame = 0

export function createProgressView(): Text {
  return new Text('', 2, 0)
}

function renderLines(items: ProgressItem[], frame: string): string {
  return items
    .map((item) => {
      if (item.status === 'in_progress') {
        const detail = item.detail ? c.muted(` — ${item.detail}`) : ''
        return `${c.lavender(frame)} ${c.lavender(item.label)}${detail}`
      }
      const icon = item.status === 'completed' ? c.success('✓') : c.muted('○')
      const label = item.status === 'completed' ? c.success(item.label) : c.dim(c.muted(item.label))
      const detail = item.status === 'completed' && item.detail ? c.muted(` — ${item.detail}`) : ''
      return `${icon} ${label}${detail}`
    })
    .join('\n')
}

export function updateProgressView(view: Text, items: ProgressItem[], hidden: boolean): void {
  stopProgressSpinner()

  if (items.length === 0 || hidden) {
    view.setText('')
    return
  }

  const hasInProgress = items.some((item) => item.status === 'in_progress')
  if (hasInProgress) {
    spinnerFrame = 0
    view.setText(renderLines(items, SPINNER_FRAMES[0]))
    spinnerTimer = setInterval(() => {
      spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length
      view.setText(renderLines(items, SPINNER_FRAMES[spinnerFrame]))
    }, SPINNER_INTERVAL)
  } else {
    view.setText(renderLines(items, '○'))
  }
}

export function stopProgressSpinner(): void {
  if (spinnerTimer) {
    clearInterval(spinnerTimer)
    spinnerTimer = null
  }
}
