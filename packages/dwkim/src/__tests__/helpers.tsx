/**
 * ink-testing-library 테스트 유틸리티
 *
 * ink-testing-library는 waitFor를 제공하지 않으므로
 * 프레임 기반 폴링으로 비동기 렌더링 대기를 구현한다.
 */

/**
 * lastFrame()이 predicate를 만족할 때까지 폴링 대기
 * @param getFrame - lastFrame 함수
 * @param predicate - 프레임 문자열 조건
 * @param timeout - 최대 대기 시간 (ms)
 */
export async function waitForFrame(
  getFrame: () => string | undefined,
  predicate: (frame: string) => boolean,
  timeout = 3000
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const frame = getFrame()
    if (frame && predicate(frame)) return
    await new Promise((r) => setTimeout(r, 50))
  }
  const lastFrame = getFrame()
  throw new Error(`waitForFrame timeout (${timeout}ms)\nLast frame:\n${lastFrame ?? '(empty)'}`)
}
