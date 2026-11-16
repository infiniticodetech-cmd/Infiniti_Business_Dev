import { describe, it, expect } from 'vitest';
import { matchOpportunity } from '../lib/pipeline/match';

describe('Deterministic Service Matcher (D2-PIPE-09)', () => {
  it('awards 25 fit points when category matches and >= 2 keywords hit', async () => {
    const res = await matchOpportunity(
      'website',
      'Corporate Website Redesign RFP',
      'Seeking web design and cms redevelopment partner for website overhaul',
      'looking for agency for web development and wordpress migration'
    );
    expect(res.fitPoints).toBe(25);
    expect(res.matchedServiceKeys).toContain('website_development');
    expect(res.flags.length).toBe(0);
  });

  it('awards 15 fit points when category matches but fewer keywords hit', async () => {
    const res = await matchOpportunity(
      'ai_solution',
      'AI Project Announcement',
      'Company exploring modern algorithms',
      'General technology discussion'
    );
    expect(res.fitPoints).toBe(15);
    expect(res.matchedServiceKeys).toContain('ai_solutions');
  });

  it('caps fit points at 10 and flags violation when minimum criteria excluded terms appear', async () => {
    const res = await matchOpportunity(
      'website',
      'Website Project',
      'Volunteer web design internship project free of charge',
      'unpaid position'
    );
    expect(res.fitPoints).toBeLessThanOrEqual(10);
    expect(res.flags.some((f) => f.includes('minimum criteria'))).toBe(true);
  });
});
