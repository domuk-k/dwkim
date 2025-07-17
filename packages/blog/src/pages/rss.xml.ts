import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getCollection } from 'astro:content'
import { themeConfig } from '@/config'

export async function GET(context: APIContext) {
  const posts = await getCollection('posts')
  const filteredPosts = posts.filter((post) => !post.id.startsWith('_'))
  
  return rss({
    title: themeConfig.site.title,
    description: themeConfig.site.description,
    site: context.site!,
    items: filteredPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description || post.data.title,
      pubDate: post.data.pubDate,
      link: `/${post.id}/`,
    })),
    customData: `<language>${themeConfig.site.language}</language>`,
  })
}
