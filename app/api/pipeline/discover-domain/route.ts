
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { discoverDomain, MAX_DISCOVERY_CANDIDATES } from '@/lib/pipeline/discoverDomain';
import { orchestratePipeline } from '@/lib/pipeline/orchestrate';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/config/env';
import { Database } from '@/lib/db/types';
import { supabaseAdmin } from '@/lib/db/admin';
export const maxDuration = 300;

const requestSchema = z.object({
  domain: z.string().min(4).max(500),
  dry_run: z.boolean().default(true),
});

const ALL_ICT_KEYWORDS = [
  'tender',
  'rfp',
  'rfq',
  'eoi',
  'procurement',
  'website',
  'web development',
  'mobile app',
  'mobile application',
  'custom software',
  'software development',
  'artificial intelligence',
  'machine learning',
  'chatbot',
  'workflow automation',
  'system integration',
  'IT services',
];

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON payload' },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid discovery request', details: parsed.error.format() },
      { status: 422 }
    );
  }

  try {
    const { domain, dry_run } = parsed.data;

    // 1. Discover up to 25 unique tender candidate URLs.
    const discovered = await discoverDomain(
      domain,
      MAX_DISCOVERY_CANDIDATES
    );

    if (discovered.length === 0) {
      return NextResponse.json({
        success: true,
        domain,
        discovered: 0,
        processed: 0,
        stats: null,
        results: [],
        message:
          'No tender-related links were discovered. Check the domain, sitemap, search API key and source permissions.',
      });
    }

    // 2. Send all categories through the existing AI analysis pipeline.
    // Bot 1 is the coordinator/fallback; orchestrate.ts maps the
    // AI-detected category to its corresponding discovery bot.
    const pipeline = await orchestratePipeline({
      bot_id: 1,
      prompt_hint:
        'Identify public tender or RFP opportunities across all ICT categories: website development, mobile applications, custom software, AI/ML solutions, and workflow automation. Classify the actual requested project, not merely technology mentioned in passing.',
      include_keywords: ALL_ICT_KEYWORDS,
      dry_run,
      candidates: discovered.map(item => ({
        url: item.url,
        title: item.title,
        snippet: item.snippet,
        text_origin: 'fetch' as const,
      })),
    });

    // 3. Join discovery metadata to pipeline outcomes.
    const metadata = new Map(
      discovered.map(item => [item.url, item])
    );

    const results = pipeline.results
      .map(item => {
        const found = metadata.get(item.url);

        return {
          ...item,
          title: found?.title || 'Tender notice',
          discovery_source: found?.discovery_source || 'domain',
        };
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

    return NextResponse.json({
      success: true,
      domain,
      discovered: discovered.length,
      processed: pipeline.processed,
      dry_run,
      stats: pipeline.stats,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Domain discovery failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
