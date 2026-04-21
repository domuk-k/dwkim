# Requirement Verification Questions

**Task**: Harness-친화적 배포 문서화 (dwkim CLI + 관련 서비스)
**Depth**: Standard (docs 작업이지만 대상 시스템 3개 → 모호점 다수)

---

## Section A — Scope & Audience

### Question A1: 문서 범위

어느 패키지까지 포함?

  
C) 전 패키지 (dwkim + persona-api + blog) — 통합 deployment handbook

### Question A2: 주요 독자

문서의 일차 독자는?

A) 본인(미래의 나) — 몇 개월 후 배포할 때 참고용 runbook 스타일  
C) AI 에이전트 — Claude/agents 가 배포 작업을 자동화할 수 있도록 기계 친화적 스펙

### Question A3: 문서 위치/형태

산출물을 어디에?

A) 각 패키지 루트에 `DEPLOY.md` 개별 (3개 파일)
B) 모노레포 루트에 `DEPLOYMENT.md` 단일 (통합 인덱스 + 패키지별 섹션)
C) 루트 `docs/deployment/` 디렉토리 (공식 문서 사이트 대비)
D) `harness-docs/` 안에만 (Harness 워크플로우 산출물로만)
X) Other

[Answer]: A나 D인데 너의 추천안을 따름

---

## Section B — Content Depth

### Question B1: 배포 커버리지

각 패키지별로 다룰 내용?

  
C) 포괄 — B + 롤백 절차 + 사고 대응 + 모니터링 링크 + cold start 등 운영 행위

[Answer]: C

### Question B2: 시크릿 관리

시크릿 설정 절차를 문서에 어느 수준으로?

  
B) 키 리스트 + 각 키의 출처/획득처 링크 + `fly secrets set` / `vercel env add` 명령 예시  


[Answer]: 다만 이 레포가 공개레포니까 gitignore 된 파일로 관리해야할거같아

### Question B3: Cold Start 문서화

Fly.io cold start 행위를 어떻게 다룰지?

A) 알려진 제약으로 명시만 (현 상태 유지)
B) 명시 + `min_machines_running` 옵션 트레이드오프 분석
C) B + warming 전략 제안 (예: 정기 health ping, 사용자 첫 접속 skeleton)
X) Other

[Answer]: C? 이건 느슨하게 결정해도 되

---

## Section C — Known Issues 처리

### Question C1: Stale 자산 처리 방침

RE 에서 발견한 부채 항목 (pnpm 잔재, Dockerfile 3종 등)?  
C) 이번에 같이 수정 (deploy-blog.sh Bun 마이그레이션, Dockerfile 정리 등)  


---

## Section D — Extension Opt-Ins

### Question D1: Security Extensions

Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

### Question D2: Property-Based Testing Extension

Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)
B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)
C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Section E — Success Criteria

### Question E1: "완료" 정의

이 문서가 완성됐다고 판단할 기준?

A) 문서 존재 자체 — 참고용
B) 문서만 보고 본인이 재현 가능 (3개월 뒤에 돌아와도 막힘 없이 배포)
C) B + 외부인도 재현 가능 (신규 협업자 onboarding 기준)
D) C + 에이전트가 자동화 가능 (기계 실행 가능한 체크리스트/스크립트 포함)
X) Other

[Answer]: 