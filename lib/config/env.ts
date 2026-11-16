import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('dummy_anon_key_for_testing'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('dummy_service_role_key_for_testing'),

  // Pipeline auth
  PIPELINE_API_KEY: z.string().min(16).default('infiniti_secret_pipeline_api_key_2026_mvp'),

  // AI Configuration
  AI_PROVIDER: z.enum(['ollama', 'openai']).default('ollama'),
  AI_TASK_ROUTING: z
    .string()
    .default('{"analyze_opportunity":{"provider":"ollama","model":"qwen2.5:7b-instruct"}}'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:7b-instruct'),
  OLLAMA_NUM_CTX: z.coerce.number().default(4096),
  OLLAMA_TIMEOUT_MS: z.coerce.number().default(120000),

  // Optional OpenAI (prepared for future)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),

  // Volume & caps
  AI_MAX_CALLS_PER_RUN: z.coerce.number().default(40),
  AI_MAX_CALLS_PER_DAY: z.coerce.number().default(120),
  MAX_CANDIDATES_PER_RUN: z.coerce.number().default(25),
  RECHECK_DAYS: z.coerce.number().default(14),
  MAX_SOURCE_AGE_DAYS: z.coerce.number().default(180),

  // Compliance & Fetch Policy
  USER_AGENT: z.string().min(10).default('InfinitiCodeTechResearchBot/0.1 (+https://infiniticodetech.com/contact)'),
  FETCH_TIMEOUT_MS: z.coerce.number().default(15000),
  FETCH_MAX_BYTES: z.coerce.number().default(1500000),
  FETCH_MIN_INTERVAL_MS: z.coerce.number().default(2000),
  FETCH_MAX_REDIRECTS: z.coerce.number().default(3),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = getEnv();
