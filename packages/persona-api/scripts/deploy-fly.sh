#!/bin/bash

echo "🚀 Fly.io 배포 스크립트"
echo "======================"

# Fly CLI 설치 확인
if ! command -v flyctl &> /dev/null; then
    echo "❌ Fly CLI가 설치되지 않았습니다."
    echo ""
    echo "설치 방법:"
    echo "curl -L https://fly.io/install.sh | sh"
    echo ""
    exit 1
fi

echo "✅ Fly CLI가 설치되어 있습니다."

# 로그인 확인
if ! flyctl auth whoami &> /dev/null; then
    echo "🔐 Fly.io 로그인이 필요합니다."
    flyctl auth login
fi

# 앱 생성 (이미 존재하면 스킵)
if ! flyctl apps list | grep -q "persona-api"; then
    echo "📦 Fly.io 앱 생성 중..."
    flyctl apps create persona-api
else
    echo "✅ 앱이 이미 존재합니다."
fi

# 환경 변수 설정
echo "🔧 환경 변수 설정 중..."
flyctl secrets set \
  NODE_ENV=production \
  MOCK_MODE=true \
  RATE_LIMIT_MAX=20 \
  RATE_LIMIT_WINDOW_MS=60000

# Redis 애드온 추가 (Upstash)
echo "📦 Redis 설정 중..."
flyctl redis create --name persona-redis --region nrt

# 배포
echo "🚀 배포 시작..."
flyctl deploy --dockerfile Dockerfile.fly --build-arg NODE_ENV=production

# 앱 상태 확인
echo "✅ 배포 완료!"
flyctl status

# 앱 URL 출력
APP_URL=$(flyctl info | grep Hostname | awk '{print $2}')
echo ""
echo "🌐 앱 URL: https://$APP_URL"
echo "🔍 헬스체크: https://$APP_URL/health"
echo "💬 챗봇 테스트: curl -X POST https://$APP_URL/api/chat -H 'Content-Type: application/json' -d '{\"message\":\"안녕하세요\"}'"

echo ""
echo "📊 모니터링:"
echo "- 로그: flyctl logs"
echo "- 상태: flyctl status"
echo "- 메트릭: flyctl dashboard"