import { describe, expect, test } from 'bun:test'
import { getDeviceId } from '../../utils/deviceId.js'

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('getDeviceId', () => {
  test('returns a valid UUID v4 format string', () => {
    const id = getDeviceId()
    expect(id).toMatch(UUID_V4_REGEX)
  })

  test('returns the same ID on subsequent calls (idempotent)', () => {
    const id1 = getDeviceId()
    const id2 = getDeviceId()
    expect(id1).toBe(id2)
  })

  test('returns a non-empty string', () => {
    const id = getDeviceId()
    expect(id.length).toBeGreaterThan(0)
  })
})
