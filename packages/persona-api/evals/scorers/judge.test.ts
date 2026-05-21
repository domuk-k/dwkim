/**
 * Judge scorer unit tests (slice domuk-k/dwkim#21).
 *
 * NO real LLM calls. We inject a FAKE `JudgeFn` to verify the scorers surface the
 * injected scores, and we unit-test the prompt-builder + response parser directly.
 */

import { describe, expect, it, mock } from 'bun:test'
import type { Document } from '../../src/services/vectorStore'
import type { AgentInput, AgentOutput } from '../adapters/runAgent'
import { buildJudgePrompt, type JudgeFn, makeJudgeScorers, parseJudgeResponse } from './judge'

const sources: Document[] = [
  {
    id: 'cogni_resume_0',
    content: '김동욱은 Coxwave에서 풀스택 엔지니어로 일합니다. TypeScript와 React를 주로 씁니다.',
    metadata: { type: 'resume', title: '이력서' }
  },
  {
    id: 'cogni_resume_1',
    content: '백엔드는 Bun과 Elysia를 사용합니다.',
    metadata: { type: 'resume' }
  }
]

function scoreInput(rubric?: string): {
  input: AgentInput
  output: AgentOutput
  expected?: { rubric?: string }
} {
  return {
    input: { query: '김동욱은 어떤 기술 스택을 쓰나요?' },
    output: {
      answer: 'TypeScript, React, Bun, Elysia를 주로 씁니다.',
      sources,
      tokens: 42,
      ms: 100
    },
    expected: rubric ? { rubric } : undefined
  }
}

describe('makeJudgeScorers', () => {
  it('returns two scorers named faithfulness and relevance', () => {
    const fakeJudge: JudgeFn = async () => ({ faithfulness: 1, relevance: 1 })
    const { faithfulness, relevance } = makeJudgeScorers(fakeJudge)
    expect(faithfulness.name).toBe('faithfulness')
    expect(relevance.name).toBe('relevance')
  })

  it('surfaces the injected faithfulness and relevance scores', async () => {
    const fakeJudge: JudgeFn = async () => ({ faithfulness: 0.8, relevance: 0.6 })
    const { faithfulness, relevance } = makeJudgeScorers(fakeJudge)

    const input = scoreInput()
    const f = await faithfulness.scorer(input)
    const r = await relevance.scorer(input)

    expect(f.score).toBe(0.8)
    expect(r.score).toBe(0.6)
  })

  it('passes query, answer, sources, and rubric through to the JudgeFn', async () => {
    const fakeJudge = mock<JudgeFn>(async () => ({ faithfulness: 1, relevance: 1 }))
    const { faithfulness } = makeJudgeScorers(fakeJudge)

    await faithfulness.scorer(scoreInput('Mention the employer.'))

    expect(fakeJudge).toHaveBeenCalledTimes(1)
    const args = fakeJudge.mock.calls[0][0]
    expect(args.query).toBe('김동욱은 어떤 기술 스택을 쓰나요?')
    expect(args.answer).toBe('TypeScript, React, Bun, Elysia를 주로 씁니다.')
    expect(args.sources).toEqual(sources)
    expect(args.rubric).toBe('Mention the employer.')
  })

  it('shares ONE judge call across both scorers for the same case', async () => {
    const fakeJudge = mock<JudgeFn>(async () => ({ faithfulness: 0.5, relevance: 0.5 }))
    const { faithfulness, relevance } = makeJudgeScorers(fakeJudge)

    const input = scoreInput()
    const [f, r] = await Promise.all([faithfulness.scorer(input), relevance.scorer(input)])

    expect(f.score).toBe(0.5)
    expect(r.score).toBe(0.5)
    // Memoized on the output object → only one judge invocation for the pair.
    expect(fakeJudge).toHaveBeenCalledTimes(1)
  })
})

describe('buildJudgePrompt', () => {
  const prompt = buildJudgePrompt({
    query: '김동욱은 어디서 일하나요?',
    answer: 'Coxwave에서 일합니다.',
    sources,
    rubric: '회사명을 정확히 언급해야 함.'
  })

  it('includes the query', () => {
    expect(prompt).toContain('김동욱은 어디서 일하나요?')
  })

  it('includes the answer under evaluation', () => {
    expect(prompt).toContain('Coxwave에서 일합니다.')
  })

  it('includes each source content and id', () => {
    expect(prompt).toContain('Coxwave에서 풀스택 엔지니어로 일합니다')
    expect(prompt).toContain('Bun과 Elysia를 사용합니다')
    expect(prompt).toContain('cogni_resume_0')
  })

  it('includes the per-case rubric', () => {
    expect(prompt).toContain('회사명을 정확히 언급해야 함.')
  })

  it('describes both scored dimensions', () => {
    expect(prompt).toContain('faithfulness')
    expect(prompt).toContain('relevance')
  })

  it('handles the no-sources case gracefully', () => {
    const p = buildJudgePrompt({ query: 'q', answer: 'a', sources: [] })
    expect(p).toContain('no sources were retrieved')
  })
})

describe('parseJudgeResponse', () => {
  it('parses a plain JSON object', () => {
    expect(parseJudgeResponse('{"faithfulness": 0.9, "relevance": 0.7}')).toEqual({
      faithfulness: 0.9,
      relevance: 0.7
    })
  })

  it('parses JSON inside markdown fences', () => {
    const raw = '```json\n{"faithfulness": 1, "relevance": 0}\n```'
    expect(parseJudgeResponse(raw)).toEqual({ faithfulness: 1, relevance: 0 })
  })

  it('parses JSON surrounded by prose', () => {
    const raw = 'Here is my assessment: {"faithfulness": 0.5, "relevance": 0.5}. Done.'
    expect(parseJudgeResponse(raw)).toEqual({ faithfulness: 0.5, relevance: 0.5 })
  })

  it('clamps out-of-range scores into [0,1]', () => {
    expect(parseJudgeResponse('{"faithfulness": 2, "relevance": -1}')).toEqual({
      faithfulness: 1,
      relevance: 0
    })
  })

  it('falls back to zeros on unparseable output', () => {
    expect(parseJudgeResponse('not json at all')).toEqual({ faithfulness: 0, relevance: 0 })
    expect(parseJudgeResponse('')).toEqual({ faithfulness: 0, relevance: 0 })
  })

  it('treats missing fields as 0', () => {
    expect(parseJudgeResponse('{"faithfulness": 0.4}')).toEqual({
      faithfulness: 0.4,
      relevance: 0
    })
  })
})
