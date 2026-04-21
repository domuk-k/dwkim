# dwkim — Secrets Manifest

> 값은 절대 여기 기록 금지. 키 이름, 출처, 저장 위치만.

## Runtime Secrets
dwkim CLI 는 API 키가 필요 없음. 런타임 시크릿 0건.

## Build/Release Secrets (GitHub)

| Key | 저장 | 사용처 | 획득 | 로테이션 |
|-----|------|--------|------|----------|
| `NPM_TOKEN` | GitHub Secrets (repo → Settings → Secrets and variables → Actions) | `.github/workflows/publish.yml` | [npmjs.com 토큰 발급](https://docs.npmjs.com/creating-and-viewing-access-tokens) — Automation 타입 | 만료 시 재발급 (npm 은 만료 기본값 30일) |
| `GITHUB_TOKEN` | 자동 주입 | `publish.yml` (release + push) | GH Actions 자동 | 로테이션 불필요 |

## Environment Variables (런타임 — 선택)

| Key | 설명 | 필수 | 기본값 |
|-----|------|------|--------|
| `DWKIM_API_URL` | persona-api 엔드포인트 | ❌ | `https://persona-api.fly.dev` |

## Verification

```bash
# GH Secret 존재 확인 (값은 표시 안 됨)
gh secret list
# 예상 출력: NPM_TOKEN  Updated YYYY-MM-DD

# npm 토큰 유효성
npm whoami  # 로컬에서 토큰 설정된 경우
```

## Leak Response
1. `NPM_TOKEN` 유출 의심 시: [npm tokens 페이지](https://www.npmjs.com/settings/~/tokens) 에서 즉시 revoke
2. 새 토큰 발급 → GH Secret 갱신
3. `git log -p packages/dwkim/` 에서 커밋된 자취 없는지 확인
