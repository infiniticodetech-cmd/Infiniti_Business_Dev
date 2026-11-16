import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
import { supabaseAdmin } from '@/lib/db/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authKey = req.headers.get('x-pipeline-key');
  if (!authKey || authKey !== env.PIPELINE_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const stats = body.stats || {};
  const status = body.status || 'succeeded';
  const error = body.error || null;

  try {
    const { error: updateError } = await (supabaseAdmin
      .from('agent_runs') as any)
      .update({
        status,
        finished_at: new Date().toISOString(),
        stats,
        error,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, run_id: id });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to finalize run', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
