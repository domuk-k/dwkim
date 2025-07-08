import { allPosts } from 'contentlayer/generated';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Mdx } from '@/components/mdx-components';
import type { Metadata } from 'next';

interface PostProps {
  params: {
    slug: string[];
  };
}

async function getPostFromParams(params: PostProps['params']) {
  const slug = params?.slug?.join('/');

  const post = allPosts.find(
    (post) => post.slugAsParams === decodeURIComponent(slug)
  );

  return post;
}

export async function generateMetadata({
  params,
}: PostProps): Promise<Metadata> {
  const post = await getPostFromParams(params);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
  };
}

export async function generateStaticParams(): Promise<PostProps['params'][]> {
  return allPosts.map((post) => ({
    slug: post.slugAsParams.split('/'),
  }));
}

export const revalidate = 60 * 60 * 6; // 6 hours

export default async function PostPage({ params }: PostProps) {
  const post = await getPostFromParams(params);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 dark:text-white tracking-tight mb-6 leading-tight">
            {post.title}
          </h1>
          {post.description && (
            <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
              {post.description}
            </p>
          )}

          <div className="flex items-center text-sm text-gray-500 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 pb-8">
            <time>
              {new Date(post.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>
        </header>

        <article className="mb-16">
          <div className="prose dark:prose-invert max-w-none prose-lg prose-headings:font-medium prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:tracking-tight prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-medium prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-transparent prose-code:font-mono prose-code:text-sm prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:text-gray-900 dark:prose-pre:text-gray-100 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:p-4 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-900/30 prose-blockquote:rounded-r-lg prose-blockquote:py-2">
            <Mdx code={post.body.code} />
          </div>
        </article>

        {/* Navigation */}
        <footer className="pt-8 border-t border-gray-100 dark:border-gray-800">
          <Link
            href="/posts"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-sm font-medium"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            다른 글 보기
          </Link>
        </footer>
      </div>
    </div>
  );
}
