import { describe, expect, test } from 'bun:test'
import type { AppState } from '../../state/types.js'
import { type ScreenController, ScreenRuntime } from '../../ui/screenRuntime.js'

function state(mode: AppState['mode']): AppState {
  return { mode } as AppState
}

function screens(events: string[]): Record<AppState['mode'], ScreenController> {
  const make = (mode: AppState['mode']): ScreenController => ({
    enter: () => events.push(`enter:${mode}`),
    update: () => events.push(`update:${mode}`),
    exit: () => events.push(`exit:${mode}`)
  })

  return {
    connecting: make('connecting'),
    welcome: make('welcome'),
    idle: make('idle'),
    loading: make('loading'),
    emailInput: make('emailInput'),
    feedback: make('feedback'),
    feedbackConfirmed: make('feedbackConfirmed'),
    exitFeedback: make('exitFeedback'),
    error: make('error')
  }
}

describe('ScreenRuntime', () => {
  test('exits the previous mode before entering the next mode', () => {
    const events: string[] = []
    const runtime = new ScreenRuntime(screens(events), () => events.push('render'))

    runtime.render(state('connecting'), state('welcome'))

    expect(events).toEqual(['exit:connecting', 'enter:welcome', 'render'])
  })

  test('updates the active mode without re-entering it', () => {
    const events: string[] = []
    const runtime = new ScreenRuntime(screens(events), () => events.push('render'))

    runtime.render(state('loading'), state('loading'))

    expect(events).toEqual(['update:loading', 'render'])
  })
})
