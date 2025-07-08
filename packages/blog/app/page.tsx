import React from 'react'
import Link from 'next/link'
import { allPosts, allCards } from 'contentlayer/generated'
import { compareDesc } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ModeToggle } from '@/components/mode-toggle'

// 서버 컴포넌트 - 빌드 시에 데이터를 가져와 정적으로 렌더링
export default function HomePage() {
  // 최신 포스트 3개 가져오기
  const posts = allPosts
    .filter((post) => post.date)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))
    .slice(0, 3)

  // 카드 데이터 가져오기
  const cards = allCards.slice(0, 4)

  return (
    <div className="container relative max-w-6xl py-6 lg:py-10">
      <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8">
        <div className="flex-1 space-y-4">
          <h1 className="inline-block font-heading text-4xl tracking-tight lg:text-5xl">
            DW Kim Blog
          </h1>
          <p className="text-xl text-muted-foreground">
            소프트웨어 개발, 기술, 그리고 생각들을 기록하는 공간입니다.
          </p>
        </div>
        {/* 테마 토글 버튼 - 클라이언트 컴포넌트 */}
        <ModeToggle />
      </div>

      <hr className="my-8" />

      {/* 카드 섹션 */}
      {cards.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.slug} className="group relative">
              <CardHeader>
                <CardTitle className="text-xl">{card.title}</CardTitle>
                {card.description && (
                  <CardDescription>{card.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Link 
                  href={card.url} 
                  className="absolute inset-0"
                  aria-label={`Read more about ${card.title}`}
                >
                  <span className="sr-only">Read more</span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <hr className="my-8" />

      {/* 최신 포스트 섹션 */}
      <div className="space-y-6">
        <h2 className="font-heading text-3xl">최신 포스트</h2>
        {posts?.length ? (
          <div className="grid gap-6">
            {posts.map((post) => (
              <article key={post.slug} className="group relative">
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold tracking-tight">
                    <Link 
                      href={post.url}
                      className="hover:underline"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  {post.summary && (
                    <p className="text-muted-foreground">{post.summary}</p>
                  )}
                  {post.date && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(post.date).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">아직 포스트가 없습니다.</p>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/posts"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          모든 포스트 보기
        </Link>
      </div>
    </div>
  )
}