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
