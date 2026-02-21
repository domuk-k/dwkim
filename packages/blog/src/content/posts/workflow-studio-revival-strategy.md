---
title: "Workflow Studio 활용 전략"
description: ""
pubDate: "2026-02-03"
---

# Workflow Studio 활용 전략

Workflow Studio 프로젝트를 **조직 내부 기술 역량 어필**, **블로그 콘텐츠**, **이력서/면접 준비**의 세 축으로 활용하는 전략 문서.

## 프로젝트 컨텍스트

- **핵심 가치**: 시각적 워크플로우 빌더 → 풀스택 웹앱 자동 생성
- **기술 스택**: Bun + Elysia + React 19 + Vite 모노레포
- **노드 시스템**: 11종 노드 타입, DAG 엔진 (Kahn's 위상정렬), HITL pause/resume
- **배포 전략**: Multi-target (CF Workers, Deno, Bun, Node via Hono)
- **통합**: Activepieces (JWT auth workaround for CE)
- **스키마**: AppSpec v2 (data/logic/ui 3축)
- **인프라**: EC2 + CloudFront 배포
- **문서화**: 5개 ADR 작성 완료

---

## 1. 조직 내부 기술 역량 어필

### 목표
프로젝트의 기술적 깊이와 의사결정 과정을 체계적으로 문서화하여, 팀/조직에 **"이런 수준의 설계와 실행이 가능한 사람"**임을 증명.

### 필요 문서 목록

| 문서 제목 | 목적 | 타겟 독자 | 형식 |
|-----------|------|-----------|------|
| **Workflow Studio 기술 보고서** | 프로젝트 전체 아키텍처와 핵심 의사결정 요약 | CTO, 테크 리드 | 10~15페이지 PDF |
| **ADR 요약 대시보드** | 5개 ADR을 한눈에 보이도록 정리 | 엔지니어링 팀, PM | Notion/Markdown + 다이어그램 |
| **아키텍처 다이어그램 팩** | 시스템 구성, 데이터 흐름, 배포 전략 시각화 | 시니어 엔지니어, 아키텍트 | Mermaid/Figma + PNG 익스포트 |
| **성능 벤치마크 리포트** | DAG 엔진 성능, 빌드 시간, 배포 속도 측정 | 백엔드/DevOps 엔지니어 | Markdown + 그래프 |
| **Activepieces 통합 케이스 스터디** | JWT workaround 설계와 트레이드오프 분석 | 통합 엔지니어, 시스템 디자이너 | 블로그 포스트 or 내부 위키 |

### 작성 우선순위
1. **P0** - ADR 요약 대시보드 (이미 ADR 5개 있음 → 정리만 하면 됨)
2. **P0** - 아키텍처 다이어그램 팩 (면접/발표 시 필수)
3. **P1** - 기술 보고서 (조직 내 신뢰 구축용)
4. **P2** - 성능 벤치마크 리포트
5. **P2** - Activepieces 케이스 스터디

### 액션 아이템
- [ ] 5개 ADR을 Notion 테이블로 정리 (제목, 컨텍스트, 결정, 결과)
- [ ] Mermaid로 시스템 아키텍처 다이어그램 3종 작성:
  - 전체 시스템 구조 (monorepo + 서비스 분리)
  - DAG 실행 흐름 (HITL pause/resume 포함)
  - 배포 파이프라인 (multi-target 전략)
- [ ] 기술 보고서 초안 작성 (목차: Problem, Solution, Architecture, ADRs, Outcomes)

---

## 2. 블로그 콘텐츠 전략 (tag: blog)

### 목표
기술 블로그를 통해 **"이 사람은 생각하면서 코드를 짠다"**는 인상을 심고, 개발자 커뮤니티에서 가시성 확보.

### 포스트 기획 (5개)

#### P0-1: "Visual Workflow Builder에서 풀스택 앱이 나오기까지"
- **핵심 메시지**: 워크플로우 → AppSpec → 코드 생성 → 배포 전체 파이프라인 설명
- **타겟 독자**: 로우코드 플랫폼 관심 있는 풀스택 개발자
- **구성**:
  - 문제 정의 (왜 만들었나?)
  - AppSpec v2 스키마 설계 (3축: data/logic/ui)
  - DAG 엔진과 HITL 처리
  - 코드 생성 전략 (템플릿 vs AST)
  - 배포 전략 (multi-target)
- **예상 분량**: 2,500자
- **키워드**: low-code, workflow automation, code generation, DAG

#### P0-2: "Bun 모노레포로 Elysia + React 19 프로젝트 구성하기"
- **핵심 메시지**: Bun workspace 설정, 타입 공유, 개발 환경 구축 실전 가이드
- **타겟 독자**: Bun 입문자, 모노레포 설계 고민하는 개발자
- **구성**:
  - 왜 Bun인가? (속도, DX, Node 호환성)
  - 모노레포 구조 설계 (packages/apps 분리)
  - 타입 공유 전략 (shared-types 패키지)
  - Vite + React 19 설정
  - Elysia 서버 구성
- **예상 분량**: 2,000자
- **키워드**: Bun, monorepo, Elysia, React 19, Vite

#### P1-1: "Activepieces Community Edition을 JWT로 인증하기"
- **핵심 메시지**: Activepieces CE의 인증 제약과 JWT workaround 구현 과정
- **타겟 독자**: Activepieces 사용자, 오픈소스 통합 엔지니어
- **구성**:
  - Activepieces CE vs Cloud 차이
  - JWT 기반 인증 설계
  - API 프록시 레이어 구현
  - 트레이드오프 (보안 vs 편의성)
- **예상 분량**: 1,800자
- **키워드**: Activepieces, JWT, authentication, open-source

#### P1-2: "DAG 엔진으로 워크플로우 실행하기 (feat. Kahn's Algorithm)"
- **핵심 메시지**: 위상정렬 기반 DAG 실행 엔진 구현과 HITL 처리
- **타겟 독자**: 워크플로우 엔진 개발자, 알고리즘 관심자
- **구성**:
  - DAG와 위상정렬 기초
  - Kahn's 알고리즘 구현
  - HITL (Human-in-the-Loop) pause/resume 설계
  - 에러 핸들링과 재시도 전략
- **예상 분량**: 2,200자
- **키워드**: DAG, topological sort, workflow engine, HITL

#### P2: "하나의 코드베이스로 CF Workers, Deno, Bun, Node 모두 배포하기"
- **핵심 메시지**: Hono 기반 multi-target 배포 전략과 런타임별 최적화
- **타겟 독자**: DevOps 엔지니어, 풀스택 개발자
- **구성**:
  - 왜 multi-target인가?
  - Hono 어댑터 구조
  - 런타임별 환경 변수 처리
  - 빌드 파이프라인 설계
  - 성능 비교 (Cold start, 메모리 사용량)
- **예상 분량**: 2,000자
- **키워드**: Hono, Cloudflare Workers, Deno, Bun, multi-runtime

### 블로그 시리즈 구성 제안
- **시리즈 제목**: "Workflow Studio 개발기"
- **시즌 1**: 아키텍처와 설계 (P0-1, P1-2)
- **시즌 2**: 기술 스택 Deep Dive (P0-2, P2)
- **시즌 3**: 통합과 최적화 (P1-1 + 추가 포스트)

### 액션 아이템
- [ ] P0-1 포스트 초안 작성 (이번 주 내)
- [ ] P0-2 포스트 작성 및 코드 예제 준비
- [ ] 블로그 시리즈 인트로 작성 (프로젝트 배경 설명)
- [ ] 각 포스트에 삽입할 다이어그램 목록 작성

---

## 3. 이력서 및 면접 준비

### 프로젝트 한 줄 설명
"시각적 워크플로우 빌더로 풀스택 웹앱을 자동 생성하는 로우코드 플랫폼 (DAG 엔진, Multi-runtime 배포, Activepieces 통합)"

### 이력서 항목 작성 예시

```
Workflow Studio — Visual Workflow Builder & Low-Code Platform
2025.06 - 2025.12 | 개인 프로젝트 (Full-stack Development)

• 11종 노드 타입을 지원하는 시각적 워크플로우 빌더 개발 (DAG 기반, HITL pause/resume)
• AppSpec v2 스키마 설계 (data/logic/ui 3축 분리) 및 코드 생성 엔진 구현
• Bun + Elysia + React 19 모노레포 구성, Cloudflare Workers/Deno/Bun/Node 멀티 타겟 배포
• Activepieces Community Edition 통합 (JWT 인증 workaround 설계)
• 5개 ADR 작성 (아키텍처 의사결정 문서화)
• 기술 스택: TypeScript, Bun, Elysia, React 19, Vite, Hono, Cloudflare, EC2, Zod
```

### 기술 스택 분류

| 카테고리 | 기술 |
|----------|------|
| **언어** | TypeScript |
| **런타임** | Bun, Node.js, Deno, Cloudflare Workers |
| **백엔드** | Elysia, Hono |
| **프론트엔드** | React 19, Vite, TanStack Query, Zustand |
| **데이터** | Zod (validation), JSON Schema |
| **인프라** | EC2, CloudFront, GitHub Actions |
| **통합** | Activepieces API, OAuth 2.0, JWT |
| **도구** | Bun workspace, Mermaid (diagramming) |

### 임팩트 및 차별화 포인트

1. **설계 역량**
   - AppSpec v2 스키마 (3축 분리) → 확장 가능한 메타데이터 구조
   - 5개 ADR 작성 → 의사결정 과정 문서화

2. **기술적 깊이**
   - DAG 엔진 (Kahn's 위상정렬) 직접 구현
   - Multi-runtime 배포 (Hono 어댑터 활용)
   - HITL (Human-in-the-Loop) pause/resume 설계

3. **통합 능력**
   - Activepieces CE의 제약을 JWT 인증으로 우회
   - OAuth 2.0 흐름 설계 및 구현

4. **풀스택 역량**
   - 백엔드 (Elysia, Hono) + 프론트엔드 (React 19) + 인프라 (EC2, CF) 전체 커버
   - Bun 모노레포로 타입 안전성 확보

### 면접 스토리라인 Q&A

#### Q1: "이 프로젝트를 왜 시작했나요?"
**A**: "로우코드 플랫폼들이 많지만, 대부분 코드 생성 없이 런타임에만 작동하거나, 생성된 코드가 읽을 수 없는 수준이었습니다. 저는 **읽을 수 있고, 수정 가능한 코드를 생성하면서도 시각적으로 워크플로우를 설계할 수 있는 플랫폼**을 만들고 싶었습니다. 특히 개발자가 워크플로우를 설계한 뒤, 생성된 코드를 직접 커스터마이징할 수 있도록 하는 게 목표였습니다."

#### Q2: "가장 어려웠던 기술적 도전은?"
**A**: "**HITL(Human-in-the-Loop) pause/resume 처리**였습니다. DAG 실행 중 특정 노드에서 사용자 입력을 기다려야 하는데, 이때 상태를 저장하고, 재개 시 정확히 그 지점부터 실행해야 했습니다. 이를 위해:
1. 각 노드의 실행 상태를 JSON으로 직렬화
2. Pause 시 Redis에 상태 저장
3. Resume 시 상태 복원 후 DAG 재실행 (이미 완료된 노드는 스킵)
이 과정에서 **상태 관리와 멱등성 보장**이 핵심이었습니다."

#### Q3: "왜 Bun을 선택했나요?"
**A**: "세 가지 이유입니다:
1. **속도**: 패키지 설치와 실행이 npm/yarn보다 5~10배 빠름
2. **DX**: 내장 번들러, 테스트 러너, TypeScript 지원
3. **Node 호환성**: 기존 npm 생태계를 그대로 사용 가능
특히 모노레포 환경에서 workspace 설정이 간단하고, 타입 공유가 자연스럽게 처리되는 점이 좋았습니다."

#### Q4: "Activepieces 통합 시 JWT workaround를 왜 사용했나요?"
**A**: "Activepieces Community Edition은 Cloud 버전과 달리 **API Key 인증을 지원하지 않습니다**. 모든 요청이 웹 UI의 쿠키 기반 세션에 의존하는 구조였습니다.
우리는 서버-to-서버 통신이 필요했기 때문에:
1. Activepieces의 인증 로직을 분석해 JWT 생성 방식을 역공학
2. 우리 서버에서 JWT를 직접 생성 → API 호출
3. 보안 리스크를 줄이기 위해 짧은 TTL (5분) + 용도 제한
이 방식으로 CE 버전에서도 API 통합이 가능해졌습니다."

#### Q5: "Multi-target 배포의 장점은?"
**A**: "하나의 코드베이스로 **런타임별 최적화**를 할 수 있다는 점입니다:
- **CF Workers**: Edge에서 낮은 latency
- **Deno**: 보안 샌드박스 환경
- **Bun**: 로컬 개발 속도
- **Node**: 기존 인프라 호환성
Hono의 어댑터를 사용하면 런타임별로 다른 설정 없이 동일한 코드가 작동합니다. 이는 **배포 유연성**과 **벤더 락인 회피**에 유리합니다."

#### Q6: "ADR을 왜 작성했나요?"
**A**: "프로젝트 초기에 **'왜 이렇게 설계했는지'**를 나중에 설명할 수 없을 것 같다는 생각이 들었습니다. ADR은:
1. **의사결정의 맥락**을 기록 (당시 제약, 대안, 트레이드오프)
2. 나중에 팀원이나 인수인계 시 **Why** 를 빠르게 이해 가능
3. 면접이나 발표에서 **사고 과정**을 증명
5개 ADR을 작성하면서, 제가 내린 결정들이 임시방편이 아니라 **근거 있는 선택**이었음을 정리할 수 있었습니다."

#### Q7: "다음에 추가하고 싶은 기능은?"
**A**:
1. **버전 관리**: 워크플로우의 Git 같은 버전 관리 시스템
2. **테스트 생성**: 워크플로우에서 자동으로 테스트 코드 생성
3. **AI 노드**: LLM을 워크플로우에 직접 통합 (예: GPT-4 노드)
4. **실시간 협업**: 여러 사람이 동시에 워크플로우 편집 (CRDT 기반)
5. **모니터링 대시보드**: 실행 중인 워크플로우의 상태를 실시간 추적

---

## 종합 액션 플랜

### Week 1-2: 문서화 (조직 어필)
- [ ] ADR 요약 대시보드 작성
- [ ] 시스템 아키텍처 다이어그램 3종 작성
- [ ] 기술 보고서 목차 작성

### Week 3-4: 블로그 (P0 포스트 2개)
- [ ] P0-1 "Visual Workflow Builder에서 풀스택 앱이 나오기까지" 작성
- [ ] P0-2 "Bun 모노레포로 Elysia + React 19 프로젝트 구성하기" 작성

### Week 5-6: 이력서 및 면접 준비
- [ ] 이력서 프로젝트 섹션 업데이트
- [ ] 면접 Q&A 스크립트 암기 및 연습
- [ ] 포트폴리오 사이트에 Workflow Studio 추가 (선택)

### Week 7-8: 블로그 (P1 포스트 2개)
- [ ] P1-1 "Activepieces CE를 JWT로 인증하기" 작성
- [ ] P1-2 "DAG 엔진으로 워크플로우 실행하기" 작성

---

## 참고 링크
- [[builder-studio-planning-v1.1]] - 기획 문서
- [[builder-app-spec-schema]] - AppSpec 스키마
- [[builder-auth-architecture]] - 인증 아키텍처
- [[n8n-reverse-engineering]] - n8n 분석
- ADR 문서들 (프로젝트 저장소 내)

---

## 메타
- **Status**: Active
- **Next Review**: 2026-02-10
- **Related Projects**: Workflow Studio, Persona API
