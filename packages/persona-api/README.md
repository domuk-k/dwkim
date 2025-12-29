# Persona API

RAG 기반 개인화 챗봇 API

## 주요 기능

- **RAG 엔진**: 벡터 검색 + LLM을 결합해 정확한 답변 생성
- **다중 벡터 DB**: Qdrant, Neon, ChromaDB 지원
- **LLM 통합**: OpenAI, Anthropic, Google Genai (LangChain)
- **Rate Limiting**: Redis 기반 요청 제한 (없으면 메모리 fallback)

## 빠른 시작

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env

# 개발 서버 실행
pnpm dev
```

## 환경 변수

```env
# LLM (필수)
OPENAI_API_KEY=your_key

# Vector DB (택 1)
QDRANT_URL=http://localhost:6333
NEON_DATABASE_URL=postgres://...

# 선택
REDIS_URL=redis://localhost:6379
PORT=3000
```

## API

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /api/v1/chat` | 채팅 응답 |
| `GET /health` | 서버 상태 |
| `GET /documentation` | Swagger UI |

## 개발

```bash
pnpm dev              # 개발 서버
pnpm test             # 테스트
pnpm test:watch       # 테스트 (watch)
pnpm lint             # 린트
pnpm type-check       # 타입 체크
```

## 벡터 DB 초기화

```bash
# Qdrant
pnpm init-qdrant
pnpm init-qdrant:clean   # 기존 데이터 삭제 후 재생성

# Neon
pnpm init-neon
pnpm init-neon:clean
```

## 배포

Fly.io에 배포되어 있어요.

```bash
fly deploy
```

## 라이선스

MIT
