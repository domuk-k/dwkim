import { describe, expect, it } from 'bun:test'
import { isIndexable, parseFrontmatter, stripPrivateSections } from '../../scripts/buildSearchIndex'

describe('parseFrontmatter', () => {
  it('parses YAML inline arrays as real arrays (not strings)', () => {
    const md = '---\ntitle: "관계 Todos"\ntags: [relationship, todo, personal]\n---\n\n# body\n'
    const { frontmatter } = parseFrontmatter(md)
    expect(Array.isArray(frontmatter.tags)).toBe(true)
    expect(frontmatter.tags).toEqual(['relationship', 'todo', 'personal'])
  })

  it('returns empty frontmatter for files without it', () => {
    const { frontmatter, body } = parseFrontmatter('# just a heading\n')
    expect(frontmatter).toEqual({})
    expect(body).toContain('just a heading')
  })
})

describe('isIndexable — public/private boundary', () => {
  // The leak: a `personal`-tagged private note must NEVER be treated as `persona`.
  it('excludes a personal-tagged note (the 관계-todos leak)', () => {
    expect(isIndexable(['relationship', 'todo', 'personal'])).toBe(false)
  })

  it('includes only exact persona/blog/rag tags', () => {
    expect(isIndexable(['persona'])).toBe(true)
    expect(isIndexable(['blog'])).toBe(true)
    expect(isIndexable(['rag'])).toBe(true)
    expect(isIndexable(['persona', 'profile'])).toBe(true)
  })

  it('is not fooled by substring homographs', () => {
    expect(isIndexable(['personal'])).toBe(false) // contains "persona"
    expect(isIndexable(['storage'])).toBe(false) // contains "rag"
    expect(isIndexable(['weblog'])).toBe(false) // contains "blog"
    expect(isIndexable([])).toBe(false)
  })
})

describe('stripPrivateSections — filter mechanism', () => {
  it('removes content between persona:private markers', () => {
    const body = [
      '## Public',
      'public content',
      '<!-- persona:private -->',
      '결혼 생활: 아내와의 관계를 중요한 삶의 축으로 명시.',
      '<!-- /persona:private -->',
      '## More public',
      'more public'
    ].join('\n')
    const stripped = stripPrivateSections(body)
    expect(stripped).not.toContain('아내')
    expect(stripped).toContain('public content')
    expect(stripped).toContain('more public')
  })

  it('leaves bodies without markers untouched', () => {
    const body = '## Heading\n\nplain content'
    expect(stripPrivateSections(body)).toBe(body)
  })
})
