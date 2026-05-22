/**
 * DeviceService — visitor profile 단위 테스트 (Module C, Slice 1 #27)
 *
 * 테스트 범위:
 * - setVisitorType 후 getVisitorContext가 visitorType을 반환 (persist+reload)
 * - 미식별 device → type undefined, isReturning false
 *
 * in-memory SqliteClient(IRedisClient)로 실제 hash ops 왕복 — mock 불필요.
 */

import { SqliteClient } from '../infra/redis'
import { DeviceService } from '../services/deviceService'

const VALID_ID = '12345678-1234-4234-8234-123456789abc'

describe('DeviceService — visitor profile', () => {
  let svc: DeviceService

  beforeEach(() => {
    svc = new DeviceService(new SqliteClient(':memory:'))
  })

  it('setVisitorType 후 getVisitorContext가 그 type을 반환한다', async () => {
    await svc.setVisitorType(VALID_ID, 'recruiter')

    const ctx = await svc.getVisitorContext(VALID_ID)

    expect(ctx.type).toBe('recruiter')
  })

  it('미식별 device는 type undefined, isReturning false', async () => {
    const ctx = await svc.getVisitorContext(VALID_ID)

    expect(ctx.type).toBeUndefined()
    expect(ctx.isReturning).toBe(false)
  })
})
