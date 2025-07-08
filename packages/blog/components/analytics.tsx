"use client"

import React from 'react'

// 클라이언트 컴포넌트 - 브라우저에서 실행되는 애널리틱스 스크립트
export function Analytics() {
  React.useEffect(() => {
    // Google Analytics나 다른 애널리틱스 서비스 초기화
    // 환경변수에서 추적 ID를 가져와 설정
    const trackingId = process.env.NEXT_PUBLIC_GA_TRACKING_ID
    
    if (trackingId && typeof window !== 'undefined') {
      // GA 스크립트 로드 및 초기화 로직
      console.log('Analytics initialized with tracking ID:', trackingId)
    }
  }, [])

  // 실제 애널리틱스 스크립트가 없으므로 null 반환
  // 실제 프로덕션에서는 Google Analytics 스크립트 태그를 반환
  return null
}