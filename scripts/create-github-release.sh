#!/bin/bash

# 사용법: ./create-github-release.sh [version]
# 예시: ./create-github-release.sh           # 최신 버전 자동 릴리즈
#       ./create-github-release.sh 0.0.3     # 특정 버전 릴리즈
#       ./create-github-release.sh v0.0.3    # 특정 버전 릴리즈

set -e

CHANGELOG_FILE="CHANGELOG.md"

if [ ! -f "$CHANGELOG_FILE" ]; then
  echo "[ERROR] $CHANGELOG_FILE 파일이 없습니다."
  exit 1
fi

if [ -z "$1" ]; then
  # CHANGELOG.md에서 가장 위에 있는 버전(## <버전>)을 자동 감지
  VERSION=$(grep -m1 '^## ' "$CHANGELOG_FILE" | sed 's/^## //')
  echo "[INFO] 최신 버전($VERSION)으로 릴리즈를 진행합니다."
else
  INPUT_VERSION=$1
  # 태그명은 v로 시작하도록 보정
  if [[ $INPUT_VERSION == v* ]]; then
    VERSION=${INPUT_VERSION#v}
  else
    VERSION=$INPUT_VERSION
  fi
fi

TAG="v$VERSION"
REPO=$(git config --get remote.origin.url | sed -E 's/.*github.com[/:](.*)\.git/\1/')

# CHANGELOG.md에서 해당 버전 섹션만 추출 (v 없는 버전으로 찾음)
delim=$(grep -n "^## " "$CHANGELOG_FILE" | grep "## $VERSION" | cut -d: -f1)
if [ -z "$delim" ]; then
  echo "[ERROR] $CHANGELOG_FILE에서 $VERSION 섹션을 찾을 수 없습니다."
  exit 1
fi
start=$delim
end=$(tail -n +$((start+1)) "$CHANGELOG_FILE" | grep -n "^## " | head -n1 | cut -d: -f1)
if [ -z "$end" ]; then
  end=$(wc -l < "$CHANGELOG_FILE")
  end=$((end+1-start))
else
  end=$((end-1))
fi

RELEASE_BODY=$(sed -n "$((start+1)),$((start+end))p" "$CHANGELOG_FILE")

# 참조 링크 추가
github_url="https://github.com/$REPO/releases/tag/$TAG"
RELEASE_BODY="$RELEASE_BODY\n\n[🔗 GitHub Release에서 보기]($github_url)"

echo "릴리즈 노트 미리보기:"
echo "----------------------"
echo "$RELEASE_BODY"
echo "----------------------"

read -p "계속해서 GitHub Release를 생성할까요? (y/n): " yn
case $yn in
    [Yy]*) ;;
    *) echo "취소됨."; exit 0;;
esac

gh release create "$TAG" --title "$TAG" --notes "$RELEASE_BODY"
echo "✅ GitHub Release가 생성되었습니다: $github_url" 