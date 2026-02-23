import { Box, Text } from '@mariozechner/pi-tui'
import { c } from '../ui/theme.js'

export function createExitFeedbackOverlay(): Box {
  const box = new Box(2, 1)

  const question = new Text('', 0, 0)
  question.setText(c.subtext('오늘 대화가 도움이 됐나요?'))

  const options = new Text('', 0, 0)
  options.setText(
    [
      '',
      `${c.success('1')} ${c.dim('좋아요')} ${c.muted('·')} ${c.warning('2')} ${c.dim('보통')} ${c.muted('·')} ${c.error('3')} ${c.dim('별로')}`,
      c.dim('d 스킵')
    ].join('\n')
  )

  box.addChild(question)
  box.addChild(options)
  return box
}
