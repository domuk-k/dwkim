# Baseline eval as before/after evidence, not a release gate

The LangGraph→Mastra migration is **learning-driven** (the goal is Mastra proficiency, not a product need). We still measure a golden-dataset baseline on the current agent *before* migrating — but as **evidence for a credible before/after story**, not as a CI gate that blocks the migration. Nothing about the migration is gated on the eval; the eval informs and documents it.

This supersedes the original "strict parity gate" framing (per-metric floor, hallucination hard-stop, mean−1σ pass/fail, parity/aspirational tagging). That machinery is product-release rigor we don't need for a learning project.

## What we keep, and why

- **Baseline capture** — run the current agent at temperature 0 a few times, commit the outputs as fixtures and the scores as a snapshot. This is the "before" half of the story.
- **Metric definitions** — faithfulness, relevance, aggregate token cost (latency advisory). The dimensions we report on.
- **Agent-agnostic adapter** — `runAgent(query, history) → { answer, sources, tokens, ms }`, implemented by LangGraph now and Mastra later. This is what makes the comparison apples-to-apples; without it the before/after is not credible.
- A small golden set (~5–10 cases) is enough; it is a learning target and evidence sample, not an exhaustive safety net.

## What makes the story trustworthy (not marketing)

1. **Freeze before touching Mastra** — git-commit the baseline before any Mastra code, so history proves the goalposts didn't move.
2. **Pre-register the reported metrics** — decide what to report before building, so results can't be cherry-picked after.
3. **Report regressions too** — "faithfulness up, latency up, here's the trade-off" is a senior story; "everything improved" is not believed.

## Consequences

- No blocking CI gate; the eval is run on-demand and its output is documentation.
- If baseline quality is already good, expect the honest story to be "equal quality + less custom orchestration + Studio observability," not a quality uplift. Don't bet the narrative on an uplift that may not materialize.
