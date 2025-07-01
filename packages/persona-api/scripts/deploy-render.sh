#!/bin/bash

echo "🎨 Render 무료 배포 스크립트"
echo "============================"

echo "📝 배포 단계:"
echo ""

echo "1. Render 계정 생성:"
echo "   https://render.com 가입 (GitHub 연동)"
echo ""

echo "2. GitHub 저장소 연결:"
echo "   - New > Web Service"
echo "   - GitHub 저장소 선택"
echo "   - Root Directory: packages/persona-api"
echo ""

echo "3. 빌드 설정:"
echo "   - Build Command: npm install && npm run build"
echo "   - Start Command: npm start"
echo "   - Environment: Node"
echo ""

echo "4. 환경 변수 설정:"
echo "   - OPENAI_API_KEY: (your-key)"
echo "   - OPENAI_MODEL: gpt-4o-mini"
echo "   - NODE_ENV: production"
echo "   - MOCK_MODE: true"
echo "   - USE_VECTOR_STORE: false"
echo ""

echo "5. Redis 추가 (무료):"
echo "   - Dashboard > New > Redis"
echo "   - 이름: persona-redis"
echo "   - Plan: Free"
echo ""

echo "6. 도메인 확인:"
echo "   - https://your-app-name.onrender.com"
echo "   - 커스텀 도메인 연결 가능"
echo ""

echo "✅ 장점:"
echo "- 완전 무료 (15분 sleep)"
echo "- Redis 무료 포함"
echo "- 자동 SSL 인증서"
echo "- GitHub 자동 배포"
echo "- 512MB RAM (충분함)"
echo ""

echo "❌ 주의사항:"
echo "- 15분 비활성시 sleep"
echo "- Cold start 3-5초"
echo "- 월 750시간 제한 (충분함)"
echo ""

echo "🚀 배포 완료 후 테스트:"
echo "curl https://your-app.onrender.com/health"
echo ""

echo "💬 챗봇 테스트:"
echo "curl -X POST https://your-app.onrender.com/api/chat \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"message\":\"안녕하세요\"}'"