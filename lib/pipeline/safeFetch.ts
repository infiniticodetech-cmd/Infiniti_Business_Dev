import { env } from '../config/env';
import { assertAllowed, markDomainBlocked } from './policy';
import { isRobotsAllowed } from './robots';
import { canonicalizeUrl, registrableDomain } from './canonicalize';

export interface FetchResult {
  ok: boolean;
  finalUrl: string;
  httpStatus: number;
  body: string;
  contentType: string;
  robotsAllowed: boolean;
  captureStatus:
    | 'captured'
    | 'blocked_robots'
    | 'blocked_auth'
    | 'blocked_captcha'
    | 'fetch_failed'
    | 'suppressed';
  errorDetail?: string;
}

// Track domain access timestamps to enforce minimum interval rate limiting (2s per domain)
const domainLastRequestTime = new Map<string, number>();

async function enforceDomainInterval(domain: string, minIntervalMs: number) {
  const lastTime = domainLastRequestTime.get(domain) || 0;
  const now = Date.now();
  const elapsed = now - lastTime;
  if (elapsed < minIntervalMs) {
    const delay = minIntervalMs - elapsed;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  domainLastRequestTime.set(domain, Date.now());
}

export async function safeFetch(targetUrl: string): Promise<FetchResult> {
  let currentUrl = canonicalizeUrl(targetUrl);
  let redirectCount = 0;
  const maxRedirects = env.FETCH_MAX_REDIRECTS;
  let finalRobotsAllowed = true;

  while (redirectCount <= maxRedirects) {
    const domain = registrableDomain(currentUrl);

    // 1. Policy & Suppression Check
    const policy = await assertAllowed(currentUrl);
    if (!policy.allowed) {
      return {
        ok: false,
        finalUrl: currentUrl,
        httpStatus: 403,
        body: '',
        contentType: '',
        robotsAllowed: false,
        captureStatus:
          policy.reason === 'suppressed'
            ? 'suppressed'
            : policy.reason === 'blocked_manual'
            ? 'fetch_failed'
            : policy.reason,
        errorDetail: policy.details,
      };
    }

    // 2. robots.txt Check
    const robots = await isRobotsAllowed(currentUrl);
    if (!robots.allowed) {
      finalRobotsAllowed = false;
      await markDomainBlocked(domain, 'blocked_robots', 7, 'robots.txt disallows this URL');
      return {
        ok: false,
        finalUrl: currentUrl,
        httpStatus: 403,
        body: '',
        contentType: '',
        robotsAllowed: false,
        captureStatus: 'blocked_robots',
        errorDetail: 'Disallowed by robots.txt',
      };
    }

    // 3. Enforce per-domain minimum interval
    const interval = Math.max(env.FETCH_MIN_INTERVAL_MS, robots.crawlDelayMs || 0);
    await enforceDomainInterval(domain, interval);

    // 4. Perform Request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': env.USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          // Explicitly no Authorization or Cookie headers
        },
        redirect: 'manual', // Manual redirect control to re-check policy on every hop
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Handle Redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return {
            ok: false,
            finalUrl: currentUrl,
            httpStatus: response.status,
            body: '',
            contentType: '',
            robotsAllowed: finalRobotsAllowed,
            captureStatus: 'fetch_failed',
            errorDetail: 'Redirect without Location header',
          };
        }

        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = canonicalizeUrl(nextUrl);
        redirectCount++;
        continue;
      }

      // Read Body with byte limit
      const reader = response.body?.getReader();
      let fullText = '';
      if (reader) {
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.length;
            if (totalBytes > env.FETCH_MAX_BYTES) {
              reader.cancel();
              break;
            }
            chunks.push(value);
          }
        }

        const decoder = new TextDecoder('utf-8', { fatal: false });
        fullText = chunks.map((c) => decoder.decode(c, { stream: true })).join('') + decoder.decode();
      }

      // Heuristic detection of CAPTCHA / anti-bot challenge pages (checked before simple 401/403)
      const lowerBody = fullText.slice(0, 10000).toLowerCase();
      const isChallenge =
        lowerBody.includes('cf-challenge') ||
        lowerBody.includes('cf-turnstile') ||
        lowerBody.includes('g-recaptcha') ||
        lowerBody.includes('hcaptcha') ||
        (lowerBody.includes('just a moment') && (response.status === 403 || response.status === 503)) ||
        lowerBody.includes('verify you are human') ||
        lowerBody.includes('enable javascript and cookies to continue');

      if (isChallenge) {
        await markDomainBlocked(domain, 'blocked_captcha', 30, 'Challenge / CAPTCHA detected');
        return {
          ok: false,
          finalUrl: currentUrl,
          httpStatus: response.status,
          body: '',
          contentType: response.headers.get('content-type') || '',
          robotsAllowed: finalRobotsAllowed,
          captureStatus: 'blocked_captcha',
          errorDetail: 'Bot challenge / CAPTCHA page detected',
        };
      }

      // Check HTTP Auth Walls
      if (response.status === 401 || response.status === 403) {
        await markDomainBlocked(domain, 'blocked_auth', 14, `HTTP ${response.status} login/auth gate`);
        return {
          ok: false,
          finalUrl: currentUrl,
          httpStatus: response.status,
          body: '',
          contentType: response.headers.get('content-type') || '',
          robotsAllowed: finalRobotsAllowed,
          captureStatus: 'blocked_auth',
          errorDetail: `Authentication required: HTTP ${response.status}`,
        };
      }

      // Check Rate Limit Status
      if (response.status === 429) {
        await markDomainBlocked(domain, 'blocked_auth', 1, 'HTTP 429 rate limit exceeded');
        return {
          ok: false,
          finalUrl: currentUrl,
          httpStatus: 429,
          body: '',
          contentType: '',
          robotsAllowed: finalRobotsAllowed,
          captureStatus: 'fetch_failed',
          errorDetail: 'HTTP 429 Too Many Requests',
        };
      }

      // Verify Content Type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
        return {
          ok: false,
          finalUrl: currentUrl,
          httpStatus: response.status,
          body: '',
          contentType,
          robotsAllowed: finalRobotsAllowed,
          captureStatus: 'fetch_failed',
          errorDetail: `Unsupported Content-Type: ${contentType}`,
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          finalUrl: currentUrl,
          httpStatus: response.status,
          body: fullText,
          contentType,
          robotsAllowed: finalRobotsAllowed,
          captureStatus: 'fetch_failed',
          errorDetail: `HTTP error ${response.status}`,
        };
      }

      return {
        ok: true,
        finalUrl: currentUrl,
        httpStatus: response.status,
        body: fullText,
        contentType,
        robotsAllowed: finalRobotsAllowed,
        captureStatus: 'captured',
      };
    } catch (err) {
      clearTimeout(timeout);
      return {
        ok: false,
        finalUrl: currentUrl,
        httpStatus: 0,
        body: '',
        contentType: '',
        robotsAllowed: finalRobotsAllowed,
        captureStatus: 'fetch_failed',
        errorDetail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    ok: false,
    finalUrl: currentUrl,
    httpStatus: 310,
    body: '',
    contentType: '',
    robotsAllowed: finalRobotsAllowed,
    captureStatus: 'fetch_failed',
    errorDetail: `Exceeded maximum redirects (${maxRedirects})`,
  };
}
