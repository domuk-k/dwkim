/**
 * LLM-as-judge scorers — Faithfulness + Relevance (slice domuk-k/dwkim#21).
 *
 * Scores the soft dimensions an Assertion can't reach:
 * - Faithfulness: the answer makes only claims supported by its retrieved Sources.
 * - Relevance: the answer actually addresses the query.
 *
 * Per ADR-0002 the judge is a DISTINCT strong model (Claude) — different from the
 * Gemini generator — at temperature 0, and it sees the query + answer + the retrieved
 * Sources' content + the per-case rubric, so Faithfulness is scored against the
 * actual grounding (not the judge's own world knowledge).
 *
 * The judge call is dependency-injected (`JudgeFn`) so the scorers are unit-testable
 * with a fake — no real LLM calls in tests. A default real `JudgeFn`
 * (`realJudgeFn`) wires the prompt-builder to the codebase's existing LLM layer.
 *
 * @see packages/persona-api/CONTEXT.md — "Faithfulness", "Relevance", "LLM-as-judge", "Source"
 * @see docs/adr/0002-eval-first-strangler-parity-gate.md — judge config (distinct model, temp 0, rubric)
 * @see node_modules/evalite/dist/types.d.ts — Evalite.ScorerOpts shape
 */

import { LLMService } from '../../src/services/llmService'
import type { Document } from '../../src/services/vectorStore'
import type { AgentInput, AgentOutput } from '../adapters/runAgent'

// ─────────────────────────────────────────────────────────────
// Per-case rubric (the eval's `expected` for judged cases)
// ─────────────────────────────────────────────────────────────

/** The judge-relevant slice of a Golden case's `expected`. */
export interface JudgeExpected {
  /** Free-text guidance the judge applies on top of the generic Faithfulness/Relevance definitions. */
  rubric?: string
}

// ─────────────────────────────────────────────────────────────
// Injected judge contract
// ─────────────────────────────────────────────────────────────

export interface JudgeArgs {
  query: string
  answer: string
  /** The retrieved Sources that ground the answer. */
  sources: Document[]
  /** Optional per-case rubric. */
  rubric?: string
}

export interface JudgeScores {
  faithfulness: number
  relevance: number
}

/**
 * The injected judge. Returns BOTH dimensions from a single call so the two
 * scorers don't each pay for a judge invocation per case.
 */
export type JudgeFn = (args: JudgeArgs) => Promise<JudgeScores>

// ─────────────────────────────────────────────────────────────
// Scorer factory
// ─────────────────────────────────────────────────────────────

/** What Evalite hands each scorer for a judged case. */
type JudgeScoreInput = {
  input: AgentInput
  output: AgentOutput
  expected?: JudgeExpected
}

/** An Evalite-compatible scorer (matches `Evalite.ScorerOpts`). */
export interface EvaliteScorer {
  name: string
  description?: string
  scorer: (input: JudgeScoreInput) => Promise<{ score: number; metadata?: unknown }>
}

/**
 * Build the `faithfulness` and `relevance` scorers from an injected `JudgeFn`.
 *
 * Both scorers share ONE judge call per case via a per-case memo keyed on the
 * output object — so adding both to an Evalite `scorers` array costs one judge
 * invocation per case, not two. (Evalite runs scorers for the same result with
 * the same `output` reference, so the WeakMap key is stable within a case.)
 */
