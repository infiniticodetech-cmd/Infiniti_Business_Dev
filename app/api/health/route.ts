import { NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
import { OllamaProvider } from '@/lib/ai/ollama.provider';
import { supabaseAdmin } from '@/lib/db/admin';

export async function GET() {
  const startTime = Date.now();
  
  // 1. Check Ollama
  const ollamaProvider = new OllamaProvider();
  const ollamaHealth = await ollamaProvider.healthCheck(env.OLLAMA_MODEL);

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

  const overallOk = ollamaHealth.ok && supabaseOk;

  return NextResponse.json(
    {
      status: overallOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      version: '0.1.0-mvp',
      services: {
        ai: {
          provider: env.AI_PROVIDER,
          model: env.OLLAMA_MODEL,
          healthy: ollamaHealth.ok,
          detail: ollamaHealth.detail,
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
