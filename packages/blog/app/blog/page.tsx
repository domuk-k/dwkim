import Link from 'next/link'
import { allPosts } from 'contentlayer/generated'

export default function BlogPage() {
  const posts = allPosts.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      
      <div className="mb-8">
        <Link 
          href="/blog/posts" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          모든 게시물 보기
        </Link>
      </div>

      <div className="grid gap-6">
        <h2 className="text-2xl font-semibold mb-4">최근 게시물</h2>
        {posts.slice(0, 3).map((post) => (
          <article 
            key={post.slug} 
            className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">
              <Link href={post.url} className="hover:text-blue-600">
                {post.title}
              </Link>
            </h3>
            <p className="text-gray-600 mb-3">{post.description}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('ko-KR')}
              </time>
              <Link 
                href={post.url}
                className="text-blue-600 hover:text-blue-800"
              >
                읽어보기 →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}