import { describe, it, expect } from 'vitest';
import { canonicalizeUrl, registrableDomain } from '../lib/pipeline/canonicalize';

describe('URL Canonicalization (D2-PIPE-01)', () => {
  it('strips tracking parameters and hashes', () => {
    const raw = 'https://Example.COM/procurement/rfp?utm_source=twitter&utm_medium=cpc&gclid=123#overview';
    const result = canonicalizeUrl(raw);
    expect(result).toBe('https://example.com/procurement/rfp');
  });

  it('normalizes trailing slashes and port numbers', () => {
    const raw = 'https://example.com:443/tender/notice/';
    const result = canonicalizeUrl(raw);
    expect(result).toBe('https://example.com/tender/notice');
  });

  it('preserves non-tracking query parameters in alphabetical order', () => {
    const raw = 'https://example.com/search?category=ai&page=2&b=1&a=2&utm_campaign=winter';
    const result = canonicalizeUrl(raw);
    expect(result).toBe('https://example.com/search?a=2&b=1&category=ai&page=2');
  });

  it('extracts registrable domain properly', () => {
    expect(registrableDomain('https://sub.portal.contractsfinder.service.gov.uk/notice/123')).toBe(
      'service.gov.uk'
    );
    expect(registrableDomain('https://careers.google.com')).toBe('google.com');
    expect(registrableDomain('https://example.co.uk/jobs')).toBe('example.co.uk');
  });
});
