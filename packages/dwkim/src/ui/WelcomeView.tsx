import { Box, Text } from 'ink'
import { icons } from './data.js'
import { theme } from './theme.js'

const TOPICS = [
  { icon: '\u{1F4BC}', label: '커리어 & 경험' },
  { icon: '\u{1F527}', label: '기술 스택 & 스킬' },
  { icon: '\u{1F4BB}', label: '프로젝트 & 오픈소스' },
  { icon: '\u{1F4DD}', label: '개발 철학 & 블로그' }
] as const

const STARTER_QUESTIONS = [
  '어떤 경력을 가지고 있나요?',
  '주로 어떤 기술 스택을 사용하나요?',
  '오픈소스 활동에 대해 알려주세요'
]

interface Props {
  questions: string[]
  selectedIndex: number
}

export function WelcomeView({ questions, selectedIndex }: Props) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {/* 기능 범위 공개 */}
      <Box marginLeft={2}>
        <Text color={theme.muted} dimColor>
          {icons.info} 동욱의 커리어, 스킬, 프로젝트, 글에 대해 답변합니다.
        </Text>
      </Box>

      {/* 토픽 그리드 */}
      <Box marginLeft={2} marginTop={1} flexDirection="column">
        <Text color={theme.subtext}>알 수 있는 것들:</Text>
        <Box marginTop={0} flexWrap="wrap" columnGap={2}>
          {TOPICS.map((topic) => (
            <Text key={topic.label} color={theme.muted}>
              {topic.icon} {topic.label}
            </Text>
          ))}
        </Box>
      </Box>

      {/* 스타터 질문 */}
      {questions.length > 0 && (
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          <Text color={theme.muted} dimColor>
            {icons.chat} 이런 것들을 물어보세요:
          </Text>
          {questions.map((q, idx) => (
            <Box key={`starter-${idx}`} marginLeft={2}>
              <Text
                color={idx === selectedIndex ? theme.lavender : theme.muted}
                bold={idx === selectedIndex}
              >
                {idx === selectedIndex ? '› ' : '  '}[{idx + 1}] {q}
              </Text>
            </Box>
          ))}
          <Text color={theme.muted} dimColor>
            {'  '}↑↓ 선택 · Enter 질문 · 또는 직접 입력
          </Text>
        </Box>
      )}
    </Box>
  )
}

export { STARTER_QUESTIONS }
