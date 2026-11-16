import { describe, it, expect } from 'vitest';
import { prefilterCandidate } from '../lib/pipeline/prefilter';

describe('Prefilter Stage (D2-PIPE-07)', () => {
  it('rejects candidates matching hiring/job URL patterns', () => {
    const res = prefilterCandidate(
      'https://company.com/careers/senior-frontend-developer',
      'Senior Developer Wanted',
      'We are looking for web developers to build our portal'
    );
    expect(res.pass).toBe(false);
    expect(res.reason).toContain('/careers/');
  });

  it('rejects candidates matching hiring text keywords', () => {
    const res = prefilterCandidate(
      'https://company.com/news/tech-team',
      'Our team is expanding',
      'We are hiring full-time software engineers. Apply now with salary expectations.'
    );
    expect(res.pass).toBe(false);
    expect(res.reason).toContain('we are hiring');
  });

  it('passes authentic procurement RFPs and applies request-language bonus', () => {
    const res = prefilterCandidate(
      'https://company.com/procurement/rfp-portal',
      'Request for Proposal: B2B Portal',
      'The company is seeking experienced software partners to build our custom portal.',
      {
        includeKeywords: ['portal', 'custom software'],
      }
    );
    expect(res.pass).toBe(true);
    expect(res.rankScore).toBeGreaterThanOrEqual(25); // keyword match + request language bonus
  });
});
