import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const kv = sqliteTable('kv', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at')
})

export const lists = sqliteTable(
  'lists',
  {
    key: text('key').notNull(),
    position: integer('position').notNull(),
    value: text('value').notNull()
  },
  (t) => [primaryKey({ columns: [t.key, t.position] })]
)

export const sets = sqliteTable(
  'sets',
  {
    key: text('key').notNull(),
    member: text('member').notNull()
  },
  (t) => [primaryKey({ columns: [t.key, t.member] })]
)

export const hashes = sqliteTable(
  'hashes',
  {
    key: text('key').notNull(),
    field: text('field').notNull(),
    value: text('value').notNull()
  },
  (t) => [primaryKey({ columns: [t.key, t.field] })]
)

export const sortedSets = sqliteTable(
  'sorted_sets',
  {
    key: text('key').notNull(),
    member: text('member').notNull(),
    score: real('score').notNull()
  },
  (t) => [primaryKey({ columns: [t.key, t.member] })]
)
