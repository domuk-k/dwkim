# Build Instructions — deployment-docs unit

> 이 유닛은 **문서 + 환경 템플릿 + shell script 수정**. 전통적 "빌드" 아니라 **검증 빌드** (링크·구문·정합성).

## Prerequisites
- **Build Tool**: Bun 1.3+, bash 4+
- **Dependencies**: 루트 워크스페이스 `bun install` 완료 상태
- **Environment Variables**: 없음 (검증은 시크릿 없이 수행)
- **System Requirements**: macOS/Linux, ~100MB 디스크

## Build Steps

### 1. Install Dependencies
```bash
cd <workspace-root>
bun install
```

### 2. Verify Workspace Packages Build (회귀 방지)
```bash
# 전체 빌드 — 문서 변경이 코드 빌드를 깨뜨리지 않는지
bun run build          # 모든 패키지
bun run lint           # Biome
```

**기대 출력**: 에러 없이 완료. blog/persona-api/dwkim 각각 `dist/` 생성.

### 3. Validate deploy-blog.sh 문법
```bash
bash -n packages/blog/scripts/deploy-blog.sh
```
**기대**: exit 0, 출력 없음.

### 4. Validate Markdown Cross-Links
```bash
# 루트 DEPLOYMENT.md 및 각 DEPLOY.md 의 상대 링크가 실제 파일을 가리키는지
for f in DEPLOYMENT.md packages/*/DEPLOY.md; do
  echo "=== $f ==="
  /usr/bin/grep -oE '\]\(\.[^)]+\)' "$f" | sed 's/](//;s/)$//' | while read link; do
    base=$(dirname "$f")
    target="$base/$link"
    [ -f "$target" ] && echo "✅ $link" || echo "❌ $link"
  done
done
```

### 5. Verify fly.toml ↔ DEPLOY.md 정합성
```bash
# 값 일치 확인
/usr/bin/grep -E "auto_stop|min_machines|memory|RATE_LIMIT" packages/persona-api/fly.toml
/usr/bin/grep -E "min_machines_running|512MB|shared-cpu|nrt" packages/persona-api/DEPLOY.md
```

### 6. Verify .env.example ↔ env.ts 정합성
```bash
# persona-api env.ts 에 정의된 모든 키가 .env.example 에 등장하는지
/usr/bin/grep -oE "^\s+[A-Z_]+:" packages/persona-api/src/config/env.ts | sort -u | sed 's/[[:space:]]//g;s/://'
/usr/bin/grep -oE "^[A-Z_]+=" packages/persona-api/.env.example | sort -u | sed 's/=//'
# 두 리스트 diff
```

## Build Artifacts
- **Docs**: 10 신규 markdown (루트 DEPLOYMENT.md + 3 DEPLOY.md + 3 .env.example + 3 secrets-manifest.md + 1 summary)
- **Scripts**: 1 modified (deploy-blog.sh), 1 deleted (Dockerfile.fly), 1 annotated (Dockerfile.dev)
- **Meta**: CLAUDE.md link 추가, .gitignore 에 audit.md

## Common Warnings (수용 가능)
- Biome: 기존 린트 경고 (docs 작업과 무관)
- `bun run build` 시 Vercel Analytics dev 경고 (blog) — 정상

## Troubleshooting

### "Link check 실패"
- **원인**: DEPLOY.md 의 상대 경로 오타 또는 파일 미생성
- **해결**: Step 4 스크립트 실행 → `❌` 표시된 링크 수정

### "bash -n 실패"
- **원인**: deploy-blog.sh 편집 중 구문 오류
- **해결**: `git diff packages/blog/scripts/deploy-blog.sh` 검토, shellcheck 돌려보기

### "bun run build 실패 (기존 코드 영향)"
- **원인**: 이번 유닛은 docs 만 — 실패는 별개 이슈. git blame 으로 원인 분리.
