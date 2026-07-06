<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
    <img alt="dwkim - AI agent in your terminal" src="docs/assets/hero-dark.png" width="640">
  </picture>
</p>

<p align="center">
  <strong>Terminal persona agent + RAG backend + blog — one monorepo.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dwkim"><img src="https://img.shields.io/npm/v/dwkim?style=flat-square&color=cba6f7&labelColor=1e1e2e" alt="npm"></a>
  <a href="https://persona-api.fly.dev/health"><img src="https://img.shields.io/badge/api-live-a6e3a1?style=flat-square&labelColor=1e1e2e" alt="API"></a>
  <a href="https://domuk-k.vercel.app"><img src="https://img.shields.io/badge/site-domuk--k.vercel.app-89b4fa?style=flat-square&labelColor=1e1e2e" alt="Site"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-f5c2e7?style=flat-square&labelColor=1e1e2e" alt="License"></a>
</p>

---

## Quick start

```bash
npx dwkim
```

Profile card → ask anything about Dongwook. No install, no config.

---

## What is this?

**dwkim** is a production-shaped personal agent system — not a demo chatbot. Three packages, one workspace:

| Package | Role | Link |
|---------|------|------|
| [`dwkim`](./packages/dwkim) | Terminal UI (pi-tui, SSE streaming) | [npm](https://www.npmjs.com/package/dwkim) |
| [`persona-api`](./packages/persona-api) | LangGraph RAG backend | [Fly.io](https://persona-api.fly.dev) |
| [`blog`](./packages/blog) | Astro static site | [domuk-k.vercel.app](https://domuk-k.vercel.app) |

The CLI is the product surface; the API is where retrieval, rewriting, and generation live.

---

## Architecture

```
┌──────────────────────────────────────────┐
│  dwkim CLI (pi-tui, Catppuccin Mocha)    │
│  npx dwkim                               │
└──────────────────┬───────────────────────┘
                   │ SSE (AI SDK stream)
                   ▼
┌──────────────────────────────────────────┐
│  persona-api (Elysia + LangGraph)        │
│  classify → rewrite → search → generate  │
│  Hybrid RRF: Qdrant + BM25               │
│  OpenRouter · OpenAI embeddings          │
└──────────────────────────────────────────┘
```

**Stack:** Bun workspace · Biome · Husky · semantic-release · Fly.io · Vercel

---

## Develop

```bash
bun install
bun run dev      # all packages watch mode
bun run lint
bun test         # persona-api
```

Architecture deep-dive: [CLAUDE.md](./CLAUDE.md)

---

## Part of a larger stack

This repo is the **personal agent** slice of [domuk-k](https://github.com/domuk-k)'s open agent infrastructure:

| Project | Focus |
|---------|-------|
| [oh-my-workflow](https://github.com/domuk-k/oh-my-workflow) | Orchestrate coding-agent CLIs |
| [pubifact](https://github.com/domuk-k/pubifact) | Self-hosted artifact URLs |
| [c0](https://github.com/domuk-k/c0) | Generative UI protocol |
| [open-managed-agents](https://github.com/domuk-k/open-managed-agents) | Self-hosted managed agents |
| [build-your-own-agent](https://github.com/domuk-k/build-your-own-agent) | Learn agents from scratch |

---

## License

MIT