# dwkim

> `npx dwkim`

터미널에서 만나는 김동욱 AI 에이전트

Built by DongWook Kim <dannyworks102@gmail.com>.

## 사용법

```bash
npx dwkim@latest # 설치 없이 실행

dwkim           # 프로필 + AI 채팅
dwkim profile   # 프로필만
```

기본 API는 `https://persona-api.fly.dev`를 사용합니다.

## 로컬 개발

```bash
bun install
bun run dev:dwkim
```

기존 workspace 명령도 동작합니다:

```bash
bun run --filter dwkim dev
```

이 경로는 로컬 빌드 후 published CLI와 같은 `node dist/index.js`를 실행합니다.

로컬 persona-api에 붙여서 테스트하려면:

```bash
cd packages/persona-api
cp .env.example .env # GOOGLE_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY 설정
bun run build:index
bun run dev

# 다른 터미널 (repo root)
DWKIM_API_URL=http://localhost:3000 bun run dev:dwkim
```

## 라이선스

MIT
