# Unit Test Instructions — deployment-docs

> 문서 유닛의 "단위 테스트" = **정적 검증** (lint, link, PII, 시크릿 누출 방지).

## Test Targets

### T-1: PII Scrub Verification
**목적**: 공개 레포에 개인 경로/이메일/토큰 유출 방지.

```bash
# 절대 경로 (username leak)
/usr/bin/grep -rn "/Users/" \
  DEPLOYMENT.md packages/*/DEPLOY.md packages/*/.env.example \
  packages/*/secrets-manifest.md harness-docs/ \
  | /usr/bin/grep -v "audit.md"   # audit.md 는 gitignore 대상

# 실제 이메일 (noreply / example.* 제외)
/usr/bin/grep -rE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}" \
  DEPLOYMENT.md packages/*/DEPLOY.md packages/*/.env.example packages/*/secrets-manifest.md \
  | /usr/bin/grep -vE "noreply|example\.|cloud\.langfuse|betterstack|dwkim\.dev"

# 시크릿 값 패턴
/usr/bin/grep -rEn "(sk-or-v1-|sk-lf-[0-9a-f]|pk-lf-[0-9a-f]|ghp_|gho_|AKIA)[A-Za-z0-9_-]{10,}" \
  DEPLOYMENT.md packages/*/DEPLOY.md packages/*/.env.example packages/*/secrets-manifest.md
```
**기대**: 3개 모두 empty 또는 exit 1 (no match).

### T-2: .env.example Trackability
**목적**: `.env` 는 ignore, `.env.example` 은 반드시 tracked.

```bash
# .env.example 은 tracked 이어야 함
for f in packages/*/.env.example; do
  git check-ignore "$f" >/dev/null 2>&1 && echo "❌ $f IGNORED" || echo "✅ $f tracked"
done

# .env 는 ignored 이어야 함
for f in packages/*/.env; do
  [ -f "$f" ] || continue
  git check-ignore "$f" >/dev/null 2>&1 && echo "✅ $f ignored" || echo "❌ $f TRACKABLE (위험)"
done
```

### T-3: Cross-link Resolution
```bash
for f in DEPLOYMENT.md packages/*/DEPLOY.md; do
  /usr/bin/grep -oE '\]\(\.[^)]+\)' "$f" | sed 's/](//;s/)$//' | while read link; do
    base=$(dirname "$f")
    [ -f "$base/$link" ] || echo "❌ $f → $link"
  done
done
```
**기대**: 출력 없음.

### T-4: Command Accuracy
**목적**: 문서의 명령이 실제 package.json 스크립트 / fly.toml 키와 일치.

```bash
# dwkim DEPLOY 의 'bun run build:dwkim' 루트에 존재?
/usr/bin/grep -q '"build:dwkim"' package.json && echo "✅ build:dwkim exists"

# blog DEPLOY 의 'bun run sync-cogni' 존재?
/usr/bin/grep -q '"sync-cogni"' packages/blog/package.json && echo "✅ sync-cogni exists"

# persona-api DEPLOY 의 'fly deploy' 대상 fly.toml 존재?
[ -f packages/persona-api/fly.toml ] && echo "✅ fly.toml exists"
```

### T-5: Markdown Structure (각 DEPLOY.md = 10 섹션)
```bash
for f in packages/*/DEPLOY.md; do
  echo "--- $f ---"
  /usr/bin/grep -cE "^## [0-9]+\." "$f"
done
```
**기대**: 각 파일 10.

### T-6: Security Baseline Spot-checks
```bash
# SECURITY-01: rediss:// 언급 존재
/usr/bin/grep -q "rediss://" packages/persona-api/DEPLOY.md && echo "✅ TLS Redis 명시"

# SECURITY-05: "값은 절대 ... 커밋 금지" 류 경고 존재
for f in packages/*/secrets-manifest.md; do
  /usr/bin/grep -qE "값.*커밋 금지|never.*commit" "$f" && echo "✅ $f: secret warning" || echo "⚠️ $f: warning missing"
done
```

## Execution
```bash
cd <workspace-root>
bash harness-docs/construction/build-and-test/run-unit-tests.sh  # (스크립트화는 선택)
# 또는 각 T-n 수동 실행
```
