import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/config/env';
import { orchestratePipeline } from '@/lib/pipeline/orchestrate';

const ingestSchema = z.object({
  run_id: z.string().uuid().optional(),
  bot_id: z.number().int().min(1).max(20),
  bot_category: z.enum(['website', 'mobile_app', 'custom_software', 'ai_solution', 'workflow_automation', 'other']).nullable().optional(),
  prompt_hint: z.string().optional(),
  include_keywords: z.array(z.string()).optional(),
  exclude_keywords: z.array(z.string()).optional(),
  exclude_url_patterns: z.array(z.string()).optional(),
  source_reliability_score: z.number().min(0).max(100).optional(),
  dry_run: z.boolean().default(false),
  candidates: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().optional(),
        snippet: z.string().optional(),
        text: z.string().nullable().optional(),
        text_origin: z.enum(['fetch', 'feed']).default('fetch'),
        published_at: z.string().nullable().optional(),
        source_id: z.string().uuid().optional(),
      })
    )
    .max(env.MAX_CANDIDATES_PER_RUN),
});

export async function POST(req: NextRequest) {
  // 1. Verify Pipeline Service Key (Rule C13)
  const authKey = req.headers.get('x-pipeline-key');
  if (!authKey || authKey !== env.PIPELINE_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing x-pipeline-key' },
      { status: 401 }
    );
  }

  // 2. Parse & Validate Request Body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const parseResult = ingestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid ingest payload schema', details: parseResult.error.format() },
      { status: 422 }
    );
  }

  try {
    const response = await orchestratePipeline(parseResult.data);
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Pipeline orchestration failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
