#!/bin/bash

echo "🏛️  Oracle Cloud Always Free 배포 가이드"
echo "========================================"

echo "📋 필요한 것들:"
echo "1. Oracle Cloud 계정 (신용카드 필요하지만 과금 없음)"
echo "2. Always Free Tier 인스턴스 생성"
echo "3. Ubuntu 20.04 ARM64 이미지"
echo ""

echo "🖥️  인스턴스 스펙:"
echo "- CPU: 4 Ampere Altra cores"
echo "- RAM: 24GB"
echo "- Storage: 200GB"
echo "- Network: 10TB/월"
echo "- 비용: $0 (영구 무료)"
echo ""

echo "🚀 배포 단계:"
echo "1. 인스턴스 생성 후 SSH 접속"
echo "2. Docker 설치:"
echo "   sudo apt update"
echo "   sudo apt install docker.io docker-compose -y"
echo "   sudo usermod -aG docker \$USER"
echo ""

echo "3. 프로젝트 클론:"
echo "   git clone <your-repo>"
echo "   cd packages/persona-api"
echo ""

echo "4. 환경 설정:"
echo "   cp .env.example .env"
echo "   # .env 파일에 API 키 설정"
echo ""

echo "5. 서비스 시작:"
echo "   docker-compose up -d"
echo ""

echo "6. 방화벽 설정:"
echo "   sudo ufw allow 8080"
echo "   # Oracle Cloud 보안 목록에서 8080 포트 열기"
echo ""

echo "💡 설정 팁:"
echo "- 인스턴스 생성시 SSH 키 등록 필수"
echo "- 보안 목록(Security List)에서 포트 8080 인바운드 허용"
echo "- Nginx 리버스 프록시 설정 권장"
echo ""

echo "🌐 도메인 연결:"
echo "1. 무료 도메인: freenom.com"
echo "2. DNS: CloudFlare (무료)"
echo "3. SSL: Let's Encrypt (무료)"
echo ""

echo "📊 모니터링:"
echo "- htop: 시스템 리소스 확인"
echo "- docker logs: 애플리케이션 로그"
echo "- 24GB RAM이므로 여유롭게 사용 가능"