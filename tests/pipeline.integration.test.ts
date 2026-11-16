import { describe, it, expect, vi } from 'vitest';
import * as understandModule from '../lib/pipeline/understand';
import { orchestratePipeline } from '../lib/pipeline/orchestrate';

describe('Pipeline Orchestrator End-to-End (D2-PIPE-13)', () => {
  it('executes full pipeline on candidate in dry_run mode without errors', async () => {
    vi.spyOn(understandModule, 'understandOpportunity').mockImplementation(async () => ({
      analysis: {
        is_relevant: true,
        category: 'website',
        signal_strength: 'explicit_request',
        company_name: 'Apex Retail Ltd',
        company_website_stated: 'https://apexretail.example.com',
        industry: 'retail_ecommerce',
        location: 'London, UK',
        title: 'Apex Retail Website Redesign RFP',
        stated_requirement: 'Seeking web agency to migrate legacy WordPress website to Next.js',
        evidence_quote: 'seeking an experienced web agency to migrate our legacy WordPress platform',
        scope_clarity: 'clear',
        published_date_stated: '2026-11-10',
        hypotheses: [],
        reason: 'Explicit procurement RFP for corporate web redevelopment',
      },
      contentHash: 'mock-hash-123',
      fromCache: false,
      quoteInSource: true,
      latencyMs: 150,
    }));

    const response = await orchestratePipeline({
      bot_id: 1,
      bot_category: 'website',
      dry_run: true,
      candidates: [
        {
          url: 'https://apexretail.example.com/procurement/rfp-website-2026',
          title: 'Apex Retail Website Redesign RFP',
          text_origin: 'feed',
          text: 'Apex Retail Ltd is seeking an experienced web agency to migrate our legacy WordPress platform to modern Next.js architecture with improved mobile responsiveness and performance. Official inquiries may be directed to tenders@apexretail.example.com.',
          published_at: '2026-11-10',
        },
      ],
    });

    expect(response.processed).toBe(1);
    expect(response.results[0].outcome).toBe('published');
    expect(response.results[0].score).toBeGreaterThanOrEqual(70);
    expect(response.stats.published).toBe(1);
    expect(response.stats.errors).toBe(0);
  });
});
