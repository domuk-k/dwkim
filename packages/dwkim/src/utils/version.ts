/**
 * 빌드 시 esbuild `define`으로 주입되는 전역 버전 문자열을 안전하게 노출.
 *
 * `__VERSION__`은 번들 빌드 시점에만 정의된다(`script/build.js`). 테스트나
 * 비번들 실행 컨텍스트에서는 정의되지 않으므로, 직접 참조하면 ReferenceError가
 * 발생한다. 이 헬퍼는 `typeof` 가드로 감싸 어떤 컨텍스트에서도 안전하게 동작한다.
 */

declare const __VERSION__: string

/**
 * 현재 CLI 버전. 번들 빌드에서는 주입된 값을, 그 외에는 'unknown'을 반환한다.
 */
export function getVersion(): string {
  try {
    // 번들 외 컨텍스트에서는 __VERSION__이 미정의 → typeof 가드로 안전 처리
    return typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'unknown'
  } catch {
    return 'unknown'
  }
}
