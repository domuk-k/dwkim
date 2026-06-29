import {
  CombinedAutocompleteProvider,
  Editor,
  type EditorTheme,
  Input,
  type OverlayHandle,
  ProcessTerminal,
  type SelectList,
  Text,
  TUI
} from '@mariozechner/pi-tui'
import { createChatHistoryText, renderAllMessages } from './components/chatHistory.js'
import {
  createProgressView,
  stopProgressSpinner,
  updateProgressView
} from './components/progressPipeline.js'
import {
  createStatusLoader,
  createToolCallsView,
  updateToolCallsView
} from './components/statusBar.js'
import { createStreamingView, updateStreamingContent } from './components/streamingView.js'
import {
  createElicitationView,
  createSuggestedQuestionsView
} from './components/suggestedQuestions.js'
import {
  createProfileImage,
  createWelcomeHintText,
  createWelcomeScopeText,
  createWelcomeSelectList
} from './components/welcomeView.js'
import { createExitFeedbackOverlay } from './overlays/exitFeedback.js'
import {
  createFeedbackView,
  showFeedbackConfirmed,
  showFeedbackPrompt
} from './overlays/feedbackPrompt.js'
import { createSourcesPanel, updateSourcesPanel } from './overlays/sourcesPanel.js'
import { createInitialState, transition } from './state/machine.js'
import type { AppEvent, AppState, LoadingState, ToolCallState } from './state/types.js'
import { isCorrection, STARTER_QUESTIONS } from './state/types.js'
import { icons } from './ui/data.js'
import { ScreenRuntime } from './ui/screenRuntime.js'
import { c } from './ui/theme.js'
import { TuiFrame } from './ui/tuiFrame.js'
import { setClipboardText } from './utils/clipboard.js'
import { loadConfig } from './utils/config.js'
import { logger } from './utils/logger.js'
import { sendNotification } from './utils/notify.js'
import { ApiError, PersonaApiClient, type StreamEvent } from './utils/personaApiClient.js'

type SourcesEvent = Extract<StreamEvent, { type: 'sources' }>

const DEFAULT_API_URL = 'https://persona-api.fly.dev'
const API_URL = process.env.DWKIM_API_URL || DEFAULT_API_URL

// ─────────────────────────────────────────────────────────────
// App: wires state machine → pi-tui components
// ─────────────────────────────────────────────────────────────

