# Evalite as the eval harness

We run the persona-api eval harness on **Evalite** (Vitest-based) rather than Mastra's built-in scorers or plain `bun test`. The harness is agent-agnostic: it drives a thin `runAgent(query, history) → { answer, sources, tokens, ms }` adapter that the current LangGraph agent implements now and the Mastra agent will implement after migration, so the same dataset and scorers measure both.

## Considered Options

- **Mastra scorers** — rejected for S-C 0. Mastra is the migration *target*; using it to measure the migration *source* (today's LangGraph agent) creates a circular dependency and forces installing Mastra before we've decided to migrate. We can reuse the scorer *logic* inside Mastra later (S-C 2) without coupling the baseline to it.
- **Plain `bun test` + custom scorers** — no new deps and full control, but we'd hand-build the dataset loader, reporting, and watch ergonomics that Evalite gives for free.
- **Evalite** — purpose-built for eval-first development (dataset + scorers + watch UI + CI reporter), agent-agnostic, and decoupled from Mastra.

## Consequences

- Adds a Vitest-based dev dependency to a Bun workspace. Verify `evalite` runs cleanly under Bun (likely via `bunx evalite` / Node) before committing to it.
- Dataset format and scorer API now couple to Evalite — changing harness later means migrating the golden dataset.
