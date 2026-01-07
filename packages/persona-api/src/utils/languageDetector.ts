/**
 * Language Detector
 *
 * 사용자 쿼리 언어 감지 유틸리티
 * LLM 프롬프트 및 HITL UI 언어 결정에 사용
 */

export type SupportedLanguage = 'ko' | 'en' | 'ja'

/**
 * 쿼리 언어 감지 (간단한 문자 범위 기반)
 *
 * 복잡한 케이스는 LLM이 알아서 처리하므로
 * 여기서는 주요 언어만 빠르게 감지
 *
 * @param text - 감지할 텍스트 (null/undefined 허용, 기본값 'en' 반환)
 */
export function detectLanguage(text: string | null | undefined): SupportedLanguage {
  if (!text) return 'en'

  const trimmed = text.trim()

  // 한글 포함 여부
  if (/[\uAC00-\uD7AF]/.test(trimmed)) {
    return 'ko'
  }

  // 일본어 (히라가나, 카타카나, 한자)
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(trimmed)) {
    return 'ja'
  }

  // 기본값: 영어
  return 'en'
}

/**
 * LLM 프롬프트용 언어 지시문
 */
export function getLanguageInstruction(lang: SupportedLanguage): string {
  switch (lang) {
    case 'ko':
      return '한국어로 답변하세요.'
    case 'ja':
      return '日本語で回答してください。'
    default:
      return 'Respond in English.'
  }
}

/**
 * HITL UI 다국어 메시지
 */
export const HITL_MESSAGES: Record<
  SupportedLanguage,
  {
    feedbackPrompt: string
    feedbackGood: string
    feedbackOkay: string
    feedbackPoor: string
    feedbackDismiss: string
    exitPrompt: string
    exitQuestion: string
    exitGreat: string
    exitGood: string
    exitPoor: string
    exitSkip: string
    clarificationPrompt: string
    clarificationHint: string
    correctionThanks: string
  }
> = {
  ko: {
    feedbackPrompt: '이 응답이 어땠나요?',
    feedbackGood: '좋아요',
    feedbackOkay: '괜찮아요',
    feedbackPoor: '별로에요',
    feedbackDismiss: '넘기기',
    exitPrompt: '떠나시기 전에...',
    exitQuestion: '오늘 대화가 도움이 됐나요?',
    exitGreat: '매우 도움됨',
    exitGood: '조금 도움됨',
    exitPoor: '별로...',
    exitSkip: '스킵',
    clarificationPrompt: '더 구체적으로 물어보시겠어요?',
    clarificationHint: '↑↓ 선택 · Enter 질문 · ESC 닫기',
    correctionThanks: '정정해주셔서 감사합니다! 피드백을 기록했어요.'
  },
  en: {
    feedbackPrompt: 'How was this response?',
    feedbackGood: 'Good',
    feedbackOkay: 'Okay',
    feedbackPoor: 'Poor',
    feedbackDismiss: 'Dismiss',
    exitPrompt: 'Before you go...',
    exitQuestion: 'Was this conversation helpful?',
    exitGreat: 'Very helpful',
    exitGood: 'Somewhat',
    exitPoor: 'Not really',
    exitSkip: 'Skip',
    clarificationPrompt: 'Want to be more specific?',
    clarificationHint: '↑↓ Select · Enter to ask · ESC to close',
    correctionThanks: 'Thanks for the correction! Feedback recorded.'
  },
  ja: {
    feedbackPrompt: 'この回答はいかがでしたか？',
    feedbackGood: '良い',
    feedbackOkay: 'まあまあ',
    feedbackPoor: 'いまいち',
    feedbackDismiss: 'スキップ',
    exitPrompt: 'お帰りの前に...',
    exitQuestion: '今日の会話は役に立ちましたか？',
    exitGreat: 'とても役立った',
    exitGood: 'まあまあ',
    exitPoor: 'あまり...',
    exitSkip: 'スキップ',
    clarificationPrompt: 'もっと具体的に聞きますか？',
    clarificationHint: '↑↓ 選択 · Enter 質問 · ESC 閉じる',
    correctionThanks: 'ご訂正ありがとうございます！フィードバックを記録しました。'
  }
}
