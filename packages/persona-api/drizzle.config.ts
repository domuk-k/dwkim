/// <reference types="node" />
import type { Config } from 'drizzle-kit'

/**
 * Drizzle config for schema introspection and (optional) migrations.
 *
 * Runtime uses in-memory SQLite by default — migrations only matter
 * when KV_DB_PATH points at a persistent file (e.g. mounted Fly volume).
 */
export default {
  schema: './src/infra/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.KV_DB_PATH || ':memory:'
  }
} satisfies Config
