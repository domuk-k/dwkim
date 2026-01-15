import { ChatView } from './ChatView.js'

const DEFAULT_API_URL = 'https://persona-api.fly.dev'
const API_URL = process.env.DWKIM_API_URL || DEFAULT_API_URL

export function App() {
  return <ChatView apiUrl={API_URL} />
}
