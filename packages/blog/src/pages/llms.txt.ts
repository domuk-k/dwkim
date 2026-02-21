import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'
import { themeConfig } from '@/config'

export async function GET(context: APIContext) {
  const posts = await getCollection('posts')
  const siteUrl = themeConfig.site.website

  const published = posts
    .filter((post) => !post.id.startsWith('_'))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())

  const postLines = published
    .map((post) => {
      const desc = post.data.description ? `: ${post.data.description}` : ''
      return `- [${post.data.title}](${siteUrl}/${post.id}/)${desc}`
    })
    .join('\n')

  const body = `# ${themeConfig.site.title}

> ${themeConfig.site.author}의 개인 블로그. AI 에이전트와 함께하는 개발, 러닝, 그리고 생각을 기록합니다.

dwkim은 소프트웨어 엔지니어이자 마라톤 러너입니다. AI 에이전트를 활용한 개발 방식, 시스템 설계, 프로젝트 수행 경험, 그리고 삶에 대한 생각을 공유합니다.

## Blog Posts

${postLines}

## Site Info

- [About](${siteUrl}/): 프로필 및 소개
- [All Posts](${siteUrl}/posts/): 전체 글 목록
- [RSS Feed](${siteUrl}/rss.xml): RSS 피드
- [Full Content for LLMs](${siteUrl}/llms-full.txt): 전체 글 내용 (LLM 컨텍스트용)

## Contact

- Website: ${siteUrl}
- Twitter: ${themeConfig.seo.twitterSite}
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
