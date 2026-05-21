# persona-api evals

Eval-first harness for the LangGraph → Mastra migration. Measures answer quality
(faithfulness, relevance), assertions, and cost over a small golden dataset, and
produces a credible **before/after** report. The eval is evidence, **not a release
gate** — see `docs/adr/0002-*`. Vocabulary: `../CONTEXT.md`.

## Layout

```
evals/
├── adapters/        runAgent contract; langGraph (runAgent.ts) + mastra (mastraAgent.ts) impls
├── golden/          golden dataset (cases.ts) + branch→scorer selection (select.ts)
├── scorers/         assertions (deterministic) + judge (LLM faithfulness/relevance)
├── baseline/        capture runner, stats, compare, committed snapshots + fixtures, STORY.md
└── tsconfig.json    ES2022 (Bun-run); separate from the prod build's ES2020 tsconfig
```

## Prerequisites

`packages/persona-api/.env` with `OPENROUTER_API_KEY` (generation + judge both use
`anthropic/claude-sonnet-4` via OpenRouter), `GOOGLE_API_KEY`, and the `LANGFUSE_*`
keys. Search is local BM25 (`data/searchIndex.json`, committed) — no API.

> **Cost**: every command below except `bun test` makes real LLM calls billed to the
> OpenRouter key. A full before/after (`baseline` + `baseline:mastra`) is ~150 calls.

## Commands

| Command | What it does | Cost |
| --- | --- | --- |
| `bun test evals/` | Unit tests: scorers, golden schema, contract, stats | none |
| `bun run eval` | Evalite **watch UI** (interactive, opens a local dashboard) | LLM |
| `bun run eval:run` | Evalite once → terminal table | LLM |
| `bun run eval:export` | Static **HTML report** → `eval-report/index.html` | none (reads last run) |
| `bun run baseline` | Capture LangGraph **"before"** (temp=0) → `baseline/snapshot.json` + `fixtures/` | LLM |
| `bun run baseline:mastra` | Capture Mastra **"after"** → `baseline/snapshot-mastra.json` + `fixtures-mastra/` | LLM |
| `bun run eval:compare` | Print **before/after** table from the two snapshots | none |

Knobs: `BASELINE_RUNS=5` (runs per case, default 3), `BASELINE_LIMIT=2` (cap cases,
for smoke runs), `LLM_JUDGE_MODEL=...` (override the judge), `MASTRA_DEBUG=1`.

## End-to-end: produce a before/after report

```bash
cd packages/persona-api
bun test evals/                 # 1. sanity: scorers/contract green (no cost)
bun run baseline                # 2. freeze the "before" (LangGraph), commit it
bun run baseline:mastra         # 3. run the "after" (Mastra)
bun run eval:compare            # 4. before/after table
bun run eval:export             # 5. (optional) HTML report of Evalite runs
```

Result artifacts:
- **`baseline/STORY.md`** — the written, honest before/after narrative (read this).
- **`baseline/snapshot.json` / `snapshot-mastra.json`** — per-case mean ± σ scores.
- **`baseline/fixtures*/`** — raw agent outputs (re-score without re-calling the agent).
- **`eval-report/`** — static Evalite HTML dashboard (gitignored).

## Credibility notes (read before quoting numbers)

- The judge (`claude-sonnet-4`) shares a family with both generators → absolute scores
  are likely inflated, but equally on both sides, so the *relative* comparison holds.
  Use a neutral `LLM_JUDGE_MODEL` to tighten absolutes.
- LangGraph runs at temp=0; the Mastra agent runs at its model default (non-zero σ).
- Freeze the baseline (`snapshot.json`) and commit it **before** changing the agent,
  so the before/after can't be accused of moving the goalposts.
