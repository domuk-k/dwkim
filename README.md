# dwkim-workspace

이 저장소는 **dwkim** CLI 도구를 포함한 pnpm workspace 모노레포입니다.

## 📦 Packages

### [dwkim](./packages/dwkim) - CLI 명함 도구

개발자의 프로필 정보를 기반으로 터미널에서 명함을 출력하는 CLI 도구입니다.

```bash
npx dwkim
```

### [persona-api](./packages/persona-api) - Fastify RAG API 서버

개인화된 챗봇 API 서버로, RAG (Retrieval-Augmented Generation) 기술을 사용합니다.

- **Framework**: Fastify with TypeScript
- **Database**: ChromaDB (vector store), Redis (cache)
- **LLM**: OpenAI (primary), Anthropic (fallback)
- **Deployment**: https://dwkim.onrender.com

### [blog](./packages/blog) - Next.js 블로그

MDX 기반의 개인 블로그 사이트입니다.

- **Framework**: Next.js 13+ with App Router
- **Content**: Contentlayer for MDX processing
- **Styling**: Tailwind CSS with shadcn/ui components
