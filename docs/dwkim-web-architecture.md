---
title: "dwkim-web Architecture Blueprint"
created: 2025-01-08
tags: [architecture, dwkim, web, react-router-v7]
---

# dwkim-web Package Architecture Blueprint

## Patterns & Conventions Found

Based on the existing codebase analysis, I've identified the following patterns:

### Backend SSE Streaming Pattern (/packages/persona-api/src/routes/chat.ts:244-272)
- SSE endpoint at `POST /api/v1/chat/stream`
- Discriminated union event types: `session | status | tool_call | sources | content | clarification | escalation | followup | progress | done | error`
- Headers: `Content-Type: text/event-stream`, `X-Device-ID` for personalization
- Event format: `data: ${JSON.stringify(event)}\n\n`

### CLI Client Pattern (/packages/dwkim/src/utils/personaApiClient.ts:236-299)
- AbortController for stream cancellation
- AsyncGenerator pattern for type-safe SSE consumption
- Device ID persistence to `~/.dwkim/device_id`
- Session-based conversation history (server-side)

### UI State Management Pattern (/packages/dwkim/src/ui/ChatView.tsx)
- Progressive disclosure: Loading → Streaming → Complete
- Real-time progress items with status (pending | in_progress | completed)
- HITL patterns: Email collection, feedback prompts, escalation
- A2UI: Suggested questions for clarification and followup

### Shared Components
- Markdown rendering (marked + marked-terminal in CLI)
- Theme: Catppuccin Mocha color palette
- Profile data structure (name, title, bio, links)

---

## Architecture Decision

**Stack Choice: React Router v7 (SSR-capable SPA)**

**Rationale:**
1. **SSE Support**: React Router v7's loader/action pattern works seamlessly with streaming APIs
2. **Shared Code**: React components can be adapted from CLI (Ink → DOM)
3. **SEO & Performance**: SSR capabilities for landing page, CSR for chat interface
4. **Deploy Simplicity**: Single Node.js server deployable to Fly.io alongside persona-api
5. **Type Safety**: Full TypeScript with discriminated union events from API client

**Trade-offs:**
- More complex than pure SPA (Vite + React) but gains SSR benefits
- Requires Node.js runtime (not static hosting) but aligns with existing Fly.io infra
- Learning curve for RR7 patterns but team familiarity with React ecosystem

---

## Component Design

### Directory Structure

```
packages/dwkim-web/
├── app/
│   ├── root.tsx                      # Root layout (HTML shell, providers)
│   ├── routes/
│   │   ├── _index.tsx                # Landing page (SSR)
│   │   └── chat.tsx                  # Chat interface (CSR with SSE)
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatView.tsx          # Main chat container
│   │   │   ├── MessageList.tsx       # Static message history
│   │   │   ├── MessageBubble.tsx     # Individual message renderer
│   │   │   ├── StreamingMessage.tsx  # Live streaming content
│   │   │   ├── ProgressIndicator.tsx # RAG pipeline progress
│   │   │   ├── InputArea.tsx         # Message input + suggestions
│   │   │   └── EmailPrompt.tsx       # HITL email collection
│   │   ├── profile/
│   │   │   ├── ProfileCard.tsx       # Profile display
│   │   │   └── ProfileBanner.tsx     # Hero section
│   │   ├── ui/
│   │   │   ├── MarkdownRenderer.tsx  # react-markdown + rehype plugins
│   │   │   ├── FeedbackPrompt.tsx    # HITL feedback UI
│   │   │   ├── SuggestedQuestions.tsx # A2UI clarification
│   │   │   └── StatusBadge.tsx       # Server status indicator
│   │   └── layout/
│   │       ├── Header.tsx            # Nav + title
│   │       └── Footer.tsx            # Links + attribution
│   ├── hooks/
│   │   ├── useChatStream.ts          # SSE streaming hook
│   │   ├── useDeviceId.ts            # localStorage device ID
│   │   └── useSessionHistory.ts      # Session storage for history
│   ├── utils/
│   │   ├── personaApiClient.ts       # Shared API client (browser-compatible)
│   │   ├── deviceId.ts               # Browser localStorage version
│   │   └── markdown.ts               # Markdown processor config
│   └── styles/
│       ├── global.css                # Tailwind base + catppuccin theme
│       └── theme.ts                  # Color palette constants
├── public/
│   ├── favicon.ico
│   ├── og-image.png                  # Open Graph preview
│   └── manifest.json                 # PWA manifest
├── vite.config.ts                    # React Router v7 uses Vite
├── fly.toml                          # Fly.io deployment config
├── Dockerfile                        # Production build
├── package.json
└── tsconfig.json
```

---

### Key Components

#### 1. `app/routes/chat.tsx` - Chat Interface Route
**Responsibilities:**
- Initialize SSE stream via `useChatStream` hook
- Manage chat state (messages, status, streaming content)
- Handle HITL flows (email, feedback, escalation)
- Persist session ID to localStorage

