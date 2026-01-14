import { Box, Static, Text, useApp, useInput, useStdout } from 'ink'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  PersonaApiClient,
  type ProgressItem,
  type StreamEvent
} from '../utils/personaApiClient.js'
import { icons } from './data.js'
import { FeedbackPrompt } from './FeedbackPrompt.js'
import { MarkdownText } from './MarkdownText.js'
import { ProfileBanner } from './ProfileCard.js'
import { theme } from './theme.js'

// config.js는 더 이상 사용하지 않음 - 세션 기반으로 변경

// Extract sources type from discriminated union
type SourcesEvent = Extract<StreamEvent, { type: 'sources' }>

interface Message {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: SourcesEvent['sources']
  processingTime?: number
  shouldSuggestContact?: boolean
}

type Status = 'idle' | 'connecting' | 'loading' | 'error'

interface ToolCallState {
  tool: string
  displayName: string
  icon: string
  phase: 'started' | 'executing' | 'completed' | 'error'
  query?: string
  resultCount?: number
}

interface LoadingState {
  icon: string
  message: string
  toolCalls: ToolCallState[]
}

interface Props {
  apiUrl: string
}

export function ChatView({ apiUrl }: Props) {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const termWidth = stdout?.columns || 80
  const [client] = useState(() => new PersonaApiClient(apiUrl))
  // 메시지 히스토리 (배너는 Static 밖에서 별도 렌더링)
  const [messages, setMessages] = useState<Message[]>([])
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
  // HITL: Exit Feedback 상태 (종료 시 세션 피드백)
  const [showExitFeedback, setShowExitFeedback] = useState(false)
  // HITL: Correction 감지용 마지막 대화 추적
  const [lastExchange, setLastExchange] = useState<{ query: string; response: string } | null>(null)
  // 프로필 배너 (Static으로 한 번만 렌더링, 이후 스크롤)
  const [bannerItems] = useState([{ id: 'banner' }])
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
    async (rating: 1 | 2 | 3 | null) => {
      setShowFeedback(false)
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
      // 다른 키는 무시 (종료 대기 중)
      return
    }

    if (key.ctrl && input === 'c') {
      // 대화가 있었으면 피드백 요청, 없으면 바로 종료
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
      // 숫자 키로 직접 선택 (1, 2)
      if (input === '1' && suggestedQuestions.length >= 1) {
        handleSuggestionSelect(suggestedQuestions[0])
        return
      }
      if (input === '2' && suggestedQuestions.length >= 2) {
        handleSuggestionSelect(suggestedQuestions[1])
        return
      }
    }

    // HITL: 피드백 키 처리 (1, 2, 3, d)
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
      if (input === 'd' || input === 'D') {
        handleFeedback(null)
        return
      }
      // 다른 키를 누르면 피드백 dismiss하고 타이핑 시작 (Claude Code 스타일)
      if (input && !key.ctrl && !key.meta && !key.escape) {
        setShowFeedback(false)
        // 입력은 TextInput으로 전달됨
      }
    }

    // ESC 처리
    if (key.escape) {
      // 피드백 닫기 (dismiss)
      if (showFeedback) {
        handleFeedback(null)
        return
      }
      // 추천 질문 닫기
      if (suggestedQuestions.length > 0) {
        setSuggestedQuestions([])
        return
      }
      // 스트리밍 중이면 취소
      if (status === 'loading') {
        client.abort()
        setStatus('idle')
        setLoadingState(null)
        setStreamContent('')
        setMessages((prev) => [...prev, { id: nextId(), role: 'system', content: '⏹ 취소됨' }])
        return
      }
      // 이메일 입력 중이면 이번 세션에서만 숨기기
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
              {
                id: nextId(),
                role: 'system',
                content: `${icons.error} 상태 조회 실패`
              }
            ])
          }
          break

        case 'clear':
          setSessionId(undefined) // 세션 ID 초기화 (새 대화 시작)
          setMessages([
            {
              id: nextId(),
              role: 'system',
              content: `${icons.check} 초기화 완료`
            }
          ])
          break

        case 'exit':
        case 'quit':
        case 'bye':
          // HITL: 대화가 있었으면 피드백 요청, 없으면 바로 종료
          if (feedbackResponseCount > 0) {
            setShowExitFeedback(true)
          } else {
            exit()
          }
          break

        default:
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'system',
              content: `${icons.error} /${cmd} — /help 참고`
            }
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

      // HITL: Correction 감지 - "틀렸어", "아니야" 등
      // 수정 피드백을 저장하고 감사 메시지 표시 (일반 대화는 계속하지 않음)
      if (lastExchange && isCorrection(trimmed)) {
        setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: trimmed }])

        // 수정 피드백 제출
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

        // 수정 피드백 후 종료 (일반 대화로 넘어가지 않음)
        return
      }

      // 사용자 메시지
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: trimmed }])
      setStatus('loading')
      setLoadingState({ icon: '⏳', message: '처리 중...', toolCalls: [] })
      setStreamContent('')

      try {
        let sources: SourcesEvent['sources'] = []
        let fullContent = ''
        let processingTime = 0
        let shouldSuggestContact = false

        for await (const event of client.chatStream(trimmed, sessionId)) {
          switch (event.type) {
            case 'session':
              // 첫 요청 시 서버에서 받은 sessionId 저장 (이후 요청에 사용)
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
                const toolState: ToolCallState = {
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
                  icon: prev?.icon || '🔧',
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
              // A2UI: 모호한 쿼리에 대한 추천 질문 표시
              setSuggestedQuestions(event.suggestedQuestions)
              setSelectedSuggestionIdx(0)
              break
            case 'escalation':
              // HITL: Human Escalation - 높은 불확실성으로 사람 연결 제안
              setEscalationReason(event.reason)
              // done 이벤트 후에 표시하기 위해 플래그만 설정
              break
            case 'followup':
              // HITL: 응답 완료 후 팔로업 질문 제안 (clarification과 동일 UI 재사용)
              setSuggestedQuestions(event.suggestedQuestions)
              setSelectedSuggestionIdx(0)
              break
            case 'content':
              fullContent += event.content
              setStreamContent(fullContent)
              // 컨텐츠 스트리밍 시작하면 progress 숨기기
              setProgressItems([])
              break
            case 'done':
              processingTime = event.metadata.processingTime
              shouldSuggestContact = event.metadata.shouldSuggestContact ?? false
              // 완료 시 progress 초기화 (suggestedQuestions는 유지)
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

        // HITL: 피드백 요청 (3번째 응답마다, 다른 UI가 없을 때)
        // Claude Code 스타일: 간헐적으로, 비침습적으로
        const newResponseCount = feedbackResponseCount + 1
        setFeedbackResponseCount(newResponseCount)
        if (newResponseCount % 3 === 0 && !shouldSuggestContact && !escalationReason) {
          setShowFeedback(true)
        }

        // 5회 이상 대화 시 이메일 입력 UI 표시 (세션 중 숨기지 않은 경우)
        if (shouldSuggestContact && !hideEmailForSession) {
          setShowEmailInput(true)
        }

        // HITL: Escalation이 있으면 이메일 입력 UI 표시 (shouldSuggestContact보다 우선)
        if (escalationReason && !hideEmailForSession) {
          setShowEscalation(true)
          setShowEmailInput(true)
        }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : '오류가 발생했습니다.'
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'system',
            content: `${icons.error} ${message}`
          }
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
      isCorrection,
      lastExchange,
      nextId
    ]
  )

  // 이메일 제출 핸들러
  const handleEmailSubmit = useCallback(
    async (email: string) => {
      const trimmedEmail = email.trim()

      // 빈 입력 시 건너뛰기
      if (!trimmedEmail) {
        setShowEmailInput(false)
        setEmailInput('')
        return
      }

      if (emailSubmitting) return

      // 간단한 이메일 형식 검증
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
            {
              id: nextId(),
              role: 'system',
              content: `${icons.check} ${result.message}`
            }
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

  // Exit Feedback 모드일 때는 다른 UI 숨김
  if (showExitFeedback) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Box
          borderStyle="round"
          borderColor={theme.lavender}
          paddingX={2}
          paddingY={1}
          flexDirection="column"
        >
          <Text color={theme.lavender} bold>
            {icons.chat} 떠나시기 전에...
          </Text>
          <Box marginTop={1}>
            <Text color={theme.subtext}>오늘 대화가 도움이 됐나요?</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.success}>[1]</Text>
            <Text color={theme.subtext}> 매우 도움됨 </Text>
            <Text color={theme.warning}>[2]</Text>
            <Text color={theme.subtext}> 조금 도움됨 </Text>
            <Text color={theme.error}>[3]</Text>
            <Text color={theme.subtext}> 별로... </Text>
            <Text color={theme.muted}>[d]</Text>
            <Text color={theme.subtext}> 스킵</Text>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* 프로필 배너 (Static으로 한 번만 렌더링, 이후 스크롤) */}
      <Static items={bannerItems}>{() => <ProfileBanner />}</Static>

      {/* 메시지 히스토리 (Static으로 flicker 방지) */}
      <Static items={messages}>{(msg) => <MessageBubble key={msg.id} message={msg} />}</Static>

      {/* 스트리밍 응답 */}
      {streamContent.length > 0 && (
        <Box marginTop={1} marginLeft={2}>
          <MarkdownText color={theme.text}>{streamContent}</MarkdownText>
        </Box>
      )}

      {/* Progress 표시 (RAG 파이프라인 진행 상태 with animated spinner + detail) */}
      {progressItems.length > 0 && !streamContent && (
        <Box flexDirection="column" marginY={1} marginLeft={2}>
          {progressItems.map((item) => (
            <Box key={item.id}>
              {item.status === 'in_progress' ? (
                <Text color={theme.lavender}>
                  <Spinner type="dots" /> {item.label}
                  {item.detail ? <Text color={theme.muted}> — {item.detail}</Text> : null}
                </Text>
              ) : (
                <Text
                  color={item.status === 'completed' ? theme.success : theme.muted}
                  dimColor={item.status === 'pending'}
                >
                  {item.status === 'completed' ? '✓' : '○'} {item.label}
                  {item.status === 'completed' && item.detail ? (
                    <Text color={theme.muted}> — {item.detail}</Text>
                  ) : null}
                </Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* 상태 표시 (progress 없을 때만) */}
      {status !== 'idle' && status !== 'error' && !progressItems.length && (
        <Box flexDirection="column" marginY={1}>
          <Box>
            {status === 'loading' && (
              <Text color={theme.lavender}>
                <Spinner type="dots" />
              </Text>
            )}
            {status === 'connecting' && (
              <Text color={theme.info}>
                <Spinner type="dots" />
              </Text>
            )}
            <Text color={theme.info}>
              {' '}
              {status === 'connecting' ? '연결 중...' : loadingState?.message || '처리 중...'}
            </Text>
          </Box>
          {loadingState?.toolCalls && loadingState.toolCalls.length > 0 && (
            <Box flexDirection="column" marginLeft={2} marginTop={0}>
              {loadingState.toolCalls.map((tool, idx) => (
                <Box key={`${tool.tool}-${idx}`}>
                  <Text color={tool.phase === 'completed' ? theme.success : theme.muted}>
                    {tool.phase === 'completed' ? '✓' : tool.phase === 'error' ? '✗' : '○'}{' '}
                    {tool.displayName}
                    {tool.query ? <Text dimColor> "{tool.query}"</Text> : null}
                    {tool.resultCount !== undefined ? (
                      <Text dimColor> → {tool.resultCount}건</Text>
                    ) : null}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* 에러 */}
      {errorMessage !== null && (
        <Box marginBottom={1}>
          <Text color={theme.error}>
            {icons.error} {errorMessage}
          </Text>
        </Box>
      )}

      {/* 추천 질문 UI (A2UI/HITL - 모호한 쿼리 또는 팔로업) - inline style */}
      {suggestedQuestions.length > 0 && status === 'idle' && !showEmailInput && !showFeedback && (
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          <Text color={theme.muted} dimColor>
            ? 더 구체적으로 물어보시겠어요?
          </Text>
          {suggestedQuestions.map((q, idx) => (
            <Box key={`suggestion-${idx}`} marginLeft={2}>
              <Text
                color={idx === selectedSuggestionIdx ? theme.lavender : theme.muted}
                bold={idx === selectedSuggestionIdx}
              >
                {idx === selectedSuggestionIdx ? '› ' : '  '}[{idx + 1}] {q}
              </Text>
            </Box>
          ))}
          <Text color={theme.muted} dimColor>
            {'  '}↑↓ 선택 · Enter 질문 · ESC 닫기
          </Text>
        </Box>
      )}

      {/* HITL: Response Feedback (Claude Code 스타일) */}
      {showFeedback && status === 'idle' && !showEmailInput && <FeedbackPrompt />}

      {/* 이메일 입력 UI (HITL 패턴 - 일반 또는 Escalation) */}
      {showEmailInput && status === 'idle' && (
        <Box flexDirection="column" marginTop={1} paddingX={1}>
          <Box
            borderStyle="round"
            borderColor={showEscalation ? theme.peach : theme.lavender}
            paddingX={2}
            paddingY={1}
            flexDirection="column"
          >
            <Text color={showEscalation ? theme.peach : theme.lavender}>
              {showEscalation ? '🤔 ' : '📧 '}
              {showEscalation
                ? escalationReason || '이 질문은 정확한 답변을 위해 직접 연락드리고 싶어요.'
                : '더 깊은 이야기가 필요하신 것 같아요!'}
            </Text>
            <Text color={theme.muted} dimColor>
              이메일 남겨주시면 동욱이 직접 연락드릴게요.
            </Text>
            <Box marginTop={1}>
              <Text color={theme.primary}>이메일: </Text>
              <TextInput
                value={emailInput}
                onChange={setEmailInput}
                onSubmit={handleEmailSubmit}
                placeholder="your@email.com"
              />
            </Box>
            <Box marginTop={1}>
              <Text color={theme.muted} dimColor>
                Enter: 전송 • 빈값 Enter: 넘어가기 • ESC: 다시보지않기
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* 입력 영역 (위아래 선) */}
      {status !== 'connecting' && status !== 'error' && !showEmailInput && (
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

const MessageBubble = React.memo(function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* 메시지 본문 */}
      <Box marginLeft={isUser ? 0 : 2}>
        {isUser && <Text color={theme.lavender}>{icons.arrow} </Text>}
        {message.role === 'assistant' ? (
          <MarkdownText color={theme.text}>{message.content}</MarkdownText>
        ) : (
          <Text color={isUser ? theme.lavender : theme.muted} dimColor={isSystem}>
            {message.content}
          </Text>
        )}
      </Box>

      {/* 소스 (간략화) */}
      {message.sources && message.sources.length > 0 && (
        <Box marginLeft={4} marginTop={0}>
          <Text color={theme.muted} dimColor>
            {icons.book} {message.sources.length}개 문서 참조
          </Text>
        </Box>
      )}

      {/* 처리 시간 */}
      {message.processingTime !== undefined && message.processingTime > 0 && (
        <Box marginLeft={4}>
          <Text color={theme.muted} dimColor>
            {icons.clock} {message.processingTime}ms
          </Text>
        </Box>
      )}
    </Box>
  )
})
