# Self-selling persona agent — design (thin validation slice)

> Status: design approved (brainstorm 2026-05-22), not yet planned/built.
> Scope: a **thin validation slice (Approach C)** — prove the product value cheaply on
> the current stack before any framework migration.

## Problem / vision

persona-api (and the dwkim CLI) today answers questions *about* 김동욱. The vision is to
expand it to **represent and sell** him — an agent that makes him memorable and credible
to his network, and converts the right visitors into conversations.

Priority of outcomes:
1. **Branding** (1st) — make 김동욱 memorable + credible to a broad technical network
   (blog readers, peers, devs); capture interest.
2. **Recruiter conversion** (2nd) — when a hiring-side visitor appears, convert to an
   interview / coffee chat.

## Principles (decided)

- **Grounded confidence, not hype.** A technical audience distrusts exaggeration; for a
  *branding* agent, faithfulness IS the brand. The agent frames strengths positively but
  only on claims supported by the notes. The eval's **faithfulness scorer guards this** —
  overselling = a measurable regression.
- **Framework-agnostic backend.** Mastra is NOT required. The repo already has the Vercel
  **AI SDK (`ai@^6`)** with native tool-calling + structured output, so the slice builds on
  the existing stack with zero migration. The backend stays behind the `runAgent` contract;
  LangGraph / Mastra / AI-SDK / "Hermes" are swappable parts chosen by *measured capability
  need*, not preference.
- **Validate before migrating.** Build cheap, measure engagement + conversion, and let the
  data decide whether a capability (e.g. Mastra working memory / semantic recall) is worth a
  migration. "Framework X makes it easy" is never the reason to build; product value is.

## Core mechanism: structured prompts ("AskUserQuestion-style")

The selling behaviors all run on the agent emitting **structured, interactive option
prompts** (chips) into the stream — not just prose. This is the slice's #1 build.

```
{ type: 'choice', prompt: '어떤 맥락에서 오셨어요?',
  options: ['개발자', '채용', '그냥 구경', '안 밝힘'] }
```

Used for: **identification** (visitor type), **guidance** (interest area), **conversion**
(coffee chat / leave email). The rendering half already exists — web **A2UI** (suggested
questions) and the CLI `suggestedQuestions` / `clarification` stream events. The missing
half is the agent *deciding when to ask and what options*, produced via **AI SDK structured
output (Zod schema)**.

## Interaction flow

1. **(Optional) identification** — a skippable chip ("어떤 맥락이세요?"). NOT a gate;
   answering is optional so it doesn't feel salesy (branding-first concern).
2. **Visitor-type inference + memory** — infer/remember the visitor type and interests across
   sessions (see Memory).
3. **Grounded-confident tailored advocacy** — answers framed for the visitor type
   (recruiter → hireable strengths + proof; peer → technical depth), grounded in the notes,
   with optional **guidance chips** to steer toward strong topics.
4. **Soft conversion** — recruiter → coffee-chat CTA + lead capture (reuse `contactService`);
   network → follow / return-visit nudge.

## Memory (lite first)

Reuse the existing **`deviceService` + Redis** to remember the identified visitor type +
inferred interests across sessions ("working-memory-lite"). Upgrade to Mastra working memory
(resource-scoped) **only if** this proves limiting — that becomes the measured trigger for
the migration question.

## Deep modules

- **Structured-prompt protocol/emitter** — typed `choice` events; extends the existing A2UI /
  suggestedQuestions stream protocol; produced via AI SDK structured output. The slice's
  spine.
- **Visitor context** — identify (from chip) + infer + remember (deviceService/Redis).
  Interface: `(deviceId, signals) → { type, interests, isReturning }`.
- **Advocacy framing** — builds the grounded, visitor-tailored prompt/instructions.
- **Conversion hooks** — emits CTA chips + captures leads (reuse `contactService`).

## Measurement (eval-first)

- Extend the golden dataset with **personalization / advocacy** cases (e.g. recruiter-type
  query → response emphasizes hireable strengths + offers coffee chat; returning visitor →
  remembers prior interest).
- Track **engagement** (did the visitor answer the identification/guidance chip?) and
  **conversion** (coffee-chat CTA taken / email captured).
- Faithfulness scorer continues to gate against hype.

## Out of scope (this slice)

- Full Mastra migration / Mastra working memory / semantic recall / observational memory.
- Multi-channel outreach (Slack / Discord / Telegram).
- Proactive / outbound selling (the agent reaching out unprompted).
- A redesign of the web/CLI rendering layer (reuse what exists).

## Open questions / risks

- **Identification friction** — even optional, asking "who are you" can read as salesy.
  Mitigation: skippable chip, light copy; measure drop-off.
- **Cost** — agentic structured-output adds calls; eval runs use Haiku (the prod model
  decision is separate).
- **Surface priority** — web (persona-api) is the primary surface for recruiters/network;
  the CLI (dwkim) is a dev-audience secondary. The slice targets web first.
