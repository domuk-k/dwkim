/**
 * useChatVisibility Hook
 *
 * 채팅 패널 열림/닫힘 상태 관리
 * - 키보드 단축키 (Escape로 닫기)
 * - localStorage 상태 저장 (선택적)
 */

import { useCallback, useEffect, useState } from 'react'

export interface UseChatVisibilityOptions {
  initialOpen?: boolean
  persistState?: boolean
}

export interface UseChatVisibilityReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const STORAGE_KEY = 'dwkim-blog-chat-open'

/**
 * 채팅 패널 가시성 관리 훅
 */
export function useChatVisibility(options: UseChatVisibilityOptions = {}): UseChatVisibilityReturn {
  const { initialOpen = false, persistState = false } = options

  // 초기 상태 결정
  const getInitialState = (): boolean => {
    if (typeof window === 'undefined') return initialOpen

    if (persistState) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        return stored === 'true'
      }
    }

    return initialOpen
  }

  const [isOpen, setIsOpen] = useState(getInitialState)

  // 상태 저장
  useEffect(() => {
    if (persistState && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(isOpen))
    }
  }, [isOpen, persistState])

  // Escape 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // 열릴 때 body 스크롤 방지 (모바일)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, open, close, toggle }
}
