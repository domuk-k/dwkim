# persona-api RAG 개선 리서치

> 작성일: 2025-01-21
> 상태: 구현 완료

## 개요

개인 프로필 RAG의 특성(문서 수십 개, 도메인 좁음)을 고려한 개선 방안 분석 및 구현 결과.

## 핵심 발견: 하이브리드 검색은 이미 구현됨

**BM25 + Dense Vector + RRF Fusion**이 `vectorStore.ts`에 완전히 구현되어 있음.

```
┌─────────────┐     ┌─────────────┐
│   Dense     │     │   Sparse    │
│  (OpenAI)   │     │   (BM25)    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 │
          ┌──────▼──────┐
          │  RRF Fusion │
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │   Results   │
          └─────────────┘
```

## 개선안 분석 요약

| 개선안 | 현재 상태 | 예상 효과 | 구현 결정 |
|--------|----------|----------|----------|
| **하이브리드 검색** | ✅ 이미 구현 | N/A | 추가 작업 불필요 |
| **프롬프트 엔지니어링** | 기본 수준 | 15-25% | ✅ 구현 완료 |
| **Contextual Retrieval** | 코드 있으나 비활성화 | 10-15% | ✅ 활성화 완료 |
| **리랭킹** | 없음 | 20-30% | ❌ 문서 적어서 ROI 낮음 |
| **청킹 최적화** | 문서별 맞춤 전략 있음 | 5-10% | 추가 개선 불필요 |

---

## 구현 완료 항목

### 1. 프롬프트 엔지니어링 (llmService.ts)

**변경 사항:**
- 정보 신뢰도 계층화 추가
  - resume (1순위) > 100-questions (2순위) > blog/knowledge (3순위)
- 할루시네이션 방지 규칙 강화
- 컨텍스트 미포함 정보 추측 금지 명시

**구현 위치:** `src/services/llmService.ts:77-106`

```typescript
## 정보 신뢰도 계층 (우선순위 순)
1. **[resume]**: 공식 이력서 - 가장 신뢰, 경력/학력/기술스택 질문에 우선 참조
2. **[100-questions]**: 직접 작성한 100문 100답 - 개인적 견해/취향 질문에 우선 참조
3. **[blog/knowledge]**: 블로그 글 - 기술 철학/방법론 질문에 참조

## 할루시네이션 방지
- 날짜, 숫자, 회사명 등 구체적 사실은 컨텍스트에서 직접 인용
- 컨텍스트에 없는 경력/프로젝트를 만들어내지 않음
```

### 2. 컨텍스트 빌더 개선 (personaAgent.ts)

**변경 사항:**
- 문서 타입별 우선순위 정렬 적용
- 타입 변경 시 섹션 구분 헤더 추가
- 구조화된 컨텍스트 포맷

**구현 위치:** `src/services/personaAgent.ts:227-279`

```typescript
const SOURCE_PRIORITY: Record<string, number> = {
  resume: 1,
  '100-questions': 2,
  knowledge: 3,
  blog: 4
}
```

### 3. Contextual Retrieval 활성화 (initQdrantData.ts)

**변경 사항:**
- `_addContextToChunk()` → `addContextToChunk()` 활성화
- 청크에 의미적 컨텍스트 prefix 주입

**구현 위치:** `scripts/initQdrantData.ts:372-457`

**적용 예시:**
```
Before: "콕스웨이브 / Software Engineer"
After:  "[컨텍스트: 김동욱의 재직 회사, 경력, 직장 경험]\n\n콕스웨이브 / Software Engineer"
```

**효과:**
- "어떤 회사에서 일해?" → "콕스웨이브" 매칭 가능 (시맨틱 갭 해소)
- BM25 + Dense 모두 개선

---

## 구현하지 않은 항목

### 리랭킹 (Cohere/BGE)

**불채택 이유:**
- 문서가 수십 개로 적어서 검색 결과 자체가 5-10개
- 리랭킹 효과 제한적 (이미 좋은 결과)
- latency 추가 (+150-300ms)
- 비용 대비 효과 불분명

### 청킹 전략 고도화

**불채택 이유:**
- 이미 문서 유형별 맞춤 전략 적용됨
  - resume.md: H2 섹션 기반
  - 100-questions.md: Q&A 단위
  - blog: H2 섹션 기반
- 슬라이딩 윈도우, 시맨틱 청킹은 문서 수가 적어 불필요

---

## 검증 방법

### Before/After 테스트 쿼리

```bash
# 테스트 쿼리 예시
bun run init-qdrant --search

# 쿼리 목록
- "동욱이 어디서 일해?" (대명사 + 키워드)
- "김동욱의 기술 스택은?" (직접 쿼리)
- "좋아하는 책?" (간접 쿼리)
```

### SEU 로그 분석

clarification 빈도 모니터링:
- 개선 전: SEU threshold 0.45 기준 clarification 발생률
- 개선 후: 동일 쿼리셋 대비 비교

### 응답 품질 체크

- 할루시네이션 발생 여부 (컨텍스트에 없는 정보 생성)
- 정보 신뢰도 계층 준수 여부

---

## 재인덱싱 필요

Contextual Retrieval 활성화 후 벡터 DB 재인덱싱 필요:

```bash
cd packages/persona-api
bun run init-qdrant:clean
```

---

## 참고 자료

- [Anthropic Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Qdrant Hybrid Search](https://qdrant.tech/documentation/concepts/hybrid-queries/)
- [RRF (Reciprocal Rank Fusion)](https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html)
