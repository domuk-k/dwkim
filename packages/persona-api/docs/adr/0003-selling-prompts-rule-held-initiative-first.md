# Selling prompts: rule-held initiative first, model initiative only when measured

The persona agent is gaining "selling" behavior — it emits structured option chips (`choice` events) to identify the visitor, steer toward strong topics, and offer a CTA. Open question: who decides *when* to emit a chip and *what* the options are — our code, or the model?

Decision: **start with code-held (rule-based) initiative. Hand initiative to the model only as engagement data justifies it.**

## The initiative ladder

- **Rung 1 — rules (this slice).** Code decides: turn-1 identify chip, CTA on N-turn engagement. Deterministic, cheap, golden-case-testable.
- **Rung 2 — single structured object.** One `streamObject({ answer, choice? })` call; model fills `choice` when useful. One call, schema-constrained.
- **Rung 3 — model tool-calling.** Model holds an `askChoice` tool, decides mid-stream. Most flexible, least predictable.

Climb only when the lower rung is proven limiting. Data (engagement/conversion) moves us up — never "the framework makes it easy."

## Why rule-first

- **Measurable.** "Why did it ask there?" must be answerable as a golden-case assertion. Model-held initiative is non-deterministic → hard to eval.
- **Cheap.** Rung 1 adds no extra LLM call.
- **Trust.** Branding-first product: an over-eager agent repels. Code can encode "stay quiet by default"; a model left to its own initiative tends to over-ask.

## What holds at every rung

- **`choice` is a new event type, not reused `clarification`.** Existing `clarification`/`followup` carry a flat `string[]`. A choice option needs `value ≠ label` — `label` for the human, `value` (e.g. `'recruiter'`) feeds the visitor profile + framing. Reusing the flat event loses the value.
- **Measured on observable output.** `AgentOutput` gains optional `choices[]` so golden cases can assert chip behavior — still observable output, no internal pipeline state, so the agent-agnostic contract (ADR-0002) holds.
- **Faithfulness is the guardrail.** Selling = framing true facts for the listener, never inflating. Overselling is a faithfulness regression (CONTEXT.md: Faithfulness).

## Consequences

- Slice 1 ships rules + the protocol; no structured-output LLM call yet.
- *When* to climb to Rung 2/3 is itself a future, data-backed call — log engagement from day 1.
- If rules suffice for branding goals, Rung 3 may never be needed. A valid outcome, not a shortfall.
