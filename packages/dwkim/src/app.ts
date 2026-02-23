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
import { createSuggestedQuestionsView } from './components/suggestedQuestions.js'
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
import { c } from './ui/theme.js'
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
  const chatHistory = createChatHistoryText()
  const profileImage = createProfileImage()
  const welcomeScopeText = createWelcomeScopeText()
  const welcomeSelectList = createWelcomeSelectList()
  const welcomeHintText = createWelcomeHintText()
  const streamingView = createStreamingView()
  const progressView = createProgressView()
  const toolCallsView = createToolCallsView()
  let suggestedQuestionsView: SelectList | null = null
  const feedbackView = createFeedbackView()
  const sourcesPanel = createSourcesPanel()

  // Input separator + editor
  const inputSeparator = new Text('', 0, 0)
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

  // Track which components are currently in the tree
  let loaderInTree = false
  let welcomeInTree = false
  let inputInTree = false
  let feedbackInTree = false
  let sourcesInTree = false
  let emailInTree = false
  let suggestionsInTree = false
  let toolCallsInTree = false
  let emailInput: Input | null = null
  let emailHeaderText: Text | null = null
  let emailHintText: Text | null = null

  // ─── Build initial tree ───────────────────────────────
  tui.addChild(chatHistory)
  // Show connecting loader immediately
  statusLoader.setMessage('연결 중...')
  statusLoader.start()
  tui.addChild(statusLoader)
  loaderInTree = true
  tui.start()

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
        if (!sourcesInTree) {
          tui.addChild(sourcesPanel)
          sourcesInTree = true
        }
      } else {
        if (sourcesInTree) {
          tui.removeChild(sourcesPanel)
          sourcesInTree = false
        }
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

    // Mode transitions
    if (prev.mode !== next.mode) {
      // Clean up previous mode's components
      cleanupMode(prev.mode)
      // Set up next mode's components
      setupMode(next)
    } else {
      // Same mode — update content within mode
      updateCurrentMode(prev, next)
    }

    tui.requestRender()
  }

  function cleanupMode(prevMode: string): void {
    switch (prevMode) {
      case 'connecting':
        if (loaderInTree) {
          statusLoader.stop()
          tui.removeChild(statusLoader)
          loaderInTree = false
        }
        break
      case 'loading':
        stopProgressSpinner()
        if (toolCallsInTree) {
          tui.removeChild(toolCallsView)
          toolCallsInTree = false
        }
        tui.removeChild(progressView)
        tui.removeChild(streamingView)
        break
      case 'welcome':
        if (welcomeInTree) {
          tui.removeChild(profileImage)
          tui.removeChild(welcomeScopeText)
          tui.removeChild(welcomeSelectList)
          tui.removeChild(welcomeHintText)
          welcomeInTree = false
        }
        // Welcome also has input area
        if (inputInTree) {
          tui.removeChild(inputSeparator)
          tui.removeChild(inputField)
          inputInTree = false
        }
        break
      case 'idle':
        if (inputInTree) {
          tui.removeChild(inputSeparator)
          tui.removeChild(inputField)
          inputInTree = false
        }
        if (suggestionsInTree) {
          if (suggestedQuestionsView) tui.removeChild(suggestedQuestionsView)
          suggestedQuestionsView = null
          suggestionsInTree = false
        }
        break
      case 'feedback':
      case 'feedbackConfirmed':
        if (feedbackInTree) {
          tui.removeChild(feedbackView)
          feedbackInTree = false
        }
        break
      case 'emailInput':
        if (emailInTree) {
          if (emailHeaderText) tui.removeChild(emailHeaderText)
          if (emailInput) tui.removeChild(emailInput)
          if (emailHintText) tui.removeChild(emailHintText)
          emailInTree = false
          emailInput = null
          emailHeaderText = null
          emailHintText = null
        }
        break
      case 'exitFeedback':
        if (exitFeedbackOverlay) {
          exitFeedbackOverlay.hide()
          exitFeedbackOverlay = null
        }
        break
    }
  }

  function setupMode(next: AppState): void {
    switch (next.mode) {
      case 'connecting':
        // Initial connecting state handled in initialization above
        break

      case 'welcome': {
        welcomeSelectList.setSelectedIndex(0)
        welcomeSelectList.onSelect = (item) => {
          const idx = STARTER_QUESTIONS.indexOf(item.value)
          dispatch({ type: 'STARTER_SELECT', index: idx >= 0 ? idx : 0 })
          handleChat(item.value)
        }
        welcomeSelectList.onCancel = () => dispatch({ type: 'WELCOME_DISMISS' })
        tui.addChild(profileImage)
        tui.addChild(welcomeScopeText)
        tui.addChild(welcomeSelectList)
        tui.addChild(welcomeHintText)
        welcomeInTree = true
        tui.setFocus(welcomeSelectList)

        // Also show input
        setupInputArea('')
        // Focus stays on SelectList, not input, during welcome
        tui.setFocus(welcomeSelectList)
        break
      }

      case 'idle': {
        setupInputArea(next.input)

        // Suggested questions
        if (next.suggestedQuestions.length > 0) {
          suggestedQuestionsView = createSuggestedQuestionsView(next.suggestedQuestions)
          suggestedQuestionsView.onSelect = (item) => selectSuggestion(item.value)
          suggestedQuestionsView.onCancel = () => dispatch({ type: 'SUGGESTION_DISMISS' })
          tui.addChild(suggestedQuestionsView)
          suggestionsInTree = true
          tui.setFocus(suggestedQuestionsView)
        }
        break
      }

      case 'loading': {
        // Reset views to avoid stale content flash
        updateStreamingContent(streamingView, '')
        updateProgressView(progressView, [], false)
        updateToolCallsView(toolCallsView, next.loadingState)

        inputField.disableSubmit = true
        tui.addChild(streamingView)
        tui.addChild(progressView)
        tui.addChild(toolCallsView)
        toolCallsInTree = true
        tui.setFocus(null)
        break
      }

      case 'emailInput': {
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

        tui.addChild(emailHeaderText)
        tui.addChild(emailInput)
        tui.addChild(emailHintText)
        emailInTree = true
        tui.setFocus(emailInput)
        break
      }

      case 'feedback': {
        showFeedbackPrompt(feedbackView)
        tui.addChild(feedbackView)
        feedbackInTree = true
        tui.setFocus(null)
        break
      }

      case 'feedbackConfirmed': {
        showFeedbackConfirmed(feedbackView)
        tui.addChild(feedbackView)
        feedbackInTree = true
        tui.setFocus(null)
        // Auto-dismiss after 1 second
        setTimeout(() => dispatch({ type: 'FEEDBACK_CONFIRMED_DONE' }), 1000)
        break
      }

      case 'exitFeedback': {
        const overlay = createExitFeedbackOverlay()
        exitFeedbackOverlay = tui.showOverlay(overlay, {
          anchor: 'center',
          width: '60%'
        })
        tui.setFocus(null)
        break
      }

      case 'error': {
        const errText = new Text('', 1, 0)
        errText.setText(`\n${c.error(`${icons.error} ${next.errorMessage}`)}`)
        tui.addChild(errText)
        break
      }
    }
  }

  function setupInputArea(value: string): void {
    const termWidth = terminal.columns || 80
    inputSeparator.setText(`\n${c.surface('─'.repeat(termWidth - 2))}`)
    inputField.setText(value)
    inputField.disableSubmit = false
    tui.addChild(inputSeparator)
    tui.addChild(inputField)
    inputInTree = true
    tui.setFocus(inputField)
  }

  function updateCurrentMode(prev: AppState, next: AppState): void {
    // Welcome: SelectList handles selection internally, no update needed

    // Loading: update streaming content, progress, tool calls
    if (next.mode === 'loading' && prev.mode === 'loading') {
      if (prev.streamContent !== next.streamContent) {
        updateStreamingContent(streamingView, next.streamContent)
      }
      if (prev.progressItems !== next.progressItems) {
        updateProgressView(progressView, next.progressItems, !!next.streamContent)
      }
      if (prev.loadingState !== next.loadingState) {
        updateToolCallsView(toolCallsView, next.loadingState)
      }
      // Hide toolcalls when streaming content starts
      if (next.streamContent && toolCallsInTree) {
        tui.removeChild(toolCallsView)
        toolCallsInTree = false
      }
    }

    // Idle: update suggestions
    if (next.mode === 'idle' && prev.mode === 'idle') {
      if (prev.suggestedQuestions !== next.suggestedQuestions) {
        if (next.suggestedQuestions.length > 0) {
          // Rebuild SelectList with new items
          if (suggestionsInTree && suggestedQuestionsView) {
            tui.removeChild(suggestedQuestionsView)
          }
          suggestedQuestionsView = createSuggestedQuestionsView(next.suggestedQuestions)
          suggestedQuestionsView.onSelect = (item) => selectSuggestion(item.value)
          suggestedQuestionsView.onCancel = () => dispatch({ type: 'SUGGESTION_DISMISS' })
          tui.addChild(suggestedQuestionsView)
          suggestionsInTree = true
          tui.setFocus(suggestedQuestionsView)
        } else if (suggestionsInTree) {
          if (suggestedQuestionsView) tui.removeChild(suggestedQuestionsView)
          suggestedQuestionsView = null
          suggestionsInTree = false
          tui.setFocus(inputField)
        }
      }
    }
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
      let sources: SourcesEvent['sources'] = []
      let fullContent = ''
      let processingTime = 0
      let shouldSuggestContact = false
      let confidence: 'high' | 'medium' | 'low' | undefined
      let loadingState: LoadingState = { icon: '⏳', message: '처리 중...', toolCalls: [] }

      for await (const event of client.chatStream(message, state.sessionId)) {
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
        } catch {
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
    } catch {
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
    } catch {
      dispatch({ type: 'CORRECTION_FAIL', message: '수정 요청에 실패했어요.' })
    }
  }

  // ─── Cleanup ──────────────────────────────────────────
  function cleanup(): void {
    stopProgressSpinner()
    if (loaderInTree) statusLoader.stop()
    tui.stop()
  }

  // ─── Health check & start ─────────────────────────────
  try {
    await client.checkHealth(3, 2000)
    dispatch({ type: 'HEALTH_OK' })
  } catch {
    dispatch({ type: 'HEALTH_FAIL', error: 'API 연결 실패. 잠시 후 다시 시도해주세요.' })
  }
}
