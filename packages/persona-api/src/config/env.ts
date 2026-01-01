import { z } from 'zod';

const envSchema = z
  .object({
    // Required
    VOYAGE_API_KEY: z.string().min(1, 'VOYAGE_API_KEY is required'),

    // LLM (at least one required)
    GOOGLE_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().optional(),

    // Vector Store
    QDRANT_URL: z.string().url().optional(),
    QDRANT_API_KEY: z.string().optional(),
    USE_VECTOR_STORE: z.string().optional(),
    MOCK_MODE: z.string().optional(),

    // Redis
    REDIS_URL: z.string().optional(),

    // Discord
    DISCORD_WEBHOOK_URL: z.string().url().optional(),

    // Server
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // CORS
    ALLOWED_ORIGINS: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_MAX: z.coerce.number().default(50),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

    // RAG Engine
    MAX_SEARCH_RESULTS: z.coerce.number().default(5),
    CONTEXT_WINDOW: z.coerce.number().default(4000),
    SYSTEM_PROMPT: z.string().optional(),

    // Feature Flags
    USE_DEEP_AGENT: z.enum(['0', '1']).default('0'),

    // API Host
    API_HOST: z.string().default('localhost:3000'),

    // NPM (optional, set by package.json)
    npm_package_version: z.string().optional(),
  })
  .refine(
    (data) => data.GOOGLE_API_KEY || data.GEMINI_API_KEY || data.OPENROUTER_API_KEY,
    {
      message: 'At least one LLM API key is required (GOOGLE_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY)',
    }
  );

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

export const env = validateEnv();
