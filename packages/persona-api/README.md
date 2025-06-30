# Persona API

개인화된 RAG+LLM 기반 챗봇 API로, dwkim의 개인 경험과 생각을 바탕으로 한 맞춤형 AI 어시스턴트를 제공합니다.

## 🚀 주요 기능

- **RAG (Retrieval-Augmented Generation) 엔진**: 벡터 검색과 LLM을 통합한 정확한 답변 생성
- **Chroma 벡터 데이터베이스**: 문서 임베딩 및 의미적 검색
- **OpenAI GPT 모델 연동**: 고품질 자연어 생성
- **Redis 기반 Rate Limiting**: API 사용량 제한 및 보안
- **Abuse Detection**: 악의적 요청 탐지 및 차단
- **Swagger 자동 문서화**: API 문서 자동 생성
- **Docker 컨테이너화**: 쉬운 배포 및 개발 환경
- **TDD 기반 개발**: Jest + Supertest 테스트 환경

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Fastify API   │    │   Chroma DB     │    │   OpenAI API    │
│   Server        │◄──►│   (Vector DB)   │    │   (LLM)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis         │    │   RAG Engine    │    │   Rate Limiting │
│   (Cache/Rate)  │    │   (Core Logic)  │    │   & Security    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 요구사항

- Node.js 18+
- Docker & Docker Compose
- OpenAI API Key
- Redis (Docker로 제공)
- Chroma DB (Docker로 제공)

## 🛠️ 설치 및 실행

### 1. 저장소 클론

```bash
git clone <repository-url>
cd packages/persona-api
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 편집하여 다음 값들을 설정하세요:

```env
# OpenAI API Key (필수)
OPENAI_API_KEY=your_openai_api_key_here

# 기타 설정 (선택사항)
PORT=3000
REDIS_HOST=localhost
CHROMA_URL=http://localhost:8000
```

### 3. Docker로 실행 (권장)

```bash
# 모든 서비스 시작
docker-compose up --build

# 백그라운드 실행
docker-compose up -d --build
```

### 4. 로컬 개발 환경

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 테스트 실행
npm test
```

## 📚 API 엔드포인트

### 채팅 API

- `POST /api/v1/chat` - 개인화된 채팅 응답
- `GET /api/v1/search` - 문서 검색
- `GET /api/v1/status` - RAG 엔진 상태 확인

### 헬스체크

- `GET /health` - 기본 서버 상태
- `GET /health/detailed` - 상세 상태 (RAG 엔진 포함)
- `GET /health/redis` - Redis 연결 상태

### API 문서

- `GET /documentation` - Swagger UI

## 🔧 RAG 엔진 구성 요소

### 1. VectorStore (Chroma DB)

- 문서 임베딩 저장 및 검색
- 메타데이터 기반 필터링
- 유사도 기반 검색

### 2. LLM Service (OpenAI)

- GPT 모델을 통한 답변 생성
- 컨텍스트 기반 응답
- 토큰 사용량 추적

### 3. RAG Engine

- 벡터 검색과 LLM 통합
- 컨텍스트 윈도우 관리
- 대화 히스토리 처리

## 🧪 테스트

```bash
# 전체 테스트 실행
npm test

# 테스트 커버리지
npm run test:coverage

# 테스트 감시 모드
npm run test:watch
```

### 테스트 구조

- `src/tests/ragEngine.test.ts` - RAG 엔진 단위 테스트
- `src/tests/chat.test.ts` - API 통합 테스트
- `src/tests/health.test.ts` - 헬스체크 테스트

## 🔒 보안 기능

### Rate Limiting

- IP 기반 요청 제한
- Redis를 통한 분산 처리
- 윈도우 기반 제한 (15분/100요청)

### Abuse Detection

- 의심스러운 패턴 탐지
- 연속 오류 수 모니터링
- 자동 IP 차단

## 📊 모니터링

### 헬스체크 엔드포인트

```bash
# 기본 상태 확인
curl http://localhost:3000/health

# 상세 상태 확인 (RAG 엔진 포함)
curl http://localhost:3000/health/detailed

# Redis 상태 확인
curl http://localhost:3000/health/redis
```

### 로그 레벨

- `ERROR`: 오류 및 예외 상황
- `WARN`: 경고 및 주의사항
- `INFO`: 일반 정보
- `DEBUG`: 상세 디버그 정보

## 🚀 배포

### Docker 배포

```bash
# 프로덕션 빌드
docker build -t persona-api .

# 컨테이너 실행
docker run -p 3000:3000 --env-file .env persona-api
```

### 환경별 설정

- `NODE_ENV=development` - 개발 환경
- `NODE_ENV=production` - 프로덕션 환경

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 라이선스

MIT License

## 📞 지원

문제가 있거나 질문이 있으시면 이슈를 생성해 주세요.
