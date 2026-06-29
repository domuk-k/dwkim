import { Text } from '@mariozechner/pi-tui'
import { c } from '../ui/theme.js'
import type { ProgressItem } from '../utils/personaApiClient.js'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const SPINNER_INTERVAL = 80

let spinnerTimer: ReturnType<typeof setInterval> | null = null
let spinnerFrame = 0

export function createProgressView(): Text {
  return new Text('', 1, 0)
}

const AMBIENT_LABELS: Record<string, string> = {
  rewrite: '질문을 읽는 중',
  search: '관련 맥락을 찾는 중',
  context: '맥락을 정리하는 중',
  generate: '답변을 쓰는 중'
}

export function formatAmbientProgress(items: ProgressItem[], frame: string): string {
  const active = items.find((item) => item.status === 'in_progress')
  if (!active) return ''

  const label = AMBIENT_LABELS[active.id] ?? active.label
  return `${c.lavender(frame)} ${c.muted(label)}`
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
    view.setText(formatAmbientProgress(items, SPINNER_FRAMES[0]))
    spinnerTimer = setInterval(() => {
      spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length
      view.setText(formatAmbientProgress(items, SPINNER_FRAMES[spinnerFrame]))
    }, SPINNER_INTERVAL)
  } else {
    view.setText('')
  }
}

export function stopProgressSpinner(): void {
  if (spinnerTimer) {
    clearInterval(spinnerTimer)
    spinnerTimer = null
  }
}
