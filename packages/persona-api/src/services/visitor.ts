/**
 * Visitor model — schema-first (leaf module).
 *
 * 방문자 유형 + 맥락. deviceService(working-memory-lite)가 채우고,
 * elicitationPolicy / framing이 읽는다.
 */

import { z } from 'zod'

export const visitorTypeSchema = z.enum(['developer', 'recruiter', 'browsing', 'undisclosed'])

export type VisitorType = z.infer<typeof visitorTypeSchema>

export interface VisitorContext {
  type?: VisitorType
  interests: string[]
  isReturning: boolean
}
