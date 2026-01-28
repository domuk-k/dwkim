/**
 * Device ID Management
 *
 * 크로스 세션 개인화를 위한 Device ID 생성 및 저장
 * localStorage에 UUID 형식으로 저장
 */

const STORAGE_KEY = 'dwkim-blog-device-id'

/**
 * Device ID 가져오기 (없으면 생성)
 */
export function getOrCreateDeviceId(): string {
  // SSR 환경 체크
  if (typeof window === 'undefined') {
    return 'ssr-placeholder'
  }

  let deviceId = localStorage.getItem(STORAGE_KEY)

  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, deviceId)
  }

  return deviceId
}

/**
 * Device ID 삭제 (개인정보 초기화용)
 */
export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}
