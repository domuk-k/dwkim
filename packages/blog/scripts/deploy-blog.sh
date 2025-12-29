#!/bin/bash
# Blog 배포 스크립트
# 1. Cogni에서 blog 태그 노트 동기화
# 2. Git 커밋 & 푸시 (Vercel 자동 배포)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BLOG_DIR"

echo "🔄 Syncing Cogni notes..."
pnpm sync-cogni

# 변경사항 확인
if git diff --quiet src/content/posts/; then
  echo "ℹ️  No changes to deploy"
  exit 0
fi

echo "📝 Committing changes..."
git add src/content/posts/
git commit -m "docs(blog): sync posts from Cogni

🤖 Generated with Cogni"

echo "🚀 Pushing to trigger Vercel deploy..."
git push

echo "✅ Deploy triggered! Vercel will build automatically."
