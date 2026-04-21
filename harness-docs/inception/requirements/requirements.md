# Requirements: Deployment Documentation (Harness-friendly)

## Intent Analysis

- **User Request**: "dwkim 쪽 배포과정까지도 (harness친화적으로) 문서화 필요 - 지금 서버죽은거같아서"
- **Request Type**: Documentation + minor Refactoring (stale asset fixes)
- **Scope Estimate**: Multiple Components (3 packages + CI/CD)
- **Complexity Estimate**: Moderate (3 배포 타겟, 3 플랫폼, 2차 부채 수정 병행)
- **Trigger Context**: 사용자가 서버 다운으로 오인 → 실제는 Fly.io cold start (~4-5s). 이 발견 자체가 문서화 필요성의 근거.

## Functional Requirements

### FR-1 — 배포 문서 산출물 구조
3개 패키지 전부에 대한 배포 runbook 생성.

**위치 (추천: A 기반 하이브리드)**:
- `packages/dwkim/DEPLOY.md` — CLI npm publish runbook
- `packages/persona-api/DEPLOY.md` — Fly.io deploy runbook
- `packages/blog/DEPLOY.md` — Vercel deploy runbook
- `DEPLOYMENT.md` (루트) — 얇은 인덱스: 3개 DEPLOY.md 링크 + 공통 사전조건 (Bun 설치, GH auth, flyctl) + 한 페이지 개요 다이어그램

**근거**: A2=본인+AI에이전트 독자. 패키지 루트가 발견성 최고 (에이전트 read-first 규칙). 루트 인덱스는 오버뷰용.

### FR-2 — 각 DEPLOY.md 내용 (포괄 — B1=C)
각 파일은 다음 섹션 포함:

1. **Overview** — 배포 대상, 호스팅 플랫폼, 트리거 (push auto vs manual)
2. **Prerequisites** — 필요 도구, 계정, 권한
3. **Secrets & Environment** — 키 리스트 + 획득처 + 설정 명령 (FR-3 참조)
4. **Deploy Procedure** — step-by-step 명령
5. **Post-Deploy Verification** — 체크리스트 (health, version, smoke test)
6. **Rollback** — 이전 버전 복구 절차
7. **Monitoring & Observability** — 대시보드 링크, 로그 조회, 알람
8. **Incident Response** — 장애 플레이북 (흔한 실패 모드 + 해결)
9. **Known Quirks** — cold start 등 (FR-4)
10. **Agent Cheat Sheet** — 에이전트가 실행 가능한 명령 블록 (FR-6)

### FR-3 — 시크릿 관리 방침 (B2 + 공개레포 제약)

**원칙**: 공개 레포이므로 **값은 절대 커밋 X**.

- **키 이름 + 출처 + 설정 명령**은 `DEPLOY.md` 에 평문 기재 (OK)
- **실제 값**은 `.env.example` 템플릿으로 각 패키지에 커밋, 실제 `.env` 는 gitignore
- **운영 시크릿**: `fly secrets` / Vercel Env UI / GitHub Secrets 에서만 관리
- **시크릿 매니페스트** 파일: `secrets-manifest.md` (`packages/*/` 각각) — 키 리스트 + 획득 링크 + 저장 위치. gitignore 대상은 아님 (메타데이터만).
- `.gitignore` 확인 후 누락 시 보강

### FR-4 — Cold Start 문서화 (B3=C, 느슨)

`packages/persona-api/DEPLOY.md` 의 "Known Quirks" 섹션에:
- Fly.io `auto_stop_machines = "stop"` + `min_machines_running = 0` 현재 설정 명시
- 첫 요청 ~4-5s 지연 행위 설명
- `min_machines_running` 트레이드오프 (월 비용 vs UX)
- Warming 전략 옵션 열거 (정기 health ping, CLI skeleton UI, 사용자 첫 접속 로딩 메시지) — 권장안 아닌 선택지로

### FR-5 — Stale 자산 수정 (C1=C, 이번에 같이)

다음 수정을 문서화 작업과 병행:

1. **`packages/blog/scripts/deploy-blog.sh`** — `pnpm` → `bun` 명령 치환
2. **`packages/persona-api/Dockerfile.fly`** — 삭제 또는 `.legacy` 로 리네임 + README 명시
3. **`packages/persona-api/Dockerfile.dev`** — 용도 주석 추가 or docker-compose.dev 에만 쓰이는지 명시
4. **`.gitignore`** — `.env`, `secrets-manifest.md` 예외 등 보강 검토

### FR-6 — Agent-Executable Format (E1=D)

각 `DEPLOY.md` 는 다음 조건 만족:

