import { describe, it, expect } from 'vitest';
import { calculateScore } from '../lib/pipeline/score';

describe('Lead Scoring Engine (D2-PIPE-11, PDF §10 Rubric)', () => {
  it('worked_example: reproduces fictional ABC Technologies lead score (93 / High / 98)', () => {
    // 20 days old source
    const pubDate = new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0];

    const result = calculateScore({
      signal: 'explicit_request',
      quoteInSource: true,
      fitPoints: 25, // Website + CRM integration matched, >= 2 hits
      sourceReliabilityScore: 80, // Company site, reliability 80 -> round(80 * 0.12) = 10; recency <= 30d = 8 -> 18 total
      publishedDate: pubDate,
      hasOfficialWebsite: true, // 6 pts
      hasCompanyName: true, // 4 pts
      hasContactRoute: true, // 5 pts (total identity = 15)
      scopeClarity: 'partial', // 5 pts
      verificationStatus: 'verified', // vf = 1.0
    });

    expect(result.scoreBreakdown.explicit).toBe(30);
    expect(result.scoreBreakdown.fit).toBe(25);
    expect(result.scoreBreakdown.source).toBe(18);
    expect(result.scoreBreakdown.identity).toBe(15);
    expect(result.scoreBreakdown.scope).toBe(5);

    expect(result.score).toBe(93);
    expect(result.priority).toBe('high');
    expect(result.confidence).toBe(98);
  });

  it('correctly downgrades explicit signal when quote is missing from source', () => {
    const result = calculateScore({
      signal: 'explicit_request',
      quoteInSource: false, // Hallucination guard active
      fitPoints: 25,
      sourceReliabilityScore: 80,
      publishedDate: '2026-11-01',
      hasOfficialWebsite: true,
      hasCompanyName: true,
      hasContactRoute: true,
      scopeClarity: 'clear',
      verificationStatus: 'verified',
    });

    // explicit_request downgraded to strong_signal -> 18 pts
    expect(result.scoreBreakdown.explicit).toBe(18);
  });
});
