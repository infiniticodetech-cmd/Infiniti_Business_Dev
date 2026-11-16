import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeFetch } from '../lib/pipeline/safeFetch';
import * as policyModule from '../lib/pipeline/policy';
import * as robotsModule from '../lib/pipeline/robots';

describe('safeFetch Compliance Gates (D2-PIPE-04, T-D2-02)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks request immediately if robots.txt disallows the URL (Rule C5)', async () => {
    vi.spyOn(policyModule, 'assertAllowed').mockResolvedValue({ allowed: true });
    vi.spyOn(robotsModule, 'isRobotsAllowed').mockResolvedValue({ allowed: false });

    const res = await safeFetch('https://example.com/private/tender');
    expect(res.ok).toBe(false);
    expect(res.captureStatus).toBe('blocked_robots');
    expect(res.errorDetail).toContain('robots.txt');
  });

  it('detects challenge / CAPTCHA pages and marks domain blocked_captcha (Rule C3)', async () => {
    vi.spyOn(policyModule, 'assertAllowed').mockResolvedValue({ allowed: true });
    vi.spyOn(robotsModule, 'isRobotsAllowed').mockResolvedValue({ allowed: true });

    // Mock fetch to return a Cloudflare challenge page
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'text/html' }),
      body: {
        getReader() {
          const content = new TextEncoder().encode(
            '<html><title>Just a moment...</title><body><div class="cf-challenge">Verify you are human</div></body></html>'
          );
          let read = false;
          return {
            async read() {
              if (read) return { done: true, value: undefined };
              read = true;
              return { done: false, value: content };
            },
            cancel() {},
          };
        },
      },
    } as any);

    const res = await safeFetch('https://protected.example.com/portal');
    expect(res.ok).toBe(false);
    expect(res.captureStatus).toBe('blocked_captcha');
  });

  it('maps HTTP 401/403 login walls to blocked_auth (Rule C4)', async () => {
    vi.spyOn(policyModule, 'assertAllowed').mockResolvedValue({ allowed: true });
    vi.spyOn(robotsModule, 'isRobotsAllowed').mockResolvedValue({ allowed: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'text/html' }),
    } as any);

    const res = await safeFetch('https://secure.example.com/admin/login');
    expect(res.ok).toBe(false);
    expect(res.captureStatus).toBe('blocked_auth');
  });
});
