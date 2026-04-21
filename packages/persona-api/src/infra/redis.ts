import { Database } from 'bun:sqlite'
import { and, asc, eq, gte, lte, notInArray, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

type DB = ReturnType<typeof drizzle<typeof schema>>

/**
 * Key-Value store interface (historically Redis-shaped).
 *
 * Backing: bun:sqlite via Drizzle ORM (zero-dep runtime, in-process).
 * Path from KV_DB_PATH env, default `:memory:`.
 */
export interface IRedisClient {
  // Basic operations
  get(key: string): Promise<string | null>
  setex(key: string, seconds: number, value: string): Promise<void>
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
  del(key: string): Promise<void>
  ttl(key: string): Promise<number>
  keys(pattern: string): Promise<string[]>

  // List operations
  lpush(key: string, ...values: string[]): Promise<number>
  lrange(key: string, start: number, stop: number): Promise<string[]>
  ltrim(key: string, start: number, stop: number): Promise<void>

  // Set operations
  sismember(key: string, member: string): Promise<number>
  sadd(key: string, member: string): Promise<number>
  srem(key: string, member: string): Promise<number>

  // Hash operations
  hget(key: string, field: string): Promise<string | null>
  hset(key: string, field: string, value: string): Promise<number>
  hgetall(key: string): Promise<Record<string, string> | null>
  hincrby(key: string, field: string, increment: number): Promise<number>

  // Sorted set operations
  zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]>
  zrange(key: string, start: number, stop: number, ...args: string[]): Promise<string[]>
  zadd(key: string, score: number, member: string): Promise<number>

  // Connection
  quit(): Promise<void>
}

