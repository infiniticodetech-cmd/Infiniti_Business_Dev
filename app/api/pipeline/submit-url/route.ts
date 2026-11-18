import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { orchestratePipeline } from '@/lib/pipeline/orchestrate';
import { env } from '@/lib/config/env';
const submitSchema = z.object({
  url: z.string().url(),
  bot_id: z.number().int().min(1).max(20).default(1),
  dry_run: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const authKey = req.headers.get('x-pipeline-key');

  if (!authKey || authKey !== env.PIPELINE_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing x-pipeline-key' },
      { status: 401 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid URL submission', details: parsed.error.format() },
      { status: 422 }
    );
  }

  const { url, bot_id, dry_run } = parsed.data;

  try {
    const response = await orchestratePipeline({
      bot_id,
      dry_run,
      candidates: [
        {
          url,
          text_origin: 'fetch',
        },
      ],
    });

    const result = response.results[0];
    return NextResponse.json({
      success: true,
      result,
      stats: response.stats,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Pipeline processing error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
