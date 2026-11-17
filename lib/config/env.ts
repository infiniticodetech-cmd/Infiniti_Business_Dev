import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://gwgzxdsqrubbjvsbdnix.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Z3p4ZHNxcnViYmp2c2Jkbml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MTEzODksImV4cCI6MjExMDM4NzM4OX0.Pk46L2tGy4S-M0_D21L4kvVrUYafi-_9QrmFYch4jTM'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Z3p4ZHNxcnViYmp2c2Jkbml4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDgxMTM4OSwiZXhwIjoyMTEwMzg3Mzg5fQ.AohoABDx6Ud4PkFopJN3ibpWfRfg5sC-Vi8QWQ8KHfA'),

  // External tender discovery
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  // Pipeline auth
  PIPELINE_API_KEY: z.string().min(16).default('infiniti_secret_pipeline_api_key_2026_mvp'),

  // AI Configuration
  AI_PROVIDER: z.enum(['ollama', 'openai']).default('openai'),
  AI_TASK_ROUTING: z
    .string()
    .default('{"analyze_opportunity":{"provider":"openai","model":"gpt-4o-mini"}}'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_TIMEOUT_MS: z.coerce.number().default(60000),

  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:7b-instruct'),
  OLLAMA_NUM_CTX: z.coerce.number().default(4096),
  OLLAMA_TIMEOUT_MS: z.coerce.number().default(120000),

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
