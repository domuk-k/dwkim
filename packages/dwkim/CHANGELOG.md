## 1.0.0 (2025-12-30)

### ⚠ BREAKING CHANGES

* **dwkim:** default command now shows profile + chat combined
- dwkim chat removed, use dwkim (default) instead
- dwkim profile added for profile-only display
* **persona-api:** Requires DATABASE_URL for Neon Postgres

### chore

* **dwkim:** bump version to 1.0.0 ([623a6ee](https://github.com/domuk-k/dwkim/commit/623a6ee7fffd88f2b23adb1135c077319054bd08))

### Features

* Add blog package to monorepo ([87e6768](https://github.com/domuk-k/dwkim/commit/87e676889e4661ba294d4107b7689afd592c0126))
* add GitHub repository link with icon to blog footer ([2b18d7b](https://github.com/domuk-k/dwkim/commit/2b18d7b6f2dc71f61927bb1112d27c510d52ee32))
* add global header with 3-way theme toggle and improve blog post ([af0746c](https://github.com/domuk-k/dwkim/commit/af0746c182ab0140146d68ce0d28c64e9b8dc315))
* Add global navigation and improve blog UX ([96926e3](https://github.com/domuk-k/dwkim/commit/96926e33450b19473597ce14143ff24ac5e3c39c))
* add project process mental model blog post ([7a3017b](https://github.com/domuk-k/dwkim/commit/7a3017b71a540ff1b729a92970892471949c2ae1))
* add SSE streaming for real-time chat responses ([d6347d9](https://github.com/domuk-k/dwkim/commit/d6347d92f55d1da661014ee2a576d95a2d2050b6))
* **blog:** add AI collaboration post and footer link ([720c334](https://github.com/domuk-k/dwkim/commit/720c3348946db9d1ed3f6ded0b25fc9b38314a65))
* **blog:** add Cogni sync scripts ([8c2f2a3](https://github.com/domuk-k/dwkim/commit/8c2f2a3b2abe98bd1a0e4c52c7386be7b677d3ee))
* **blog:** add interactive animations to theme toggle ([8f613e8](https://github.com/domuk-k/dwkim/commit/8f613e8f1be7734bc308421d49167ad4fb3150b9))
* **blog:** add JSON-LD schema and fix mermaid rendering ([36f838c](https://github.com/domuk-k/dwkim/commit/36f838c523ed4e43cedd455c6557f2eb6cd88fe5))
* **blog:** add llms.txt for LLM crawlers ([3f35c5b](https://github.com/domuk-k/dwkim/commit/3f35c5b2b49923e9e3f856f448591d06acbd888c))
* **blog:** add mentee testimonials to coach section ([47ca4ff](https://github.com/domuk-k/dwkim/commit/47ca4ff39569e56c8ea5609ef8fc35be73fb18b6))
* **blog:** add mermaid diagram support and new post ([200bcab](https://github.com/domuk-k/dwkim/commit/200bcab82874368e0d5f074f222af342df926334))
* **blog:** add Shiki dual theme for dark mode support ([6a0fec8](https://github.com/domuk-k/dwkim/commit/6a0fec81c196a52ce49e729e61b50202cb7444bf))
* **blog:** add Vercel Analytics event tracking ([2ef4a76](https://github.com/domuk-k/dwkim/commit/2ef4a767c6437837682e747f3918b3509310619f))
* **blog:** add Vercel Analytics integration ([bb042b9](https://github.com/domuk-k/dwkim/commit/bb042b9a9e4a80f72f69aa5874569cfb64d11bbe))
* **blog:** improve About section with tabs and code snippet ([281f977](https://github.com/domuk-k/dwkim/commit/281f9776183542570a9d7f867897f44559c17cba))
* Change Swagger UI route from /documentation to /docs ([f7bd8df](https://github.com/domuk-k/dwkim/commit/f7bd8df5c707242c5be29a450e9f6e7037d2bb68))
* Claude API로 LLM 서비스 전환 ([f27ce50](https://github.com/domuk-k/dwkim/commit/f27ce50cb0a946f672aeb2e5486ead4c49e2ab30))
* Docker 환경 설정 및 API 인프라 구축 ([2faf77d](https://github.com/domuk-k/dwkim/commit/2faf77d0b72fb3398c82d2c07c0e42455322baa1))
* **dwkim:** add curl install script and binary distribution ([187050d](https://github.com/domuk-k/dwkim/commit/187050de837d2d49f8ff10b25d0cf838bfefcda1))
* **dwkim:** add ora spinners for better UX ([df7008b](https://github.com/domuk-k/dwkim/commit/df7008b978464eb1efab7fdcf41ecb472c3454c1))
* **dwkim:** add status event type for streaming updates ([47eea4d](https://github.com/domuk-k/dwkim/commit/47eea4ddabe369502b2775694add4ec958da1b7e))
* **dwkim:** Claude Code style welcome banner ([a7f4186](https://github.com/domuk-k/dwkim/commit/a7f41868cab5e51ca202453e5258a46181b039a1))
* **dwkim:** default to profile + chat combined flow ([addd345](https://github.com/domuk-k/dwkim/commit/addd3453156ffb9655580eb3270225d9ab408386))
* **dwkim:** implement Ink + Catppuccin TUI ([f8026db](https://github.com/domuk-k/dwkim/commit/f8026db54762ac019b12e7bcb68d681e623814e5))
* **dwkim:** improve first impression with CTA and examples ([0f10bc0](https://github.com/domuk-k/dwkim/commit/0f10bc0babf946c36a6f4655c952848e22d03109))
* **dwkim:** migrate from changesets to semantic-release ([e3ae02c](https://github.com/domuk-k/dwkim/commit/e3ae02c640e64508cce71c2871c0e834cfd42178))
* **dwkim:** update bio with emojis and new quote ([736f674](https://github.com/domuk-k/dwkim/commit/736f6742052426295749c868647be86da4a1c710))
* Fastify 서버 및 기본 의존성 설치 ([a1f7baa](https://github.com/domuk-k/dwkim/commit/a1f7baab1e508501d17f4aadbfb7b6b4abe348b5))
* migrate blog from Next.js to Astro with UI improvements ([4fd579e](https://github.com/domuk-k/dwkim/commit/4fd579e4af99147ae46df6116a98302b9353a94c))
* migrate build system from tsup to esbuild with ESM support ([9a154aa](https://github.com/domuk-k/dwkim/commit/9a154aab601a8a2855609188adcb680689009992))
* migrate to official @astrojs/rss package ([7b08cf6](https://github.com/domuk-k/dwkim/commit/7b08cf6be4b5eb193a6f4a65a3dde2efbbe575e4))
* OpenAPI 기반 chat 엔드포인트 인터페이스 정의 ([9a1a4bc](https://github.com/domuk-k/dwkim/commit/9a1a4bc0ea6268fb2955920bc1549a80ba0d8b75))
* Optimize blog for static export and enhance styling ([0cf534b](https://github.com/domuk-k/dwkim/commit/0cf534b1cf2f4a2359b1e97b1fb09e9c83d13a34))
* **persona-api,dwkim:** implement rich loading states with discriminated unions ([957e86a](https://github.com/domuk-k/dwkim/commit/957e86adf2dc3d99507839b582a511daf02ffd30))
* **persona-api:** add Cogni sync API endpoint ([718432f](https://github.com/domuk-k/dwkim/commit/718432f304b81289a5bbfa9180fde3ee747fbb7a))
* **persona-api:** add conversation services for UX improvements ([599fae4](https://github.com/domuk-k/dwkim/commit/599fae4634c87c95ab4ded98d8a360193f0d8bf6))
* **persona-api:** add OpenRouter LLM provider support ([e6d0856](https://github.com/domuk-k/dwkim/commit/e6d0856165fc27f97e272437be887a2b941823a7))
* **persona-api:** add Qdrant data initialization script ([340ecf8](https://github.com/domuk-k/dwkim/commit/340ecf87f8b3409a88832f90db7b051370694095))
* **persona-api:** add Qdrant Fly.io deployment config ([3b3a9fe](https://github.com/domuk-k/dwkim/commit/3b3a9fe021a80908de0cd5d3471d680cd5e68812))
* **persona-api:** integrate DeepAgents.js with Gemini 2.5 Flash ([539e391](https://github.com/domuk-k/dwkim/commit/539e3910ef036213e412e77093c59aa416a13cc3))
* **persona-api:** integrate Qdrant with native MMR support ([8488269](https://github.com/domuk-k/dwkim/commit/8488269fcfbbc8dcd41bf936ec6b9856dfdbdcf7))
* **persona-api:** replace ChromaDB with Neon pgvector ([d0b0c73](https://github.com/domuk-k/dwkim/commit/d0b0c73c728d93536abb35f19d401cbcb9ebee23))
* **persona-api:** tune RAG config for better retrieval ([2bbb06b](https://github.com/domuk-k/dwkim/commit/2bbb06b32d424c1d1916a5b8ca09b6ad4cd04165))
* RAG 기반 개인화 챗봇 시스템 완성 ([5b13b43](https://github.com/domuk-k/dwkim/commit/5b13b437653f1739d3976775d2ce0b627c0e22b7))
* RAG 챗봇 API 완전 구현 ([fd8dbe9](https://github.com/domuk-k/dwkim/commit/fd8dbe943e7de513ce10712f109f4dbad87cfcd6))
* Rate limit, abuse detection 미들웨어 구현 ([bdb8a31](https://github.com/domuk-k/dwkim/commit/bdb8a315056311ad171d251861b0e07874ad37e3))
* Switch to gpt-4.1-nano model for cost optimization ([c0ea165](https://github.com/domuk-k/dwkim/commit/c0ea165356a57784a62ef23e6fc11df2527c7f28))
* 프로젝트 디렉토리 및 Docker 개발환경 초기화 ([5dca7f1](https://github.com/domuk-k/dwkim/commit/5dca7f163623785831056c5d39125fb47952200d))

### Bug Fixes

* Add proper TypeScript types instead of any ([4d81a59](https://github.com/domuk-k/dwkim/commit/4d81a59e6a77e9917c740cff8c48587229a2c42d))
* bio update ([a10fb76](https://github.com/domuk-k/dwkim/commit/a10fb76c0c215bbd49582ceddf1734db2cd7291c))
* **blog:** add Shiki dual theme files (previous commit was empty) ([b6e95d2](https://github.com/domuk-k/dwkim/commit/b6e95d233bc2b0dfccf7c7a967b99198369eb1a3))
* **blog:** correct pubDate for working-with-agents post ([2b85be4](https://github.com/domuk-k/dwkim/commit/2b85be458437d90b571bcf34284adde65930467e))
* claude settings update ([66f9759](https://github.com/domuk-k/dwkim/commit/66f97595ad1f44677e56f32cc4930aad6d81aec9))
* **dwkim:** fix API response parsing and improve error handling ([70a274e](https://github.com/domuk-k/dwkim/commit/70a274e16a02ad5f45b7360ceae4171ac270f110))
* **dwkim:** remove ASCII block characters from banner ([9bd3a44](https://github.com/domuk-k/dwkim/commit/9bd3a44589b486293d04e84841cd686d700cca7c))
* **dwkim:** render banner inside Static for proper scrolling ([23c10f4](https://github.com/domuk-k/dwkim/commit/23c10f4e7a0ddd032fe05fb6701b0e95f2d64647))
* **dwkim:** show profile banner above chat ([489a845](https://github.com/domuk-k/dwkim/commit/489a8451ea4b0f2a6b4612f944d2d61cce3ac770))
* **dwkim:** update company info to Coxwave ([1ea8c4b](https://github.com/domuk-k/dwkim/commit/1ea8c4b6e001ec51a8299439e70570cb2b7fdc1f))
* **dwkim:** update website URL to dwkim.vercel.app ([9374467](https://github.com/domuk-k/dwkim/commit/9374467ed689d8b8d85deff1038c5ecb6d0d7ac4))
* **dwkim:** use Node.js 22 for semantic-release v25 ([572a07d](https://github.com/domuk-k/dwkim/commit/572a07db0707afe8ff8b039a2501b3856b9f4f44))
* Extend RateLimitOptions type to include redis property ([ec5273d](https://github.com/domuk-k/dwkim/commit/ec5273d941d409cbe4acb592b7af7f609d240c88))
* layout ([0908af3](https://github.com/domuk-k/dwkim/commit/0908af3b42d96d432932f1ea059f1c67877827d9))
* LightTabs 컴포넌트의 스타일 수정 및 애니메이션 개선 ([a4ae479](https://github.com/domuk-k/dwkim/commit/a4ae4793d437209f98dd8c2e44408311dfe417be))
* move vercel.json to blog directory and update build command ([3fe4f24](https://github.com/domuk-k/dwkim/commit/3fe4f249cafca6d9b82f6df73909c991ce1eef39))
* **persona-api:** fix Fastify logger type errors ([47a67ce](https://github.com/domuk-k/dwkim/commit/47a67ceae11be0373ae7270206e366cb97db15e6))
* **persona-api:** graceful fallback when GOOGLE_API_KEY missing ([64e7122](https://github.com/domuk-k/dwkim/commit/64e71224e8d588c9b7f06e2fb04fbb013af3a027))
* **persona-api:** remove tracked env files and strengthen gitignore ([141f144](https://github.com/domuk-k/dwkim/commit/141f1443742a30e90a870205d70008daaaf96701))
* **persona-api:** switch to gemini-1.5-flash model ([596880f](https://github.com/domuk-k/dwkim/commit/596880feb6b120c85475cbe35ad873af6dc76c28))
* **persona-api:** update to gemini-2.0-flash-exp model ([843a0aa](https://github.com/domuk-k/dwkim/commit/843a0aa6da990a1bece0d33aa293090d040bc213))
* **persona-api:** use gemini-1.5-flash-002 without models/ prefix ([f15a308](https://github.com/domuk-k/dwkim/commit/f15a30867cd265f0571e274236b3c154394fc359))
* **persona-api:** use gemini-1.5-flash-latest for better free tier quota ([6351158](https://github.com/domuk-k/dwkim/commit/6351158f3160532746987cb5400679da303e95f4))
* **persona-api:** use gemini-2.0-flash (confirmed available) ([1756a85](https://github.com/domuk-k/dwkim/commit/1756a85eefb7213bbebf092c900d3bfec606e6aa))
* **persona-api:** use gemini-2.0-flash model identifier ([77c6149](https://github.com/domuk-k/dwkim/commit/77c61491c77f38b4bc5166c8d803bc045ca8c3c3))
* **persona-api:** use gemini-pro model ([79a99ec](https://github.com/domuk-k/dwkim/commit/79a99ecb0bb2f053858f1055615273c45ac4c206))
* **persona-api:** use models/gemini-1.5-flash-001 full path ([c29ccd8](https://github.com/domuk-k/dwkim/commit/c29ccd8fb92723c6c71843733d5240ad7f4cd416))
* Redis connection timeout and URL parsing for Render ([6cc5f7e](https://github.com/domuk-k/dwkim/commit/6cc5f7e69aea18459fe4765388c58d4c26257bf0))
* Resolve TypeScript error in theme provider ([dbb4a5d](https://github.com/domuk-k/dwkim/commit/dbb4a5d616a21f6ffc875a816c1f0556c299dd84))
* Restore Redis connection options with proper TypeScript handling ([33ebeed](https://github.com/domuk-k/dwkim/commit/33ebeedeb537fb728e44985f1da3ee95e1574194))
* settings permissions update ([484a74a](https://github.com/domuk-k/dwkim/commit/484a74ae7d3a06c43905aa6ad23a8e3dcb86f5bc))
* Simplify Redis constructor to resolve TypeScript overload error ([ef79ec0](https://github.com/domuk-k/dwkim/commit/ef79ec09bf2a475a7cd5c133ff2387796aabfb04))
* TypeScript compilation error in LLMService ([e4b00f6](https://github.com/domuk-k/dwkim/commit/e4b00f6af00e681b5e4596ccf323ed99ffc65e97))
* TypeScript 빌드 에러 해결 ([9ad8f85](https://github.com/domuk-k/dwkim/commit/9ad8f8582048c3f0f948233d163a7921c2874b9e))
* typo ([3ebf236](https://github.com/domuk-k/dwkim/commit/3ebf236919fa6c98c34cb9a4cb4f27a0deac3feb))
* update vercel build command for pnpm workspace ([d906081](https://github.com/domuk-k/dwkim/commit/d906081a71de82c74c464f065978036b30edace7))
* 서버 포트 8080으로 변경 및 안정성 개선 ([7f4d568](https://github.com/domuk-k/dwkim/commit/7f4d56833c10c2031a47e772044ac199aa102634))

### Refactoring

* **dwkim:** remove legacy CLI implementation ([a9010b2](https://github.com/domuk-k/dwkim/commit/a9010b2f66fcb347622d2926e80ca6e8ff753992))
* Make Redis completely optional for robust server startup ([b7159a9](https://github.com/domuk-k/dwkim/commit/b7159a9c3ec20163b3057e8cb920c0d5d907b311))
* **persona-api:** clean up code and add keyword boosting ([9fa7776](https://github.com/domuk-k/dwkim/commit/9fa77766f84db380679248fd913a02b0cacfb740)), closes [#1](https://github.com/domuk-k/dwkim/issues/1) [#31](https://github.com/domuk-k/dwkim/issues/31)
* **persona-api:** clean up route registration ([56a9963](https://github.com/domuk-k/dwkim/commit/56a996366a232b6ca342c777681b6b91c323039e))
* **persona-api:** integrate new services and remove legacy code ([dfa6714](https://github.com/domuk-k/dwkim/commit/dfa6714e0aa8e44cfc5929772b1324ca5a43d4cd))
* **persona-api:** load system prompt from file ([730e747](https://github.com/domuk-k/dwkim/commit/730e747ac3e1234d6636e106e59d03797b432b41))
* **persona-api:** migrate data to Cogni SSOT ([a648eb3](https://github.com/domuk-k/dwkim/commit/a648eb35bab63ec1dada4db79f729871ba1bcf37))
* **persona-api:** migrate docker-compose from Chroma to Qdrant ([6f244f5](https://github.com/domuk-k/dwkim/commit/6f244f5cc1876a53e0a1be90682f52e173214a68))
* **persona-api:** remove migrated data files ([9b36d21](https://github.com/domuk-k/dwkim/commit/9b36d218abe5eb89cbe078c58c0beecd51b3447a))
* **persona-api:** use diverse search with MMR for better retrieval ([4d69429](https://github.com/domuk-k/dwkim/commit/4d69429309ac8895e9fcffdd57a43649e2b9db34))
* printProfile 함수 개선 및 프로필 정보 상수화 ([e5dd4c0](https://github.com/domuk-k/dwkim/commit/e5dd4c0136cafbc06a3cfd575fa8abdc1f3049a8))
* 프로필 정보 구조 변경 및 출력 함수 수정 ([ce3698f](https://github.com/domuk-k/dwkim/commit/ce3698fb96ca6e75c6f86a1571156565df332593))

# dwkim

## 0.2.1

### Patch Changes

- f5e7e49: Fix a bug where the CLI command would crash due to a double shebang line.

## 0.2.0

### Minor Changes

- 5b13b43: feat: RAG 기반 개인화 챗봇 API 및 CLI 통합 구현

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

### Patch Changes

- e5dd4c0: refactor: printProfile 함수 개선 및 프로필 정보 상수화
- a10fb76: fix: bio update

## 0.1.2

### Patch Changes

- 14bb186: chore: intro of pnpm workspace
- 8b6bd18: dwkim 패키지 구조 변경 및 스크립트 수정
