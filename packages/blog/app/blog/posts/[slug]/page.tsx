import { notFound } from 'next/navigation'
import Link from 'next/link'
import { allPosts } from 'contentlayer/generated'

interface PostPageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  return allPosts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: PostPageProps) {
  const post = allPosts.find((post) => post.slug === params.slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.description,
  }
}

export default function PostPage({ params }: PostPageProps) {
  const post = allPosts.find((post) => post.slug === params.slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link 
          href="/blog/posts" 
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← 게시물 목록으로
        </Link>
      </div>

      <article className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </div>
          {post.description && (
            <p className="text-lg text-gray-600 mt-4">{post.description}</p>
          )}
        </header>

        <div className="prose prose-lg max-w-none">
          <pre className="whitespace-pre-wrap">{post.body.raw}</pre>
        </div>
      </article>

      <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200">
        <Link 
          href="/blog/posts"
          className="text-blue-600 hover:text-blue-800"
        >
          ← 다른 게시물 보기
        </Link>
      </div>
    </div>
  )
}