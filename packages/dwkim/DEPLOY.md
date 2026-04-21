# dwkim CLI — Deployment Runbook

> npm 글로벌 CLI (`npm i -g dwkim`, `npx dwkim`). 배포는 **push-to-main 완전 자동**.

## 1. Overview

- **Target**: [npm registry](https://www.npmjs.com/package/dwkim)
- **Package**: `dwkim` (public scope)
- **Trigger**: `main` 브랜치에 `packages/dwkim/**` 변경 포함된 푸시
- **Automation**: `.github/workflows/publish.yml` → [semantic-release](https://github.com/semantic-release/semantic-release)
- **Version bump**: Conventional Commits 기반 자동 (`fix:` → patch, `feat:` → minor, `feat!:` → major)
- **Provenance**: OIDC (`NPM_CONFIG_PROVENANCE=true`) — npm 페이지에 서명 표시
- **Tag format**: `dwkim-v${version}` (블로그·persona-api 와 태그 네임스페이스 분리)

## 2. Prerequisites

### 최초 1회 설정 (이미 완료됨 — 참고용)
- [ ] npm 계정에 OIDC publisher 연동 (또는 `NPM_TOKEN` GitHub secret 구성)
- [ ] `publish.yml` 의 permissions 에 `id-token: write` 포함
- [ ] `packages/dwkim/release.config.js` 존재 확인
- [ ] npm 페이지에서 public 패키지 등록

### 매 배포 전 (로컬)
- [ ] `git status` clean
- [ ] `main` 브랜치 위 or `main` 으로 merge 직전

### 매 배포 전 (로컬 수동 publish 가 필요한 희귀 상황)
- [ ] `npm whoami` → 본인 확인
- [ ] `NPM_TOKEN` 환경변수 or `.npmrc` 설정
- [ ] `bun install && bun run build:dwkim` 성공

## 3. Secrets & Environment

**런타임**: dwkim CLI 는 외부 API 키 불요. `DWKIM_API_URL` 만 선택적.

**빌드/배포 시크릿**: GitHub Secrets 에서 관리.

자세히: [`secrets-manifest.md`](./secrets-manifest.md) · 템플릿: [`.env.example`](./.env.example)

## 4. Deploy Procedure

### 4.1 자동 배포 (권장 경로)

```bash
# 1. 변경 작업 + conventional commit
cd <workspace-root>
git checkout -b feat/dwkim-xxx
# ... src/ 수정 ...
git commit -m "feat(dwkim): add --json output flag"

# 2. PR → squash merge to main
gh pr create --fill
gh pr merge --squash --delete-branch

# 3. 배포 자동 진행 — GH Actions 관찰
gh run watch $(gh run list -w publish.yml -L 1 --json databaseId -q '.[0].databaseId')

# 4. semantic-release 가 버전 bump 커밋을 main 에 push → 로컬 sync
git pull origin main
```

### 4.2 수동 배포 (emergency 용)

> ⚠️ 권장하지 않음. CI 가 막혀있고 패치가 급할 때만.

```bash
cd <workspace-root>
bun install
bun run build:dwkim

# 버전 수동 bump (Conventional Commits 를 건너뛸 때)
cd packages/dwkim
# package.json 편집...

# npm publish (OIDC 사용 불가 — 토큰 필요)
npm publish --access public
```

## 5. Post-Deploy Verification

```bash
# 1. GH Actions 성공 확인
gh run list -w publish.yml -L 1

# 2. npm 에 새 버전 도달 확인 (registry 전파 10~30초)
npm view dwkim version
# 예상 출력: 3.7.0

# 3. 실제 설치 테스트
npx dwkim@latest
# 예상: connecting → welcome 화면 → persona-api 응답
```

**체크리스트**:
- [ ] GH Actions `publish.yml` 성공
- [ ] npm view 가 새 버전 반환
- [ ] GitHub release 페이지에 릴리즈 노트 자동 생성됨
- [ ] `CHANGELOG.md` 에 엔트리 추가됨 (semantic-release 가 커밋)
- [ ] `npx dwkim` 정상 실행

## 6. Rollback

**npm 은 unpublish 에 제약이 큼** (72시간 내만, 의존성 없을 때만). 롤백은 **새 패치 릴리즈** 가 정석.

```bash
# 옵션 A: git revert + 새 patch
git revert <bad-commit>
git commit -m "fix(dwkim): revert <short-desc>"
git push origin main
# → publish.yml 이 patch 버전으로 자동 재배포

# 옵션 B: npm dist-tag 이전 버전 되돌리기 (최신 tag 만 영향)
npm dist-tag add dwkim@3.6.0 latest
# 사용자는 npx dwkim@latest 시 3.6.0 받음 (기존 릴리즈 유지)
```

## 7. Monitoring & Observability

| 신호 | 위치 |
|------|------|
| 빌드 실패 | [GH Actions runs](https://github.com/domuk-k/dwkim/actions/workflows/publish.yml) |
| npm 다운로드 | [npmjs.com/package/dwkim](https://www.npmjs.com/package/dwkim) |
| 릴리즈 이력 | [GitHub releases](https://github.com/domuk-k/dwkim/releases) |
| 런타임 에러 | CLI 는 stateless — 사용자 터미널에서만. 원격 로그 없음. |

## 8. Incident Response

| 증상 | 진단 | 해결 |
|------|------|------|
| `gh pr merge` 후 새 버전 안 나옴 | `gh run list -w publish.yml` — 실패인지, 미트리거인지 확인 | 커밋 메시지가 `fix:`/`feat:` 형식 아닌지 확인. `docs:`/`chore:` 는 릴리즈 안 됨 |
| `semantic-release` "No release published" | CI 로그 확인 | Conventional commits 형식이 맞는지 재확인. paths filter 통과했는지 확인 |
| OIDC provenance 에러 | "id-token: write" permission 누락 | `publish.yml` 의 `permissions:` 블록 확인 |
| `npm publish` 403 | 토큰 만료 or 권한 | `NPM_TOKEN` secret 재발급 |
| 사용자 측 "패키지 설치 실패" | `npm cache verify` 안내 | registry 전파 대기, 또는 `npm cache clean --force` |

## 9. Known Quirks

- **semantic-release 커밋 푸시백**: 릴리즈 시 `chore(dwkim): release x.y.z [skip ci]` 커밋이 `main` 에 추가됨. 로컬 `git pull` 필요.
- **Path filter**: `packages/dwkim/**` 만 변경 시 트리거. `.github/workflows/publish.yml` 자체 수정도 트리거함 (원복 테스트 시 주의).
- **scoped vs global commits**: `release.config.js` 가 `{type: 'feat', scope: 'dwkim'}` 우선, fallback 으로 scope 없는 `feat:` 도 minor 로 처리. 스코프 지키는 것이 안전.
- **npm workspaces 제거**: CI 가 publish 전 `jq 'del(.workspaces)' package.json` 로 workspaces 필드 제거 후 `npm install --ignore-scripts` — 로컬 실험 시 레포 오염 금지.
- **`__VERSION__` inject**: esbuild 가 `define` 으로 버전 상수 치환. CLI 에서 버전 표시할 때 이 상수 사용.

## 10. Agent Cheat Sheet

```bash
# 에이전트가 순차 실행할 최소 명령 (자동 배포 경로 기준)

# 1) Preflight
cd <workspace-root>
git status --porcelain || exit 1
git fetch origin main

# 2) Build local (선택 — CI 가 어차피 돌림)
bun install
bun run build:dwkim
bun run lint
node -e "import('./packages/dwkim/dist/index.js').then(() => console.log('load ok'))"

# 3) Commit + push (호출자가 이미 commit 했다면 생략)
# 에이전트는 반드시 conventional commit 사용:
#   feat(dwkim): ... | fix(dwkim): ... | perf(dwkim): ... | refactor(dwkim): ...
git push origin main

# 4) Watch deploy
gh run watch $(gh run list -w publish.yml -L 1 --json databaseId -q '.[0].databaseId')

# 5) Verify
LATEST=$(npm view dwkim version)
echo "Published: $LATEST"
```

### Agent Guardrails
- **절대**: 임의 버전 bump / `npm publish` 로컬 실행 금지
- **절대**: force push to main
- **반드시**: conventional commit scope `dwkim` 사용
- **반드시**: PR 생성 후 사람 승인 대기 (main 직접 push 금지)

---
*Last updated: 2026-04-21*
