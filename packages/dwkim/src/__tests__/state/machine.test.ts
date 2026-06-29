import { describe, expect, test } from 'bun:test'
import { createInitialState, transition } from '../../state/machine.js'

describe('transition', () => {
  test('STEER_SUBMIT preserves partial assistant text and starts a new loading turn', () => {
    const welcome = transition(createInitialState(), { type: 'HEALTH_OK' })
    const idle = transition(welcome, { type: 'WELCOME_DISMISS' })
    const loading = transition(idle, { type: 'SUBMIT', value: '기술 스택 알려줘' })
    const streaming = transition(loading, {
      type: 'STREAM_CONTENT',
      fullContent: '초안 답변입니다.'
    })

    const steered = transition(streaming, {
      type: 'STEER_SUBMIT',
      value: '프론트엔드 중심으로 좁혀줘'
    })

    if (steered.mode !== 'loading') {
      throw new Error(`expected loading mode, got ${steered.mode}`)
    }

    expect(steered.streamContent).toBe('')
    expect(steered.progressItems).toEqual([])
    expect(steered.loadingState.message).toBe('방향 전환 중...')
    expect(steered.messages.at(-2)).toMatchObject({
      role: 'assistant',
      content: '초안 답변입니다.'
    })
    expect(steered.messages.at(-1)).toMatchObject({
      role: 'user',
      content: '프론트엔드 중심으로 좁혀줘'
    })
  })
})
