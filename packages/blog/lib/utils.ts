// 간단한 클래스 이름 병합 유틸리티 함수
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs
    .filter(Boolean)
    .join(" ")
    .trim()
}