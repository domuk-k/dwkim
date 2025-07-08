# DW Kim Blog

Next.js 15 App Router를 사용한 현대적인 개인 블로그입니다.

## 🚀 기술 스택

- **Next.js 15** - App Router와 최신 React 19 사용
- **TypeScript** - 타입 안정성 보장
- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Contentlayer** - MDX 콘텐츠 관리
- **next-themes** - 다크/라이트 모드 지원

## 📁 프로젝트 구조

```
packages/blog/
├── app/                    # Next.js 15 App Router
│   ├── layout.tsx         # 루트 레이아웃 (서버 컴포넌트)
│   ├── page.tsx           # 메인 페이지 (서버 컴포넌트)
│   ├── globals.css        # 글로벌 스타일
│   └── posts/             # 포스트 페이지들
├── components/            # 컴포넌트들
│   ├── theme-provider.tsx # 테마 제공자 (클라이언트 컴포넌트)
│   ├── mode-toggle.tsx    # 테마 토글 (클라이언트 컴포넌트)
│   ├── footer.tsx         # 푸터 (서버 컴포넌트)
│   ├── analytics.tsx      # 애널리틱스 (클라이언트 컴포넌트)
│   ├── external-link.tsx  # 외부 링크 (서버 컴포넌트)
│   └── ui/               # UI 컴포넌트들
│       └── card.tsx      # 카드 컴포넌트 (서버 컴포넌트)
├── content/              # MDX 콘텐츠
│   ├── posts/           # 블로그 포스트들
│   ├── cards/           # 카드 콘텐츠
│   └── books/           # 책 리뷰들
├── lib/                 # 유틸리티 함수들
│   └── utils.ts         # 공통 유틸리티
├── hooks/               # 커스텀 훅들
└── utils/               # 추가 유틸리티들
```

## 🏗️ 서버/클라이언트 컴포넌트 분리 전략

### 서버 컴포넌트 (기본값)
- **app/layout.tsx** - 루트 레이아웃과 메타데이터
- **app/page.tsx** - 메인 페이지와 정적 데이터 렌더링
- **components/footer.tsx** - 정적 푸터 콘텐츠
- **components/external-link.tsx** - 외부 링크 렌더링
- **components/ui/card.tsx** - UI 카드 컴포넌트들

**장점:**
- 빌드 타임에 렌더링되어 성능 최적화
- SEO 친화적
- 초기 자바스크립트 번들 크기 감소

### 클라이언트 컴포넌트 ("use client")
- **components/theme-provider.tsx** - 테마 상태 관리
- **components/mode-toggle.tsx** - 테마 토글 인터랙션
- **components/analytics.tsx** - 브라우저 전용 추적 스크립트

**장점:**
- 브라우저 상태 관리 (테마, 애널리틱스)
- 사용자 인터랙션 처리
- 브라우저 API 접근

## 🎨 Next.js 15 최신 기능 활용

### 실험적 기능 활성화
```javascript
// next.config.js
experimental: {
  ppr: true,        // Partial Prerendering
  dynamicIO: true   // Dynamic IO
}
```

### React 19 호환성
- React 19와 호환되는 컴포넌트 작성
- 최신 React 기능 활용 준비

## 📝 콘텐츠 관리

### Contentlayer 설정
- **Posts**: Markdown 파일로 블로그 포스트 관리
- **Cards**: MDX 파일로 카드 형태 콘텐츠
- **Books**: 책 리뷰 및 노트

### 타입 안정성
- Contentlayer가 자동으로 TypeScript 타입 생성
- 빌드 타임에 콘텐츠 검증

## 🚦 개발 가이드라인

### 컴포넌트 작성 원칙
1. **기본적으로 서버 컴포넌트 사용**
2. **상태나 브라우저 API가 필요한 경우에만 클라이언트 컴포넌트**
3. **"use client" 지시어를 최소한으로 사용**
4. **Props drilling을 피하고 적절한 컴포넌트 분리**

### 성능 최적화
- 서버 컴포넌트로 초기 로딩 성능 향상
- 클라이언트 컴포넌트는 필요한 부분만 hydration
- 이미지 최적화 (WebP, AVIF 지원)

## 🛠️ 개발 환경 설정

### 의존성 설치
```bash
cd packages/blog
pnpm install
```

### 개발 서버 실행
```bash
pnpm dev
```

### 빌드
```bash
pnpm build
```

### 타입 체크
```bash
pnpm type-check
```

## 📦 주요 의존성

- `next@^15.1.3` - Next.js 15
- `react@^19.0.0` - React 19
- `typescript@^5.8.0` - TypeScript
- `tailwindcss@^3.4.0` - Tailwind CSS
- `contentlayer2@^0.5.0` - 콘텐츠 관리
- `next-themes@^0.4.0` - 테마 관리
- `lucide-react@^0.460.0` - 아이콘

## 🔧 설정 파일들

- `next.config.js` - Next.js 설정 및 실험적 기능
- `tailwind.config.js` - Tailwind CSS 설정
- `contentlayer.config.js` - 콘텐츠 타입 정의
- `tsconfig.json` - TypeScript 설정
- `postcss.config.js` - PostCSS 설정

## 📈 향후 계획

- [ ] 포스트 상세 페이지 구현
- [ ] 검색 기능 추가
- [ ] RSS 피드 생성
- [ ] 댓글 시스템 (utterances 또는 giscus)
- [ ] 사이트맵 자동 생성
- [ ] PWA 지원