- **명령은 코드 블록** (paste-and-run)
- **전제 조건은 체크리스트** (`- [ ]`)
- **루트에서 상대경로** 사용 (CWD 명시)
- **환경변수는 `${VAR}` 형태**로 참조
- **에이전트 cheat sheet 섹션** 포함 — 최소 커맨드 시퀀스 (예: `bun install && bun run build:dwkim && git push`)

## Non-Functional Requirements

### NFR-1 — Accuracy (정확성, 최우선)
- 모든 명령은 현재 코드베이스와 일치. RE 결과 기반.
- 버전·플래그는 `package.json` / `fly.toml` 등 실제 파일에서 추출

### NFR-2 — Maintainability
- 문서는 코드 진실의 소스 (package.json scripts, fly.toml, vercel.json) 를 참조. 중복 최소화.
- "Last updated" 타임스탬프 푸터 포함

### NFR-3 — Discoverability
- 루트 `README.md` 또는 `CLAUDE.md` 에서 `DEPLOYMENT.md` 링크 (1곳 수정 검토)
- 각 패키지 README 에 DEPLOY.md 링크

### NFR-4 — Security (Extension: security-baseline ON)
적용 룰 & 본 문서 연관성:
- **SECURITY-03 (Application Logging)**: persona-api DEPLOY 에 Logtail/Pino 설정 + 로그 PII 금지 명시
- **SECURITY-05 (Secrets Management)**: FR-3 과 직접 정합
- **SECURITY-04 (HTTP Headers)**: blog Vercel 헤더 설정 검증 필요
- **SECURITY-02 (Access Logging)**: Fly.io proxy 로그 + Vercel 로그 링크 문서화
- **SECURITY-01 (Encryption at Rest/Transit)**: Fly HTTPS force / Redis URL tls 스킴 명시. Neon/Qdrant 연결 TLS 확인.

N/A 룰 존재 시 compliance summary 에서 명시.

### NFR-5 — Reproducibility
- 본인 재현 (E1=D) + 에이전트 실행 가능 (FR-6)

## User Scenarios

### US-1 — 3개월 후의 본인
3개월간 배포 안 한 상태에서 `persona-api` hotfix 필요 → `packages/persona-api/DEPLOY.md` 열어 `fly deploy` 시퀀스 그대로 실행, cold start 후 health 체크까지 완료.

### US-2 — AI 에이전트 자동 배포
Claude agent 가 "dwkim CLI 버그 수정 후 배포" 지시 받음 → `packages/dwkim/DEPLOY.md` 의 "Agent Cheat Sheet" 읽고 conventional commit → push → semantic-release 관찰까지 자동 실행.

### US-3 — 장애 대응
persona-api 실패 알림 → `DEPLOY.md` "Incident Response" 섹션에서 흔한 실패 모드 (OpenRouter rate limit, Redis 연결 끊김, cold start 오해) 확인 → 해당 진단 스크립트 실행.

## Out of Scope (명시적 제외)

- 새로운 배포 타겟 추가 (staging 환경 등)
- CI 확장 (예: persona-api 자동 배포 GH Action) — Known Issues 에 기록만
- 테스트 추가 (PBT OFF)
- Dockerfile 대폭 재작성 (최소 정리만)
- 블로그 Vercel 프로젝트 재설정

## Success Criteria

- [ ] 4개 파일 생성: 3 × `packages/*/DEPLOY.md` + 루트 `DEPLOYMENT.md`
- [ ] 각 DEPLOY.md 가 10개 섹션 (FR-2) 포함
- [ ] `.env.example` 3개 패키지 각각 존재 (실제 `.env` 는 gitignore)
- [ ] secrets-manifest.md 3개
- [ ] `deploy-blog.sh` pnpm → bun 치환 완료
- [ ] `Dockerfile.fly` / `Dockerfile.dev` 의도 명시 or 제거
- [ ] security-baseline 룰 5개 (01~05) 각각 compliance 평가 완료 (compliant / N/A / non-compliant)
- [ ] 모든 명령이 실제 복붙 실행 시 동작 (수동 검증)
- [ ] 에이전트가 각 DEPLOY.md 를 읽고 배포 시퀀스 재현 가능

## Summary

**What**: 3개 패키지 + 루트 통합 인덱스의 배포 runbook (총 4문서), 부차적 stale 자산 수정, `.env.example`/secrets manifest 템플릿.

**Why**: 서버 cold start 를 장애로 오인한 사건 → 배포·운영 지식이 코드에만 있고 문서화 부재. 본인(future-me) + AI 에이전트가 동등하게 재현 가능해야 함. 공개 레포 + 프로덕션 엔드포인트이므로 security baseline 강제.

**How (next)**: Workflow Planning 에서 실행 시퀀스 확정.
