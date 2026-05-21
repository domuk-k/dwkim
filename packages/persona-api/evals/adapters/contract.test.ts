/**
 * runAgent contract test (planned in #19/#22, was missing).
 *
 * Both adapters are typed `RunAgent` so the contract is enforced at compile time.
 * This adds a RUNTIME check that both actually PRODUCED contract-conforming output,
 * using the committed baseline fixtures (langgraph) and mastra fixtures — so it runs
 * with no LLM calls and proves the before/after compared like-shaped outputs.
 */

import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const BASELINE_DIR = join(import.meta.dir, '../baseline')

function runRecords(fixturesDir: string): Array<Record<string, unknown>> {
  const dir = join(BASELINE_DIR, fixturesDir)
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap(
      (f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).runs as Array<Record<string, unknown>>
    )
}

const ADAPTERS: Array<[string, string]> = [
  ['langgraph', 'fixtures'],
  ['mastra', 'fixtures-mastra']
]

describe('runAgent contract — both adapters produce the same output shape', () => {
  for (const [adapter, dir] of ADAPTERS) {
    it(`${adapter} outputs conform to { answer, sources, tokens, ms }`, () => {
      const runs = runRecords(dir)
      expect(runs.length).toBeGreaterThan(0)
      for (const r of runs) {
        expect(typeof r.answer).toBe('string')
        expect(Array.isArray(r.sourceIds)).toBe(true)
        expect(typeof r.tokens).toBe('number')
        expect(r.tokens as number).toBeGreaterThanOrEqual(0)
        expect(typeof r.ms).toBe('number')
        expect(r.ms as number).toBeGreaterThanOrEqual(0)
      }
    })
  }
})
