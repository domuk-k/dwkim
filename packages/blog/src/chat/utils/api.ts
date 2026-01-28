/**
 * API Configuration
 *
 * persona-api v2 엔드포인트 설정
 */

/**
 * API 기본 URL
 * 환경변수 PUBLIC_PERSONA_API_URL로 오버라이드 가능
 */
export function getApiUrl(): string {
  // Astro public 환경변수
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_PERSONA_API_URL) {
    return import.meta.env.PUBLIC_PERSONA_API_URL
  }

  // 기본값: 프로덕션 API
  return 'https://persona-api.fly.dev'
}

/**
 * Chat Stream 엔드포인트 URL
 */
export function getChatStreamUrl(): string {
  return `${getApiUrl()}/api/v2/chat/stream`
}
