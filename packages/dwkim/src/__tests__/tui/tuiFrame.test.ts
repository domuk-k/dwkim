import { describe, expect, test } from 'bun:test'
import type { Component } from '@mariozechner/pi-tui'
import { TuiFrame } from '../../ui/tuiFrame.js'

function component(...lines: string[]): Component {
  return {
    render: () => lines,
    invalidate: () => {}
  }
}

describe('TuiFrame', () => {
  test('renders semantic regions in stable order', () => {
    const frame = new TuiFrame()

    frame.setSlot('composer', 'input', [component('input')])
    frame.setSlot('history', 'chat', [component('history')])
    frame.setSlot('main', 'screen', [component('screen')])
    frame.setSlot('auxiliary', 'sources', [component('sources')])

    expect(frame.render(80)).toEqual(['history', '', 'screen', '', 'sources', 'input'])
  })

  test('replaces and clears named slots without leaking stale lines', () => {
    const frame = new TuiFrame()

    frame.setSlot('main', 'screen', [component('welcome')])
    frame.setSlot('main', 'screen', [component('loading')])
    expect(frame.render(80)).toEqual(['loading'])

    frame.clearSlot('main', 'screen')
    expect(frame.render(80)).toEqual([])
  })

  test('passes the render viewport to mounted children', () => {
    const frame = new TuiFrame()
    frame.setSlot('composer', 'input', [
      {
        render: (width) => [`width:${width}`],
        invalidate: () => {}
      }
    ])

    expect(frame.render(42)).toEqual(['width:42'])
  })
})
