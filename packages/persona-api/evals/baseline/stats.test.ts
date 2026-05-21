import { describe, expect, it } from 'bun:test'
import { summarize } from './stats'

describe('summarize', () => {
  it('computes mean, population stddev, min, max', () => {
    const s = summarize([2, 4, 4, 4, 5, 5, 7, 9])
    expect(s.n).toBe(8)
    expect(s.mean).toBe(5)
    expect(s.stddev).toBe(2) // population σ of this classic set
    expect(s.min).toBe(2)
    expect(s.max).toBe(9)
  })

  it('reports ~zero stddev for identical values (ideal temp=0 case)', () => {
    const s = summarize([0.8, 0.8, 0.8])
    expect(s.mean).toBeCloseTo(0.8)
    expect(s.stddev).toBeCloseTo(0, 10)
  })

  it('handles the empty set', () => {
    expect(summarize([])).toEqual({ n: 0, mean: 0, stddev: 0, min: 0, max: 0 })
  })
})
