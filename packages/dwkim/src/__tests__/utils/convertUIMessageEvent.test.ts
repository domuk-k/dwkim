import { describe, expect, test } from 'bun:test'
import { convertUIMessageEvent } from '../../utils/personaApiClient.js'

// Module A (Slice 1 #27): data-elicitation → elicitation StreamEvent
// value≠label이 CLI 파싱을 거쳐도 보존되는지 (persona-api adapter의 반대편)
describe('convertUIMessageEvent — elicitation', () => {
  test('data-elicitation을 elicitation 이벤트로 변환하며 value/label을 보존한다', () => {
    const event = convertUIMessageEvent({
      type: 'data-elicitation',
      data: {
        intent: 'identify',
        prompt: '어떤 맥락에서 오셨어요?',
        options: [{ value: 'recruiter', label: '채용 관련이에요' }],
        skippable: true
      }
    })

    expect(event).toEqual({
      type: 'elicitation',
      intent: 'identify',
      prompt: '어떤 맥락에서 오셨어요?',
      options: [{ value: 'recruiter', label: '채용 관련이에요' }],
      skippable: true
    })
  })
})