export async function startApp(): Promise<void> {
  const terminal = new ProcessTerminal()
  const tui = new TUI(terminal, true)
  const client = new PersonaApiClient(API_URL)

  let state = createInitialState()

  // ─── Component tree ───────────────────────────────────
  const frame = new TuiFrame()
  const chatHistory = createChatHistoryText()
  const profileImage = createProfileImage()
  const welcomeScopeText = createWelcomeScopeText()
  const welcomeSelectList = createWelcomeSelectList()
  const welcomeHintText = createWelcomeHintText()
  const streamingView = createStreamingView()
  const progressView = createProgressView()
  const toolCallsView = createToolCallsView()
  let suggestedQuestionsView: SelectList | null = null
  let elicitationView: SelectList | null = null
  let elicitationPromptText: Text | null = null
  const feedbackView = createFeedbackView()
  const sourcesPanel = createSourcesPanel()

  // Composer editor
  const editorTheme: EditorTheme = {
    borderColor: c.surface,
    selectList: {
      selectedPrefix: c.lavender,
      selectedText: c.lavender,
      description: c.muted,
      scrollInfo: c.dim,
      noMatch: c.muted
    }
  }
  const autocompleteProvider = new CombinedAutocompleteProvider([
    { name: 'help', description: '도움말' },
    { name: 'status', description: '서버 상태' },
    { name: 'clear', description: '초기화' },
    { name: 'exit', description: '종료' }
  ])
  const inputField = new Editor(tui, editorTheme, { paddingX: 0 })
  inputField.setAutocompleteProvider(autocompleteProvider)

  // Status loader (created but not always visible)
  const statusLoader = createStatusLoader(tui)

  // Overlay handle for exit feedback
  let exitFeedbackOverlay: OverlayHandle | null = null

  let emailInput: Input | null = null
  let emailHeaderText: Text | null = null
  let emailHintText: Text | null = null

  // ─── Build initial tree ───────────────────────────────
  frame.setSlot('history', 'chat', [chatHistory])
  // Show connecting loader immediately
  statusLoader.setMessage('연결 중...')
  statusLoader.start()
  frame.setSlot('main', 'connecting', [statusLoader])
  tui.addChild(frame)
  tui.start()

  const screenRuntime = new ScreenRuntime(
    {
      connecting: { exit: exitConnecting },
      welcome: { enter: enterWelcome, exit: exitWelcome },
      idle: { enter: enterIdle, update: updateIdle, exit: exitIdle },
      loading: { enter: enterLoading, update: updateLoading, exit: exitLoading },
      emailInput: { enter: enterEmailInput, exit: exitEmailInput },
      feedback: { enter: enterFeedback, exit: exitFeedback },
      feedbackConfirmed: { enter: enterFeedbackConfirmed, exit: exitFeedback },
      exitFeedback: { enter: enterExitFeedback, exit: exitExitFeedback },
      error: { enter: enterError, exit: exitError }
    },
    () => tui.requestRender()
  )

  // ─── Dispatch & render ────────────────────────────────
  function dispatch(event: AppEvent): void {
    const prev = state
    state = transition(state, event)
    renderState(prev, state)
  }

  function renderState(prev: AppState, next: AppState): void {
    // Messages
    if (prev.messages !== next.messages) {
      chatHistory.setText(renderAllMessages(next.messages))
    }

    // Sources panel
    if (prev.expandedSourcesMsgId !== next.expandedSourcesMsgId) {
      if (next.expandedSourcesMsgId !== null) {
        const msg = next.messages.find((m) => m.id === next.expandedSourcesMsgId)
        updateSourcesPanel(sourcesPanel, msg?.sources)
        frame.setSlot('auxiliary', 'sources', [sourcesPanel])
      } else {
        frame.clearSlot('auxiliary', 'sources')
      }
    }

    // Email error: show inline in email UI
    if (
      next.mode === 'emailInput' &&
      prev.mode === 'emailInput' &&
      prev.messages !== next.messages &&
      emailHintText
    ) {
      const lastMsg = next.messages[next.messages.length - 1]
      if (lastMsg?.role === 'system' && lastMsg.content.includes(icons.error)) {
        emailHintText.setText(
          `\n${c.error(lastMsg.content)}\n${c.dim(c.muted('Enter: 전송 · 빈값 Enter: 넘어가기 · ESC: 다시보지않기'))}`
        )
      }
    }

    screenRuntime.render(prev, next)
  }

  function exitConnecting(): void {
    statusLoader.stop()
    frame.clearSlot('main', 'connecting')
  }

  function enterWelcome(): void {
    welcomeSelectList.setSelectedIndex(0)
    welcomeSelectList.onSelect = (item) => {
      const idx = STARTER_QUESTIONS.indexOf(item.value)
      dispatch({ type: 'STARTER_SELECT', index: idx >= 0 ? idx : 0 })
      handleChat(item.value)
    }
    welcomeSelectList.onCancel = () => dispatch({ type: 'WELCOME_DISMISS' })

    frame.setSlot('main', 'welcome', [
      profileImage,
      welcomeScopeText,
      welcomeSelectList,
      welcomeHintText
    ])
    setupInputArea('')
    tui.setFocus(welcomeSelectList)
  }

  function exitWelcome(): void {
    frame.clearSlot('main', 'welcome')
    frame.clearSlot('composer', 'input')
  }

  function enterIdle(next: AppState): void {
    if (next.mode !== 'idle') return
    setupInputArea(next.input)
    syncIdlePrompt(next)
  }

  function updateIdle(prev: AppState, next: AppState): void {
    if (prev.mode !== 'idle' || next.mode !== 'idle') return
    if (
      prev.suggestedQuestions !== next.suggestedQuestions ||
      prev.pendingElicitation !== next.pendingElicitation
    ) {
      syncIdlePrompt(next)
    }
  }

  function exitIdle(): void {
    frame.clearSlot('composer', 'input')
    clearIdlePrompt()
  }

  function enterLoading(next: AppState): void {
    if (next.mode !== 'loading') return

    updateStreamingContent(streamingView, '')
    updateProgressView(progressView, [], false)
    updateToolCallsView(toolCallsView, next.loadingState)

    inputField.disableSubmit = true
    frame.setSlot('main', 'streaming', [streamingView])
    frame.setSlot('main', 'progress', [progressView])
    frame.setSlot('main', 'toolCalls', [toolCallsView])
    tui.setFocus(null)
  }

  function updateLoading(prev: AppState, next: AppState): void {
    if (prev.mode !== 'loading' || next.mode !== 'loading') return

    if (prev.streamContent !== next.streamContent) {
      updateStreamingContent(streamingView, next.streamContent)
    }
    if (prev.progressItems !== next.progressItems) {
      updateProgressView(progressView, next.progressItems, !!next.streamContent)
    }
    if (prev.loadingState !== next.loadingState) {
      updateToolCallsView(toolCallsView, next.loadingState)
    }
    if (next.streamContent && frame.hasSlot('main', 'toolCalls')) {
      frame.clearSlot('main', 'toolCalls')
    }
  }

  function exitLoading(): void {
    stopProgressSpinner()
    frame.clearSlot('main', 'streaming')
    frame.clearSlot('main', 'progress')
    frame.clearSlot('main', 'toolCalls')
  }

  function enterEmailInput(next: AppState): void {
    if (next.mode !== 'emailInput') return

    const escalation = next.escalation
    const color = escalation.show ? c.peach : c.lavender
    const headerIcon = escalation.show ? '🤔 ' : '📧 '
    const headerMsg = escalation.show
      ? escalation.reason || '이 질문은 정확한 답변을 위해 직접 연락드리고 싶어요.'
      : '더 깊은 이야기가 필요하신 것 같아요!'

    emailHeaderText = new Text('', 2, 0)
    emailHeaderText.setText(
      [
        '',
        color(`${headerIcon}${headerMsg}`),
        c.dim(c.muted('이메일 남겨주시면 동욱이 직접 연락드릴게요.')),
        '',
        c.primary('이메일: ')
      ].join('\n')
    )

    emailInput = new Input()
    emailInput.onSubmit = (value: string) => handleEmailSubmit(value)
    emailInput.onEscape = () => dispatch({ type: 'EMAIL_DISMISS' })

    emailHintText = new Text('', 2, 0)
    emailHintText.setText(
      `\n${c.dim(c.muted('Enter: 전송 · 빈값 Enter: 넘어가기 · ESC: 다시보지않기'))}`
    )

    frame.setSlot('main', 'email', [emailHeaderText, emailInput, emailHintText])
    tui.setFocus(emailInput)
  }

  function exitEmailInput(): void {
    frame.clearSlot('main', 'email')
    emailInput = null
    emailHeaderText = null
    emailHintText = null
  }

  function enterFeedback(): void {
    showFeedbackPrompt(feedbackView)
    frame.setSlot('main', 'feedback', [feedbackView])
    tui.setFocus(null)
  }

  function enterFeedbackConfirmed(): void {
    showFeedbackConfirmed(feedbackView)
    frame.setSlot('main', 'feedback', [feedbackView])
    tui.setFocus(null)
    setTimeout(() => dispatch({ type: 'FEEDBACK_CONFIRMED_DONE' }), 1000)
  }

  function exitFeedback(): void {
    frame.clearSlot('main', 'feedback')
  }

  function enterExitFeedback(): void {
    const overlay = createExitFeedbackOverlay()
    exitFeedbackOverlay = tui.showOverlay(overlay, {
      anchor: 'center',
      width: '60%'
    })
    tui.setFocus(null)
  }

  function exitExitFeedback(): void {
    if (exitFeedbackOverlay) {
      exitFeedbackOverlay.hide()
      exitFeedbackOverlay = null
    }
  }

  function enterError(next: AppState): void {
    if (next.mode !== 'error') return
    const errText = new Text('', 1, 0)
    errText.setText(`\n${c.error(`${icons.error} ${next.errorMessage}`)}`)
    frame.setSlot('main', 'error', [errText])
  }

  function exitError(): void {
    frame.clearSlot('main', 'error')
  }

  function setupInputArea(value: string): void {
    inputField.setText(value)
    inputField.disableSubmit = false
    frame.setSlot('composer', 'input', [inputField])
    tui.setFocus(inputField)
  }

  function syncIdlePrompt(next: Extract<AppState, { mode: 'idle' }>): void {
    clearIdlePrompt()

    if (next.pendingElicitation) {
      elicitationPromptText = new Text(c.lavender(next.pendingElicitation.prompt), 1, 0)
      elicitationView = createElicitationView(next.pendingElicitation.options)
      elicitationView.onSelect = (item) =>
        dispatch({ type: 'ELICITATION_SELECT', value: item.value, label: item.label })
      elicitationView.onCancel = () => dispatch({ type: 'ELICITATION_DISMISS' })
      frame.setSlot('main', 'elicitation', [elicitationPromptText, elicitationView])
      tui.setFocus(elicitationView)
      return
    }

    if (next.suggestedQuestions.length > 0) {
      suggestedQuestionsView = createSuggestedQuestionsView(next.suggestedQuestions)
      suggestedQuestionsView.onSelect = (item) => selectSuggestion(item.value)
      suggestedQuestionsView.onCancel = () => dispatch({ type: 'SUGGESTION_DISMISS' })
      frame.setSlot('main', 'suggestions', [suggestedQuestionsView])
      tui.setFocus(suggestedQuestionsView)
      return
    }

    tui.setFocus(inputField)
  }

  function clearIdlePrompt(): void {
    frame.clearSlot('main', 'suggestions')
    frame.clearSlot('main', 'elicitation')
    suggestedQuestionsView = null
    elicitationPromptText = null
    elicitationView = null
  }

  // ─── Input handling ───────────────────────────────────
  inputField.onSubmit = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    inputField.addToHistory(trimmed)

    if (trimmed.startsWith('/')) {
      handleCommand(trimmed)
      return
    }

    // Correction detection
    if (state.lastExchange && isCorrection(trimmed)) {
      handleCorrection(trimmed)
      return
    }

    dispatch({ type: 'SUBMIT', value: trimmed })
    handleChat(trimmed)
  }

  // Global key handler at TUI level — intercepts ALL keys before focused element routing.
  // TUI.handleInput is private in TypeScript but we bypass for global key interception.
  // biome-ignore lint/suspicious/noExplicitAny: bypassing private access for global key handling
  const origTuiHandleInput = (tui as any).handleInput.bind(tui)
  // biome-ignore lint/suspicious/noExplicitAny: bypassing private access for global key handling
  ;(tui as any).handleInput = (data: string) => {
    // Ctrl+C — always works regardless of focus/mode
    if (data === '\x03') {
      // Abort any in-flight stream first
      if (state.mode === 'loading') {
        client.abort()
        dispatch({ type: 'STREAM_CANCEL' })
      }
      if (state.feedbackResponseCount > 0) {
        dispatch({ type: 'EXIT_FEEDBACK_SHOW' })
        return
      }
      cleanup()
      process.exit(0)
    }

    // Exit feedback mode — intercept all keys
    if (state.mode === 'exitFeedback') {
      handleExitFeedbackKey(data)
      return
    }

    // ESC key — let SelectList handle it for welcome/suggestions via onCancel
    if (data === '\x1b') {
      if (state.mode === 'feedback') {
        dispatch({ type: 'FEEDBACK_DISABLE' })
        return
      }
      if (state.mode === 'loading') {
        client.abort()
        dispatch({ type: 'STREAM_CANCEL' })
        return
      }
      // idle 모드: 입력 내용이 있으면 비우기
      if (state.mode === 'idle' && state.suggestedQuestions.length === 0) {
        if (inputField.getText().trim()) {
          inputField.setText('')
          return
        }
      }
      // Welcome and suggestions ESC: fall through to SelectList's onCancel
    }

    // Welcome mode — SelectList handles ↑↓/Enter/Esc internally
    if (state.mode === 'welcome') {
      // Number keys for quick selection
      const numKey = Number(data)
      if (numKey >= 1 && numKey <= STARTER_QUESTIONS.length) {
        dispatch({ type: 'STARTER_SELECT', index: numKey - 1 })
        handleChat(STARTER_QUESTIONS[numKey - 1])
        return
      }
      // Printable char: dismiss welcome, start typing
      if (data.length === 1 && data >= ' ') {
        dispatch({ type: 'WELCOME_DISMISS' })
        // Pass through to focused input
        origTuiHandleInput(data)
        return
      }
      // Let SelectList handle ↑↓/Enter/Esc
      origTuiHandleInput(data)
      return
    }

    // Suggestions — SelectList handles ↑↓/Enter/Esc internally
    if (state.mode === 'idle' && state.suggestedQuestions.length > 0) {
      // Number keys for quick selection
      if (data === '1' && state.suggestedQuestions.length >= 1) {
        selectSuggestion(state.suggestedQuestions[0])
        return
      }
      if (data === '2' && state.suggestedQuestions.length >= 2) {
        selectSuggestion(state.suggestedQuestions[1])
        return
      }
      // Printable char (not number): dismiss suggestions, start typing
      if (data.length === 1 && data >= ' ' && data !== '1' && data !== '2') {
        dispatch({ type: 'SUGGESTION_DISMISS' })
        // Pass through to input
        origTuiHandleInput(data)
        return
      }
      // Let SelectList handle ↑↓/Enter/Esc
      origTuiHandleInput(data)
      return
    }

    // Ctrl+Y (\x19) in idle: 마지막 어시스턴트 응답을 클립보드에 복사.
    // idle + suggestions/elicitation 없음으로 게이팅 → SelectList 포커스/스트리밍과 충돌 방지.
    // setClipboardText는 절대 throw하지 않고 실패 시 false를 반환한다.
    if (
      state.mode === 'idle' &&
      data === '\x19' &&
      state.suggestedQuestions.length === 0 &&
      !state.pendingElicitation
    ) {
      const lastAssistant = [...state.messages].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant) {
        setClipboardText(lastAssistant.content)
        // NOTE: 복사 성공/실패 배너는 별도 상태 이벤트가 필요해 생략 (state machine 미변경).
      }
      return
    }

    // Sources toggle: 's' key in idle (only when sources exist)
    if (state.mode === 'idle' && data === 's' && state.suggestedQuestions.length === 0) {
      const hasSources = state.messages.some(
        (m) => m.role === 'assistant' && m.sources && m.sources.length > 0
      )
      if (hasSources || state.expandedSourcesMsgId !== null) {
        dispatch({ type: 'TOGGLE_SOURCES' })
        return
      }
    }

    // Feedback mode keys (no input focus)
    if (state.mode === 'feedback') {
      handleFeedbackKey(data)
      return
    }

    // Default: route to focused element via pi-tui
    origTuiHandleInput(data)
  }

  function selectSuggestion(question: string): void {
    dispatch({ type: 'SUBMIT', value: question })
    handleChat(question)
  }

  function handleFeedbackKey(data: string): void {
    if (data === '1') {
      dispatch({ type: 'FEEDBACK_RATE', rating: 1 })
      client.submitFeedback(1, state.sessionId)
      return
    }
    if (data === '2') {
      dispatch({ type: 'FEEDBACK_RATE', rating: 2 })
      client.submitFeedback(2, state.sessionId)
      return
    }
    if (data === '3') {
      dispatch({ type: 'FEEDBACK_RATE', rating: 3 })
      client.submitFeedback(3, state.sessionId)
      return
    }
    if (data === 'd' || data === 'D') {
      dispatch({ type: 'FEEDBACK_SKIP' })
      return
    }
    // Any other key: dismiss feedback, start typing
    if (data.length === 1 && data >= ' ') {
      dispatch({ type: 'FEEDBACK_SKIP' })
      // Forward the character to the now-focused input
      origTuiHandleInput(data)
    }
  }

  function handleExitFeedbackKey(data: string): void {
    const submitAndExit = async (rating: 1 | 2 | 3 | null) => {
      await client.submitFeedback(rating, state.sessionId)
      cleanup()
      process.exit(0)
    }

    if (data === '1') {
      submitAndExit(1)
      return
    }
    if (data === '2') {
      submitAndExit(2)
      return
    }
    if (data === '3') {
      submitAndExit(3)
      return
    }
    if (data === 'd' || data === 'D' || data === '\x1b') {
      submitAndExit(null)
    }
  }

  // ─── Chat streaming ──────────────────────────────────
  async function handleChat(message: string): Promise<void> {
    try {
      // capture: 직전 턴에 선택한 visitorType을 이번 요청에 실어 보내고 clear
      const visitorType = state.capturedVisitorType ?? undefined
      if (visitorType) dispatch({ type: 'ELICITATION_CONSUMED' })

      let sources: SourcesEvent['sources'] = []
      let fullContent = ''
      let processingTime = 0
      let shouldSuggestContact = false
      let confidence: 'high' | 'medium' | 'low' | undefined
      let loadingState: LoadingState = { icon: '⏳', message: '처리 중...', toolCalls: [] }

      for await (const event of client.chatStream(message, state.sessionId, visitorType)) {
        switch (event.type) {
          case 'session':
            dispatch({ type: 'STREAM_SESSION', sessionId: event.sessionId })
            break
          case 'status':
            loadingState = {
              icon: event.icon,
              message: event.message,
              toolCalls: loadingState.toolCalls
            }
            dispatch({ type: 'STREAM_STATUS', loadingState })
            break
          case 'tool_call': {
            const toolCalls = [...loadingState.toolCalls]
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
            loadingState = { ...loadingState, toolCalls }
            dispatch({ type: 'STREAM_TOOL_CALL', loadingState })
            break
          }
          case 'sources':
            sources = event.sources
            break
          case 'progress':
            dispatch({ type: 'STREAM_PROGRESS', items: event.items })
            break
          case 'clarification':
            dispatch({ type: 'STREAM_CLARIFICATION', questions: event.suggestedQuestions })
            break
          case 'escalation':
            dispatch({ type: 'STREAM_ESCALATION', reason: event.reason })
            break
          case 'followup':
            dispatch({ type: 'STREAM_FOLLOWUP', questions: event.suggestedQuestions })
            break
          case 'elicitation':
            dispatch({ type: 'STREAM_ELICITATION', elicitation: event })
            break
          case 'content':
            fullContent += event.content
            dispatch({ type: 'STREAM_CONTENT', fullContent })
            break
          case 'done':
            processingTime = event.metadata.processingTime
            shouldSuggestContact = event.metadata.shouldSuggestContact ?? false
            confidence = event.metadata.confidence
            break
          case 'error':
            throw new ApiError(event.error)
        }
      }

      dispatch({
        type: 'STREAM_DONE',
        fullContent,
        sources,
        processingTime,
        shouldSuggestContact,
        confidence
      })

      // 응답 완료 알림 (벨/시스템). config는 핸들러 내부에서 읽어 라이브 변경을 반영.
      // 기본값 'bell'. content 스트리밍 분기가 아닌 완료 시 1회만 발사.
      sendNotification('response_done', { mode: loadConfig().notifyMode ?? 'bell' })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      const message = error instanceof ApiError ? error.message : '오류가 발생했습니다.'
      dispatch({ type: 'STREAM_ERROR', error: message })
    }
  }

  // ─── Commands ─────────────────────────────────────────
  async function handleCommand(input: string): Promise<void> {
    const [cmd] = input.slice(1).split(' ')

    switch (cmd) {
      case 'help':
        dispatch({
          type: 'CMD_HELP',
          helpText: `
명령어
  /help     도움말
  /status   서버 상태
  /clear    초기화

단축키
  ESC       응답 취소
  Ctrl+C    종료

예시 질문
  어떤 기술을 사용하나요?
  경력에 대해 알려주세요`
        })
        break

      case 'status':
        try {
          const st = await client.getStatus()
          dispatch({
            type: 'CMD_STATUS_OK',
            statusText: `${icons.check} ${st.status} · 문서 ${st.rag_engine?.total_documents || 0}개`
          })
        } catch (error) {
          logger.warn('status_failed', {
            error: error instanceof Error ? error.message : String(error)
          })
          dispatch({ type: 'CMD_STATUS_FAIL' })
        }
        break

      case 'clear':
        dispatch({ type: 'CMD_CLEAR' })
        break

      case 'exit':
      case 'quit':
      case 'bye':
        if (state.feedbackResponseCount > 0) {
          dispatch({ type: 'EXIT_FEEDBACK_SHOW' })
        } else {
          cleanup()
          process.exit(0)
        }
        break

      default:
        dispatch({
          type: 'CMD_HELP',
          helpText: `${icons.error} /${cmd} — /help 참고`
        })
    }
  }

  // ─── Email submission ─────────────────────────────────
  async function handleEmailSubmit(email: string): Promise<void> {
    const trimmed = email.trim()
    if (!trimmed) {
      dispatch({ type: 'EMAIL_DISMISS' })
      return
    }

    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      dispatch({ type: 'EMAIL_SUBMIT_ERROR', message: '올바른 이메일 주소를 입력해주세요.' })
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, sessionId: state.sessionId })
      })
      const result = (await response.json()) as {
        success: boolean
        message: string
        error?: string
      }
      if (result.success) {
        dispatch({ type: 'EMAIL_SUBMIT_SUCCESS', message: result.message })
      } else {
        throw new Error(result.error || '이메일 전송 실패')
      }
    } catch (error) {
      logger.warn('email_submit_failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      dispatch({
        type: 'EMAIL_SUBMIT_ERROR',
        message: '이메일 전송에 실패했어요. 다시 시도해주세요.'
      })
    }
  }

  // ─── Correction ───────────────────────────────────────
  async function handleCorrection(message: string): Promise<void> {
    if (!state.lastExchange) return

    // Add user message without entering loading mode
    const { query, response } = state.lastExchange
    inputField.setText('')

    try {
      const result = await client.submitCorrection(query, response, message, state.sessionId)
      if (result.success) {
        dispatch({ type: 'CORRECTION_SUCCESS', message: result.message })
      } else {
        dispatch({ type: 'CORRECTION_FAIL', message: result.message })
      }
    } catch (error) {
      logger.warn('correction_failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      dispatch({ type: 'CORRECTION_FAIL', message: '수정 요청에 실패했어요.' })
    }
  }

  // ─── Cleanup ──────────────────────────────────────────
  function cleanup(): void {
    stopProgressSpinner()
    statusLoader.stop()
    tui.stop()
  }

  // ─── Health check & start ─────────────────────────────
  try {
    await client.checkHealth(3, 2000)
    dispatch({ type: 'HEALTH_OK' })
  } catch (error) {
    logger.warn('health_check_failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    dispatch({ type: 'HEALTH_FAIL', error: 'API 연결 실패. 잠시 후 다시 시도해주세요.' })
  }
}
