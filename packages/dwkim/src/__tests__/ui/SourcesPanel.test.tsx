import { describe, expect, test } from 'bun:test'
import { render } from 'ink-testing-library'
import { SourcesPanel } from '../../ui/SourcesPanel.js'

describe('SourcesPanel', () => {
  const sources = [
    { id: 'doc-1', content: '이력서 내용', metadata: { type: 'resume', title: '이력서' } },
    { id: 'doc-2', content: 'FAQ 내용', metadata: { type: 'faq', title: '100문100답' } },
    { id: 'doc-3', content: '블로그 내용', metadata: { type: 'blog' } }
  ]

  test('renders numbered source list', () => {
    const { lastFrame } = render(<SourcesPanel sources={sources} />)
    const frame = lastFrame()!
    expect(frame).toContain('1. [이력서] 이력서')
    expect(frame).toContain('2. [100문100답] 100문100답')
  })

  test('falls back to source.id when title is missing', () => {
    const { lastFrame } = render(<SourcesPanel sources={sources} />)
    expect(lastFrame()).toContain('3. [블로그] doc-3')
  })

  test('maps type to Korean label', () => {
    const { lastFrame } = render(<SourcesPanel sources={sources} />)
    expect(lastFrame()).toContain('[이력서]')
    expect(lastFrame()).toContain('[100문100답]')
    expect(lastFrame()).toContain('[블로그]')
  })

  test('shows fold hint', () => {
    const { lastFrame } = render(<SourcesPanel sources={sources} />)
    expect(lastFrame()).toContain('s 키로 접기')
  })

  test('renders nothing for empty sources', () => {
    const { lastFrame } = render(<SourcesPanel sources={[]} />)
    expect(lastFrame()).toBe('')
  })
})
