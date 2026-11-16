import { describe, it, expect } from 'vitest';
import { verifyOpportunity } from '../lib/pipeline/verify';

describe('Verification Stage V1-V9 (D2-PIPE-10)', () => {
  it('returns verified when all hard checks pass without soft flags', () => {
    const res = verifyOpportunity({
      httpStatus: 200,
      robotsAllowed: true,
      quoteInSource: true,
      publishedDate: '2026-11-01',
      maxAgeDays: 180,
      companyName: 'Apex Retail Ltd',
      officialWebsite: 'https://apexretail.example.com',
      isDuplicate: false,
      isSuppressed: false,
      isPiiScrubbed: true,
      aiCategory: 'website',
      botCategory: 'website',
    });

    expect(res.status).toBe('verified');
    expect(res.checks['V1_http_status'].passed).toBe(true);
    expect(res.checks['V3_quote_in_source'].passed).toBe(true);
    expect(res.flags.length).toBe(0);
  });

  it('fails verification when quote is not in source text (hard check V3)', () => {
    const res = verifyOpportunity({
      httpStatus: 200,
      robotsAllowed: true,
      quoteInSource: false, // Hallucination failure
      publishedDate: '2026-11-01',
      companyName: 'Acme Corp',
      officialWebsite: 'https://acme.org',
      isPiiScrubbed: true,
      aiCategory: 'website',
    });

    expect(res.status).toBe('failed');
    expect(res.checks['V3_quote_in_source'].passed).toBe(false);
  });

  it('sets needs_review when soft checks fail (e.g. unknown publication date)', () => {
    const res = verifyOpportunity({
      httpStatus: 200,
      robotsAllowed: true,
      quoteInSource: true,
      publishedDate: null, // Unknown publication date is soft flag
      companyName: 'Acme Corp',
      officialWebsite: 'https://acme.org',
      isPiiScrubbed: true,
      aiCategory: 'website',
    });

    expect(res.status).toBe('needs_review');
    expect(res.checks['V4_recency'].passed).toBe(false);
    expect(res.checks['V4_recency'].type).toBe('soft');
  });

  it('fails verification if domain is on suppression list (hard check V7)', () => {
    const res = verifyOpportunity({
      httpStatus: 200,
      robotsAllowed: true,
      quoteInSource: true,
      publishedDate: '2026-11-01',
      companyName: 'Acme Corp',
      officialWebsite: 'https://acme.org',
      isSuppressed: true,
      isPiiScrubbed: true,
      aiCategory: 'website',
    });

    expect(res.status).toBe('failed');
    expect(res.checks['V7_suppression_list'].passed).toBe(false);
  });
});
