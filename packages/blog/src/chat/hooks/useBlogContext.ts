/**
 * useBlogContext Hook
 *
 * 현재 페이지의 블로그 컨텍스트 추출
 * - 포스트 페이지: 제목, slug, 설명
 * - 인덱스 페이지: 기본 컨텍스트
 */

import { useEffect, useState } from 'react'
import type { BlogContext } from '../types'

/**
 * DOM에서 블로그 컨텍스트 추출
 */
function extractBlogContext(): BlogContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  const pathname = window.location.pathname

  // 인덱스 페이지
  if (pathname === '/' || pathname === '') {
    return {
      type: 'index',
      title: '홈'
    }
  }

  // 포스트 페이지 감지 (/posts/ 제외한 slug)
  const postMatch = pathname.match(/^\/([^/]+)\/?$/)
  if (postMatch) {
    const slug = postMatch[1]

    // 특수 페이지 제외
    if (['posts', 'chat', 'tags', '404'].includes(slug)) {
      return {
        type: 'page',
        title: slug
      }
    }

    // 블로그 포스트
    const title = document.querySelector('h1')?.textContent || slug
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined

    // keywords 추출 (meta 태그에서)
    const keywordsStr = document.querySelector('meta[name="keywords"]')?.getAttribute('content')
    const keywords = keywordsStr ? keywordsStr.split(',').map((k) => k.trim()) : undefined

    return {
      type: 'post',
      title,
      slug,
      description,
      keywords
    }
  }

  // 기타 페이지
  return {
    type: 'page',
    title: document.title
  }
}

/**
 * 블로그 컨텍스트 훅
 */
export function useBlogContext(): BlogContext | null {
  const [context, setContext] = useState<BlogContext | null>(null)

  useEffect(() => {
    // 초기 컨텍스트 추출
    setContext(extractBlogContext())

    // Astro View Transitions 지원
    const handlePageLoad = () => {
      setContext(extractBlogContext())
    }

    document.addEventListener('astro:page-load', handlePageLoad)

    return () => {
      document.removeEventListener('astro:page-load', handlePageLoad)
    }
  }, [])

  return context
}

/**
 * 컨텍스트를 사용자 친화적 메시지로 변환
 */
export function formatContextMessage(context: BlogContext | null): string | null {
  if (!context) return null

  if (context.type === 'post' && context.title) {
    return `현재 "${context.title}" 글을 보고 있어요.`
  }

  if (context.type === 'index') {
    return '홈 페이지를 보고 있어요.'
  }

  return null
}
