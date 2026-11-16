import robotsParser from 'robots-parser';
import { registrableDomain } from './canonicalize';
import { env } from '../config/env';

interface CachedRobots {
  parser: ReturnType<typeof robotsParser>;
  checkedAt: number;
}

const robotsCache = new Map<string, CachedRobots>();

export async function isRobotsAllowed(targetUrl: string, customUserAgent?: string): Promise<{
  allowed: boolean;
  crawlDelayMs?: number;
  robotsUrl?: string;
}> {
  const ua = customUserAgent || env.USER_AGENT;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return { allowed: false };
  }

  const origin = parsedUrl.origin;
  const domain = registrableDomain(targetUrl);
  const robotsUrl = `${origin}/robots.txt`;
  const now = Date.now();

  const cached = robotsCache.get(domain);
  if (cached && now - cached.checkedAt < 86400000) {
    // 24 hour cache
    const allowed = cached.parser.isAllowed(targetUrl, ua) !== false;
    const delay = cached.parser.getCrawlDelay(ua);
    return {
      allowed,
      crawlDelayMs: delay ? delay * 1000 : undefined,
      robotsUrl,
    };
  }

  // Fetch robots.txt with safe limits
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(robotsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': ua,
        Accept: 'text/plain',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // RFC 9309 rules:
    // 4xx status: robots.txt is considered non-existent, everything is allowed
    // 5xx status: server error, disallow crawling temporarily for safety
    if (response.status >= 500) {
      return { allowed: false, robotsUrl };
    }

    let robotsText = '';
    if (response.ok) {
      robotsText = await response.text();
    }

    const parser = robotsParser(robotsUrl, robotsText);
    robotsCache.set(domain, { parser, checkedAt: now });

    const allowed = parser.isAllowed(targetUrl, ua) !== false;
    const delay = parser.getCrawlDelay(ua);

    return {
      allowed,
      crawlDelayMs: delay ? delay * 1000 : undefined,
      robotsUrl,
    };
  } catch {
    // Network error or timeout: allow default crawling unless RFC 5xx error
    const parser = robotsParser(robotsUrl, '');
    robotsCache.set(domain, { parser, checkedAt: now });
    return { allowed: true, robotsUrl };
  }
}