**Interface:**
```typescript
export default function ChatRoute() {
  const { messages, status, sendMessage, abort } = useChatStream();
  const deviceId = useDeviceId();

  return <ChatView
    messages={messages}
    status={status}
    onSendMessage={sendMessage}
    onAbort={abort}
    deviceId={deviceId}
  />;
}
```

#### 2. `app/hooks/useChatStream.ts` - SSE Streaming Hook
**Responsibilities:**
- Establish EventSource connection to `/api/v1/chat/stream`
- Parse SSE events into discriminated union types
- Update UI state progressively (status → progress → content → done)
- Handle reconnection on network errors

**Interface:**
```typescript
export function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [streamContent, setStreamContent] = useState('');
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  const sendMessage = async (message: string) => {
    // Initiate SSE stream, update state as events arrive
  };

  const abort = () => {
    // Cancel ongoing stream
  };

  return { messages, status, streamContent, progressItems, sendMessage, abort };
}
```

#### 3. `app/components/chat/ChatView.tsx` - Main Chat Container
**Responsibilities:**
- Layout chat UI (message list, streaming area, input)
- Keyboard shortcuts (ESC to cancel, Ctrl+C to exit)
- Responsive design (mobile-first)
- Scroll management (auto-scroll to bottom)

**Interface:**
```typescript
interface ChatViewProps {
  messages: Message[];
  status: Status;
  streamContent: string;
  progressItems: ProgressItem[];
  onSendMessage: (msg: string) => void;
  onAbort: () => void;
}
```

#### 4. `app/components/ui/MarkdownRenderer.tsx` - Markdown Component
**Responsibilities:**
- Render markdown with syntax highlighting (shiki)
- Support code blocks with copy button
- Preserve sources as footnotes
- Responsive typography

**Dependencies:**
- `react-markdown` for parsing
- `rehype-highlight` for syntax highlighting
- `remark-gfm` for GitHub-flavored markdown

#### 5. `app/utils/personaApiClient.ts` - Browser API Client
**Responsibilities:**
- Fork from CLI client, adapted for browser
- Use fetch API (remove Node.js dependencies)
- localStorage for device ID (not filesystem)
- Same discriminated union types

**Changes from CLI version:**
- Replace `fs` operations with `localStorage`
- Use browser `fetch` (already compatible)
- Remove Node.js crypto, use Web Crypto API

---

## Implementation Map

### Files to Create

#### 1. **Package Scaffold**
- `packages/dwkim-web/package.json`
  - Dependencies: `react`, `react-dom`, `react-router`, `react-markdown`, `tailwindcss`, `@catppuccin/palette`
  - Scripts: `dev`, `build`, `start`, `deploy`

- `packages/dwkim-web/vite.config.ts`
  - React Router v7 plugin
  - Tailwind CSS plugin
  - SSR configuration

- `packages/dwkim-web/tsconfig.json`
  - Strict mode, paths for `@/` imports
  - DOM types + ES2022

#### 2. **Core Routes**
- `app/root.tsx` - HTML shell with providers (theme, error boundary)
- `app/routes/_index.tsx` - Landing page with ProfileBanner, call-to-action to `/chat`
- `app/routes/chat.tsx` - Chat interface with SSE streaming

#### 3. **Chat Components** (Ported from CLI)
- `app/components/chat/ChatView.tsx` - Main container (from CLI ChatView.tsx)
- `app/components/chat/MessageBubble.tsx` - Message rendering (from CLI MessageBubble)
- `app/components/chat/StreamingMessage.tsx` - New component for live streaming
- `app/components/chat/ProgressIndicator.tsx` - Progress items UI (from CLI progress section)
- `app/components/chat/InputArea.tsx` - Input field + suggested questions
- `app/components/chat/EmailPrompt.tsx` - HITL email collection (from CLI email UI)

#### 4. **Utilities** (Adapted from CLI)
- `app/utils/personaApiClient.ts` - Browser-compatible API client
- `app/utils/deviceId.ts` - localStorage-based device ID
- `app/hooks/useChatStream.ts` - React hook wrapping AsyncGenerator

#### 5. **Styling**
- `app/styles/global.css` - Tailwind imports + Catppuccin theme variables
- `app/styles/theme.ts` - Color palette constants (from CLI theme.ts)

#### 6. **Deployment**
- `packages/dwkim-web/fly.toml` - Fly.io configuration
- `packages/dwkim-web/Dockerfile` - Production build

---

## Data Flow

### Chat Message Flow (SSE)

```
User Input → InputArea.tsx
    ↓
ChatView.sendMessage()
    ↓
useChatStream.sendMessage()
    ↓
personaApiClient.chatStream(message, sessionId)
    ↓
POST /api/v1/chat/stream (SSE)
    ↓
Server yields events:
  - session → setSessionId()
  - status → setLoadingState()
  - progress → setProgressItems()
  - content → appendStreamContent()
  - sources → setSources()
  - done → finalizeMessage()
    ↓
ChatView renders:
  - MessageList (static history)
  - StreamingMessage (live content)
  - ProgressIndicator (RAG steps)
```

