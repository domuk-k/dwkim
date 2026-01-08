import { ChatView } from './ChatView.js'
import { ProfileCard } from './ProfileCard.js'

const DEFAULT_API_URL = 'https://persona-api.fly.dev'
const API_URL = process.env.DWKIM_API_URL || DEFAULT_API_URL

export type Mode = 'full' | 'profile'

interface Props {
  mode: Mode
}

export function App({ mode }: Props) {
  if (mode === 'profile') {
    return <ProfileCard />
  }

  // 채팅 모드 (배너는 ChatView 내부 Static에서 렌더링)
  return <ChatView apiUrl={API_URL} />
}
