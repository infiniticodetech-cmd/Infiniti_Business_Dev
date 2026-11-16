import { NextResponse } from 'next/server';
import { resolve } from '@/lib/ai/registry';
import { supabaseAdmin } from '@/lib/db/admin';

export async function GET() {
  const startTime = Date.now();
  
  // 1. Check active AI Provider (OpenAI or Ollama dynamically)
  const { provider, model } = resolve('analyze_opportunity');
  let aiHealth: { ok: boolean; detail?: string };
  try {
    aiHealth = await provider.healthCheck(model);
  } catch (err) {
    aiHealth = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }

  // 2. Check Supabase
  let supabaseOk = false;
  let supabaseDetail = '';
  try {
    const { data, error } = await supabaseAdmin.from('bots').select('id').limit(1);
    if (error) {
      supabaseDetail = error.message;
    } else {
      supabaseOk = true;
      supabaseDetail = `Connected. Found ${data ? data.length : 0} bots query response.`;
    }
  } catch (err) {
    supabaseDetail = err instanceof Error ? err.message : String(err);
  }

  const overallOk = aiHealth.ok && supabaseOk;

  return NextResponse.json(
    {
      status: overallOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      version: '0.1.0-mvp',
      services: {
        ai: {
          provider: provider.name,
          model: model,
          healthy: aiHealth.ok,
          detail: aiHealth.detail,
        },
        database: {
          healthy: supabaseOk,
          detail: supabaseDetail,
        },
      },
      compliance: {
        automatedOutreach: 'DISABLED_BY_DESIGN',
        publicDataOnly: true,
        factsVsHypothesesSeparation: true,
      },
    },
    { status: overallOk ? 200 : 207 }
  );
}