### Device ID Flow

```
First Visit → useDeviceId()
    ↓
Check localStorage.getItem('dwkim_device_id')
    ↓
Generate UUID v4 → localStorage.setItem()
    ↓
Include in fetch headers: { 'X-Device-ID': deviceId }
    ↓
Server tracks activity, links to email on HITL
```

---

## Build Sequence

### Phase 1: Scaffold & Infrastructure
- [ ] Create `packages/dwkim-web/` directory structure
- [ ] Set up `package.json` with React Router v7 dependencies
- [ ] Configure `vite.config.ts` for SSR + Tailwind
- [ ] Create `fly.toml` and `Dockerfile` for deployment
- [ ] Set up Tailwind CSS with Catppuccin theme variables

### Phase 2: Core Utilities (Browser-Compatible)
- [ ] Port `personaApiClient.ts` to browser (replace fs with localStorage)
- [ ] Implement `deviceId.ts` with localStorage persistence
- [ ] Create TypeScript types for SSE events (discriminated unions)
- [ ] Implement `useChatStream` hook with AsyncGenerator consumption

### Phase 3: UI Components (Adapt from CLI)
- [ ] Create `ProfileCard.tsx` and `ProfileBanner.tsx` (from CLI)
- [ ] Implement `MarkdownRenderer.tsx` with react-markdown + syntax highlighting
- [ ] Build `MessageBubble.tsx` (adapt from CLI MessageBubble)
- [ ] Create `StreamingMessage.tsx` for real-time content rendering
- [ ] Implement `ProgressIndicator.tsx` (RAG pipeline steps)

### Phase 4: Chat Interface
- [ ] Build `ChatView.tsx` main container (layout, state management)
- [ ] Implement `InputArea.tsx` with keyboard shortcuts (Enter, ESC)
- [ ] Create `SuggestedQuestions.tsx` for A2UI clarification
- [ ] Build `EmailPrompt.tsx` for HITL email collection
- [ ] Implement `FeedbackPrompt.tsx` for response feedback

### Phase 5: Routes & Navigation
- [ ] Create landing page (`routes/_index.tsx`) with ProfileBanner + CTA
- [ ] Build chat route (`routes/chat.tsx`) integrating ChatView
- [ ] Set up `root.tsx` with theme provider and error boundary
- [ ] Add responsive navigation (Header + Footer)

### Phase 6: Testing & Polish
- [ ] Test SSE streaming with network throttling
- [ ] Verify mobile responsiveness (320px → 1920px)
- [ ] Test HITL flows (email, feedback, escalation)
- [ ] Add loading states and error boundaries
- [ ] Optimize bundle size (code splitting by route)

### Phase 7: Deployment
- [ ] Build production bundle (`pnpm build`)
- [ ] Deploy to Fly.io (`fly deploy` from packages/dwkim-web/)
- [ ] Configure CORS on persona-api for web origin
- [ ] Set up HTTPS and custom domain (optional)
- [ ] Monitor logs and performance

---

## Deployment Configuration

### `packages/dwkim-web/fly.toml`
```toml
app = "dwkim-web"
primary_region = "nrt"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  NODE_ENV = "production"
  PERSONA_API_URL = "https://persona-api.fly.dev"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type = "requests"
    hard_limit = 100
    soft_limit = 80

  [[http_service.checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/"

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

### `packages/dwkim-web/Dockerfile`
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "build/server.js"]
```

### CORS Configuration on persona-api
Add to `/packages/persona-api/src/server.ts`:
```typescript
await fastify.register(cors, {
  origin: [
    'http://localhost:5173', // Vite dev server
    'https://dwkim-web.fly.dev', // Production
  ],
  credentials: true,
});
```

---

## Critical Details

### Error Handling
- **Network Errors**: Auto-reconnect SSE stream with exponential backoff
- **API Errors**: Display user-friendly messages from discriminated union `error` events
- **Validation Errors**: Client-side input length check (1000 chars) before sending
- **Timeout**: 30-second timeout on SSE stream, show "Taking longer than expected..." message

### Security Considerations
- **Device ID**: Client-generated UUID, no PII, deletable by user
- **CORS**: Restrict persona-api to specific web origin in production
- **Input Sanitization**: Markdown renderer escapes HTML by default
- **Rate Limiting**: Inherit from persona-api (8 req/min per IP)
- **HTTPS Only**: Enforce in Fly.io config (`force_https: true`)

### Accessibility
- **Keyboard Navigation**: Tab through messages, Enter to send, ESC to cancel
- **Screen Readers**: ARIA labels on input, live regions for streaming content
- **Color Contrast**: Catppuccin Mocha passes WCAG AA (4.5:1 contrast)
- **Focus Management**: Auto-focus input after message sent

---

## Related

- [[persona-api-architecture]]
- [[dwkim-cli-architecture]]
- [[rag-prompt-injection-defense]]