function ensureSchema(sqlite: Database) {
  sqlite.run('PRAGMA journal_mode = WAL')
  sqlite.run('PRAGMA synchronous = NORMAL')
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at INTEGER
    )
  `)
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS lists (
      key TEXT NOT NULL,
      position INTEGER NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (key, position)
    )
  `)
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS sets (
      key TEXT NOT NULL,
      member TEXT NOT NULL,
      PRIMARY KEY (key, member)
    )
  `)
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS hashes (
      key TEXT NOT NULL,
      field TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (key, field)
    )
  `)
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS sorted_sets (
      key TEXT NOT NULL,
      member TEXT NOT NULL,
      score REAL NOT NULL,
      PRIMARY KEY (key, member)
    )
  `)
}

// ─────────────────────────────────────────────────────────────
// Drizzle (bun:sqlite) implementation
// ─────────────────────────────────────────────────────────────
export class SqliteClient implements IRedisClient {
  private sqlite: Database
  private db: DB

  constructor(path: string = ':memory:') {
    this.sqlite = new Database(path, { create: true })
    ensureSchema(this.sqlite)
    this.db = drizzle(this.sqlite, { schema })
  }

  // ─── Basic ops ──────────────────────────────────────────────
  async get(key: string): Promise<string | null> {
    const [row] = this.db
      .select({ value: schema.kv.value, expiresAt: schema.kv.expiresAt })
      .from(schema.kv)
      .where(eq(schema.kv.key, key))
      .all()
    if (!row) return null
    if (row.expiresAt != null && row.expiresAt < Date.now()) {
      this.db.delete(schema.kv).where(eq(schema.kv.key, key)).run()
      return null
    }
    return row.value
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    const expiresAt = Date.now() + seconds * 1000
    this.db
      .insert(schema.kv)
      .values({ key, value, expiresAt })
      .onConflictDoUpdate({
        target: schema.kv.key,
        set: { value, expiresAt }
      })
      .run()
  }

  async incr(key: string): Promise<number> {
    const now = Date.now()
    const [row] = this.db
      .select({ value: schema.kv.value, expiresAt: schema.kv.expiresAt })
      .from(schema.kv)
      .where(eq(schema.kv.key, key))
      .all()
    const expired = row?.expiresAt != null && row.expiresAt < now
    const current = row && !expired ? parseInt(row.value, 10) || 0 : 0
    const next = current + 1
    const keepExpiry = expired ? null : (row?.expiresAt ?? null)
    this.db
      .insert(schema.kv)
      .values({ key, value: String(next), expiresAt: keepExpiry })
      .onConflictDoUpdate({
        target: schema.kv.key,
        set: { value: String(next), expiresAt: keepExpiry }
      })
      .run()
    return next
  }

  async expire(key: string, seconds: number): Promise<void> {
    this.db
      .update(schema.kv)
      .set({ expiresAt: Date.now() + seconds * 1000 })
      .where(eq(schema.kv.key, key))
      .run()
  }

  async del(key: string): Promise<void> {
    this.sqlite.transaction(() => {
      this.db.delete(schema.kv).where(eq(schema.kv.key, key)).run()
      this.db.delete(schema.lists).where(eq(schema.lists.key, key)).run()
      this.db.delete(schema.sets).where(eq(schema.sets.key, key)).run()
      this.db.delete(schema.hashes).where(eq(schema.hashes.key, key)).run()
      this.db.delete(schema.sortedSets).where(eq(schema.sortedSets.key, key)).run()
    })()
  }

  async ttl(key: string): Promise<number> {
    const [row] = this.db
      .select({ expiresAt: schema.kv.expiresAt })
      .from(schema.kv)
      .where(eq(schema.kv.key, key))
      .all()
    if (!row) return -2
    if (row.expiresAt == null) return -1
    const remaining = Math.ceil((row.expiresAt - Date.now()) / 1000)
    return remaining > 0 ? remaining : -2
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`)
    const rows = [
      ...this.db.selectDistinct({ key: schema.kv.key }).from(schema.kv).all(),
      ...this.db.selectDistinct({ key: schema.lists.key }).from(schema.lists).all(),
      ...this.db.selectDistinct({ key: schema.sets.key }).from(schema.sets).all(),
      ...this.db.selectDistinct({ key: schema.hashes.key }).from(schema.hashes).all(),
      ...this.db.selectDistinct({ key: schema.sortedSets.key }).from(schema.sortedSets).all()
    ]
    return [...new Set(rows.map((r) => r.key))].filter((k) => regex.test(k))
  }

  // ─── Lists ──────────────────────────────────────────────────
  async lpush(key: string, ...values: string[]): Promise<number> {
    const [minRow] = this.db
      .select({ min: sql<number | null>`MIN(${schema.lists.position})` })
      .from(schema.lists)
      .where(eq(schema.lists.key, key))
      .all()
    let pos = (minRow?.min ?? 1) - 1
    this.sqlite.transaction(() => {
      for (const v of values) {
        this.db.insert(schema.lists).values({ key, position: pos, value: v }).run()
        pos -= 1
      }
    })()
    const [countRow] = this.db
      .select({ c: sql<number>`COUNT(*)` })
      .from(schema.lists)
      .where(eq(schema.lists.key, key))
      .all()
    return countRow?.c ?? 0
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const rows = this.db
      .select({ value: schema.lists.value })
      .from(schema.lists)
      .where(eq(schema.lists.key, key))
      .orderBy(asc(schema.lists.position))
      .all()
    const len = rows.length
    const s = start < 0 ? Math.max(0, len + start) : start
    const e = stop < 0 ? len + stop : stop
    return rows.slice(s, e + 1).map((r) => r.value)
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const rows = this.db
      .select({ position: schema.lists.position })
      .from(schema.lists)
      .where(eq(schema.lists.key, key))
      .orderBy(asc(schema.lists.position))
      .all()
    const len = rows.length
    const s = start < 0 ? Math.max(0, len + start) : start
    const e = stop < 0 ? len + stop : stop
    const keep = rows.slice(s, e + 1).map((r) => r.position)
    if (keep.length === 0) {
      this.db.delete(schema.lists).where(eq(schema.lists.key, key)).run()
      return
    }
    this.db
      .delete(schema.lists)
      .where(and(eq(schema.lists.key, key), notInArray(schema.lists.position, keep)))
      .run()
  }

  // ─── Sets ───────────────────────────────────────────────────
  async sismember(key: string, member: string): Promise<number> {
    const [row] = this.db
      .select({ c: sql<number>`COUNT(*)` })
      .from(schema.sets)
      .where(and(eq(schema.sets.key, key), eq(schema.sets.member, member)))
      .all()
    return row?.c ? 1 : 0
  }

  async sadd(key: string, member: string): Promise<number> {
    const existed = await this.sismember(key, member)
    if (existed) return 0
    this.db.insert(schema.sets).values({ key, member }).run()
    return 1
  }

  async srem(key: string, member: string): Promise<number> {
    const existed = await this.sismember(key, member)
    if (!existed) return 0
    this.db
      .delete(schema.sets)
      .where(and(eq(schema.sets.key, key), eq(schema.sets.member, member)))
      .run()
    return 1
  }

  // ─── Hashes ─────────────────────────────────────────────────
  async hget(key: string, field: string): Promise<string | null> {
    const [row] = this.db
      .select({ value: schema.hashes.value })
      .from(schema.hashes)
      .where(and(eq(schema.hashes.key, key), eq(schema.hashes.field, field)))
      .all()
    return row?.value ?? null
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const existing = await this.hget(key, field)
    this.db
      .insert(schema.hashes)
      .values({ key, field, value })
      .onConflictDoUpdate({
        target: [schema.hashes.key, schema.hashes.field],
        set: { value }
      })
      .run()
    return existing === null ? 1 : 0
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const rows = this.db
      .select({ field: schema.hashes.field, value: schema.hashes.value })
      .from(schema.hashes)
      .where(eq(schema.hashes.key, key))
      .all()
    if (rows.length === 0) return null
    return Object.fromEntries(rows.map((r) => [r.field, r.value]))
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const current = await this.hget(key, field)
    const next = (parseInt(current ?? '0', 10) || 0) + increment
    this.db
      .insert(schema.hashes)
      .values({ key, field, value: String(next) })
      .onConflictDoUpdate({
        target: [schema.hashes.key, schema.hashes.field],
        set: { value: String(next) }
      })
      .run()
    return next
  }

  // ─── Sorted sets ────────────────────────────────────────────
  async zrangebyscore(key: string, min: string | number, max: string | number): Promise<string[]> {
    const minScore = min === '-inf' ? -Infinity : typeof min === 'string' ? parseFloat(min) : min
    const maxScore = max === '+inf' ? Infinity : typeof max === 'string' ? parseFloat(max) : max
    const rows = this.db
      .select({ member: schema.sortedSets.member })
      .from(schema.sortedSets)
      .where(
        and(
          eq(schema.sortedSets.key, key),
          gte(schema.sortedSets.score, minScore),
          lte(schema.sortedSets.score, maxScore)
        )
      )
      .orderBy(asc(schema.sortedSets.score))
      .all()
    return rows.map((r) => r.member)
  }

  async zrange(key: string, start: number, stop: number, ...args: string[]): Promise<string[]> {
    const rows = this.db
      .select({ member: schema.sortedSets.member, score: schema.sortedSets.score })
      .from(schema.sortedSets)
      .where(eq(schema.sortedSets.key, key))
      .orderBy(asc(schema.sortedSets.score))
      .all()
    const len = rows.length
    const s = start < 0 ? Math.max(0, len + start) : start
    const e = stop < 0 ? len + stop : stop
    const sliced = rows.slice(s, e + 1)
    if (args.includes('WITHSCORES')) {
      return sliced.flatMap((r) => [r.member, String(r.score)])
    }
    return sliced.map((r) => r.member)
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    const [existing] = this.db
      .select({ c: sql<number>`COUNT(*)` })
      .from(schema.sortedSets)
      .where(and(eq(schema.sortedSets.key, key), eq(schema.sortedSets.member, member)))
      .all()
    this.db
      .insert(schema.sortedSets)
      .values({ key, member, score })
      .onConflictDoUpdate({
        target: [schema.sortedSets.key, schema.sortedSets.member],
        set: { score }
      })
      .run()
    return existing?.c ? 0 : 1
  }

  async quit(): Promise<void> {
    this.sqlite.close()
  }
}

/**
 * Factory. bun:sqlite + Drizzle. Path from KV_DB_PATH env, default `:memory:`.
 * The `url` parameter is ignored; kept for backwards compatibility with the
 * previous Redis-shaped signature.
 */
export function createRedisClient(_url?: string): IRedisClient {
  const path = process.env.KV_DB_PATH || ':memory:'
  console.log(`📦 Using bun:sqlite (Drizzle) KV store (${path})`)
  return new SqliteClient(path)
}
