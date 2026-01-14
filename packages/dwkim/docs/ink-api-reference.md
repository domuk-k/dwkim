# Ink - React for CLI 핵심 API 레퍼런스

> Ink는 터미널 CLI 앱을 React 컴포넌트로 빌드하는 라이브러리. Flexbox 레이아웃 지원.

## Core Components

### `<Box>` - Flexbox 레이아웃 컨테이너

CSS Flexbox와 동일한 레이아웃 시스템.

```tsx
<Box
  flexDirection="column"    // row | row-reverse | column | column-reverse
  justifyContent="center"   // flex-start | center | flex-end | space-between | space-around
  alignItems="center"       // flex-start | center | flex-end | stretch
  flexGrow={1}              // 남은 공간 차지 비율
  gap={1}                   // 자식 요소 간격
  width="80%"               // 퍼센트 또는 숫자
  height={10}
  padding={1}               // paddingX, paddingY, paddingTop 등
  margin={1}                // marginX, marginY, marginTop 등
  borderStyle="round"       // single | double | round | bold | singleDouble | doubleSingle | classic
  borderColor="cyan"
  backgroundColor="blue"
>
  {children}
</Box>
```

### `<Text>` - 스타일링된 텍스트

모든 텍스트 출력은 반드시 `<Text>` 안에 있어야 함.

```tsx
<Text
  color="green"              // chalk 색상명, hex (#ffffff), rgb
  backgroundColor="blue"
  bold
  italic
  underline
  strikethrough
  dimColor                   // 흐리게
  inverse                    // 색상 반전
  wrap="truncate"            // wrap | truncate | truncate-start | truncate-middle | truncate-end
>
  Hello World
</Text>
```

### `<Static>` - 한 번만 렌더링, 스크롤 가능

**핵심 특징**: 아이템을 한 번만 렌더링하고, 이후 터미널 위로 스크롤됨. 기존 아이템 수정은 무시됨.

```tsx
const [logs, setLogs] = useState([])

// logs에 새 아이템이 추가될 때만 렌더링
// 기존 아이템 수정은 무시됨!
<Static items={logs}>
  {(log) => (
    <Box key={log.id}>
      <Text color="green">✓ {log.message}</Text>
    </Box>
  )}
</Static>

// Static 아래의 컴포넌트는 계속 업데이트됨
<Box>
  <Text>현재 진행 중...</Text>
</Box>
```

**Use Cases**:
- 완료된 작업 목록 (테스트 결과, 빌드 로그)
- 채팅 히스토리 (Claude Code 스타일)
- 스트리밍 로그

### `<Newline>` - 줄바꿈

```tsx
<Text>
  Hello<Newline />World
</Text>
```

### `<Transform>` - 텍스트 변환

라인별로 텍스트를 변환.

```tsx
<Transform transform={(line, index) =>
  index === 0 ? line : '  ' + line  // 첫 줄 제외 들여쓰기
}>
  {longText}
</Transform>
```

---

## Hooks

### `useInput` - 키보드 입력 처리

```tsx
useInput((input, key) => {
  // input: 입력된 문자
  // key: { upArrow, downArrow, leftArrow, rightArrow,
  //        return, escape, ctrl, meta, shift, tab, backspace, delete }

  if (input === 'q') exit()
  if (key.upArrow) moveUp()
  if (key.ctrl && input === 'c') exit()
  if (key.escape) cancel()
})
```

### `useApp` - 앱 제어

```tsx
const { exit } = useApp()

// 정상 종료
exit()

// 에러와 함께 종료 (waitUntilExit() reject)
exit(new Error('Something went wrong'))
```

### `useStdout` - stdout 직접 쓰기

Ink 렌더링을 방해하지 않고 stdout에 직접 출력.

```tsx
const { write } = useStdout()

write('이 텍스트는 Ink UI 위에 영구적으로 출력됨\n')
```

### `useFocus` / `useFocusManager` - 포커스 관리

Tab/Shift+Tab으로 포커스 이동.

```tsx
// 컴포넌트를 포커스 가능하게 만들기
function Input({ id }) {
  const { isFocused } = useFocus({ id, autoFocus: true })

  return (
    <Text color={isFocused ? 'cyan' : 'white'}>
      {isFocused ? '> ' : '  '} Input
    </Text>
  )
}

// 포커스 프로그래밍 제어
function Menu() {
  const { focusNext, focusPrevious, focus } = useFocusManager()

  useInput((input, key) => {
    if (key.downArrow) focusNext()
    if (key.upArrow) focusPrevious()
    if (input === '1') focus('home')  // id로 직접 포커스
  })
}
```

---

## Utilities

### `render()` - 앱 렌더링

```tsx
const instance = render(<App />)

// 앱 종료 대기
await instance.waitUntilExit()

// 수동 리렌더
instance.rerender(<App updated />)

// 수동 언마운트
instance.unmount()
```

### `measureElement()` - 요소 크기 측정

렌더링 후 Box의 실제 크기를 측정.

```tsx
const ref = useRef()
const [size, setSize] = useState({ width: 0, height: 0 })

useEffect(() => {
  if (ref.current) {
    const { width, height } = measureElement(ref.current)
    setSize({ width, height })
  }
}, [])

<Box ref={ref}>Content</Box>
```

---

## Ink UI (@inkjs/ui)

추가 UI 컴포넌트 라이브러리.

```tsx
import { TextInput, Select, Spinner, ProgressBar } from '@inkjs/ui'

// 텍스트 입력
<TextInput
  placeholder="Enter name..."
  suggestions={['Alice', 'Bob']}
  onChange={setValue}
  onSubmit={handleSubmit}
/>

// 선택 메뉴
<Select
  options={[
    { label: 'Red', value: 'red' },
    { label: 'Blue', value: 'blue' },
  ]}
  onChange={setColor}
/>

// 스피너
<Spinner label="Loading..." />

// 프로그레스 바
<ProgressBar value={75} />  // 0-100
```

---

## 패턴 & 팁

### 채팅 UI 패턴 (Claude Code 스타일)

```tsx
function ChatView() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  return (
    <Box flexDirection="column">
      {/* 메시지 히스토리 - 한 번만 렌더링, 위로 스크롤 */}
      <Static items={messages}>
        {(msg) => <MessageBubble key={msg.id} message={msg} />}
      </Static>

      {/* 스트리밍 중인 응답 - 실시간 업데이트 */}
      {streaming && <Text>{streamContent}</Text>}

      {/* 입력 영역 - 항상 하단에 고정 */}
      <TextInput value={input} onChange={setInput} />
    </Box>
  )
}
```

### 키보드 단축키 패턴

```tsx
useInput((input, key) => {
  // ESC: 취소/닫기
  if (key.escape) handleCancel()

  // Ctrl+C: 종료
  if (key.ctrl && input === 'c') exit()

  // 방향키: 네비게이션
  if (key.upArrow) selectPrev()
  if (key.downArrow) selectNext()

  // Enter: 확인
  if (key.return) handleSubmit()

  // 숫자키: 빠른 선택
  if (/^[1-9]$/.test(input)) quickSelect(parseInt(input))
})
```

---

## References

- [Ink GitHub](https://github.com/vadimdemedes/ink)
- [Ink UI GitHub](https://github.com/vadimdemedes/ink-ui)
