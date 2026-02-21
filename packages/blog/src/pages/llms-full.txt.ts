import { getCollection, render } from 'astro:content'
import type { APIContext } from 'astro'
import { themeConfig } from '@/config'

export async function GET(context: APIContext) {
  const posts = await getCollection('posts')
  const siteUrl = themeConfig.site.website

  const published = posts
    .filter((post) => !post.id.startsWith('_'))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())

  const sections: string[] = []

  sections.push(`# ${themeConfig.site.title} — Full Content`)
  sections.push('')
  sections.push(
    `> 이 파일은 ${themeConfig.site.author}의 블로그 전체 글을 LLM이 읽을 수 있는 형태로 제공합니다.`
  )
  sections.push(`> Generated at build time. ${published.length} posts total.`)
  sections.push('')

  for (const post of published) {
    const date = post.data.pubDate.toISOString().split('T')[0]
    const url = `${siteUrl}/${post.id}/`

    sections.push('---')
    sections.push('')
    sections.push(`## ${post.data.title}`)
    sections.push('')
    sections.push(`- URL: ${url}`)
    sections.push(`- Date: ${date}`)
    if (post.data.description) {
      sections.push(`- Description: ${post.data.description}`)
    }
    sections.push('')
    sections.push(post.body ?? '')
    sections.push('')
  }

  return new Response(sections.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