export function makeJudgeScorers(judge: JudgeFn): {
  faithfulness: EvaliteScorer
  relevance: EvaliteScorer
} {
  // Memoize the judge result per (output) so the two scorers don't double-call.
  const cache = new WeakMap<object, Promise<JudgeScores>>()

  const getScores = (input: JudgeScoreInput): Promise<JudgeScores> => {
    const cached = cache.get(input.output)
    if (cached) return cached
    const promise = judge({
      query: input.input.query,
      answer: input.output.answer,
      sources: input.output.sources,
      rubric: input.expected?.rubric
    })
    cache.set(input.output, promise)
    return promise
  }

  return {
    faithfulness: {
      name: 'faithfulness',
      description: 'Answer makes only claims supported by retrieved Sources (LLM-as-judge, 0–1).',
      scorer: async (input) => {
        const { faithfulness } = await getScores(input)
        return { score: faithfulness }
      }
    },
    relevance: {
      name: 'relevance',
      description: 'Answer actually addresses the query (LLM-as-judge, 0–1).',
      scorer: async (input) => {
        const { relevance } = await getScores(input)
        return { score: relevance }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Default real JudgeFn — prompt-builder + Claude via existing LLM layer
// ─────────────────────────────────────────────────────────────

/**
 * The judge model. A distinct strong model from the Gemini generator to avoid
 * self-preference bias (ADR-0002). Overridable via env for cost control.
 */
export const JUDGE_MODEL = process.env.LLM_JUDGE_MODEL || 'anthropic/claude-sonnet-4'

/**
 * Build the judge prompt. Embeds the query, the answer under test, every retrieved
 * Source's content, and the per-case rubric. Exported so it can be unit-tested in
 * isolation (no LLM call).
 */
export function buildJudgePrompt(args: JudgeArgs): string {
  const sourcesBlock =
    args.sources.length > 0
      ? args.sources
          .map((s, i) => {
            const title = s.metadata?.title ? ` (${s.metadata.title})` : ''
            return `[Source ${i + 1}] id=${s.id}${title}\n${s.content}`
          })
          .join('\n\n')
      : '(no sources were retrieved)'

  const rubricBlock = args.rubric
    ? `\n\nPER-CASE RUBRIC (apply on top of the definitions above):\n${args.rubric}`
    : ''

  return `You are an impartial evaluator (LLM-as-judge) scoring an AI agent's answer.

Score TWO dimensions, each from 0.0 to 1.0:

- "faithfulness": the degree to which the ANSWER makes only claims SUPPORTED BY THE SOURCES below. Penalize any fabrication, invented facts, dates, numbers, or company names that are not grounded in the sources. An answer that says "I don't know" rather than guessing is faithful. Judge ONLY against the sources, not your own world knowledge.
- "relevance": the degree to which the ANSWER actually addresses the QUERY. An answer can be faithful to its sources yet fail to answer the question — score relevance independently.${rubricBlock}

QUERY:
${args.query}

RETRIEVED SOURCES (the only valid grounding for faithfulness):
${sourcesBlock}

ANSWER UNDER EVALUATION:
${args.answer}

Respond with ONLY a JSON object, no prose, no markdown fences:
{"faithfulness": <number 0..1>, "relevance": <number 0..1>}`
}

/** Clamp to [0, 1]; non-finite or non-number → 0. */
function clamp01(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * Defensively parse the judge model's text into `{ faithfulness, relevance }`.
 * Tolerates markdown fences and surrounding prose by extracting the first JSON
 * object. Exported for unit testing.
 */
export function parseJudgeResponse(raw: string): JudgeScores {
  const fallback: JudgeScores = { faithfulness: 0, relevance: 0 }
  if (!raw || typeof raw !== 'string') return fallback

  // Strip markdown code fences if present.
  const stripped = raw.replace(/```(?:json)?/gi, '').trim()

  // Extract the first {...} block to survive leading/trailing prose.
  const match = stripped.match(/\{[\s\S]*\}/)
  const candidate = match ? match[0] : stripped

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>
    return {
      faithfulness: clamp01(parsed.faithfulness),
      relevance: clamp01(parsed.relevance)
    }
  } catch {
    return fallback
  }
}

/**
 * Default real judge: calls a Claude model via the codebase's existing
 * `LLMService` (OpenRouter) at temperature 0, then parses the JSON response.
 *
 * Lazily constructed so importing this module never spins up an LLM client
 * (keeps test imports side-effect-free).
 */
let judgeLLM: LLMService | null = null
function getJudgeLLM(): LLMService {
  if (!judgeLLM) {
    judgeLLM = new LLMService({ purpose: 'generation', model: JUDGE_MODEL })
  }
  return judgeLLM
}

export const realJudgeFn: JudgeFn = async (args) => {
  const prompt = buildJudgePrompt(args)
  const res = await getJudgeLLM().chat([{ role: 'user', content: prompt }], undefined, {
    temperature: 0
  })
  if (res.isError) return { faithfulness: 0, relevance: 0 }
  return parseJudgeResponse(res.content)
}
