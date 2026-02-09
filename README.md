<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/hero-light.png">
    <img alt="dwkim - AI agent in your terminal" src="docs/assets/hero-dark.png" width="640">
  </picture>
</p>

<p align="center">
  <strong>Talk to Kim Dongwook's AI agent — right in your terminal.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dwkim"><img src="https://img.shields.io/npm/v/dwkim?style=flat-square&color=cba6f7&labelColor=1e1e2e" alt="npm"></a>
  <a href="https://persona-api.fly.dev/health"><img src="https://img.shields.io/badge/api-live-a6e3a1?style=flat-square&labelColor=1e1e2e" alt="API Status"></a>
  <a href="https://dwkim.net"><img src="https://img.shields.io/badge/blog-dwkim.net-89b4fa?style=flat-square&labelColor=1e1e2e" alt="Blog"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-f5c2e7?style=flat-square&labelColor=1e1e2e" alt="License"></a>
</p>

---

## Quick Start

```bash
npx dwkim
```

That's it. Profile card appears, then ask anything about Dongwook.

## What is this?

A production AI agent system built as a monorepo — CLI frontend, RAG backend, and blog:

| Package | Description | Links |
|---------|-------------|-------|
| [`dwkim`](./packages/dwkim) | TUI personal agent | [![npm](https://img.shields.io/npm/v/dwkim?style=flat-square&labelColor=1e1e2e)](https://www.npmjs.com/package/dwkim) |
| [`persona-api`](./packages/persona-api) | RAG + LangGraph backend | [persona-api.fly.dev](https://persona-api.fly.dev) |
| [`blog`](./packages/blog) | Astro static blog | [dwkim.net](https://dwkim.net) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  dwkim CLI (pi-tui)                                         │
│  State Machine · SSE Streaming · Catppuccin Mocha           │
│  npx dwkim                                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ SSE (AI SDK Data Stream Protocol)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  persona-api (Elysia + LangGraph)          Fly.io · nrt     │
│                                                             │
│  classify → rewrite → search → analyze → generate → done   │
│                          │                                  │
│              ┌───────────┴───────────┐                      │
│              │  Hybrid Search (RRF)  │                      │
│              │  Qdrant + BM25        │                      │
│              └───────────────────────┘                      │
│                                                             │
│  OpenRouter (Gemini 2.0 Flash) · OpenAI Embeddings          │
│  SEU Uncertainty · Query Rewriting · Device Personalization │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

**CLI** — pi-tui (differential rendering), chalk, marked-terminal, esbuild
**API** — Elysia, LangGraph, Qdrant, BM25, Redis, Pino + Logtail
**Blog** — Astro 5, Content Collections, KaTeX, Mermaid
**Infra** — Bun workspace, Biome, Husky, Fly.io, Vercel, semantic-release

## Development

```bash
# Requirements: Bun (https://bun.sh)
bun install
bun run dev          # All packages in watch mode
bun run lint         # Biome check
bun test             # persona-api tests
```

See [CLAUDE.md](./CLAUDE.md) for full architecture docs and commands.

## License

MIT
