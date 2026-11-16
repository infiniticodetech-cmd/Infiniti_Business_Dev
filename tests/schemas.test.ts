import { describe, it, expect } from 'vitest';
import { AnalyzeOpportunityOutputSchema } from '../lib/ai/schemas';

describe('AnalyzeOpportunity Schema Validation', () => {
  it('successfully validates a complete conforming payload', () => {
    const validSample = {
      is_relevant: true,
      category: 'website',
      signal_strength: 'explicit_request',
      company_name: 'Acme Corp',
      company_website_stated: 'https://acme.org',
      industry: 'technology',
      location: 'London, UK',
      title: 'Acme Corp Website Redesign Request',
      stated_requirement: 'Seeking agency to overhaul corporate website and migrate to Next.js CMS',
      evidence_quote: 'We are seeking proposals from qualified web development partners to redesign our corporate website.',
      scope_clarity: 'clear',
      published_date_stated: '2026-11-10',
      hypotheses: [
        {
          text: 'May need HubSpot CRM integration',
          basis: 'Mentions marketing automation requirements',
        },
      ],
      reason: 'Explicit tender statement for website development services.',
    };

    const parsed = AnalyzeOpportunityOutputSchema.safeParse(validSample);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid categories', () => {
    const invalidSample = {
      is_relevant: true,
      category: 'crypto_trading', // invalid
      signal_strength: 'explicit_request',
      company_name: 'Acme Corp',
      company_website_stated: null,
      industry: 'technology',
      location: null,
      title: 'Crypto project',
      stated_requirement: 'Build a coin',
      evidence_quote: 'Looking for developers',
      scope_clarity: 'partial',
      published_date_stated: null,
      hypotheses: [],
      reason: 'Invalid category',
    };

    const parsed = AnalyzeOpportunityOutputSchema.safeParse(invalidSample);
    expect(parsed.success).toBe(false);
  });

  it('rejects when evidence quote exceeds maximum character limit', () => {
    const invalidSample = {
      is_relevant: true,
      category: 'website',
      signal_strength: 'strong_signal',
      company_name: 'Acme Corp',
      company_website_stated: null,
      industry: 'technology',
      location: null,
      title: 'Title',
      stated_requirement: 'Requirement text',
      evidence_quote: 'A'.repeat(301), // Limit is 300
      scope_clarity: 'vague',
      published_date_stated: null,
      hypotheses: [],
      reason: 'Quote too long',
    };

    const parsed = AnalyzeOpportunityOutputSchema.safeParse(invalidSample);
    expect(parsed.success).toBe(false);
  });
});
