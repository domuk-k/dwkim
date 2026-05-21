/**
 * Baseline statistics (slice domuk-k/dwkim#23).
 *
 * The Baseline runs each Golden case N times at temperature 0; these summarise
 * the per-metric distribution so the before/after story can quote mean ± σ and
 * derive a tolerance from observed noise. Population σ (not sample) — we're
 * describing the N observed runs, not inferring a wider population.
 */

export interface Summary {
  n: number
  mean: number
  stddev: number
  min: number
  max: number
}

export function summarize(values: number[]): Summary {
  const n = values.length
  if (n === 0) return { n: 0, mean: 0, stddev: 0, min: 0, max: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  return {
    n,
    mean,
    stddev: Math.sqrt(variance),
    min: Math.min(...values),
    max: Math.max(...values)
  }
}
