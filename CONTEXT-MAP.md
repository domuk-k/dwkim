# Context Map

This is a multi-context Bun workspace monorepo. Each package is its own bounded context with its own domain language. Per-package `CONTEXT.md` files are created lazily by `/grill-with-docs` as terms get resolved — read whichever ones are relevant to the topic at hand.

| Context | Path | What it is |
| --- | --- | --- |
| dwkim CLI | `packages/dwkim/CONTEXT.md` | Terminal personal agent (pi-tui TUI, state machine, SSE streaming) |
| persona-api | `packages/persona-api/CONTEXT.md` | Personal AI agent backend (RAG pipeline, search, personalization) |
| blog | `packages/blog/CONTEXT.md` | Astro static blog (content collections, custom plugins) |

System-wide architectural decisions live in `docs/adr/`. Context-scoped decisions live in `packages/<pkg>/docs/adr/`.

See `docs/agents/domain.md` for how the engineering skills consume these.
