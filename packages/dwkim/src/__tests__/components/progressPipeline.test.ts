import { describe, expect, test } from 'bun:test'
import { formatAmbientProgress } from '../../components/progressPipeline.js'
import type { ProgressItem } from '../../utils/personaApiClient.js'

describe('formatAmbientProgress', () => {
  test('renders only the active progress item as ambient status', () => {
    const items: ProgressItem[] = [
      { id: 'rewrite', label: '쿼리 분석', status: 'completed' },
      { id: 'search', label: '문서 검색', status: 'in_progress', detail: 'Dense + Sparse' },
      { id: 'context', label: '컨텍스트 구성', status: 'pending' },
      { id: 'generate', label: '답변 생성', status: 'pending' }
    ]

    const line = formatAmbientProgress(items, '*')

    expect(line).toContain('관련 맥락을 찾는 중')
    expect(line).not.toContain('쿼리 분석')
    expect(line).not.toContain('Dense + Sparse')
    expect(line).not.toContain('컨텍스트 구성')
  })

  test('renders nothing when no item is active', () => {
    expect(
      formatAmbientProgress([{ id: 'search', label: '문서 검색', status: 'completed' }], '*')
    ).toBe('')
  })
})
