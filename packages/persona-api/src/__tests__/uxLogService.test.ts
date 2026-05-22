/**
 * UXLogService — elicitation engagement 로깅 단위 테스트 (Slice 1 #27)
 *
 * 테스트 범위:
 * - logElicitation('shown')이 올바른 엔트리를 circular buffer에 쌓는다
 * - logElicitation('answered')가 value(visitorType)를 포함한다
 *
 * ADR-0003: day 1부터 engagement 로깅 — 데이터가 initiative ladder를 결정한다.
 * in-memory SqliteClient(IRedisClient)로 실제 list ops 왕복 — mock 불필요.
 */

import { SqliteClient } from '../infra/redis'
import type { ElicitationLogEntry } from '../services/uxLogService'
import { UXLogService } from '../services/uxLogService'

const ELICITATION_LOG_KEY = 'persona:elicitation_logs'

describe('UXLogService — logElicitation', () => {
  let redis: SqliteClient
  let svc: UXLogService

  beforeEach(() => {
    redis = new SqliteClient(':memory:')
    svc = new UXLogService(redis)
  })

  async function readEntries(): Promise<ElicitationLogEntry[]> {
    const raw = await redis.lrange(ELICITATION_LOG_KEY, 0, -1)
    return raw.map((r) => JSON.parse(r) as ElicitationLogEntry)
  }

  it("'shown' 이벤트를 intent와 함께 기록한다", async () => {
    await svc.logElicitation({
      deviceId: 'dev-1',
      sessionId: 'sess-1',
      intent: 'identify',
      event: 'shown'
    })

    const entries = await readEntries()
    expect(entries.length).toBe(1)
    expect(entries[0].event).toBe('shown')
    expect(entries[0].intent).toBe('identify')
    expect(entries[0].deviceId).toBe('dev-1')
    expect(entries[0].sessionId).toBe('sess-1')
    expect(entries[0].value).toBeUndefined()
    expect(entries[0].timestamp).toBeTruthy()
  })

  it("'answered' 이벤트는 선택한 value(visitorType)를 포함한다", async () => {
    await svc.logElicitation({
      deviceId: 'dev-2',
      sessionId: 'sess-2',
      intent: 'identify',
      event: 'answered',
      value: 'recruiter'
    })

    const entries = await readEntries()
    expect(entries.length).toBe(1)
    expect(entries[0].event).toBe('answered')
    expect(entries[0].value).toBe('recruiter')
  })

  it('deviceId 없이도 기록한다 (anonymous)', async () => {
    await svc.logElicitation({
      sessionId: 'sess-3',
      intent: 'identify',
      event: 'shown'
    })

    const entries = await readEntries()
    expect(entries.length).toBe(1)
    expect(entries[0].deviceId).toBeUndefined()
    expect(entries[0].sessionId).toBe('sess-3')
  })
})
