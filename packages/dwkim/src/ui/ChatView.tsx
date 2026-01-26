import { Box, Static, Text, useApp, useInput, useStdout } from 'ink'
import TextInput from 'ink-text-input'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  PersonaApiClient,
  type ProgressItem,
  type StreamEvent
} from '../utils/personaApiClient.js'
import { icons } from './data.js'
import { EmailCollector } from './EmailCollector.js'
import { ExitFeedback } from './ExitFeedback.js'
import { FeedbackPrompt } from './FeedbackPrompt.js'
import { MarkdownText } from './MarkdownText.js'
import { type Message, MessageBubble } from './MessageBubble.js'
import { ProgressPipeline } from './ProgressPipeline.js'
import { type LoadingState, StatusIndicator } from './StatusIndicator.js'
import { SuggestedQuestions } from './SuggestedQuestions.js'
import { theme } from './theme.js'

// config.js는 더 이상 사용하지 않음 - 세션 기반으로 변경

// Extract sources type from discriminated union
type SourcesEvent = Extract<StreamEvent, { type: 'sources' }>

type Status = 'idle' | 'connecting' | 'loading' | 'error'

interface Props {
  apiUrl: string
}

export function ChatView({ apiUrl }: Props) {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const termWidth = stdout?.columns || 80
  const [client] = useState(() => new PersonaApiClient(apiUrl))
  // 메시지 히스토리 (배너를 첫 번째 아이템으로 포함)
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'banner', content: '' }])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('connecting')
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null)
  const [streamContent, setStreamContent] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([])
  const [hideEmailForSession, setHideEmailForSession] = useState(false) // ESC로 세션 중 숨김
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0)
  // HITL: Human Escalation 상태
  const [showEscalation, setShowEscalation] = useState(false)
  const [escalationReason, setEscalationReason] = useState<string>('')
  // HITL: Response Feedback 상태 (Claude Code 스타일)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackResponseCount, setFeedbackResponseCount] = useState(0)
  const [feedbackConfirmed, setFeedbackConfirmed] = useState(false) // 피드백 확인 메시지
  const [hideFeedbackForSession, setHideFeedbackForSession] = useState(false) // 세션 중 피드백 비활성화
  // HITL: Exit Feedback 상태 (종료 시 세션 피드백)
  const [showExitFeedback, setShowExitFeedback] = useState(false)
  // HITL: Correction 감지용 마지막 대화 추적
  const [lastExchange, setLastExchange] = useState<{ query: string; response: string } | null>(null)
  const messageIdRef = useRef(0)

  // HITL: 수정 요청 패턴 감지
  const CORRECTION_PATTERNS = [
    /틀렸/,
    /아니야/,
    /아닌데/,
    /잘못/,
    /수정해/,
    /고쳐/,
    /오류야/,
    /맞지\s*않/,
    /정확하지\s*않/,
    /incorrect/i,
    /wrong/i,
    /fix/i,
    /correct/i
  ]
  const isCorrection = (msg: string) => CORRECTION_PATTERNS.some((p) => p.test(msg))

  const nextId = () => ++messageIdRef.current

  // 초기 연결 확인 (with cleanup + cold start retry)
  useEffect(() => {
    let mounted = true

    // cold start 재시도: 3회, 2초 간격 (fly.io auto_start 대기)
    client
      .checkHealth(3, 2000)
      .then(() => {
        if (!mounted) return
        setStatus('idle')
        setMessages([
          {
            id: nextId(),
            role: 'system',
            content: `${icons.book} /help 도움말  •  Ctrl+C 종료`
          }
        ])
      })
      .catch(() => {
        if (!mounted) return
        setStatus('error')
        setErrorMessage('API 연결 실패. 잠시 후 다시 시도해주세요.')
      })

    return () => {
      mounted = false
    }
  }, [client, nextId])

  // 추천 질문 선택 핸들러
  const handleSuggestionSelect = useCallback((question: string) => {
    setSuggestedQuestions([])
    setInput(question)
  }, [])

  // HITL: 피드백 제출 핸들러 (Claude Code 스타일)
  const handleFeedback = useCallback(
    async (rating: 1 | 2 | 3 | null, disableForSession = false) => {
      setShowFeedback(false)
      if (rating !== null) {
        // 간단한 확인 표시 (1초 후 사라짐)
        setFeedbackConfirmed(true)
        setTimeout(() => setFeedbackConfirmed(false), 1000)
      }
      if (disableForSession) {
        setHideFeedbackForSession(true)
      }
      // 피드백 제출 (실패해도 UX에 영향 없음)
      await client.submitFeedback(rating, sessionId)
    },
    [client, sessionId]
  )

  // HITL: Exit Feedback 핸들러 (피드백 후 종료)
  const handleExitFeedback = useCallback(
    async (rating: 1 | 2 | 3 | null) => {
      setShowExitFeedback(false)
      // 피드백 제출 (실패해도 종료 진행)
      await client.submitFeedback(rating, sessionId)
      exit()
    },
    [client, sessionId, exit]
  )

  // 키보드 처리 (Ctrl+C, ESC, 추천 질문 선택)
  useInput((input, key) => {
    // HITL: Exit Feedback 키 처리
    if (showExitFeedback) {
      if (input === '1') {
        handleExitFeedback(1)
        return
      }
      if (input === '2') {
        handleExitFeedback(2)
        return
      }
      if (input === '3') {
        handleExitFeedback(3)
        return
      }
      if (input === 'd' || input === 'D' || key.escape) {
        handleExitFeedback(null)
        return
      }
      return
    }

    if (key.ctrl && input === 'c') {
      if (feedbackResponseCount > 0) {
        setShowExitFeedback(true)
        return
      }
      exit()
    }

    // 추천 질문 UI 키보드 네비게이션
    if (suggestedQuestions.length > 0 && status === 'idle' && !showEmailInput) {
      if (key.upArrow) {
        setSelectedSuggestionIdx((prev) => Math.max(0, prev - 1))
        return
      }
      if (key.downArrow) {
        setSelectedSuggestionIdx((prev) => Math.min(suggestedQuestions.length - 1, prev + 1))
        return
      }
      if (key.return) {
        handleSuggestionSelect(suggestedQuestions[selectedSuggestionIdx])
        return
      }
      if (input === '1' && suggestedQuestions.length >= 1) {
        handleSuggestionSelect(suggestedQuestions[0])
        return
      }
      if (input === '2' && suggestedQuestions.length >= 2) {
        handleSuggestionSelect(suggestedQuestions[1])
        return
      }
    }

    // HITL: 피드백 키 처리
    if (showFeedback && status === 'idle' && !showEmailInput) {
      if (input === '1') {
        handleFeedback(1)
        return
      }
      if (input === '2') {
        handleFeedback(2)
        return
      }
      if (input === '3') {
        handleFeedback(3)
        return
      }
      if (input === 'D' && key.shift) {
        handleFeedback(null, true)
        return
      }
      if (input === 'd') {
        handleFeedback(null)
        return
      }
      if (input && !key.ctrl && !key.meta && !key.escape) {
        setShowFeedback(false)
      }
    }

    // ESC 처리
    if (key.escape) {
      if (showFeedback) {
        handleFeedback(null)
        return
      }
      if (suggestedQuestions.length > 0) {
        setSuggestedQuestions([])
        return
      }
      if (status === 'loading') {
        client.abort()
        setStatus('idle')
        setLoadingState(null)
        setStreamContent('')
        setMessages((prev) => [...prev, { id: nextId(), role: 'system', content: '\u23F9 취소됨' }])
        return
      }
      if (showEmailInput) {
        setHideEmailForSession(true)
        setShowEmailInput(false)
        setShowEscalation(false)
        setEscalationReason('')
        setEmailInput('')
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'system',
            content: `${icons.info} 이번 세션에서 이메일 안내를 숨겨요.`
          }
        ])
      }
    }
  })

  // 커맨드 핸들러
  const handleCommand = useCallback(
    async (command: string) => {
      const [cmd] = command.slice(1).split(' ')

      switch (cmd) {
        case 'help':
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'system',
              content: `
${icons.book} 명령어
  /help     도움말
  /status   서버 상태
  /clear    초기화

${icons.chat} 단축키
  ESC       응답 취소
  Ctrl+C    종료

${icons.chat} 예시 질문
  어떤 기술을 사용하나요?
  경력에 대해 알려주세요`
            }
          ])
          break

        case 'status':
          try {
            const st = await client.getStatus()
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: 'system',
                content: `${icons.check} ${st.status} • 문서 ${st.rag_engine?.total_documents || 0}개`
              }
            ])
          } catch {
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: 'system', content: `${icons.error} 상태 조회 실패` }
            ])
          }
          break

        case 'clear':
          setSessionId(undefined)
          setMessages([{ id: nextId(), role: 'system', content: `${icons.check} 초기화 완료` }])
          break

        case 'exit':
        case 'quit':
        case 'bye':
          if (feedbackResponseCount > 0) {
            setShowExitFeedback(true)
          } else {
            exit()
          }
          break

        default:
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: 'system', content: `${icons.error} /${cmd} — /help 참고` }
          ])
      }
    },
    [client, feedbackResponseCount, exit, nextId]
  )

  // 메시지 제출
  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim()
      if (!trimmed || status !== 'idle') return

      setInput('')

      if (trimmed.startsWith('/')) {
        await handleCommand(trimmed)
        return
      }

      // HITL: Correction 감지
      if (lastExchange && isCorrection(trimmed)) {
        setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: trimmed }])

        const result = await client.submitCorrection(
          lastExchange.query,
          lastExchange.response,
          trimmed,
          sessionId
        )

        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'system',
            content: result.success
              ? `${icons.check} ${result.message}`
              : `${icons.error} ${result.message}`
          }
        ])
        return
      }

      // 사용자 메시지
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: trimmed }])
      setStatus('loading')
      setLoadingState({ icon: '\u23F3', message: '처리 중...', toolCalls: [] })
      setStreamContent('')

      try {
        let sources: SourcesEvent['sources'] = []
        let fullContent = ''
        let processingTime = 0
        let shouldSuggestContact = false

        for await (const event of client.chatStream(trimmed, sessionId)) {
          switch (event.type) {
            case 'session':
              setSessionId(event.sessionId)
              break
            case 'status':
              setLoadingState((prev) => ({
                icon: event.icon,
                message: event.message,
                toolCalls: prev?.toolCalls || []
              }))
              break
            case 'tool_call':
              setLoadingState((prev) => {
                const toolCalls = [...(prev?.toolCalls || [])]
                const existingIdx = toolCalls.findIndex((t) => t.tool === event.tool)
                const toolState = {
                  tool: event.tool,
                  displayName: event.displayName,
                  icon: event.icon,
                  phase: event.phase,
                  query: event.metadata?.query,
                  resultCount: event.metadata?.resultCount
                }
                if (existingIdx >= 0) {
                  toolCalls[existingIdx] = toolState
                } else {
                  toolCalls.push(toolState)
                }
                return {
                  icon: prev?.icon || '\u{1F527}',
                  message: prev?.message || event.displayName,
                  toolCalls
                }
              })
              break
            case 'sources':
              sources = event.sources
              break
            case 'progress':
              setProgressItems(event.items)
              break
            case 'clarification':
              setSuggestedQuestions(event.suggestedQuestions)
              setSelectedSuggestionIdx(0)
              break
            case 'escalation':
              setEscalationReason(event.reason)
              break
            case 'followup':
              setSuggestedQuestions(event.suggestedQuestions)
              setSelectedSuggestionIdx(0)
              break
            case 'content':
              fullContent += event.content
              setStreamContent(fullContent)
              setProgressItems([])
              break
            case 'done':
              processingTime = event.metadata.processingTime
              shouldSuggestContact = event.metadata.shouldSuggestContact ?? false
              setProgressItems([])
              break
            case 'error':
              throw new ApiError(event.error)
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            content: fullContent,
            sources,
            processingTime,
            shouldSuggestContact
          }
        ])
        setStreamContent('')
        setLoadingState(null)
        setStatus('idle')

        // HITL: Correction 감지를 위한 마지막 대화 저장
        setLastExchange({ query: trimmed, response: fullContent })

        // HITL: 피드백 요청 (3번째 응답마다)
        const newResponseCount = feedbackResponseCount + 1
        setFeedbackResponseCount(newResponseCount)
        if (
          newResponseCount % 3 === 0 &&
          !shouldSuggestContact &&
          !escalationReason &&
          !hideFeedbackForSession
        ) {
          setShowFeedback(true)
        }

        if (shouldSuggestContact && !hideEmailForSession) {
          setShowEmailInput(true)
        }

        if (escalationReason && !hideEmailForSession) {
          setShowEscalation(true)
          setShowEmailInput(true)
        }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : '오류가 발생했습니다.'
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'system', content: `${icons.error} ${message}` }
        ])
        setStreamContent('')
        setLoadingState(null)
        setStatus('idle')
      }
    },
    [
      client,
      status,
      sessionId,
      handleCommand,
      feedbackResponseCount,
      escalationReason,
      hideEmailForSession,
      hideFeedbackForSession,
      isCorrection,
      lastExchange,
      nextId
    ]
  )

  // 이메일 제출 핸들러
  const handleEmailSubmit = useCallback(
    async (email: string) => {
      const trimmedEmail = email.trim()

      if (!trimmedEmail) {
        setShowEmailInput(false)
        setEmailInput('')
        return
      }

      if (emailSubmitting) return

      if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'system',
            content: `${icons.error} 올바른 이메일 주소를 입력해주세요.`
          }
        ])
        return
      }

      setEmailSubmitting(true)

      try {
        const response = await fetch(`${apiUrl}/api/v1/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, sessionId })
        })

        const result = await response.json()

        if (result.success) {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: 'system', content: `${icons.check} ${result.message}` }
          ])
          setShowEmailInput(false)
          setShowEscalation(false)
          setEscalationReason('')
          setEmailInput('')
        } else {
          throw new Error(result.error || '이메일 전송 실패')
        }
      } catch (_error) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'system',
            content: `${icons.error} 이메일 전송에 실패했어요. 다시 시도해주세요.`
          }
        ])
      } finally {
        setEmailSubmitting(false)
      }
    },
    [apiUrl, emailSubmitting, sessionId, nextId]
  )

  // Exit Feedback 모드
  if (showExitFeedback) {
    return <ExitFeedback />
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* 메시지 히스토리 */}
      <Static items={messages}>{(msg) => <MessageBubble key={msg.id} message={msg} />}</Static>

      {/* 스트리밍 응답 */}
      {streamContent.length > 0 && (
        <Box marginTop={1} marginLeft={2}>
          <MarkdownText color={theme.text}>{streamContent}</MarkdownText>
        </Box>
      )}

      {/* Progress 표시 (RAG 파이프라인) */}
      <ProgressPipeline items={progressItems} hidden={!!streamContent} />

      {/* 상태 표시 */}
      <StatusIndicator
        status={status}
        loadingState={loadingState}
        hasProgress={progressItems.length > 0}
      />

      {/* 에러 */}
      {errorMessage !== null && (
        <Box marginBottom={1}>
          <Text color={theme.error}>
            {icons.error} {errorMessage}
          </Text>
        </Box>
      )}

      {/* 추천 질문 UI (A2UI/HITL) */}
      {suggestedQuestions.length > 0 && status === 'idle' && !showEmailInput && !showFeedback && (
        <SuggestedQuestions questions={suggestedQuestions} selectedIndex={selectedSuggestionIdx} />
      )}

      {/* HITL: Response Feedback */}
      {showFeedback && status === 'idle' && !showEmailInput && <FeedbackPrompt />}

      {/* 피드백 확인 메시지 */}
      {feedbackConfirmed && (
        <Box marginLeft={2}>
          <Text color={theme.success}>✓ 감사합니다!</Text>
        </Box>
      )}

      {/* 이메일 입력 UI */}
      {showEmailInput && status === 'idle' && (
        <EmailCollector
          value={emailInput}
          onChange={setEmailInput}
          onSubmit={handleEmailSubmit}
          showEscalation={showEscalation}
          escalationReason={escalationReason}
        />
      )}

      {/* 입력 영역 */}
      {status !== 'connecting' &&
        status !== 'error' &&
        !showEmailInput &&
        !showFeedback &&
        !showExitFeedback && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.surface}>{'─'.repeat(termWidth - 2)}</Text>
            <Box paddingX={1}>
              <Text color={theme.primary}>{icons.arrow} </Text>
              <TextInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                placeholder="질문을 입력하세요..."
              />
            </Box>
            <Text color={theme.surface}>{'─'.repeat(termWidth - 2)}</Text>
          </Box>
        )}
    </Box>
  )
}
