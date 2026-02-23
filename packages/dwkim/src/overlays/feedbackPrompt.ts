import { Text } from '@mariozechner/pi-tui'
import { c } from '../ui/theme.js'

export function createFeedbackView(): Text {
  return new Text('', 2, 0)
}

export function showFeedbackPrompt(view: Text): void {
  view.setText(
    `${c.subtext('도움이 됐나요?')}  ${c.success('1')} ${c.dim('좋아요')} ${c.muted('·')} ${c.warning('2')} ${c.dim('보통')} ${c.muted('·')} ${c.error('3')} ${c.dim('별로')} ${c.muted('·')} ${c.dim('d 스킵')}`
  )
}

export function showFeedbackConfirmed(view: Text): void {
  view.setText(c.success('✓ 감사합니다!'))
}
