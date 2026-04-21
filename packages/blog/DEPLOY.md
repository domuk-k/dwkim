# blog — Deployment Runbook

> Astro 정적 사이트. Vercel GitHub integration 으로 push 자동 배포.

## 1. Overview

- **Target**: [Vercel](https://vercel.com) (프로젝트 대시보드에서 관리)
- **URL**: https://dwkim.dev (또는 Vercel 기본 도메인)
- **Trigger**: `main` 브랜치 push (Vercel GitHub App)
- **Automation**: ✅ 완전 자동 (`vercel.json` 설정 기반)
- **Framework**: Astro 5 SSG + React 19 (선택 islands)
- **Build command**: `bun run build` (prebuild sync-cogni + astro build + postbuild check-links)

## 2. Prerequisites

### 최초 1회 (이미 완료)
- [ ] Vercel 계정 + GitHub 연동
- [ ] 프로젝트 생성 + `packages/blog/` 를 root directory 로 지정
- [ ] (커스텀 도메인 사용 시) DNS A/CNAME 레코드 추가

### 매 작업 전 (로컬)
- [ ] Bun 설치 + `bun install` 성공
- [ ] `~/.cogni/` 존재 (블로그 포스트 SSOT) — 없으면 prebuild 가 스킵 (CI-safe)
- [ ] `bun run dev` 로 로컬 확인 권장

## 3. Secrets & Environment

**프로덕션**: Vercel dashboard → Project Settings → Environment Variables.

블로그 자체는 런타임 시크릿이 거의 없음 (정적 사이트). Vercel Analytics 는 자동 주입.

자세히: [`secrets-manifest.md`](./secrets-manifest.md) · 템플릿: [`.env.example`](./.env.example)

## 4. Deploy Procedure

### 4.1 자동 배포 (99% 경로)
```bash
# Cogni → 로컬 sync (선택, 수동)
cd <workspace-root>/packages/blog
bun run sync-cogni

# 변경 커밋
git add src/content/
git commit -m "docs(blog): add new post about X"
git push origin main
# → Vercel 이 webhook 받고 자동 빌드 (~2분)
```

### 4.2 deploy-blog.sh 사용 (원-커맨드 래퍼)
```bash
cd <workspace-root>/packages/blog
bun run deploy
# 내부적으로: sync-cogni → git diff 체크 → 변경 있을 시 commit + push
```

### 4.3 Preview 배포 (PR)
```bash
git checkout -b post/xxx
# ...
gh pr create --fill
# → Vercel 이 PR 마다 preview URL 생성 (commit status 로 노출)
```

### 4.4 수동 Vercel CLI (비상)
```bash
# 로컬에서 직접 push (GH 우회 필요한 경우)
cd packages/blog
npx vercel --prod
```

## 5. Post-Deploy Verification

```bash
# 1. Vercel 빌드 상태
open https://vercel.com/<team>/<project>/deployments

# 2. 새 빌드 도달
curl -sI https://dwkim.dev | head -5
curl -s https://dwkim.dev/rss.xml | head -5   # RSS 생성 확인
curl -s https://dwkim.dev/sitemap-index.xml | head

# 3. 특정 포스트
curl -s https://dwkim.dev/posts/<slug>/ | /usr/bin/grep "<title>"
```

**체크리스트**:
- [ ] Vercel 대시보드 빌드 "Ready"
- [ ] 프로덕션 URL 200 + 최신 포스트 표시
- [ ] RSS / sitemap 갱신됨
- [ ] OG 이미지 생성됨 (`/og/<slug>.png`)
- [ ] 포스트 postbuild link check 통과 (`bun scripts/check-links.ts`)

## 6. Rollback

Vercel 은 모든 배포 보존 — 대시보드에서 1-click rollback 가능.

```bash
# CLI
vercel rollback <previous-deployment-url> --scope=<team>

# 또는 git revert
git revert <bad-commit>
git push origin main
```

## 7. Monitoring & Observability

| 신호 | 위치 |
|------|------|
| 빌드 성공/실패 | [Vercel dashboard](https://vercel.com) → Deployments |
| 런타임 방문 수 | [Vercel Analytics](https://vercel.com/analytics) (`@vercel/analytics` 통합) |
| 에러 (정적 사이트라 거의 없음) | 브라우저 콘솔 / Vercel Web Vitals |
| Link 무결성 | postbuild `scripts/check-links.ts` 출력 (빌드 로그에 표시) |

> **SECURITY-02**: Vercel 은 기본 HTTP access log 제공 (대시보드 → Logs).
> **SECURITY-04**: HTTP 보안 헤더는 `vercel.json` 의 `headers` 블록에서 명시 관리. CSP, HSTS (`max-age=63072000; includeSubDomains; preload`), X-Content-Type-Options, X-Frame-Options (`DENY`), Referrer-Policy, Permissions-Policy 포함. CSP 는 `'self' + unsafe-inline`(Astro hydration), Vercel Analytics, YouTube/Vimeo/Twitter 임베드, GitHub API 를 허용. 수정 시 배포 후 `curl -sI https://blog.dwkim.me` 로 재검증.

## 8. Incident Response

| 증상 | 진단 | 해결 |
|------|------|------|
| 빌드 실패 | Vercel 로그 확인 | `bun run build` 로컬 재현 → 의존성/타입 에러 수정 |
| Link check 실패로 빌드 멈춤 | postbuild 로그 | 깨진 링크 수정 후 재커밋 |
| 최신 포스트 안 보임 | 빌드 성공했는지 확인 | Cogni 노트에 `tags: [blog]` 있는지, `date:` 미래 아닌지 |
| 이미지 깨짐 | Sharp 처리 실패 | 원본 이미지 포맷 확인 (webp/avif 지원) |
| Cogni sync 실패 | `~/.cogni/` 권한 | 로컬 운영자만 영향. CI 는 자동 스킵 |
| CSS 깜빡임 | `@playform/inline` 인라인 실패 | dev 모드 재현 후 설정 검토 |

## 9. Known Quirks

### Prebuild sync-cogni (CI-safe)
`package.json` 의 `prebuild` 스크립트:
```bash
[ -d ~/.cogni ] && bun run sync-cogni || echo 'Skipping sync-cogni (no ~/.cogni directory)'
```
- **로컬**: `~/.cogni/notes/**` 중 `tags: [blog]` 자동 sync → `src/content/posts/`
- **Vercel CI**: `~/.cogni` 없음 → prebuild 스킵. `src/content/posts/` 에 이미 커밋된 파일만 빌드 대상
- **의미**: 블로그 포스트는 **로컬에서 sync-cogni 돌린 뒤 커밋·푸시**가 정식 경로

### Postbuild link check
`scripts/check-links.ts` 가 빌드 산출물의 링크 검증. 빌드를 fail 시킬 수 있음. 의도적 외부 링크 이슈 시 스크립트에 allowlist 추가.

### deploy-blog.sh
원-커맨드 래퍼 — 로컬 commit + push 대체. 단, **Cogni sync 를 수동 트리거**해야 하는 경우에만 의미. CI 자동 배포 자체는 이 스크립트 없이도 동작.

> ⚠️ **이전**: `pnpm sync-cogni` 명령을 사용했으나 Bun 이행 후 stale 상태였음. `bun run sync-cogni` 로 이미 수정됨 (2026-04-21).

### Vercel GitHub integration
- PR 마다 preview 배포 자동 생성
- Preview URL 은 PR comment 로 붙음
- 프로덕션 배포는 `main` push 에만
- `.vercel/` 디렉토리는 gitignore (프로젝트 링크 캐시)

## 10. Agent Cheat Sheet

```bash
# 에이전트가 순차 실행할 최소 명령

# 1) Preflight
cd <workspace-root>/packages/blog
git status --porcelain || exit 1
bun install

# 2) Local sync + build validation
[ -d ~/.cogni ] && bun run sync-cogni
bun run build   # prebuild + astro build + postbuild link check

# 3) Commit + push
git add -A src/content/
git commit -m "docs(blog): <description>"
git push origin main

# 4) Watch Vercel
# CLI 가 연결되어 있다면:
vercel inspect --prod
# 아니면 대시보드 URL 제시
echo "Check: https://vercel.com/<team>/<project>/deployments"

# 5) Verify
sleep 90   # Vercel 빌드 대기
curl -sI https://dwkim.dev | head -3
```

### Agent Guardrails
- **절대**: `main` 직접 push 금지 (PR 경유 권장, Vercel 이 preview 제공)
- **절대**: `.vercel/` 커밋
- **반드시**: `bun run build` 로컬 성공 후 push
- **반드시**: Cogni 노트 frontmatter 검증 (`tags: [blog]`, `date:` 포맷, `draft: false`)
- **주의**: 이미지는 `src/content/posts/images/` 하위 상대 경로로

---
*Last updated: 2026-04-21*
