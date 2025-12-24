# 김동욱 이력서

## 기본 정보
- 이름: 김동욱
- 이메일: dannyworks102@gmail.com
- GitHub: github.com/domuk-k
- 소개 페이지: https://domuk-k.vercel.app/

## 소개
5년 차 소프트웨어 엔지니어입니다.

SaaS 제품팀에서 프론트/백엔드 전환, 모노레포 구축, 디자인 시스템, CI/CD 자동화 등 다양한 프로젝트를 주도하며 코드 효율성과 사용자 만족도 향상에 기여했습니다. 실용적인 기술 선택과 협업 중심의 개발 문화를 추구합니다.

### 개발 철학
- 읽고 수정하고 지우기 편한 코드를 지향
- 선택지 구조화하고, 판단기준과 과정 문서화
- 코드 리뷰, 회고, 의사결정 공유에서 일관성있게 배려하며 소통

### 풀사이클 사고 확장 중
- AI 도구를 실무 기획·개발·문서화 전반에 사용
- 프론트엔드/백엔드/CLI 도구 개발 경험에 이어 AI 서비스 파이프라인 구축에 관심

## 기술 스택
- **프론트엔드**: React, Next.js, Svelte, SvelteKit, TypeScript
- **백엔드**: Node.js, Kotlin, Spring Boot
- **상태관리**: Redux Toolkit, React Query, Zustand
- **스타일**: styled-system, emotion, tailwindcss
- **테스트**: Jest, testing-library, Playwright, Storybook
- **데이터베이스**: PostgreSQL, MySQL, MongoDB
- **클라우드/인프라**: AWS (S3, CloudFront), Docker, Vercel
- **CI/CD**: GitHub Actions, ArgoCD, Argo Workflows
- **모니터링**: Datadog (log/RUM)

## 경력 (총 6년 9개월)

### 주식회사 콕스웨이브 (2025.09 - 현재)
**LLM Engineer / SDK Engineer**

#### edutap.ai dev kit 핵심 기능 개발
- 프로토타입 코드의 변화에 취약한 구조 개선
- Dynamic Loader, Stub 패턴 구현 (Queue Replay 메커니즘)
- SDK 구조설계: iframe Bridge 통신 시스템, Service Layer 모듈화, CSS 내장
- 자동 배포 스크립트 및 롤백 구현
- Playwright E2E 테스트 작성
- **결과**: 3줄 코드 연동 API, npm/cdn 2가지 연동방식 지원, @coxwave/tap-kit 배포 (~2.8KB)

### 주식회사 비에이치에스엔 (2024.01 - 2025.09, 1년 9개월)
**Software Engineer**

#### 조직 계층 구조 API 성능 최적화 (Backend)
- 성능 병목점 분석: O(N×M) 재귀 처리 로직 발견, 1,000개 조직 테스트 환경 구축
- Materialized Path, Nested Set, Recursive CTE, Hybrid 등 트리 구조 최적화 패턴 비교 분석
- Materialized Path 패턴 선택으로 80-90% 성능 개선
- 기술: Kotlin, Spring Boot, JPA/Hibernate, MySQL, Flyway

#### 프론트엔드 공통 코드 패키지 분리 (Frontend)
- Turborepo 기반 모노레포에서 공통 컴포넌트/유틸리티 모듈을 독립 패키지로 분리
- UI컴포넌트, utils 모듈 관련 코드라인수 85% 감소
- @bhsn/* 으로 일관된 모듈 참조 정책 수립

#### 앨리비(allibee) 웹 기반 전자서명 에디터 (Frontend)
- PDF 기반 form builder (docusign/모두싸인 유사)
- 노드 drag&drop 기반 form builder 기능 구현
- 터치 압력/속도를 시뮬레이션하는 SVG path 기반 '펜 그리기' 구현
- 오픈소스(documenso, tldraw) core 구조 분석/적용으로 개발 일정 50% 단축

#### 앨리비(allibee) 런칭: 클라우드 기반 계약생애주기(CLM) 솔루션 (Frontend)
- turborepo 기반 모노레포, SvelteKit 기반 웹앱
- SaaS 워크스페이스 관리자를 위한 권한/멤버/그룹 관리 개발

#### 배포 후 알림 UX 개선
- Service Worker 업데이트 시 새로고침 버그 해결
- vite-plugin-pwa 소스코드 분석하여 버그 원인 파악 및 수정
- 사용자 불편 피드백 17건 → 0건으로 감소 (4주 관측)

### 주식회사 모두싸인 (2021.04 - 2023.12, 2년 9개월)
**Frontend Engineer**

#### 모두싸인 웹: React/Next.js 기반 엔터프라이즈 SaaS 웹앱
- yarn workspace 기반 모노레포, CRA 기반 주요 서비스 / Next.js 기반 랜딩 페이지
- 매일 17시 배포: GitHub Actions, Vercel, ArgoCD, AWS S3/CloudFront
- 워크스페이스 유저 권한 제어, 문서/인감 리소스 권한 제어

#### CI/CD 개선
- CRA 프로젝트 loader 속도 개선: esbuild, swc loader 시도/부분 적용
- CloudFront 캐싱 이슈로 인한 사용자 에러 발생률 약 80% 감소
- Datadog log/RUM 도입/운영: Web Vitals, Frustration Signals 등 UX지표 공유

#### 리액트 기반 디자인 시스템 개선
- styled-system, emotion 기반 sx prop 활용 공통 컴포넌트 패키지
- theme type 타입 선언으로 디자이너-개발자 간 커뮤니케이션 오류 해결
- Tooltip, Tabs Compound 컴포넌트 설계/구현/문서화

#### 리더십/사내활동
- 9인 팀 내 프론트엔드 기술결정 주도
- '실용주의 프로그래머' 독서모임 진행 (5인, 11회)
- E2E테스트를 위한 Playwright 도입 제안
- React 18 버전 업데이트 길드 조직 및 수행
- TypeScript 4.2 → 5.1 업데이트

### (주)데이원컴퍼니 제2성수학원 (2020.10 - 2021.04, 7개월)
**프론트엔드 스쿨 매니저**
- 수강생 20명 리드: 퀴즈 출제/풀이, Q&A
- HTML, CSS, ESNext, React, TypeScript, Webpack, Sass 학습 지도
- Chrome 개발자도구 관련 세션 진행

### 스파크랩(SparkLabs) (2018.03 - 2018.09, 7개월)
**인턴**
- 스타트업 엑셀러레이팅 프로그램 실무 지원
- LP 보고서 작성, 캡테이블 작성 지원

### 백지장 (2017.07 - 2018.12, 1년 6개월)
**정규직**
- 청년을 위한 문화공간 대여 사업 운영
- 연 공간대관 방문자 6,600명 이상 달성, 4개 지점 확장

## 학력
- 홍익대학교 경영학과 학사 (2012.03 - 2018.08)
- 서울대학교 빅데이터연구원 빅데이터-핀테크 과정 수료 (2019.06 - 2020.06)

## 기타 활동
- (주)코드잇 스프린트 프론트엔드과정 멘토 활동 (2023.12)
- 오픈소스 기여: react-hook-form, svelte-toast, svelte.dev

## 수상
- 홍익대학교 창업경진대회 창업실행부문 우수상 (2017.05)

## 언어
- 영어: 일상 회화 (토익 910점)
