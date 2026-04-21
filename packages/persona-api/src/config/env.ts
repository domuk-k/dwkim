import { z } from 'zod'

const envSchema = z
  .object({
    // LLM (at least one required)
    GOOGLE_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),

    // LLM Model Configuration (optional overrides)
    // If not set, uses MODEL_PROFILES based on NODE_ENV
    LLM_GENERATION_MODEL: z.string().optional(), // User-facing responses (e.g., anthropic/claude-sonnet-4)
    LLM_UTILITY_MODEL: z.string().optional(), // Internal processing (e.g., google/gemini-2.5-flash-lite)

    /** @deprecated Use LLM_GENERATION_MODEL instead */
    OPENROUTER_MODEL: z.string().optional(),

    // OpenAI (for embeddings)
    OPENAI_API_KEY: z.string().optional(),

    // Search
    MOCK_MODE: z.string().optional(),

    // KV store (bun:sqlite). Path, default :memory:.
    KV_DB_PATH: z.string().optional(),

    // Discord
    DISCORD_WEBHOOK_URL: z.string().url().optional(),

    // Server
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    LOGTAIL_TOKEN: z.string().optional(),

    // CORS
    ALLOWED_ORIGINS: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_MAX: z.coerce.number().default(50),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

    // RAG Engine
    MAX_SEARCH_RESULTS: z.coerce.number().default(10),
    CONTEXT_WINDOW: z.coerce.number().default(4000),
    SYSTEM_PROMPT: z.string().optional(),

    // Feature Flags
    ENABLE_SEU: z.enum(['true', 'false']).default('true'),

    // API Host
    API_HOST: z.string().default('localhost:3000'),

    // NPM (optional, set by package.json)
    npm_package_version: z.string().optional(),

    // Langfuse (LLM Observability)
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_BASE_URL: z.string().url().optional(),

    // Admin API Key (for logs endpoint)
    ADMIN_API_KEY: z.string().optional()
  })
  .refine(
    (data) =>
      process.env.NODE_ENV === 'test' ||
      data.GOOGLE_API_KEY ||
      data.GEMINI_API_KEY ||
      data.OPENROUTER_API_KEY,
    {
      message:
        'At least one LLM API key is required (GOOGLE_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY)'
    }
  )

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('Environment validation failed:')
    console.error(result.error.format())
    throw new Error('Invalid environment configuration')
  }

  // 설정 요약 로그 (민감 정보 제외)
  console.log('=== Configuration Summary ===')
  console.log(`NODE_ENV: ${result.data.NODE_ENV}`)
  console.log(`SEARCH: local BM25 (searchIndex.json)`)
  console.log(`MAX_SEARCH_RESULTS: ${result.data.MAX_SEARCH_RESULTS}`)
  console.log(`CONTEXT_WINDOW: ${result.data.CONTEXT_WINDOW}`)
  console.log(`RATE_LIMIT_MAX: ${result.data.RATE_LIMIT_MAX}`)
  console.log(`LOG_LEVEL: ${result.data.LOG_LEVEL}`)
  console.log(`LANGFUSE: ${result.data.LANGFUSE_PUBLIC_KEY ? 'ENABLED' : 'DISABLED'}`)
  console.log('=============================')

  return result.data
}

export const env = validateEnv()
