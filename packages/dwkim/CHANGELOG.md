## 1.0.0 (2026-06-01)

### ⚠ BREAKING CHANGES

* **persona-api:** Complete framework migration

- Replace Fastify with Elysia (Bun-native)
- Remove custom middleware (abuseDetection, rateLimit)
- Add inline rate limiting with in-memory store
- Convert all routes to Elysia style with TypeBox schemas

Features:
- Add UX log service with Redis circular buffer
- Add /api/v1/logs endpoints with ADMIN_API_KEY auth
- Add embedding cache (LRU) for TTFT optimization
- Improve query rewriter with expanded keywords
- Simplify system prompt (50% token reduction)
- Replace dynamic imports with static imports

Code reduction: -1,273 lines (38% smaller)
* Package manager changed from pnpm to Bun
* **dwkim:** default command now shows profile + chat combined
- dwkim chat removed, use dwkim (default) instead
- dwkim profile added for profile-only display
* **persona-api:** Requires DATABASE_URL for Neon Postgres

### chore

* **dwkim:** bump version to 1.0.0 ([e5d435b](https://github.com/domuk-k/dwkim/commit/e5d435b11b7e77a8a02b6dee319cc694596f02a5))
* migrate monorepo to Bun + Biome ([a706fac](https://github.com/domuk-k/dwkim/commit/a706fac0eb1f5522fb31316d9d2a26225f57bda2))

### Features

* Add blog package to monorepo ([f1ff69f](https://github.com/domuk-k/dwkim/commit/f1ff69f4f17c80e2b346c2ed7f00c76e4f508d3a))
* add GitHub repository link with icon to blog footer ([f9078e6](https://github.com/domuk-k/dwkim/commit/f9078e67b59064507526bbfa33314c3887c1a099))
* add global header with 3-way theme toggle and improve blog post ([5404203](https://github.com/domuk-k/dwkim/commit/5404203606373a35798cc353e534b6dbdbd27f07))
* Add global navigation and improve blog UX ([020a139](https://github.com/domuk-k/dwkim/commit/020a139d8a32041c94fc856f0558cffe1acec662))
* add project process mental model blog post ([c0bd2ef](https://github.com/domuk-k/dwkim/commit/c0bd2ef09c6683e6af1b4d4c606d6a1a50f75aff))
* add SSE streaming for real-time chat responses ([2318bf8](https://github.com/domuk-k/dwkim/commit/2318bf8a8d3353efb73b058774aaf62057ee3838))
* **blog:** add AI collaboration post and footer link ([078be14](https://github.com/domuk-k/dwkim/commit/078be1490f6f9f663ab3a246af98c8f5a9ff2246))
* **blog:** add BSP parallel model post with callout support ([76ec668](https://github.com/domuk-k/dwkim/commit/76ec668f34013b82ce7583b286d3d30997c5df41))
* **blog:** add chat page with AI SDK v6 integration ([9a41e21](https://github.com/domuk-k/dwkim/commit/9a41e211fd8913fa520c57d50b9b2a1c28289272))
* **blog:** add Claude Code plugin analysis series (4 articles) ([5ca0a94](https://github.com/domuk-k/dwkim/commit/5ca0a94e6bc1ffa4ff16ef42eadf766e40583ce5))
* **blog:** add Cogni sync scripts ([02bb674](https://github.com/domuk-k/dwkim/commit/02bb674ef54a32fdf1ddac9b0ecc7bc9a0b7810d))
* **blog:** add evolving document status with animated badge ([56c22b2](https://github.com/domuk-k/dwkim/commit/56c22b22ea1221057b45a0a58a687894a83e8e86))
* **blog:** add explicit security headers to vercel.json ([130163b](https://github.com/domuk-k/dwkim/commit/130163b18d544e8825f4d12e8881c06c816681c8))
* **blog:** add interactive animations to theme toggle ([5a6b227](https://github.com/domuk-k/dwkim/commit/5a6b22753b6b39e87fec16638f3e206cd0a3c633))
* **blog:** add JSON-LD schema and fix mermaid rendering ([ad0df51](https://github.com/domuk-k/dwkim/commit/ad0df513caa4e125b2560f85dac45a79d29c1b4e))
* **blog:** add llms.txt for LLM crawlers ([a62732c](https://github.com/domuk-k/dwkim/commit/a62732c2d6d38a3557afcbd44919b700af2bf9b5))
* **blog:** add mentee testimonials to coach section ([2d4a3f1](https://github.com/domuk-k/dwkim/commit/2d4a3f17ea9f7da0defb77fa4d239a748841bcc6))
* **blog:** add mermaid diagram support and new post ([ae7594c](https://github.com/domuk-k/dwkim/commit/ae7594c29ad2c82cfc23af5211b15c50f81a3d25))
* **blog:** add Obsidian callout to HTML transform in sync-cogni ([a637595](https://github.com/domuk-k/dwkim/commit/a637595c25e19c41e6fb8e40302d84481cdeb068))
* **blog:** add postbuild broken link checker ([2a302b7](https://github.com/domuk-k/dwkim/commit/2a302b7d019dbf3884b02db9d2996863d1f32de1))
* **blog:** add robots.txt and auto-generated llms.txt/llms-full.txt ([9dec306](https://github.com/domuk-k/dwkim/commit/9dec30681236c552075093224332d30be891b8c0))
* **blog:** add series navigation to post pages ([5a2d5da](https://github.com/domuk-k/dwkim/commit/5a2d5dad4f13e77186b954c36fa3e9baa47f016e))
* **blog:** add Shiki dual theme for dark mode support ([f1e990d](https://github.com/domuk-k/dwkim/commit/f1e990d644dbb845345c38eb35b8ab82bdd3af7c))
* **blog:** add Vercel Analytics event tracking ([22ac7b9](https://github.com/domuk-k/dwkim/commit/22ac7b9b3632e63e5d8eac1893ed36a1493a6771))
* **blog:** add Vercel Analytics integration ([10b4178](https://github.com/domuk-k/dwkim/commit/10b4178925a0b5e057745f13383fac02b2dbe08e))
* **blog:** improve About section with tabs and code snippet ([e9b377e](https://github.com/domuk-k/dwkim/commit/e9b377ea1dcf02a534731c2c5a1700c9da1183a3))
* Change Swagger UI route from /documentation to /docs ([eb74d27](https://github.com/domuk-k/dwkim/commit/eb74d27a83eec0c9ad6d25c66ad69ddf6750b4c2))
* Claude API로 LLM 서비스 전환 ([fc52b45](https://github.com/domuk-k/dwkim/commit/fc52b45033af5bba645ec46613cbef91ecbcde0a))
* Docker 환경 설정 및 API 인프라 구축 ([67e8118](https://github.com/domuk-k/dwkim/commit/67e8118ef5a789e3f8d85def059970efdadadc8f))
* **dwkim,persona-api:** add HITL email collection pattern ([a39343f](https://github.com/domuk-k/dwkim/commit/a39343f1e4ab8c674fa2166491c6491332c330c6))
* **dwkim:** add --version flag with build-time injection ([b6160a4](https://github.com/domuk-k/dwkim/commit/b6160a41f3d1bac9432fb240a784b31ee858b2cc))
* **dwkim:** add clarification UI for ambiguous queries (A2UI) ([f74dc47](https://github.com/domuk-k/dwkim/commit/f74dc47fd0d5840b547a8539a503b86537de33b5))
* **dwkim:** add cold-start retry for 502/503 errors ([8a5d904](https://github.com/domuk-k/dwkim/commit/8a5d90469e8dd2a3ca4b819e46d669754a653b03))
* **dwkim:** add curl install script and binary distribution ([3f6e15b](https://github.com/domuk-k/dwkim/commit/3f6e15b5bd66db6d25555aba1d9ba43051f0d900))
* **dwkim:** add HITL feedback API client methods ([4f89d7e](https://github.com/domuk-k/dwkim/commit/4f89d7e9ba520c130f5c465569a8bafec52819bc))
* **dwkim:** add interactive onboarding with welcome screen and capability disclosure ([a894fd8](https://github.com/domuk-k/dwkim/commit/a894fd85a8d65db34fd89587dd4b0e0900aa5b7f))
* **dwkim:** add markdown rendering for chat responses ([cf796ac](https://github.com/domuk-k/dwkim/commit/cf796aca1e29f8b8936f3f93791f0db9049cacd2))
* **dwkim:** add marked-terminal markdown renderer ([2ca6b69](https://github.com/domuk-k/dwkim/commit/2ca6b69754a2b97c662886b00412a328b6a07d81))
* **dwkim:** add ora spinners for better UX ([2d186bf](https://github.com/domuk-k/dwkim/commit/2d186bf050a9df571f8846a13658f0fe577e5769))
* **dwkim:** add retry logic for cold start health check ([62a5d29](https://github.com/domuk-k/dwkim/commit/62a5d29d821f430cb7830cb8064468bd2bfd9320))
* **dwkim:** add source detail expansion toggle with s key ([7c75720](https://github.com/domuk-k/dwkim/commit/7c7572088f01776ae614d53553e215ff30f9a420))
* **dwkim:** add status event type for streaming updates ([66df246](https://github.com/domuk-k/dwkim/commit/66df2461dd98769d81b42d3adb800988b8b07e86))
* **dwkim:** add streaming abort with ESC key ([48537c2](https://github.com/domuk-k/dwkim/commit/48537c2015dc2de543f90c4a9d8afc873a1986dc))
* **dwkim:** add thinking/progress display for RAG streaming ([6e7cb92](https://github.com/domuk-k/dwkim/commit/6e7cb922b445261df410a5d96db70571ef41e99b))
* **dwkim:** adopt pi-tui native components ([1f1b34c](https://github.com/domuk-k/dwkim/commit/1f1b34c0a9994fb3746d05c7cd65987bb3f5cf98))
* **dwkim:** Claude Code style welcome banner ([1dfe223](https://github.com/domuk-k/dwkim/commit/1dfe2231675e0ad41d639c0ecd2ad426f3a1f015))
* **dwkim:** clear input on ESC in idle mode ([cd3d849](https://github.com/domuk-k/dwkim/commit/cd3d849e3e096f8d2270eddc307f89ed8849bff5))
* **dwkim:** config 확장 및 app/index wiring ([b7ea53a](https://github.com/domuk-k/dwkim/commit/b7ea53a72ba5a35bc7e9ff23964892b42b8eafcc))
* **dwkim:** default to profile + chat combined flow ([6b6739c](https://github.com/domuk-k/dwkim/commit/6b6739ced5261ee6883f3a1b2c37e30415273d2d))
* **dwkim:** implement Ink + Catppuccin TUI ([756292f](https://github.com/domuk-k/dwkim/commit/756292f269f615ff60f6cb1017109cbe23aa0565))
* **dwkim:** improve email prompt UX ([af5a43e](https://github.com/domuk-k/dwkim/commit/af5a43e973979e32249f8741171e3982de1d9638))
* **dwkim:** improve first impression with CTA and examples ([3597dc7](https://github.com/domuk-k/dwkim/commit/3597dc70838e03a84c6a149f7be204027c9a10d1))
* **dwkim:** migrate from changesets to semantic-release ([b65c85c](https://github.com/domuk-k/dwkim/commit/b65c85c2a9b71a4bbb3ce8afeb037f1e81e59ee8))
* **dwkim:** npm 업데이트 체크 유틸 ([0db6606](https://github.com/domuk-k/dwkim/commit/0db6606f2823562dacb48e34ccb18b8f530c0097))
* **dwkim:** parse data-elicitation into elicitation StreamEvent ([#27](https://github.com/domuk-k/dwkim/issues/27)) ([c261680](https://github.com/domuk-k/dwkim/commit/c2616804dc6a5242e379b9bc2dfcd1d236e19b0c))
* **dwkim:** render elicitation chip in CLI, select sets visitorType silently ([#27](https://github.com/domuk-k/dwkim/issues/27)) ([c17e71e](https://github.com/domuk-k/dwkim/commit/c17e71e084808ade315bfa482f6129a72f7f5848)), closes [#9](https://github.com/domuk-k/dwkim/issues/9)
* **dwkim:** send captured visitorType on next request, clear after ([#27](https://github.com/domuk-k/dwkim/issues/27)) ([6085ae8](https://github.com/domuk-k/dwkim/commit/6085ae8ba8a917ad57d7cd6d48b96423c3bcdb4f))
* **dwkim:** update bio with emojis and new quote ([4ba273f](https://github.com/domuk-k/dwkim/commit/4ba273fad8a20e417fb1e438388711b3175f2e72))
* **dwkim:** update streaming event types ([87308b0](https://github.com/domuk-k/dwkim/commit/87308b068a017ddf979dda919521ff03470bdb05))
* **dwkim:** 로딩 스피너 애니메이션 추가 ([c22a028](https://github.com/domuk-k/dwkim/commit/c22a0282e911e0b5fd20381e380336990fe58a57))
* **dwkim:** 시스템 클립보드 텍스트 복사 유틸 ([8b27a56](https://github.com/domuk-k/dwkim/commit/8b27a56cac6630d7fba5ad4460eda42949820065))
* **dwkim:** 응답 완료 알림 유틸 (bell/system/both/off) ([1fc11f4](https://github.com/domuk-k/dwkim/commit/1fc11f43daf5df195d3e263c0d36a2fa75e23736))
* **dwkim:** 터미널 테마 자동 감지 (dark/light) ([9ebee24](https://github.com/domuk-k/dwkim/commit/9ebee24b4dc958a92e15de5eba8048fb60650b77))
* Fastify 서버 및 기본 의존성 설치 ([4baf924](https://github.com/domuk-k/dwkim/commit/4baf9240862e1b6a960c73c5559882b659318a69))
* migrate blog from Next.js to Astro with UI improvements ([e9d4d5e](https://github.com/domuk-k/dwkim/commit/e9d4d5ea39f9083cb123ccbf399283af08debfa8))
* migrate build system from tsup to esbuild with ESM support ([be81414](https://github.com/domuk-k/dwkim/commit/be81414242b73057f6ab43629e03128235551c78))
* migrate to official @astrojs/rss package ([2ea83d7](https://github.com/domuk-k/dwkim/commit/2ea83d733c5045e750ad4820f45260490107658f))
* OpenAPI 기반 chat 엔드포인트 인터페이스 정의 ([21934ad](https://github.com/domuk-k/dwkim/commit/21934ada657f61dc936f33fd1af3302a7300541f))
* Optimize blog for static export and enhance styling ([6e9ad6d](https://github.com/domuk-k/dwkim/commit/6e9ad6d44db90f818d023af7740864d809dc741e))
* **persona-api,dwkim:** add confidence score with CLI visualization ([2b9e9c0](https://github.com/domuk-k/dwkim/commit/2b9e9c02c69a9c8b81c5a375807bdc86b3bb3df9))
* **persona-api,dwkim:** add inline source citations in responses ([d656368](https://github.com/domuk-k/dwkim/commit/d656368f697615f7f1a69b04ad7cb3827ccdbafa))
* **persona-api,dwkim:** implement rich loading states with discriminated unions ([7e14a20](https://github.com/domuk-k/dwkim/commit/7e14a2076edc670b9ae9650a0177fe4e08715148))
* **persona-api,dwkim:** improve SEU threshold and feedback UX ([a4eea97](https://github.com/domuk-k/dwkim/commit/a4eea9780212fc5bd7a96e6097e9c6e217441171))
* **persona-api:** add AI SDK v6 dependencies ([6e26176](https://github.com/domuk-k/dwkim/commit/6e261766b52818f4e1c9b979b7de77308816ec41))
* **persona-api:** add CI auto-deploy workflow ([71ebb17](https://github.com/domuk-k/dwkim/commit/71ebb175c6c738b0cfa9b2cf9716433b5d508aee))
* **persona-api:** add Cogni sync API endpoint ([8bca475](https://github.com/domuk-k/dwkim/commit/8bca4750b624ac02e805d4413a9225f5f733fd2e))
* **persona-api:** add conversation services for UX improvements ([0e3a036](https://github.com/domuk-k/dwkim/commit/0e3a0362467ea799541c7a1e984866d70dfdffce))
* **persona-api:** add cross-session memory via DeviceService personalization ([b64f97c](https://github.com/domuk-k/dwkim/commit/b64f97c29b6a37aae81af1a33a92d1e1655c616f))
* **persona-api:** add graceful shutdown with memory data sync ([d4cf18d](https://github.com/domuk-k/dwkim/commit/d4cf18df0fb9e1e1ece78b0bbcda49ef174a21e9))
* **persona-api:** add Langfuse Prompt Management ([cb9a00d](https://github.com/domuk-k/dwkim/commit/cb9a00dc52b184cbef7e6ea9ff34d90d0a322c6a))
* **persona-api:** add multi-model support with environment profiles ([1f6db4d](https://github.com/domuk-k/dwkim/commit/1f6db4dd37c4e55942f2ab8be04676c7586c4cab))
* **persona-api:** add multilingual response support ([b553206](https://github.com/domuk-k/dwkim/commit/b5532065ac931602f84356299756548d9d0ccf5a))
* **persona-api:** add OpenRouter LLM provider support ([8113369](https://github.com/domuk-k/dwkim/commit/8113369b968c5ebc5ffbdec4479f56048a7e76c1))
* **persona-api:** add Qdrant data initialization script ([35ae166](https://github.com/domuk-k/dwkim/commit/35ae166d5cf356aface7c8e3e33f9082fe6c0f79))
* **persona-api:** add Qdrant Fly.io deployment config ([77bbfe6](https://github.com/domuk-k/dwkim/commit/77bbfe61721850a8243e7a08f99cd4f1c266399d))
* **persona-api:** add query complexity router for fast-path responses ([53cbba1](https://github.com/domuk-k/dwkim/commit/53cbba101a4c350ed9e7ac755c002bb4ab82ae1f))
* **persona-api:** add Query Rewriting, Device ID personalization, A2UI ([5456c45](https://github.com/domuk-k/dwkim/commit/5456c45682883fb3a1f443fbad1fd2b264b13bd1))
* **persona-api:** add search index build script ([4868d02](https://github.com/domuk-k/dwkim/commit/4868d02173d234dfee490accddb9830b216a38ff))
* **persona-api:** before/after comparison + honest story ([#25](https://github.com/domuk-k/dwkim/issues/25)) ([0bb7d11](https://github.com/domuk-k/dwkim/commit/0bb7d11098b85ce23871f037e4b3c0b69760ae1d))
* **persona-api:** capture visitorType from request → persist before emit ([#27](https://github.com/domuk-k/dwkim/issues/27)) ([debd1a7](https://github.com/domuk-k/dwkim/commit/debd1a7b1407b399f98157e9b18da4fd1ef623aa))
* **persona-api:** conversation memory with full history ([bb7264d](https://github.com/domuk-k/dwkim/commit/bb7264dd5ed9c5be8fbf55db383b2f44439e2297))
* **persona-api:** elicitation policy + visitor profile (schema-first, Slice 1 [#27](https://github.com/domuk-k/dwkim/issues/27)) ([72b0c8e](https://github.com/domuk-k/dwkim/commit/72b0c8e117dd6381df6f7ee907a0d7e143a7b2a7))
* **persona-api:** emit identify elicitation on turn-1 ([#27](https://github.com/domuk-k/dwkim/issues/27)) ([a27d99d](https://github.com/domuk-k/dwkim/commit/a27d99dcf282477de51749c7f0cfe8c696f90726))
* **persona-api:** enable contextual retrieval chunking ([0da25ac](https://github.com/domuk-k/dwkim/commit/0da25ac7f495e2a2abe274603b5177e2af06f427))
* **persona-api:** implement Hybrid Search with BM25 + Voyage RRF ([c342090](https://github.com/domuk-k/dwkim/commit/c342090b01fb5cc303efe9a515a619c6faeb6069))
* **persona-api:** implement Mastra RAG-core agent ([#24](https://github.com/domuk-k/dwkim/issues/24)) ([6059915](https://github.com/domuk-k/dwkim/commit/60599150f260395a1bffa7a8ef2b96a15a52f177))
* **persona-api:** index persona-tagged notes in Qdrant ([0b78b66](https://github.com/domuk-k/dwkim/commit/0b78b667e2d95aef8471bb2fbb78935fb8d1ff0d))
* **persona-api:** integrate DeepAgents.js with Gemini 2.5 Flash ([34ec7f6](https://github.com/domuk-k/dwkim/commit/34ec7f64da9bb39e16a01549dcce2db60192de95))
* **persona-api:** integrate Qdrant with native MMR support ([3bb707f](https://github.com/domuk-k/dwkim/commit/3bb707f685d617ce274ce05b3e8caeb06c38dd93))
* **persona-api:** log elicitation engagement — shown + answered ([#27](https://github.com/domuk-k/dwkim/issues/27)) ([bef7d45](https://github.com/domuk-k/dwkim/commit/bef7d45bfb741413aed79b809ee29394bb782deb))
* **persona-api:** RAG 개선 및 Discord 알림 강화 ([0999224](https://github.com/domuk-k/dwkim/commit/0999224d3500908fc9144669ae350e4b05c3c7c5))
* **persona-api:** reactivate follow-up question generation after responses ([5daaf23](https://github.com/domuk-k/dwkim/commit/5daaf2369ba105c6cc691b0dce598cb2807e41aa))
* **persona-api:** replace BGE-M3 with Voyage multilingual-2 ([8a5df12](https://github.com/domuk-k/dwkim/commit/8a5df1245cd268389ec1879188da5e0e29228fd2))
* **persona-api:** replace ChromaDB with Neon pgvector ([5ca7b9b](https://github.com/domuk-k/dwkim/commit/5ca7b9b0461ac5945155222cfa1ace288feafee6))
* **persona-api:** restore A2UI clarification and improve suggestions ([645f2b4](https://github.com/domuk-k/dwkim/commit/645f2b44d0fb4814ee071179c4bb959d58e45ca1))
* **persona-api:** tune RAG config for better retrieval ([1ce8f65](https://github.com/domuk-k/dwkim/commit/1ce8f65a239ec329ff37701a96d8ecc25f8640b8))
* **persona-api:** update systemPrompt and RAG pipeline for resume renewal ([9f1b881](https://github.com/domuk-k/dwkim/commit/9f1b8815cd36dab3dcd0b37fd2215b51aaccf8e2))
* **persona-api:** wire elicitation into stream protocol + eval contract ([#27](https://github.com/domuk-k/dwkim/issues/27)) ([b1e7351](https://github.com/domuk-k/dwkim/commit/b1e7351232617165e60b8a6c1285e36b2b001474))
* RAG 기반 개인화 챗봇 시스템 완성 ([43a0161](https://github.com/domuk-k/dwkim/commit/43a0161953ecb49c0d774989ee78ed63c7074b6a))
* RAG 챗봇 API 완전 구현 ([fd4958d](https://github.com/domuk-k/dwkim/commit/fd4958d1e25bd334433ae8b6e26c5f7831e1b15d))
* Rate limit, abuse detection 미들웨어 구현 ([fa1f11a](https://github.com/domuk-k/dwkim/commit/fa1f11a0f3530a403877a963461d45e6fdca4779))
* Switch to gpt-4.1-nano model for cost optimization ([62cca10](https://github.com/domuk-k/dwkim/commit/62cca10c4f22c8bd7f067ae8c7b5f8dad1b5aadf))
* 프로젝트 디렉토리 및 Docker 개발환경 초기화 ([b2a656c](https://github.com/domuk-k/dwkim/commit/b2a656c1ada7f3b1ae4cad9f05ea643f9dee37c9))

### Bug Fixes

* Add proper TypeScript types instead of any ([72ac68c](https://github.com/domuk-k/dwkim/commit/72ac68c1143805df5520e147f73ac41766470be8))
* bio update ([38fc246](https://github.com/domuk-k/dwkim/commit/38fc2469a0b1013f619ee9e6e37bce4afae757aa))
* **blog:** add Shiki dual theme files (previous commit was empty) ([5751411](https://github.com/domuk-k/dwkim/commit/575141172a65161ed1d4dcfb5c7181338ab58a3e))
* **blog:** correct pubDate for recent posts ([0a1d643](https://github.com/domuk-k/dwkim/commit/0a1d6436ebb5d3eb1cf6511776b2302ccc1dfee7))
* **blog:** correct pubDate for working-with-agents post ([e94c03f](https://github.com/domuk-k/dwkim/commit/e94c03fef573813dd9aed9e8f60b47c536122468))
* **blog:** fix broken links in developer profile ([f2b7fd1](https://github.com/domuk-k/dwkim/commit/f2b7fd105c6dd35341f7ddc600b7e551ef0710fc))
* **blog:** handle Obsidian wiki-links in sync-cogni ([1697a97](https://github.com/domuk-k/dwkim/commit/1697a97d3de68fe5c43a7af10d5874c56c423cd7))
* **blog:** remove daily note accidentally tagged as blog ([3580401](https://github.com/domuk-k/dwkim/commit/3580401955871776572fc0f0af4a0cf9b66c14ec))
* **blog:** remove duplicate post with Korean filename ([7e9d408](https://github.com/domuk-k/dwkim/commit/7e9d408d38bb69a32ffbdc24e32804fdd692b7b3))
* **blog:** replace unicode three-em dash with markdown hr ([8754729](https://github.com/domuk-k/dwkim/commit/87547293be2d5cf80680ab070afcfaaade709460))
* **blog:** restore imports removed in Biome migration ([bb147e0](https://github.com/domuk-k/dwkim/commit/bb147e08091a31c0ecc8179ef5de129c9ba087b0))
* **blog:** skip sync-cogni on Vercel when ~/.cogni missing ([cad47e2](https://github.com/domuk-k/dwkim/commit/cad47e2892a58925f84c70e335677e333612cd9a))
* **blog:** use attribute selector for Shiki code block themes ([c17a760](https://github.com/domuk-k/dwkim/commit/c17a760364bfb64cd1d886c5e1d408a30a163902))
* **blog:** use bun in deploy-blog.sh instead of pnpm ([514a55c](https://github.com/domuk-k/dwkim/commit/514a55c9d036503eb0df782be308653599bb97db))
* **blog:** use bun instead of pnpm in vercel.json ([2337c17](https://github.com/domuk-k/dwkim/commit/2337c17ee3f9ef8f1699f656f74e9b2184c099ea))
* claude settings update ([0e3c571](https://github.com/domuk-k/dwkim/commit/0e3c5716740a0619da268c500534ae8e80b16ea8))
* **dwkim:** add missing key prop to Static ProfileBanner ([ce886a9](https://github.com/domuk-k/dwkim/commit/ce886a99e17d9b402dd8022fe447e840b51c1f0c))
* **dwkim:** add repository field for npm provenance verification ([b8cfa75](https://github.com/domuk-k/dwkim/commit/b8cfa753ee8232b801f50803d8b9547d842ba779))
* **dwkim:** auto-submit starter questions on WelcomeView selection ([37199aa](https://github.com/domuk-k/dwkim/commit/37199aa647646691cfc6eba184e5429b05edd32f))
* **dwkim:** change email prompt hiding to session-based ([78e3406](https://github.com/domuk-k/dwkim/commit/78e34068c53d5acca277661488ae1c98314634e3))
* **dwkim:** clean up TUI markdown rendering for citations and links ([595f067](https://github.com/domuk-k/dwkim/commit/595f067b37209f66f284fe456c955266fffa6678))
* **dwkim:** enable NPM_CONFIG_PROVENANCE and simplify README ([3a3bf8a](https://github.com/domuk-k/dwkim/commit/3a3bf8a720ade3ead34f8e3a7ee50592934a1828))
* **dwkim:** expand citation pattern to cover English source keys ([a1e8d47](https://github.com/domuk-k/dwkim/commit/a1e8d47ec0e13b9738f622d121b1827de90ba695))
* **dwkim:** fix API response parsing and improve error handling ([fd0abfb](https://github.com/domuk-k/dwkim/commit/fd0abfbe39f9f3f2c0e2ae281fd83a0306df86aa))
* **dwkim:** fix markdown rendering with correct marked-terminal config ([2e3f6c7](https://github.com/domuk-k/dwkim/commit/2e3f6c744be2823f50139aff5f1e26bc6509c52a))
* **dwkim:** fix profile banner not rendering in Static component ([03c4f37](https://github.com/domuk-k/dwkim/commit/03c4f3791df4704381012f3d7462acc2ab5cbd12))
* **dwkim:** include sessionId in contact endpoint request ([b7689c8](https://github.com/domuk-k/dwkim/commit/b7689c8c7264496e45ef89d9f4aa96a10d6b63eb))
* **dwkim:** migrate stream parser to UI Message Stream format ([0ac642d](https://github.com/domuk-k/dwkim/commit/0ac642dcdf6a18beb748d0a86adb31365c82aa51))
* **dwkim:** postprocess markdown for bold/code in list items ([2a31951](https://github.com/domuk-k/dwkim/commit/2a319513f71a96054be49b08083eb294026d33cd))
* **dwkim:** prevent falsy values from rendering in Ink components ([9ab0b7d](https://github.com/domuk-k/dwkim/commit/9ab0b7dd3b918cec17181fc0909872797ad1fd51))
* **dwkim:** remove ASCII block characters from banner ([9553460](https://github.com/domuk-k/dwkim/commit/9553460f953ae81b49ae94fc83c323a12da80446))
* **dwkim:** render banner inside Static for proper scrolling ([73db2a1](https://github.com/domuk-k/dwkim/commit/73db2a173d8733eb6573c1b0993cc17bc8ce708f))
* **dwkim:** render profile banner via useEffect for Static component ([a2b68ff](https://github.com/domuk-k/dwkim/commit/a2b68ffac8b0952d25aff1b1fe6711d570a9a1bb))
* **dwkim:** resolve React key duplication warnings ([e19c7df](https://github.com/domuk-k/dwkim/commit/e19c7df5c1acfde6c45295bfc182525b7504b75c))
* **dwkim:** rollback version for npm release retry ([c09b394](https://github.com/domuk-k/dwkim/commit/c09b39403fd57eae7cfde6ca42749e8976b7bf61))
* **dwkim:** separate banner from Static component ([bee1af0](https://github.com/domuk-k/dwkim/commit/bee1af05016ccc0c9901d2b3b3127b5f3393bfb6))
* **dwkim:** show profile banner above chat ([4f14c3f](https://github.com/domuk-k/dwkim/commit/4f14c3fe1cde6ca17eb2e295430ee0493b296c50))
* **dwkim:** show profile banner only on first run ([a579977](https://github.com/domuk-k/dwkim/commit/a57997785e90e40de352b7342d9392d587233fff))
* **dwkim:** simplify A2UI clarification UI to inline style ([44ec3d1](https://github.com/domuk-k/dwkim/commit/44ec3d1aa1e5227d5cbc08796726652455e1b62a))
* **dwkim:** stabilize nextId with useCallback to prevent useEffect re-runs ([328e725](https://github.com/domuk-k/dwkim/commit/328e725d419fddf90070bcaac8c91c40ebdd0b86))
* **dwkim:** strip hyperlink URLs from markdown in TUI ([f19c08a](https://github.com/domuk-k/dwkim/commit/f19c08a435f8d37bec8afecd4c30e0859e2230a3))
* **dwkim:** trigger release with markdown rendering fix ([fa790ed](https://github.com/domuk-k/dwkim/commit/fa790edd4c4772dab18fd08f33c6c878438ac1c0))
* **dwkim:** update company info to Coxwave ([334336f](https://github.com/domuk-k/dwkim/commit/334336f961014b8b7c15f9d0fe068775e999ac29))
* **dwkim:** update title to Agent Builder Product Lead ([cbaa9f5](https://github.com/domuk-k/dwkim/commit/cbaa9f5cfb5601198cdc49e15d0080af70cab187))
* **dwkim:** update website URL to dwkim.vercel.app ([f13e720](https://github.com/domuk-k/dwkim/commit/f13e72070c93782dad04ec659623fe6154fb0e8d))
* **dwkim:** use @anolilab/semantic-release-pnpm for OIDC monorepo support ([dd566b2](https://github.com/domuk-k/dwkim/commit/dd566b2ef117f5424901d9b04b6442761324d49b))
* **dwkim:** use Node.js 22 for semantic-release v25 ([08817e5](https://github.com/domuk-k/dwkim/commit/08817e5f1b30bbca58791777781c4416a38c1480))
* **dwkim:** use Static for banner to scroll naturally ([7e5c0af](https://github.com/domuk-k/dwkim/commit/7e5c0afe4a5fb0696c3fed66260f24358a1c357f))
* **dwkim:** 로딩 상태 중복 표시 수정 ([a66ab98](https://github.com/domuk-k/dwkim/commit/a66ab989c592063335d5a47491f3e38294daed49))
* Extend RateLimitOptions type to include redis property ([ee8e2b5](https://github.com/domuk-k/dwkim/commit/ee8e2b500882279f7be8ca69efb2dd94a3f7aea2))
* layout ([5d263e0](https://github.com/domuk-k/dwkim/commit/5d263e08e864c7aa4f667d9068d19127462b2a27))
* LightTabs 컴포넌트의 스타일 수정 및 애니메이션 개선 ([54df277](https://github.com/domuk-k/dwkim/commit/54df277488e43bde4e3b43414a927ee1887a7d5f))
* move vercel.json to blog directory and update build command ([7cbc87b](https://github.com/domuk-k/dwkim/commit/7cbc87bc86c9e37eadd56c3558ee33921bd504bb))
* **persona-api,dwkim:** address verification issues across S3-S5 ([eb87673](https://github.com/domuk-k/dwkim/commit/eb87673095818321353faf3795c9ffd14373d538))
* **persona-api:** change MAX_SEARCH_RESULTS default from 5 to 10 ([dc7a993](https://github.com/domuk-k/dwkim/commit/dc7a9934500b67f079997092d8b58cd356152b67))
* **persona-api:** exclude /health from rate limiting ([a71945c](https://github.com/domuk-k/dwkim/commit/a71945cfb8d3c6e6609bdbfe8319d5d436faf955))
* **persona-api:** fix A2UI contact suggestion and BM25 initialization ([62c15b0](https://github.com/domuk-k/dwkim/commit/62c15b05a357d77800fabf89d842d86d73aad083))
* **persona-api:** fix Fastify logger type errors ([bb55255](https://github.com/domuk-k/dwkim/commit/bb5525583ce73f7dc48804b00f1a1f8bdf14eb41))
* **persona-api:** graceful fallback when GOOGLE_API_KEY missing ([55ba32b](https://github.com/domuk-k/dwkim/commit/55ba32b3efadc86d3468f48de1f99bb2512df4d1))
* **persona-api:** handle short device ID and session ID in Discord notifications ([7cc41c3](https://github.com/domuk-k/dwkim/commit/7cc41c334780e2aed998cb872ef8c1cf4325fd63))
* **persona-api:** improve Discord notification reliability and device ID display ([f449b86](https://github.com/domuk-k/dwkim/commit/f449b86e0c4e3c1422ea62c97077882b9215a8eb))
* **persona-api:** improve error handling with circuit breaker pattern ([56a873b](https://github.com/domuk-k/dwkim/commit/56a873b5f1668db86d4e31a9bd26a1a3b1e213b0))
* **persona-api:** improve RAG pipeline reliability and performance ([32059b5](https://github.com/domuk-k/dwkim/commit/32059b5281c0aa46abeeed10d14d44926b50a8af))
* **persona-api:** increase rate limit to 100 req/min ([17115df](https://github.com/domuk-k/dwkim/commit/17115dfd9327d899a0aacc910470a76f959909b1))
* **persona-api:** keep eval-only Mastra deps out of the deployed image ([b1c7918](https://github.com/domuk-k/dwkim/commit/b1c791847cea7b0599390cbb348a04c6e1afb0c1))
* **persona-api:** prevent hallucination in system prompt ([c6dadeb](https://github.com/domuk-k/dwkim/commit/c6dadeba97af5c12dbbfbb09d3672f7c6de4b42f))
* **persona-api:** record honest temperature in mastra snapshot ([cdca549](https://github.com/domuk-k/dwkim/commit/cdca549f9adbfef05514d6d81190225b432944aa)), closes [#1](https://github.com/domuk-k/dwkim/issues/1)
* **persona-api:** remove tracked env files and strengthen gitignore ([778a008](https://github.com/domuk-k/dwkim/commit/778a00893bce7e4709ba9d8bb10603cdbf131a03))
* **persona-api:** report real LLM token usage in streaming generation ([99d85ca](https://github.com/domuk-k/dwkim/commit/99d85ca32c71d0f9d7496612f9cb7d113fcc5291))
* **persona-api:** restore bm25Engine for init script compatibility ([aaefbf3](https://github.com/domuk-k/dwkim/commit/aaefbf30c6a383752aa82215ee6fdecfed83e446))
* **persona-api:** set temperature 0.3 for OpenRouter calls ([ebd84b4](https://github.com/domuk-k/dwkim/commit/ebd84b4fae29fa343f69aa64513b67a3bd49d18f))
* **persona-api:** stop private notes leaking into public search index ([276ba89](https://github.com/domuk-k/dwkim/commit/276ba898c58d5e92248886a01d93fad58e06b923))
* **persona-api:** switch to gemini-1.5-flash model ([9a300e6](https://github.com/domuk-k/dwkim/commit/9a300e64a414821fcd7dddae12b3ab46f9e2c396))
* **persona-api:** update register-prompts to support version upsert ([c0b6918](https://github.com/domuk-k/dwkim/commit/c0b6918f997e50209e8b688c117a5ae25f6f45ec))
* **persona-api:** update to gemini-2.0-flash-exp model ([99b1843](https://github.com/domuk-k/dwkim/commit/99b18438e420980e159268ff56546fff32a14099))
* **persona-api:** use 1st person perspective in system prompt ([d49a1ee](https://github.com/domuk-k/dwkim/commit/d49a1eee62a7c0d30deb82ffe9acec3d57216322))
* **persona-api:** use gemini-1.5-flash-002 without models/ prefix ([5c8c749](https://github.com/domuk-k/dwkim/commit/5c8c7494c71170f6c2f7e033b1ea5d245ebe692a))
* **persona-api:** use gemini-1.5-flash-latest for better free tier quota ([0a7efcd](https://github.com/domuk-k/dwkim/commit/0a7efcdc21ec5196b1af307a02c41773c0998599))
* **persona-api:** use gemini-2.0-flash (confirmed available) ([09f896d](https://github.com/domuk-k/dwkim/commit/09f896dc87c201e4e616035b455971e719bd0a23))
* **persona-api:** use gemini-2.0-flash model identifier ([bdcb6a5](https://github.com/domuk-k/dwkim/commit/bdcb6a5817dfa32f79105667d96f49dd147618ec))
* **persona-api:** use gemini-pro model ([fe88285](https://github.com/domuk-k/dwkim/commit/fe88285eeb0f0f9f25724eceff57cf55865ea160))
* **persona-api:** use models/gemini-1.5-flash-001 full path ([65a03fa](https://github.com/domuk-k/dwkim/commit/65a03fa8e57222fb9ed2fbce7d8fed53a25bf39d))
* Redis connection timeout and URL parsing for Render ([553497c](https://github.com/domuk-k/dwkim/commit/553497c5d26ad2e15f82c5edb88297b6af5292e0))
* Resolve TypeScript error in theme provider ([08e2e7b](https://github.com/domuk-k/dwkim/commit/08e2e7b226d97e9b2fef2ca5c9fdd638babfd541))
* resolve workflow failures and unreachable node error ([ff90f59](https://github.com/domuk-k/dwkim/commit/ff90f59a0891fa47b6110ddc641318df55d1980c))
* Restore Redis connection options with proper TypeScript handling ([e84b688](https://github.com/domuk-k/dwkim/commit/e84b6882b557c5f3553e33dabddf666d6396195f))
* settings permissions update ([b9971f7](https://github.com/domuk-k/dwkim/commit/b9971f72b95f408d617f5ff3c09528b4cb835358))
* Simplify Redis constructor to resolve TypeScript overload error ([25ffa12](https://github.com/domuk-k/dwkim/commit/25ffa1225cd4cb5c3b8d09df4b2725e65e1331da))
* TypeScript compilation error in LLMService ([3f174c4](https://github.com/domuk-k/dwkim/commit/3f174c40d55f0a47d348b4a3153dc7a0ed2a0af2))
* TypeScript 빌드 에러 해결 ([ecdc374](https://github.com/domuk-k/dwkim/commit/ecdc37491f38bd71987a9215d161e5263b13aaba))
* typo ([8e54a63](https://github.com/domuk-k/dwkim/commit/8e54a63832c37fec4d4ddc5002c651de4f749f92))
* update vercel build command for pnpm workspace ([bbdab42](https://github.com/domuk-k/dwkim/commit/bbdab42b2003a338815000f00831e3c6971946e6))
* 서버 포트 8080으로 변경 및 안정성 개선 ([f57fdcf](https://github.com/domuk-k/dwkim/commit/f57fdcf334991328ad9958167d4f0cac3cc0e2a1))

### Refactoring

* apply YAGNI, naming consistency, and security improvements ([517a3a6](https://github.com/domuk-k/dwkim/commit/517a3a67eebff20d145c1a6eeab8376e622880b3))
* **blog:** revamp about tabs with leerob-style developer profile ([aa4961a](https://github.com/domuk-k/dwkim/commit/aa4961a66e30b6b05c73586a440357255041093a))
* **dwkim:** decompose ChatView into focused sub-components ([df3d60c](https://github.com/domuk-k/dwkim/commit/df3d60ce1fb03c84830d446d9f9d056f1181d7b6))
* **dwkim:** improve Ink component reuse and responsiveness ([f00e570](https://github.com/domuk-k/dwkim/commit/f00e570c6b0a29ca58840fef7af459ff26c701fd))
* **dwkim:** remove legacy CLI implementation ([3f3b9ed](https://github.com/domuk-k/dwkim/commit/3f3b9ed0b64fda284c67e107a897a40618e41042))
* **dwkim:** remove thinkingStep, use progress.detail ([89f0cf7](https://github.com/domuk-k/dwkim/commit/89f0cf72012f2bbe305ee133ef65925cb7d81e1e))
* **dwkim:** remove unused banner role from MessageBubble ([90da459](https://github.com/domuk-k/dwkim/commit/90da459fa58f851515fc98e47c8da105ae502700))
* Make Redis completely optional for robust server startup ([ba7c3c0](https://github.com/domuk-k/dwkim/commit/ba7c3c07f4e4517f764deb8add811776b36f88a1))
* **persona-api:** apply IRedisClient abstraction to services ([f08bf0b](https://github.com/domuk-k/dwkim/commit/f08bf0bc824f6bda1f19f1e7f6435d8fe98e052c))
* **persona-api:** centralize config via validated env ([a622a9b](https://github.com/domuk-k/dwkim/commit/a622a9b198ccbfabddaaee842c20b81d3fea3785))
* **persona-api:** clean up code and add keyword boosting ([bf862f4](https://github.com/domuk-k/dwkim/commit/bf862f462ba22042f969ac741dc3aba5a323512a)), closes [#1](https://github.com/domuk-k/dwkim/issues/1) [#31](https://github.com/domuk-k/dwkim/issues/31)
* **persona-api:** clean up route registration ([aba726d](https://github.com/domuk-k/dwkim/commit/aba726d3d676f4c663bdb27558dff8f48cea7b18))
* **persona-api:** consolidate security into guardrails module ([3fe10ad](https://github.com/domuk-k/dwkim/commit/3fe10ad0fb1d2a1705e7519915e9e73bf18fdeed))
* **persona-api:** DI pattern, type safety improvements ([b549721](https://github.com/domuk-k/dwkim/commit/b54972132a2bdf347ab9268a9964f5a7f146f15e))
* **persona-api:** disable A2UI clarification and followup ([8860fff](https://github.com/domuk-k/dwkim/commit/8860fff730dfc9d2c8302c56c091d188207655b2))
* **persona-api:** improve disambiguation prompt ([c503985](https://github.com/domuk-k/dwkim/commit/c5039854006a2cd0768d01ed891ae4255f1f67d0))
* **persona-api:** integrate new services and remove legacy code ([a98455d](https://github.com/domuk-k/dwkim/commit/a98455d0999485d8482317a3bf7c4667d1a7476a))
* **persona-api:** LangGraph best practices 적용 ([c9f3929](https://github.com/domuk-k/dwkim/commit/c9f3929d7e996e3a8e355f31ff37b92ae4b4ec2e))
* **persona-api:** load system prompt from file ([32c3a71](https://github.com/domuk-k/dwkim/commit/32c3a71eac96e583d0337e44bcb95bd9d10553ad))
* **persona-api:** merge thinking events into progress items ([1dae0cc](https://github.com/domuk-k/dwkim/commit/1dae0cc8be54e7c96185667dc3c13f2a88d074c8))
* **persona-api:** migrate data to Cogni SSOT ([70a61cf](https://github.com/domuk-k/dwkim/commit/70a61cff23794a449ca803c1020a5346929245ad))
* **persona-api:** migrate docker-compose from Chroma to Qdrant ([78eeb4f](https://github.com/domuk-k/dwkim/commit/78eeb4ffe307e3e14e5e8e95f46b2e2f54436840))
* **persona-api:** migrate from Fastify to Elysia ([fe30cf1](https://github.com/domuk-k/dwkim/commit/fe30cf1eafb8369ccdea5fb039e437cdf0535818))
* **persona-api:** migrate to AI SDK v6 UI Message Stream ([ea6daf2](https://github.com/domuk-k/dwkim/commit/ea6daf2828b8b763c2fcab457bfb16dee0c52ab9))
* **persona-api:** migrate to LangGraph StateGraph architecture ([ae94ce2](https://github.com/domuk-k/dwkim/commit/ae94ce20896fd88778f18e9c263cffe00f74fc2d))
* **persona-api:** remove clarifyNode, suggestions only after response ([a3f12a9](https://github.com/domuk-k/dwkim/commit/a3f12a9869440a7244e37f86ac76a051ac667272))
* **persona-api:** remove migrated data files ([b7b1ea7](https://github.com/domuk-k/dwkim/commit/b7b1ea718c3fc97a3428a3544f9fd486b2f983ad))
* **persona-api:** remove Qdrant/embedding deps, add SEU latency instrumentation ([62bb1cc](https://github.com/domuk-k/dwkim/commit/62bb1cc9d1c79eb98cd4b29c3906fd63a502eb06))
* **persona-api:** replace ioredis with bun:sqlite + Drizzle ORM ([e62bbe8](https://github.com/domuk-k/dwkim/commit/e62bbe8299ea45de6ef776099dbb2b18cc0f6d6d))
* **persona-api:** replace process.env with validated env config ([58f3b17](https://github.com/domuk-k/dwkim/commit/58f3b17ae5b3369343ea511330b6ff0525927032))
* **persona-api:** use diverse search with MMR for better retrieval ([89f0edd](https://github.com/domuk-k/dwkim/commit/89f0edda7e53f45ffa3b86de62d8da727338de28))
* printProfile 함수 개선 및 프로필 정보 상수화 ([a8121b5](https://github.com/domuk-k/dwkim/commit/a8121b5c18dc9f92b5affec58168f157781901c8))
* remove inline citation in favor of SourcesPanel ([2b16ee2](https://github.com/domuk-k/dwkim/commit/2b16ee20e8d7d3bb2ec964d7794b9e24d2cb11bd))
* unify chat API to AI SDK v6 Data Stream Protocol ([90f3801](https://github.com/domuk-k/dwkim/commit/90f38010f859308d86047dd8873003969838d2b3))
* 프로필 정보 구조 변경 및 출력 함수 수정 ([19e3727](https://github.com/domuk-k/dwkim/commit/19e3727299bdadc5384a1bf89789e690fbb606fc))

## [3.6.0](https://github.com/domuk-k/dwkim/compare/dwkim-v3.5.0...dwkim-v3.6.0) (2026-03-10)

### Features

* **blog:** add evolving document status with animated badge ([f7ddb45](https://github.com/domuk-k/dwkim/commit/f7ddb45ce1f26e6c96437ca43f1c0b2b43ed66d8))
* **blog:** add series navigation to post pages ([ebc7f9d](https://github.com/domuk-k/dwkim/commit/ebc7f9dc9d6666a649c93c0b55363e24dde6636d))
* **persona-api:** add search index build script ([80f9f61](https://github.com/domuk-k/dwkim/commit/80f9f61289d80d86acbec040c1719c5b8af89a1a))
* **persona-api:** update systemPrompt and RAG pipeline for resume renewal ([d3062bd](https://github.com/domuk-k/dwkim/commit/d3062bd9fd0e91f59e51e340e06d92e017ea9f14))

### Bug Fixes

* **dwkim:** update title to Agent Builder Product Lead ([39a917a](https://github.com/domuk-k/dwkim/commit/39a917a60222b79ccab8236893bcb5bca3a7e5c6))

## [3.5.0](https://github.com/domuk-k/dwkim/compare/dwkim-v3.4.0...dwkim-v3.5.0) (2026-02-28)

### Features

* **dwkim:** clear input on ESC in idle mode ([ed11a41](https://github.com/domuk-k/dwkim/commit/ed11a414b01ca4857151d9c810db63eaf90eec0c))
* **persona-api:** index persona-tagged notes in Qdrant ([504ef74](https://github.com/domuk-k/dwkim/commit/504ef7432643b60aa076d8b11683d426ac528952))

### Bug Fixes

* **blog:** replace unicode three-em dash with markdown hr ([8787dd9](https://github.com/domuk-k/dwkim/commit/8787dd94d01d86facd77dee39ef9096c355109ac))
* **persona-api:** prevent hallucination in system prompt ([7588a06](https://github.com/domuk-k/dwkim/commit/7588a06b1d24040c124c5c06fa26fa1b303237ba))
* **persona-api:** set temperature 0.3 for OpenRouter calls ([1af9c64](https://github.com/domuk-k/dwkim/commit/1af9c64d49950f3e1b3989b1d73369ede5d3c814))
* **persona-api:** update register-prompts to support version upsert ([6f2bfde](https://github.com/domuk-k/dwkim/commit/6f2bfde6ef2fa076e48f0583c4cdf9ac37396071))

## [3.4.0](https://github.com/domuk-k/dwkim/compare/dwkim-v3.3.0...dwkim-v3.4.0) (2026-02-23)

### Features

* **blog:** add robots.txt and auto-generated llms.txt/llms-full.txt ([47c073b](https://github.com/domuk-k/dwkim/commit/47c073b92a36d63258481de37147d0cf1d6497ca))
* **dwkim:** adopt pi-tui native components ([4431acd](https://github.com/domuk-k/dwkim/commit/4431acda958875c6478e0c3916138ad5694cdc82))
* **persona-api:** add Langfuse Prompt Management ([b0979cf](https://github.com/domuk-k/dwkim/commit/b0979cf1446ce3ef92d4f6b3f85aae2b63f69989))

### Bug Fixes

* **blog:** handle Obsidian wiki-links in sync-cogni ([6eb4e7b](https://github.com/domuk-k/dwkim/commit/6eb4e7be95d9fc98b4094455b52c010202b66cdb))
* **persona-api:** improve RAG pipeline reliability and performance ([4ddded3](https://github.com/domuk-k/dwkim/commit/4ddded3d42ad09dbc45928f7fe27fe335b8f8ad4))

### Refactoring

* **persona-api:** remove clarifyNode, suggestions only after response ([5d363f5](https://github.com/domuk-k/dwkim/commit/5d363f540bd7909579beb6406574fb742e434a8d))

## [3.3.0](https://github.com/domuk-k/dwkim/compare/dwkim-v3.2.0...dwkim-v3.3.0) (2026-01-28)

### Features

* **dwkim:** add --version flag with build-time injection ([46f58a4](https://github.com/domuk-k/dwkim/commit/46f58a4c450cd7bc6329899276fd5314ef39d022))
* **dwkim:** add cold-start retry for 502/503 errors ([a9a00f1](https://github.com/domuk-k/dwkim/commit/a9a00f1363d9ba3e04194d131a1ae50686b516e8))
* **persona-api:** add AI SDK v6 dependencies ([9c2f412](https://github.com/domuk-k/dwkim/commit/9c2f41293c78c3e7cab383a1c334ebd6b17feac4))
* **persona-api:** enable contextual retrieval chunking ([2fb1259](https://github.com/domuk-k/dwkim/commit/2fb1259978ae5245491ae4c282154fccc9de957a))

### Bug Fixes

* **blog:** skip sync-cogni on Vercel when ~/.cogni missing ([1cfd11d](https://github.com/domuk-k/dwkim/commit/1cfd11db265a63df89de46df5c3346211c886f39))

### Refactoring

* **persona-api:** improve disambiguation prompt ([2c724cc](https://github.com/domuk-k/dwkim/commit/2c724ccbd182a9537efa10884365649882bedb20))

## [3.2.0](https://github.com/domuk-k/dwkim/compare/dwkim-v3.1.5...dwkim-v3.2.0) (2026-01-28)

### Features

* **blog:** add chat page with AI SDK v6 integration ([25ba5ba](https://github.com/domuk-k/dwkim/commit/25ba5ba89ae2bf528c1ae86634e86c0e94939e5a))

### Bug Fixes

* **dwkim:** migrate stream parser to UI Message Stream format ([6126553](https://github.com/domuk-k/dwkim/commit/612655369989376e9ad15b129b7be6242be4ed21))

### Refactoring

* **persona-api:** migrate to AI SDK v6 UI Message Stream ([82cf4c2](https://github.com/domuk-k/dwkim/commit/82cf4c252eabae1b3c08db48ca0c1baaf6e3ff47))
* unify chat API to AI SDK v6 Data Stream Protocol ([07fde38](https://github.com/domuk-k/dwkim/commit/07fde381b158da0c79e9454afd7a3925b5e667c3))

## [3.1.5](https://github.com/domuk-k/dwkim/compare/dwkim-v3.1.4...dwkim-v3.1.5) (2026-01-26)

### Bug Fixes

* **dwkim:** expand citation pattern to cover English source keys ([d07d899](https://github.com/domuk-k/dwkim/commit/d07d8994b5777399ca446caac007414600855aa3))

### Refactoring

* remove inline citation in favor of SourcesPanel ([70c8e0a](https://github.com/domuk-k/dwkim/commit/70c8e0a600cab0b5b10c5283247e47a2f7d8e818))

## [3.1.4](https://github.com/domuk-k/dwkim/compare/dwkim-v3.1.3...dwkim-v3.1.4) (2026-01-26)

### Bug Fixes

* **dwkim:** clean up TUI markdown rendering for citations and links ([17f8f7c](https://github.com/domuk-k/dwkim/commit/17f8f7c54aeb9423385cf5d863ba37fdccdd4e26))

## [3.1.3](https://github.com/domuk-k/dwkim/compare/dwkim-v3.1.2...dwkim-v3.1.3) (2026-01-26)

### Bug Fixes

* **dwkim:** strip hyperlink URLs from markdown in TUI ([9072e10](https://github.com/domuk-k/dwkim/commit/9072e10c5b50eecedf12a73a785f7228fa28e4ac))

## [3.1.2](https://github.com/domuk-k/dwkim/compare/dwkim-v3.1.1...dwkim-v3.1.2) (2026-01-26)

### Bug Fixes

* **dwkim:** stabilize nextId with useCallback to prevent useEffect re-runs ([9219972](https://github.com/domuk-k/dwkim/commit/921997283ba661c236209dcb478237efbdac4d74))

## [3.1.1](https://github.com/domuk-k/dwkim/compare/dwkim-v3.1.0...dwkim-v3.1.1) (2026-01-26)

### Bug Fixes

* **dwkim:** auto-submit starter questions on WelcomeView selection ([9b53c1c](https://github.com/domuk-k/dwkim/commit/9b53c1cbd7da6ca0ac85d44648a0ff6ccb27a1d5))

## [3.1.0](https://github.com/domuk-k/dwkim/compare/dwkim-v3.0.0...dwkim-v3.1.0) (2026-01-26)

### Features

* **dwkim:** add interactive onboarding with welcome screen and capability disclosure ([5f33b83](https://github.com/domuk-k/dwkim/commit/5f33b83095aadfadddd072f995272f1b6d48ed27))
* **dwkim:** add source detail expansion toggle with s key ([d9aca09](https://github.com/domuk-k/dwkim/commit/d9aca09aa693bcfcbb0fa097bfc4a82f9849db48))
* **persona-api,dwkim:** add confidence score with CLI visualization ([ad68578](https://github.com/domuk-k/dwkim/commit/ad68578717d929d64b4e525ffc5005b510556186))
* **persona-api,dwkim:** add inline source citations in responses ([4782d73](https://github.com/domuk-k/dwkim/commit/4782d739deae348631701575bddab83837502bb8))
* **persona-api:** add cross-session memory via DeviceService personalization ([a37749c](https://github.com/domuk-k/dwkim/commit/a37749c6613173229a2664ac506233a16063b839))
* **persona-api:** add query complexity router for fast-path responses ([f6b861e](https://github.com/domuk-k/dwkim/commit/f6b861e471ffc896abd7a0e9f0f15c1a759e2e68))
* **persona-api:** reactivate follow-up question generation after responses ([643a3dc](https://github.com/domuk-k/dwkim/commit/643a3dc9e88b1a4dfc87696f3e3df684a0eed892))

### Bug Fixes

* **persona-api,dwkim:** address verification issues across S3-S5 ([047a098](https://github.com/domuk-k/dwkim/commit/047a0987836c758a1703fe006b19effa06047045))

### Refactoring

* **dwkim:** decompose ChatView into focused sub-components ([303d8b9](https://github.com/domuk-k/dwkim/commit/303d8b91b21a8a097b9c4bc90e66aac33d5f0838))

## [3.0.0](https://github.com/domuk-k/dwkim/compare/dwkim-v2.2.4...dwkim-v3.0.0) (2026-01-21)

### ⚠ BREAKING CHANGES

* **persona-api:** Complete framework migration

- Replace Fastify with Elysia (Bun-native)
- Remove custom middleware (abuseDetection, rateLimit)
- Add inline rate limiting with in-memory store
- Convert all routes to Elysia style with TypeBox schemas

Features:
- Add UX log service with Redis circular buffer
- Add /api/v1/logs endpoints with ADMIN_API_KEY auth
- Add embedding cache (LRU) for TTFT optimization
- Improve query rewriter with expanded keywords
- Simplify system prompt (50% token reduction)
- Replace dynamic imports with static imports

Code reduction: -1,273 lines (38% smaller)

### Features

* **persona-api,dwkim:** improve SEU threshold and feedback UX ([4b10354](https://github.com/domuk-k/dwkim/commit/4b103549bbeff7e1f36ad4c9280affad55b9bf26))
* **persona-api:** restore A2UI clarification and improve suggestions ([a1e6109](https://github.com/domuk-k/dwkim/commit/a1e6109a25eb5d52ef47ba77cb97c0ddfc37459e))

### Refactoring

* **persona-api:** migrate from Fastify to Elysia ([c653338](https://github.com/domuk-k/dwkim/commit/c6533380a84956047f11f65cdf7b497084f8755d))

## [2.2.4](https://github.com/domuk-k/dwkim/compare/dwkim-v2.2.3...dwkim-v2.2.4) (2026-01-16)

### Bug Fixes

* **dwkim:** fix markdown rendering with correct marked-terminal config ([98bd620](https://github.com/domuk-k/dwkim/commit/98bd6206d6eefb239a75f86d152e3415845f5008))

## [2.2.3](https://github.com/domuk-k/dwkim/compare/dwkim-v2.2.2...dwkim-v2.2.3) (2026-01-15)

### Bug Fixes

* **dwkim:** fix profile banner not rendering in Static component ([5b08a74](https://github.com/domuk-k/dwkim/commit/5b08a74d8dfa4308292d29279b46e4725ea6ce57))
* **dwkim:** render profile banner via useEffect for Static component ([c8145f0](https://github.com/domuk-k/dwkim/commit/c8145f0f2bae26a2001e43607a2787035b94c878))

## [2.2.2](https://github.com/domuk-k/dwkim/compare/dwkim-v2.2.1...dwkim-v2.2.2) (2026-01-14)

### Bug Fixes

* **dwkim:** add missing key prop to Static ProfileBanner ([49a9ded](https://github.com/domuk-k/dwkim/commit/49a9ded9233aab351d335b5340a0768d90672f11))

## [2.2.1](https://github.com/domuk-k/dwkim/compare/dwkim-v2.2.0...dwkim-v2.2.1) (2026-01-14)

### Refactoring

* **dwkim:** improve Ink component reuse and responsiveness ([fa3faae](https://github.com/domuk-k/dwkim/commit/fa3faae5ce74425955d473ce89c572c1500a7029))

## [2.2.0](https://github.com/domuk-k/dwkim/compare/dwkim-v2.1.4...dwkim-v2.2.0) (2026-01-14)

### Features

* **blog:** add Claude Code plugin analysis series (4 articles) ([6c2fd73](https://github.com/domuk-k/dwkim/commit/6c2fd73865029b14a068702e927f783d57b8ec19))

### Bug Fixes

* **dwkim:** use Static for banner to scroll naturally ([90dd0f3](https://github.com/domuk-k/dwkim/commit/90dd0f33d50c4495dbd49ac2d2807b3791a06f43))

## [2.1.4](https://github.com/domuk-k/dwkim/compare/dwkim-v2.1.3...dwkim-v2.1.4) (2026-01-14)

### Bug Fixes

* **blog:** remove daily note accidentally tagged as blog ([3621552](https://github.com/domuk-k/dwkim/commit/3621552392d905eb9291d4174b763e3147e98f56))
* **blog:** remove duplicate post with Korean filename ([95c5068](https://github.com/domuk-k/dwkim/commit/95c5068499ef5cc765bce5d0a68cd1d58bc65646))
* **dwkim:** show profile banner only on first run ([8c602da](https://github.com/domuk-k/dwkim/commit/8c602dad8e653bec4a608d6c6632c6d3772132c5))

## [2.1.3](https://github.com/domuk-k/dwkim/compare/dwkim-v2.1.2...dwkim-v2.1.3) (2026-01-12)

### Refactoring

* **dwkim:** remove unused banner role from MessageBubble ([5eb2f59](https://github.com/domuk-k/dwkim/commit/5eb2f59106e2c9c7958225984fe10ea107b55a98))

## [2.1.2](https://github.com/domuk-k/dwkim/compare/dwkim-v2.1.1...dwkim-v2.1.2) (2026-01-12)

### Bug Fixes

* **dwkim:** separate banner from Static component ([89af184](https://github.com/domuk-k/dwkim/commit/89af1847a5b7fcb4427bc4ab36ffc00340ae4029))

## [2.1.1](https://github.com/domuk-k/dwkim/compare/dwkim-v2.1.0...dwkim-v2.1.1) (2026-01-12)

### Bug Fixes

* **dwkim:** resolve React key duplication warnings ([2280ff3](https://github.com/domuk-k/dwkim/commit/2280ff34960dfb29f05140849796687917536f3d))

## [2.1.0](https://github.com/domuk-k/dwkim/compare/dwkim-v2.0.1...dwkim-v2.1.0) (2026-01-11)

### Features

* **dwkim:** add retry logic for cold start health check ([79cc6e6](https://github.com/domuk-k/dwkim/commit/79cc6e6c1ccc1f1a219109f018f3d790bcc065e4))

## [2.0.1](https://github.com/domuk-k/dwkim/compare/dwkim-v2.0.0...dwkim-v2.0.1) (2026-01-11)

### Bug Fixes

* **dwkim:** prevent falsy values from rendering in Ink components ([47ccd5e](https://github.com/domuk-k/dwkim/commit/47ccd5e4291f6dd216405b233a311a3f61e3128b))
* **persona-api:** exclude /health from rate limiting ([a607cc2](https://github.com/domuk-k/dwkim/commit/a607cc270853d4a63d9b6ad5a3e345c620a7c603))
* **persona-api:** increase rate limit to 100 req/min ([ec75a1d](https://github.com/domuk-k/dwkim/commit/ec75a1d68f2cccd7086c61c032f2336c2a5cf3ae))

## [2.0.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.10.0...dwkim-v2.0.0) (2026-01-09)

### ⚠ BREAKING CHANGES

* Package manager changed from pnpm to Bun

### chore

* migrate monorepo to Bun + Biome ([2862d39](https://github.com/domuk-k/dwkim/commit/2862d394785a2dc2c92fe81aace95ffb0ef2c954))

### Features

* **dwkim:** add HITL feedback API client methods ([6510d65](https://github.com/domuk-k/dwkim/commit/6510d6577a80caff3db27537bf1ad54ab32ab55c))
* **persona-api:** add multi-model support with environment profiles ([ab3681f](https://github.com/domuk-k/dwkim/commit/ab3681f66e8555699c1a198f8b0a991bd3ca5a35))

### Bug Fixes

* **blog:** restore imports removed in Biome migration ([645c6b2](https://github.com/domuk-k/dwkim/commit/645c6b24d6e623e161ee1edc7b91f94c771f2aef))
* **blog:** use attribute selector for Shiki code block themes ([eb30e3d](https://github.com/domuk-k/dwkim/commit/eb30e3d3a0b6ec60a03c0275e2d4f0c7d56cdfee))
* **blog:** use bun instead of pnpm in vercel.json ([0cfad84](https://github.com/domuk-k/dwkim/commit/0cfad846392365574c923198ca1bc5230073a3fe))
* **dwkim:** postprocess markdown for bold/code in list items ([b473080](https://github.com/domuk-k/dwkim/commit/b47308070a1d79d23d05dd3f8bcda3cd3826b83b))
* **dwkim:** rollback version for npm release retry ([fbd37fb](https://github.com/domuk-k/dwkim/commit/fbd37fbb40afaacd7d832e9ef84716d5deca5d6a))
* **dwkim:** trigger release with markdown rendering fix ([2bd9827](https://github.com/domuk-k/dwkim/commit/2bd98276296a647e65f839bf3675d286e858e9f8))
* **persona-api:** handle short device ID and session ID in Discord notifications ([3ad836c](https://github.com/domuk-k/dwkim/commit/3ad836c728a5250c57309da2db37266038aecc4f))
* **persona-api:** improve Discord notification reliability and device ID display ([e636814](https://github.com/domuk-k/dwkim/commit/e6368140f830d9a1b2203070e99cea40de986bfd))
* resolve workflow failures and unreachable node error ([da17bc3](https://github.com/domuk-k/dwkim/commit/da17bc327a1293440fbf003f922cb8a9b9f6e90a))

### Refactoring

* apply YAGNI, naming consistency, and security improvements ([e1840b8](https://github.com/domuk-k/dwkim/commit/e1840b887bc652c8a9fe478d9bc00e1f16737464))
* **persona-api:** consolidate security into guardrails module ([2609374](https://github.com/domuk-k/dwkim/commit/260937457199714f592235407d2afc474d7fc566))
* **persona-api:** disable A2UI clarification and followup ([0799061](https://github.com/domuk-k/dwkim/commit/0799061cf9df0d7f46bd2de34092ff78cd7a85d9))
* **persona-api:** LangGraph best practices 적용 ([1d8e534](https://github.com/domuk-k/dwkim/commit/1d8e534bed26226dbd876cc4741cde8a3ddb6202))
* **persona-api:** migrate to LangGraph StateGraph architecture ([d25270c](https://github.com/domuk-k/dwkim/commit/d25270cdbfce0667a7757f0b6ad7598ea43a7137))

## [2.0.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.10.0...dwkim-v2.0.0) (2026-01-09)

### ⚠ BREAKING CHANGES

* Package manager changed from pnpm to Bun

### chore

* migrate monorepo to Bun + Biome ([2862d39](https://github.com/domuk-k/dwkim/commit/2862d394785a2dc2c92fe81aace95ffb0ef2c954))

### Features

* **dwkim:** add HITL feedback API client methods ([6510d65](https://github.com/domuk-k/dwkim/commit/6510d6577a80caff3db27537bf1ad54ab32ab55c))
* **persona-api:** add multi-model support with environment profiles ([ab3681f](https://github.com/domuk-k/dwkim/commit/ab3681f66e8555699c1a198f8b0a991bd3ca5a35))

### Bug Fixes

* **blog:** restore imports removed in Biome migration ([645c6b2](https://github.com/domuk-k/dwkim/commit/645c6b24d6e623e161ee1edc7b91f94c771f2aef))
* **blog:** use attribute selector for Shiki code block themes ([eb30e3d](https://github.com/domuk-k/dwkim/commit/eb30e3d3a0b6ec60a03c0275e2d4f0c7d56cdfee))
* **blog:** use bun instead of pnpm in vercel.json ([0cfad84](https://github.com/domuk-k/dwkim/commit/0cfad846392365574c923198ca1bc5230073a3fe))
* **dwkim:** postprocess markdown for bold/code in list items ([b473080](https://github.com/domuk-k/dwkim/commit/b47308070a1d79d23d05dd3f8bcda3cd3826b83b))
* **dwkim:** rollback version for npm release retry ([fbd37fb](https://github.com/domuk-k/dwkim/commit/fbd37fbb40afaacd7d832e9ef84716d5deca5d6a))
* **dwkim:** trigger release with markdown rendering fix ([2bd9827](https://github.com/domuk-k/dwkim/commit/2bd98276296a647e65f839bf3675d286e858e9f8))
* **persona-api:** handle short device ID and session ID in Discord notifications ([3ad836c](https://github.com/domuk-k/dwkim/commit/3ad836c728a5250c57309da2db37266038aecc4f))
* **persona-api:** improve Discord notification reliability and device ID display ([e636814](https://github.com/domuk-k/dwkim/commit/e6368140f830d9a1b2203070e99cea40de986bfd))
* resolve workflow failures and unreachable node error ([da17bc3](https://github.com/domuk-k/dwkim/commit/da17bc327a1293440fbf003f922cb8a9b9f6e90a))

### Refactoring

* apply YAGNI, naming consistency, and security improvements ([e1840b8](https://github.com/domuk-k/dwkim/commit/e1840b887bc652c8a9fe478d9bc00e1f16737464))
* **persona-api:** consolidate security into guardrails module ([2609374](https://github.com/domuk-k/dwkim/commit/260937457199714f592235407d2afc474d7fc566))
* **persona-api:** disable A2UI clarification and followup ([0799061](https://github.com/domuk-k/dwkim/commit/0799061cf9df0d7f46bd2de34092ff78cd7a85d9))
* **persona-api:** LangGraph best practices 적용 ([1d8e534](https://github.com/domuk-k/dwkim/commit/1d8e534bed26226dbd876cc4741cde8a3ddb6202))
* **persona-api:** migrate to LangGraph StateGraph architecture ([d25270c](https://github.com/domuk-k/dwkim/commit/d25270cdbfce0667a7757f0b6ad7598ea43a7137))

## [2.0.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.10.0...dwkim-v2.0.0) (2026-01-09)

### ⚠ BREAKING CHANGES

* Package manager changed from pnpm to Bun

### chore

* migrate monorepo to Bun + Biome ([2862d39](https://github.com/domuk-k/dwkim/commit/2862d394785a2dc2c92fe81aace95ffb0ef2c954))

### Features

* **dwkim:** add HITL feedback API client methods ([6510d65](https://github.com/domuk-k/dwkim/commit/6510d6577a80caff3db27537bf1ad54ab32ab55c))
* **persona-api:** add multi-model support with environment profiles ([ab3681f](https://github.com/domuk-k/dwkim/commit/ab3681f66e8555699c1a198f8b0a991bd3ca5a35))

### Bug Fixes

* **blog:** restore imports removed in Biome migration ([645c6b2](https://github.com/domuk-k/dwkim/commit/645c6b24d6e623e161ee1edc7b91f94c771f2aef))
* **blog:** use attribute selector for Shiki code block themes ([eb30e3d](https://github.com/domuk-k/dwkim/commit/eb30e3d3a0b6ec60a03c0275e2d4f0c7d56cdfee))
* **blog:** use bun instead of pnpm in vercel.json ([0cfad84](https://github.com/domuk-k/dwkim/commit/0cfad846392365574c923198ca1bc5230073a3fe))
* **dwkim:** postprocess markdown for bold/code in list items ([b473080](https://github.com/domuk-k/dwkim/commit/b47308070a1d79d23d05dd3f8bcda3cd3826b83b))
* **dwkim:** rollback version for npm release retry ([fbd37fb](https://github.com/domuk-k/dwkim/commit/fbd37fbb40afaacd7d832e9ef84716d5deca5d6a))
* **persona-api:** handle short device ID and session ID in Discord notifications ([3ad836c](https://github.com/domuk-k/dwkim/commit/3ad836c728a5250c57309da2db37266038aecc4f))
* **persona-api:** improve Discord notification reliability and device ID display ([e636814](https://github.com/domuk-k/dwkim/commit/e6368140f830d9a1b2203070e99cea40de986bfd))
* resolve workflow failures and unreachable node error ([da17bc3](https://github.com/domuk-k/dwkim/commit/da17bc327a1293440fbf003f922cb8a9b9f6e90a))

### Refactoring

* apply YAGNI, naming consistency, and security improvements ([e1840b8](https://github.com/domuk-k/dwkim/commit/e1840b887bc652c8a9fe478d9bc00e1f16737464))
* **persona-api:** consolidate security into guardrails module ([2609374](https://github.com/domuk-k/dwkim/commit/260937457199714f592235407d2afc474d7fc566))
* **persona-api:** disable A2UI clarification and followup ([0799061](https://github.com/domuk-k/dwkim/commit/0799061cf9df0d7f46bd2de34092ff78cd7a85d9))
* **persona-api:** LangGraph best practices 적용 ([1d8e534](https://github.com/domuk-k/dwkim/commit/1d8e534bed26226dbd876cc4741cde8a3ddb6202))
* **persona-api:** migrate to LangGraph StateGraph architecture ([d25270c](https://github.com/domuk-k/dwkim/commit/d25270cdbfce0667a7757f0b6ad7598ea43a7137))

## [2.0.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.10.0...dwkim-v2.0.0) (2026-01-09)

### ⚠ BREAKING CHANGES

* Package manager changed from pnpm to Bun

### chore

* migrate monorepo to Bun + Biome ([2862d39](https://github.com/domuk-k/dwkim/commit/2862d394785a2dc2c92fe81aace95ffb0ef2c954))

### Features

* **dwkim:** add HITL feedback API client methods ([6510d65](https://github.com/domuk-k/dwkim/commit/6510d6577a80caff3db27537bf1ad54ab32ab55c))
* **persona-api:** add multi-model support with environment profiles ([ab3681f](https://github.com/domuk-k/dwkim/commit/ab3681f66e8555699c1a198f8b0a991bd3ca5a35))

### Bug Fixes

* **blog:** restore imports removed in Biome migration ([645c6b2](https://github.com/domuk-k/dwkim/commit/645c6b24d6e623e161ee1edc7b91f94c771f2aef))
* **blog:** use attribute selector for Shiki code block themes ([eb30e3d](https://github.com/domuk-k/dwkim/commit/eb30e3d3a0b6ec60a03c0275e2d4f0c7d56cdfee))
* **blog:** use bun instead of pnpm in vercel.json ([0cfad84](https://github.com/domuk-k/dwkim/commit/0cfad846392365574c923198ca1bc5230073a3fe))
* **dwkim:** postprocess markdown for bold/code in list items ([b473080](https://github.com/domuk-k/dwkim/commit/b47308070a1d79d23d05dd3f8bcda3cd3826b83b))
* **persona-api:** handle short device ID and session ID in Discord notifications ([3ad836c](https://github.com/domuk-k/dwkim/commit/3ad836c728a5250c57309da2db37266038aecc4f))
* **persona-api:** improve Discord notification reliability and device ID display ([e636814](https://github.com/domuk-k/dwkim/commit/e6368140f830d9a1b2203070e99cea40de986bfd))
* resolve workflow failures and unreachable node error ([da17bc3](https://github.com/domuk-k/dwkim/commit/da17bc327a1293440fbf003f922cb8a9b9f6e90a))

### Refactoring

* apply YAGNI, naming consistency, and security improvements ([e1840b8](https://github.com/domuk-k/dwkim/commit/e1840b887bc652c8a9fe478d9bc00e1f16737464))
* **persona-api:** consolidate security into guardrails module ([2609374](https://github.com/domuk-k/dwkim/commit/260937457199714f592235407d2afc474d7fc566))
* **persona-api:** disable A2UI clarification and followup ([0799061](https://github.com/domuk-k/dwkim/commit/0799061cf9df0d7f46bd2de34092ff78cd7a85d9))
* **persona-api:** LangGraph best practices 적용 ([1d8e534](https://github.com/domuk-k/dwkim/commit/1d8e534bed26226dbd876cc4741cde8a3ddb6202))
* **persona-api:** migrate to LangGraph StateGraph architecture ([d25270c](https://github.com/domuk-k/dwkim/commit/d25270cdbfce0667a7757f0b6ad7598ea43a7137))

## [1.10.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.9.3...dwkim-v1.10.0) (2026-01-06)

### Features

* **dwkim:** add marked-terminal markdown renderer ([290b882](https://github.com/domuk-k/dwkim/commit/290b8823be9ab2a5c0a85d20647541c9efa541d0))
* **persona-api:** add multilingual response support ([f0a6536](https://github.com/domuk-k/dwkim/commit/f0a6536fdc99be564a928cfa3b189b8a954cec24))

### Bug Fixes

* **persona-api:** use 1st person perspective in system prompt ([6cbca87](https://github.com/domuk-k/dwkim/commit/6cbca875ca82a7f9f3bd9f6c565e0f5b7e0dd2fc))

### Refactoring

* **persona-api:** centralize config via validated env ([894c55f](https://github.com/domuk-k/dwkim/commit/894c55f726922a48437b6cee92a1657aa4d70ea9))
* **persona-api:** replace process.env with validated env config ([f1ee43e](https://github.com/domuk-k/dwkim/commit/f1ee43e022080e7e1c63de0bfdc3fd5b65e22d8d))

## [1.9.3](https://github.com/domuk-k/dwkim/compare/dwkim-v1.9.2...dwkim-v1.9.3) (2026-01-04)

### Bug Fixes

* **dwkim:** change email prompt hiding to session-based ([e1f6af5](https://github.com/domuk-k/dwkim/commit/e1f6af5e7dca7ef4517bc2820269e3522ef7bb74))
* **persona-api:** change MAX_SEARCH_RESULTS default from 5 to 10 ([97215b5](https://github.com/domuk-k/dwkim/commit/97215b52f161e833990be61456846c58eeb41b6f))

## [1.9.2](https://github.com/domuk-k/dwkim/compare/dwkim-v1.9.1...dwkim-v1.9.2) (2026-01-04)

### Refactoring

* **dwkim:** remove thinkingStep, use progress.detail ([54ac0db](https://github.com/domuk-k/dwkim/commit/54ac0db6fe5e3bc4db3f1dc954b56a7c54ba886a))
* **persona-api:** merge thinking events into progress items ([852728d](https://github.com/domuk-k/dwkim/commit/852728d9f1362b2c3ef0b77cbe58e33ab64420af))

## [1.9.1](https://github.com/domuk-k/dwkim/compare/dwkim-v1.9.0...dwkim-v1.9.1) (2026-01-04)

### Bug Fixes

* **dwkim:** 로딩 상태 중복 표시 수정 ([9502772](https://github.com/domuk-k/dwkim/commit/9502772cfae76114761eab3adb8b653c4db55d8e))

## [1.9.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.8.1...dwkim-v1.9.0) (2026-01-04)

### Features

* **dwkim:** 로딩 스피너 애니메이션 추가 ([a8dd1d9](https://github.com/domuk-k/dwkim/commit/a8dd1d971745e8e11782ac73d92a29e02e3c5301))
* **persona-api:** RAG 개선 및 Discord 알림 강화 ([560a288](https://github.com/domuk-k/dwkim/commit/560a2883a339a285ad655e7af9cbda7069b112f9))

## [1.8.1](https://github.com/domuk-k/dwkim/compare/dwkim-v1.8.0...dwkim-v1.8.1) (2026-01-04)

### Bug Fixes

* **dwkim:** simplify A2UI clarification UI to inline style ([54475b6](https://github.com/domuk-k/dwkim/commit/54475b65f4d8a2829669db20b95476627a7da44f))

## [1.8.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.7.0...dwkim-v1.8.0) (2026-01-03)

### Features

* **dwkim:** add clarification UI for ambiguous queries (A2UI) ([8bc0ded](https://github.com/domuk-k/dwkim/commit/8bc0ded6dd6a8d37470790fe6c36ae2ed0020727))

### Bug Fixes

* **persona-api:** fix A2UI contact suggestion and BM25 initialization ([d036f4f](https://github.com/domuk-k/dwkim/commit/d036f4f898170109800e543c40b44c45ead44200))

## [1.7.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.6.0...dwkim-v1.7.0) (2026-01-03)

### Features

* **dwkim:** add thinking/progress display for RAG streaming ([d4f5b7d](https://github.com/domuk-k/dwkim/commit/d4f5b7d5c030dc19a59d18b33fb46655db0b7116))
* **persona-api:** add graceful shutdown with memory data sync ([4190e31](https://github.com/domuk-k/dwkim/commit/4190e31e93056883cabce63334b29b919bf73078))
* **persona-api:** implement Hybrid Search with BM25 + Voyage RRF ([30f882c](https://github.com/domuk-k/dwkim/commit/30f882c8b35e90fdfb16be7eb781bc82aa12bf94))

### Bug Fixes

* **persona-api:** improve error handling with circuit breaker pattern ([97b798e](https://github.com/domuk-k/dwkim/commit/97b798ea459fd33290abc6ad8a29ec80683429d8))

## [1.6.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.5.0...dwkim-v1.6.0) (2026-01-02)

### Features

* **dwkim:** add markdown rendering for chat responses ([0a1ce83](https://github.com/domuk-k/dwkim/commit/0a1ce83dc66d3d5746f1c4dc1909f6f37ad94875))
* **persona-api:** add Query Rewriting, Device ID personalization, A2UI ([82e020e](https://github.com/domuk-k/dwkim/commit/82e020e17c1b3269a283cae3d3fed7467a724814))

## [1.5.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.4.0...dwkim-v1.5.0) (2026-01-02)

### Features

* **dwkim:** improve email prompt UX ([3edadcf](https://github.com/domuk-k/dwkim/commit/3edadcf01d052c2cf024ed5a3dc2c31a362ed011))

## [1.4.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.3.0...dwkim-v1.4.0) (2026-01-02)

### Features

* **dwkim:** update streaming event types ([895169b](https://github.com/domuk-k/dwkim/commit/895169baea8c6074cec20d3c1d4ae1b814cac1b7))

### Refactoring

* **persona-api:** apply IRedisClient abstraction to services ([6f11040](https://github.com/domuk-k/dwkim/commit/6f110408b4e8e4ee5843c9265bc63d3154899e4b))
* **persona-api:** DI pattern, type safety improvements ([c14c9c5](https://github.com/domuk-k/dwkim/commit/c14c9c59900c37bee8777c9ebf45b18d713efaa5))

## [1.3.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.2.0...dwkim-v1.3.0) (2026-01-01)

### Features

* **persona-api:** replace BGE-M3 with Voyage multilingual-2 ([e78ee5c](https://github.com/domuk-k/dwkim/commit/e78ee5c3dbadc17dd3b865da51676b87a43f2d69))

### Bug Fixes

* **dwkim:** include sessionId in contact endpoint request ([b457389](https://github.com/domuk-k/dwkim/commit/b4573892d0b590005c7162fd1710ffb57190fad0))

## [1.2.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.1.0...dwkim-v1.2.0) (2026-01-01)

### Features

* **dwkim:** add streaming abort with ESC key ([7b42248](https://github.com/domuk-k/dwkim/commit/7b42248ab3657291fcad88c7d65681447ac4d71e))
* **persona-api:** conversation memory with full history ([c5c863c](https://github.com/domuk-k/dwkim/commit/c5c863c9d7c854adf658bac694dcc08c38b2ce7c))

## [1.1.0](https://github.com/domuk-k/dwkim/compare/dwkim-v1.0.3...dwkim-v1.1.0) (2026-01-01)

### Features

* **blog:** add BSP parallel model post with callout support ([1942aa2](https://github.com/domuk-k/dwkim/commit/1942aa2e6537ff65ab80050278d0d0d116e9ccdd))
* **blog:** add Obsidian callout to HTML transform in sync-cogni ([a06dadb](https://github.com/domuk-k/dwkim/commit/a06dadb1e2db065928c29b16bb4c69b6f2869efc))
* **dwkim,persona-api:** add HITL email collection pattern ([b0c5ff7](https://github.com/domuk-k/dwkim/commit/b0c5ff702c14b039166f2f609012d66a3ee08660))

### Bug Fixes

* **blog:** correct pubDate for recent posts ([edfab43](https://github.com/domuk-k/dwkim/commit/edfab438b15faeb9e8b84a65c6752f04062c18db))

## [1.0.3](https://github.com/domuk-k/dwkim/compare/dwkim-v1.0.2...dwkim-v1.0.3) (2025-12-30)

### Bug Fixes

* **dwkim:** add repository field for npm provenance verification ([4bc615d](https://github.com/domuk-k/dwkim/commit/4bc615d2007b5e246902f9a0c7a91e6a6a09829b))

## [1.0.2](https://github.com/domuk-k/dwkim/compare/dwkim-v1.0.1...dwkim-v1.0.2) (2025-12-30)

### Bug Fixes

* **dwkim:** use @anolilab/semantic-release-pnpm for OIDC monorepo support ([e1507f4](https://github.com/domuk-k/dwkim/commit/e1507f41f498c8777d8aed7db6f1a3df629b1570))

## [1.0.1](https://github.com/domuk-k/dwkim/compare/dwkim-v1.0.0...dwkim-v1.0.1) (2025-12-30)

### Bug Fixes

* **dwkim:** enable NPM_CONFIG_PROVENANCE and simplify README ([078063e](https://github.com/domuk-k/dwkim/commit/078063e58f35b42c24877426e00ebd757d445cba))

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
