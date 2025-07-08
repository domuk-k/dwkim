import Link from 'next/link'
import { allPosts } from 'contentlayer/generated'

export default function PostsPage() {
  const posts = allPosts.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link 
          href="/blog" 
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← 블로그 홈으로
        </Link>
        <h1 className="text-4xl font-bold">모든 게시물</h1>
      </div>

      <div className="grid gap-6">
        {posts.map((post) => (
          <article 
            key={post.slug} 
            className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-3">
              <Link href={post.url} className="hover:text-blue-600">
                {post.title}
              </Link>
            </h2>
            <p className="text-gray-600 mb-4">{post.description}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
              <Link 
                href={post.url}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                읽어보기 →
              </Link>
            </div>
          </article>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <p>아직 게시물이 없습니다.</p>
        </div>
      )}
    </div>
  )
}