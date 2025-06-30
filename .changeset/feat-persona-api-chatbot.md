---
'persona-api': major
'dwkim': minor
---

feat: RAG 기반 개인화 챗봇 API 및 CLI 통합 구현

## persona-api 주요 변경사항
- RAG(Retrieval-Augmented Generation) 엔진 구현
- ChromaDB 벡터 데이터베이스 연동
- OpenAI LLM 서비스 통합
- 문서 데이터 관리 시스템 구축
- 데이터 초기화 스크립트 추가
- 문서 관리 CLI 도구 개발
- Docker 환경 구성 완료

## dwkim CLI 주요 변경사항  
- 채팅 기능 추가 (`dwkim chat`)
- persona-api 클라이언트 통합
- 대화형 인터페이스 구현
- API 상태 확인 및 검색 기능

## 기능
- 개인 문서(이력서, FAQ, 경험담, 생각) 기반의 맞춤형 답변
- 실시간 채팅 인터페이스
- 문서 검색 및 관리
- Rate limiting 및 abuse detection
- 종합적인 헬스체크 시스템