# blog — Secrets Manifest

> 값은 절대 여기 기록 금지. 블로그는 정적 사이트라 런타임 시크릿 거의 없음.

## Runtime Secrets
- **없음** (정적 사이트).

## Build-time Secrets (Vercel Environment Variables)

저장: Vercel Dashboard → Project → Settings → Environment Variables.

### 자동 주입 (Vercel 이 기본 제공)

| Key | 범위 | 용도 |
|-----|------|------|
| `VERCEL_ENV` | build + runtime | `production` / `preview` / `development` 분기 |
| `VERCEL_URL` | build + runtime | 배포 URL |
| `VERCEL_GIT_COMMIT_SHA` | build | 빌드 시점 커밋 |

→ 이들은 Vercel 이 알아서 주입. 수동 설정 불필요.

### 수동 설정이 필요한 경우

현재 프로젝트는 없음. 향후 추가될 수 있는 후보:
- AI SDK 관련 키 (블로그에서 챗 UI 붙일 때) — 현재 미사용
- 외부 API 키 (analytics 등 3rd party)

## GitHub Secrets
- `.github/workflows/ci.yml` 이 `bun install && bun run build` 실행 → 블로그 빌드 검증
- Vercel 배포는 GitHub App 통합이라 **GH Secrets 불요**

## Verification
```bash
# Vercel env 조회 (Vercel CLI 인증 후)
vercel env ls

# 로컬 빌드 검증 (시크릿 없이도 성공해야 함)
cd packages/blog
bun run build
```

## Leak Response
현재 시크릿이 없어 leak 위험 낮음. 향후 키 추가 시 이 문서 갱신 + `.env.local` gitignore 확인.
