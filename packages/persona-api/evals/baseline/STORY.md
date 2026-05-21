# LangGraph → Mastra: before/after

Slice domuk-k/dwkim#25. Both agents ran the same 6-case golden dataset, used the
same model (`anthropic/claude-sonnet-4` via OpenRouter), and were scored by the same
judge — so the relative comparison isolates orchestration, not the model.

| case | assert | faithfulness | relevance | halluc | tokens |
| --- | --- | --- | --- | --- | --- |
| greeting | 1.00→1.00 | — | — | 0%→0% | **0→5980** |
| tech-stack | 1.00→1.00 | 1.00→0.92 | 1.00→0.97 | 0%→0% | 2486→7182 |
| hackathon | 1.00→1.00 | 1.00→0.93 | 1.00→1.00 | 0%→0% | 3423→6249 |
| cogni-stack-followup (multi-turn) | 0.00→0.00 | 0.90→0.90 | **0.70→0.90** | 0%→0% | 3274→6875 |
| contact-email | 1.00→1.00 | 1.00→1.00 | 1.00→1.00 | 0%→0% | 3242→7448 |
| blood-type (out-of-scope) | 1.00→1.00 | — | 1.00→1.00 | 0%→0% | 3344→4324 |

## What actually happened (not "everything improved")

**The one win we targeted — partial.** The multi-turn follow-up (cogni) was the
baseline's weak spot (relevance 0.70). Mastra's conversational handling lifted it to
**0.90** — the answer is more on-point. But the assertion still fails (0/1): the
"Claude Agent SDK" fact still isn't surfaced. The retrieval miss persists. Memory
helped *relevance*, not *fact recall* — fixing that needs better retrieval/reranking,
not conversation memory.

**A small quality regression.** Faithfulness dipped on two cases (tech-stack
1.00→0.92, hackathon 1.00→0.93). Mastra's agentic answers elaborate a little more and
the judge docked them slightly. Within judge noise, but real and reported.

**A clear cost regression.** Token cost roughly doubled on RAG cases (agentic
tool-calling = two LLM round-trips vs the single-shot, context-pre-injected LangGraph
path). The starkest case: **greeting went 0 → ~5,980 tokens** — LangGraph has a
fast-path that answers "안녕" with no LLM call; Mastra runs the full agent + tool + LLM
for every input. This is fixable (add routing/a fast-path in Mastra) but is not done
in this slice.

**No hallucination either way.** Both refuse the out-of-scope blood-type question.

## Honest conclusion

This migration did **not** raise quality. It traded a single-shot pipeline for an
agentic one: roughly flat quality (one multi-turn relevance win, a small faithfulness
dip), no new hallucination, and ~2× the token cost — plus a large cost regression on
trivial inputs from losing the fast-path. The credible reasons to continue toward
Mastra are not in these numbers; they are the things this eval does not measure: less
custom orchestration code, Studio observability, and built-in Memory/Tools to build on.

## Caveats

- **Conditions not perfectly matched**: LangGraph ran at temperature 0; the Mastra
  agent ran at its default temperature (visible as non-zero σ, e.g. cogni faithfulness
  0.90±0.14). Baseline n=5, Mastra n=3.
- **Judge self-preference**: the judge (`claude-sonnet-4`) is the same family as both
  generators, so absolute scores are likely inflated — but equally on both sides, so
  the *relative* comparison holds. A neutral judge would tighten the absolute numbers.
- **Fast-path**: the greeting cost gap is an artifact of not porting the fast-path,
  not an inherent Mastra cost.
