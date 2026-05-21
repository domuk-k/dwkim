# persona-api

The personal AI agent backend that answers questions about 김동욱, grounded in his own notes. A RAG pipeline (search → generate) wrapped in a streaming API. This context is being migrated to Mastra under an eval-first strangler, so the eval vocabulary below is first-class domain language, not test scaffolding.

## Language

### Core

**Persona agent**:
The system-under-test: the pipeline that turns a visitor's question into a grounded answer about 김동욱.
_Avoid_: bot, assistant, chatbot.

**Note**:
A single Markdown file in `~/.cogni/notes/` tagged for a public surface. The source of truth (SSOT). Authored by hand, not by the agent.
_Avoid_: doc, document (those mean the indexed unit, below).

**Document**:
A chunk of a **Note** as it lives in the search index, with a stable `id` of the form `{source}_{note-slug}_{chunkIndex}` (e.g. `cogni_moc-workflow-studio-insights_0`). One Note produces one or more Documents.
_Avoid_: chunk, passage (use Document).

**Source**:
A **Document** that the search step retrieved for a given query and that grounds the answer. "Sources" in the API response are retrieved Documents.
_Avoid_: citation, reference, result.

### Eval

**Golden case**:
One labeled evaluation example: a `query` plus its quality labels (assertions and a judge rubric) and a `branch` (which pipeline path it exercises). The unit the eval scores. Scorers are selected by `branch` — a simple fast-path case is scored deterministically (did it return the canned response?), not by the judge.
_Avoid_: test case, sample, example.

**Golden dataset**:
The curated set of **Golden cases** that defines what "a good persona agent" means. The contract the strangler migration must preserve.
_Avoid_: test set, eval set, benchmark.

**Assertion**:
A deterministic, reproducible check on an answer's **observable output** (answer text + retrieved Sources) — `must_include` (required facts present), `must_not_include` (banned/hallucinated claims absent), or `expected_source_ids` (the right **Documents** were retrieved). Pass/fail, no LLM. Assertions never probe internal pipeline state (e.g. which node fired, the rewritten query) — that would couple the eval to one orchestration framework and break agent-agnosticism.
_Avoid_: check, rule, expectation.

**Faithfulness**:
The degree to which an answer makes only claims supported by its retrieved **Sources** — i.e. no fabrication beyond the grounding. Scored 0–1 by an LLM judge.
_Avoid_: groundedness, accuracy (accuracy conflates this with relevance).

**Relevance**:
The degree to which an answer actually addresses the `query`. Scored 0–1 by an LLM judge. Distinct from **Faithfulness**: an answer can be faithful to its sources yet not answer the question.

**LLM-as-judge**:
The model that scores the soft dimensions (**Faithfulness**, **Relevance**) of an answer against a per-case rubric, used where deterministic **Assertions** can't reach.
_Avoid_: grader, evaluator (use judge).

**Baseline**:
A committed snapshot of the current LangGraph agent's scores + output fixtures over the **Golden dataset**, captured at temperature 0 before any Mastra code is written. The "before" half of the migration's before/after comparison. It is evidence, not a release gate — the migration is not blocked on it. See ADR-0002.
_Avoid_: eval parity, parity gate (this project does not gate the migration on the eval).

## Flagged ambiguities

- **Source ID stability**: `expected_source_ids` assertions reference chunk-level Document IDs derived from a Note's slug. Re-chunking or renaming a Note shifts the IDs and silently invalidates those assertions. Treat `expected_source_ids` as coupled to the indexing scheme, not to the Note's content.

## Example dialogue

> **Dev:** When the eval fails on `expected_source_ids`, does that mean the answer was wrong?
> **Domain expert:** No — that's an Assertion about retrieval. It means the search step didn't return the Documents we expected to ground the answer. The answer could still read fine. Faithfulness and Relevance are judged separately on the prose.
> **Dev:** And if I re-chunk that Note?
> **Domain expert:** Then the Document IDs change and the Assertion breaks even though nothing about quality changed. That's why source-ID assertions are the brittle ones — they're coupled to the index, not the Note.
