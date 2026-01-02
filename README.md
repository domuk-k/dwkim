# dwkim

터미널에서 만나는 김동욱 AI 에이전트

## 사용해 보기

```bash
npx dwkim
```

프로필 카드를 확인하고 김동욱에 대해 대화할 수 있어요.

## 프로젝트 구조

이 저장소는 pnpm workspace 기반 모노레포예요.

| 패키지 | 설명 | 링크 |
|--------|------|------|
| [`dwkim`](./packages/dwkim) | CLI 개인 에이전트 | [![npm](https://img.shields.io/npm/v/dwkim)](https://www.npmjs.com/package/dwkim) |
| [`persona-api`](./packages/persona-api) | 개인 AI 에이전트 API | [persona-api.fly.dev](https://persona-api.fly.dev) |
| [`blog`](./packages/blog) | 개인 블로그 | [dwkim.net](https://dwkim.net) |

## 로컬 개발

### 요구사항

- Node.js 18+
- pnpm 9+

### 설치

```bash
pnpm install
```

### 개발 서버 실행

```bash
# 전체 패키지
pnpm dev

# 개별 패키지
pnpm dev:dwkim
pnpm dev:blog
```

### 빌드

```bash
pnpm build
```

## 기술 스택

**dwkim CLI**
- TypeScript, esbuild
- boxen, chalk, ora

**persona-api**
- Fastify, LangGraph
- Qdrant (Vector DB)
- Gemini 2.0 Flash, OpenAI Embeddings

**blog**
- Astro 5
- MDX, KaTeX, Mermaid

## 라이선스

MIT
