/**
 * messageStreamAdapter — elicitation wiring 테스트 (Module A, Slice 1 #27)
 *
 * elicitation 이벤트가 data-elicitation part로 변환되며 value/label이 보존되는지.
 * SSOT(elicitationSchema)로 재구성 검증해 drift를 막는다.
 */

import type { UIMessageStreamWriter } from 'ai'
import { writeEventToStream } from '../services/aisdk/messageStreamAdapter'
import { type Elicitation, elicitationSchema } from '../services/elicitation'

describe('messageStreamAdapter — elicitation', () => {
  it('elicitation 이벤트를 data-elicitation part로 쓴다 (value≠label 보존)', () => {
    const elicitation: Elicitation = {
      type: 'elicitation',
      intent: 'identify',
      prompt: '어떤 맥락에서 오셨어요?',
      options: [{ value: 'recruiter', label: '채용 관련이에요' }],
      skippable: true
    }
    const written: Array<{ type: string; data?: Record<string, unknown> }> = []
    const fakeWriter = {
      write: (p: { type: string; data?: Record<string, unknown> }) => written.push(p)
    } as unknown as UIMessageStreamWriter

    writeEventToStream(elicitation, fakeWriter, { value: false })

    const part = written.find((p) => p.type === 'data-elicitation')
    expect(part).toBeDefined()
    expect(part?.data?.options).toEqual([{ value: 'recruiter', label: '채용 관련이에요' }])
    // SSOT 스키마로 재구성하면 통과 (value/label/intent/skippable 무손실)
    expect(() => elicitationSchema.parse({ type: 'elicitation', ...part?.data })).not.toThrow()
  })
})
