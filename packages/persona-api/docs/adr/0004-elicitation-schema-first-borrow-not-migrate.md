# Elicitation: borrow the schema-first pattern, not the framework

The "selling prompt" (구조화된 옵션 chip) is the agent asking the visitor for structured input. Open question raised mid-build: hand-rolling this felt like reinventing a wheel. Consulted Mastra docs + the wider ecosystem to check for an established best practice.

## What the field calls this

- **MCP Elicitation** — server requests user input mid-session, validated via JSON Schema.
- **Mastra suspend/resume** — a tool/step declares `suspendSchema` (what it emits when it needs input) + `resumeSchema` (what comes back); `suspend()` pauses, stream emits `tool-call-suspended`, `resumeStream(data)` resumes.
- **AG-UI** — event-driven Agent↔User interaction protocol.

All three are the same pattern: **schema-validated human-in-the-loop elicitation**.

## Decision

**Adopt the pattern's discipline (schema-first elicitation), stay on the current stack. Do not migrate.**

- Rename to the field's vocabulary: `choice` → **`elicitation`** (joins the existing `clarification`/`escalation`/`followup` event family). `Asker`/`decideChoice` → `elicitationPolicy`/`decideElicitation`.
- **Zod schema is the SSOT** (`elicitationSchema`). Types derive via `z.infer`; boundaries (AI SDK adapter, CLI parser) `.parse()` to validate — this kills drift across the wiring points instead of maintaining N hand-written interfaces. Mirrors Mastra `suspendSchema` / MCP elicitation schema.

## Why this and not a migration

- **Policy stays hand-written everywhere.** Mastra's suspend/resume is *transport*; *when/what to ask* is still your `if (!resumeData) suspend(...)` code. So `decideElicitation` is not reinventing the framework — it's inherent. This validates ADR-0003 (rule-held initiative).
- **The protocol pain is solvable on the current stack.** Schema-first elicitation needs no framework; AI SDK structured output covers Rung 2 if/when data justifies climbing.
- **Migration trigger is unchanged: working memory, not this.** The eval showed Mastra = flat quality + ~2× cost. The only measured reason to migrate remains cross-session **working memory** (visitor model, Module C) — not the elicitation protocol.

## Consequences

- Slice 1 ships `elicitation.ts` (Zod SSOT) + `elicitationPolicy.ts` (rules) + `visitor.ts`. No framework dep added.
- `RAGStreamEvent`/`CustomDataPart`/CLI `StreamEvent`/`AgentOutput` gain an `elicitation` member, all typed off the one schema.
- Web rendering of elicitations may later use a generative-UI API (Thesys C1, free tier) — parked, out of Slice 1 scope.
- ADR-0003's `choice` references read as `elicitation`; PRD #26 + issues #27–30 use the old vocabulary until reconciled.
