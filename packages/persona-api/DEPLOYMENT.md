# Persona API 배포 가이드

## 호스팅 옵션

### 1. 클라우드 GPU 서버 (추천)
**GPT-3.5급 성능을 위한 최적 선택**

| 제공업체 | 인스턴스 타입 | GPU | 메모리 | 월 비용 (대략) |
|----------|---------------|-----|--------|---------------|
| AWS | g5.large | NVIDIA A10G | 8GB | $150-200 |
| GCP | n1-standard-4 + T4 | NVIDIA T4 | 16GB | $120-180 |
| Azure | NC6s v3 | NVIDIA V100 | 12GB | $180-250 |
| Vast.ai | RTX 4090 | NVIDIA RTX 4090 | 24GB | $80-120 |
| RunPod | RTX 3080 | NVIDIA RTX 3080 | 10GB | $60-100 |

### 2. 전용 서버 (성능 최적화)
- **Hetzner**: GPU 서버 €100-300/월
- **OVH**: GPU 서버 €150-400/월
- **자체 서버**: RTX 4090 + 고성능 CPU

### 3. 하이브리드 (비용 절약)
- API 서버: 일반 VPS (DigitalOcean, Linode)
- Ollama: 별도 GPU 서버
- 비용: $50-150/월

## 추천 모델 성능

### llama3.1:8b (추천)
- **성능**: GPT-3.5와 유사
- **요구사항**: 8GB+ VRAM
- **속도**: 30-50 토큰/초
- **용도**: 일반적인 대화 및 복잡한 추론

### qwen2.5:7b
- **성능**: GPT-3.5 근접
- **요구사항**: 7GB+ VRAM  
- **속도**: 40-60 토큰/초
- **용도**: 빠른 응답이 필요한 경우

### llama3.2:3b
- **성능**: GPT-3급
- **요구사항**: 3GB+ VRAM
- **속도**: 60-80 토큰/초
- **용도**: 가벼운 대화 및 테스트

## 배포 단계

### 1. 서버 설정
```bash
# Docker 및 Docker Compose 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# NVIDIA Docker 설치 (GPU 서버)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

### 2. 프로젝트 배포
```bash
# 프로젝트 클론
git clone <your-repo-url>
cd packages/persona-api

# 환경 변수 설정
cp .env.example .env.prod
# .env.prod 파일 수정

# 프로덕션 배포
docker-compose -f docker-compose.prod.yml up -d

# Ollama 모델 설치
./scripts/docker-setup-ollama.sh
```

### 3. 도메인 및 SSL 설정
```bash
# Nginx 설정 (예시)
# /etc/nginx/sites-available/persona-api
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# SSL 인증서 (Let's Encrypt)
sudo certbot --nginx -d your-domain.com
```

### 4. 모니터링 설정
```bash
# Docker 로그 확인
docker logs persona-api -f

# 시스템 리소스 모니터링
docker stats

# GPU 사용률 확인 (GPU 서버)
nvidia-smi
```

## 비용 최적화 팁

1. **Auto-scaling**: 트래픽에 따른 자동 스케일링
2. **Spot instances**: AWS/GCP 스팟 인스턴스 활용
3. **모델 최적화**: 작은 모델로 시작 후 필요시 업그레이드
4. **캐싱**: Redis 캐싱으로 API 호출 최소화

## 성능 테스트

### 로드 테스트
```bash
# API 엔드포인트 테스트
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "안녕하세요"}'

# 응답 시간 측정
time curl http://localhost:8080/health
```

### 모니터링 지표
- **응답 시간**: < 3초 (목표)
- **토큰 생성 속도**: > 30 토큰/초
- **메모리 사용량**: < 12GB
- **GPU 사용률**: 70-90%

## 문제 해결

### 메모리 부족
```bash
# 스왑 메모리 추가
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 모델 로딩 실패
```bash
# Ollama 서비스 재시작
docker restart persona-ollama

# 모델 재다운로드
docker exec persona-ollama ollama pull llama3.1:8b
```

### API 응답 느림
- 모델 크기 축소 (3b → 1b)
- GPU 메모리 확인
- 캐싱 설정 검토