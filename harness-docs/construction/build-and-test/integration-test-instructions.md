# Integration Test Instructions — deployment-docs

> 여러 유닛 결합 테스트 — 이 프로젝트는 문서가 **실제 배포와 연결** 되어야 가치. 통합 테스트 = "문서 따라했을 때 배포 성공하는가".

## IT-1: Dry-run 매트릭스

### dwkim CLI — 빌드 시퀀스 재현
```bash
cd <workspace-root>
bun install
bun run build:dwkim
node -e "import('./packages/dwkim/dist/index.js').then(() => console.log('load ok'))"
```
**기대**: 에러 없이 load ok.

### persona-api — 로컬 빌드 + Docker 빌드
```bash
cd packages/persona-api
bun run type-check

# Docker 빌드 (fly 안 쓰고 로컬만)
docker build -t persona-api:test -f Dockerfile .
# 또는 fly 가 빌드만
fly deploy --build-only
```
**기대**: 이미지 생성. 배포는 실제 하지 않음.

### blog — Astro 빌드
```bash
cd packages/blog
bun run build
# prebuild (sync-cogni, ~/.cogni 있으면) + astro build + postbuild (link check)
```
**기대**: `packages/blog/dist/` 생성, postbuild link check 에서 깨진 링크 0.

## IT-2: Deploy-blog.sh 드라이런 (git clean 상태에서만)
```bash
# 임시 브랜치에서 검증 (의도치 않은 커밋 방지)
cd <workspace-root>/packages/blog
git checkout -b test/deploy-dryrun
# 스크립트의 push 부분을 제거한 버전으로 확인 (or GIT_PUSH=echo 트릭)
GIT_PUSH=echo bash -x scripts/deploy-blog.sh  # 실제 sync 만 테스트
git checkout - && git branch -D test/deploy-dryrun
```
**주의**: 실제 `git push` 트리거 금지. 임시 브랜치 사용.

## IT-3: 문서 → 실제 배포 재현 (수동, 분기별)

**시나리오 A: "3개월 후의 본인" (US-1)**
1. `packages/persona-api/DEPLOY.md` 열기
2. Section 4.1 "기본 배포" 명령을 그대로 복붙 실행
3. Section 5 체크리스트 전부 통과
4. **통과 기준**: 중간에 문서에 없는 명령을 찾을 필요 없음

**시나리오 B: "AI 에이전트" (US-2)**
1. 각 DEPLOY.md 의 "Agent Cheat Sheet" 섹션만 에이전트에 전달
2. 에이전트가 로컬 Preflight → Build → Push → Verify 완주
3. **통과 기준**: 에이전트가 Guardrails 위반 없이 완료

**시나리오 C: "장애 대응" (US-3)**
1. 의도적 비정상 상황 재현 (예: Redis 연결 끊음)
2. `packages/persona-api/DEPLOY.md` Section 8 Incident Response 표를 따라 진단
3. **통과 기준**: 표의 "해결" 컬럼으로 복구 성공

## IT-4: Cold Start 행위 검증 (Known Quirk)
```bash
# 유휴 유도 (Fly 머신 stop 기다리기: ~몇 분)
fly scale count 0 -a persona-api
sleep 30
fly scale count 1 -a persona-api

# 첫 요청 시간 측정
time curl -s https://persona-api.fly.dev/health | jq
```
**기대**: 첫 요청 3-6초. 2번째부터 sub-second. 문서의 "~4-5초" 주장 검증.

## IT-5: SECURITY-04 Follow-up (CSP 부재 확인)
```bash
# 블로그 응답 헤더 확인
curl -sI https://dwkim.dev | /usr/bin/grep -iE "content-security-policy|strict-transport-security|x-frame|x-content-type"
```
**현재 예상**:
- ✅ `strict-transport-security` (Vercel 기본)
- ✅ `x-content-type-options: nosniff` (Vercel 기본)
- ❌ `content-security-policy` — 부재 (후속 개선)

→ `packages/blog/DEPLOY.md` Section 7 의 Known Issue 기재 일관성 재확인.
