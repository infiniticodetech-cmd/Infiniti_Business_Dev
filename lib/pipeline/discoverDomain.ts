
import * as cheerio from 'cheerio';
import { safeFetch } from './safeFetch';
import { canonicalizeUrl } from './canonicalize';

export const MAX_DISCOVERY_CANDIDATES = 25;

export interface DiscoveredCandidate {
  url: string;
  title: string;
  snippet: string;
  discovery_source: 'domain' | 'search';
}

const TENDER_TERMS = [
  'tender',
  'tenders',
  'rfp',
  'rfq',
  'eoi',
  'procurement',
  'bid',
  'bids',
  'quotation',
  'proposal',
  'website development',
  'web development',
  'mobile application',
  'mobile app',
  'software development',
  'custom software',
  'artificial intelligence',
  'machine learning',
  'workflow automation',
  'system integration',
  'it services',
];

const SEARCH_TERMS = [
  'website development',
  'mobile application development',
  'custom software development',
  'AI machine learning software',
  'workflow automation system integration',
];

function isTenderLike(text: string): boolean {
  const value = text.toLowerCase();
  return TENDER_TERMS.some(term => value.includes(term));
}

function normalizeDomain(input: string): URL {
  const parsed = new URL(
    input.includes('://') ? input : `https://${input}`
  );

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS domains are supported');
  }

  if (
    !parsed.hostname.includes('.') ||
    parsed.hostname === 'localhost' ||
    parsed.hostname.endsWith('.local')
  ) {
    throw new Error('Enter a valid public website domain');
  }

  return parsed;
}

export async function discoverDomain(
  input: string,
  maxCandidates = MAX_DISCOVERY_CANDIDATES
): Promise<DiscoveredCandidate[]> {
  const root = normalizeDomain(input);
  const origin = root.origin;
  const host = root.hostname.toLowerCase();

  const results = new Map<string, DiscoveredCandidate>();
  const visited = new Set<string>();
  const queue: string[] = [origin];

  const add = (
    rawUrl: string,
    title: string,
    snippet: string,
    source: 'domain' | 'search'
  ) => {
    if (results.size >= maxCandidates) return;

    try {
      const url = canonicalizeUrl(rawUrl);
      const parsed = new URL(url);

      // Domain discovery is restricted to the requested host.
      if (parsed.hostname.toLowerCase() !== host) return;

      const combined = `${title} ${snippet} ${parsed.pathname}`;

      if (!isTenderLike(combined)) return;

      if (!results.has(url)) {
        results.set(url, {
          url,
          title: title.trim().slice(0, 250) || 'Tender notice',
          snippet: snippet.trim().slice(0, 1000),
          discovery_source: source,
        });
      }
    } catch {
      // Ignore malformed or unsupported URLs.
    }
  };

  // A. Sitemap discovery. Both common sitemap paths are attempted.
  for (const path of ['/sitemap.xml', '/sitemap_index.xml']) {
    if (results.size >= maxCandidates) break;

    const response = await safeFetch(`${origin}${path}`);

    if (!response.ok || !response.contentType.toLowerCase().includes('xml')) {
      continue;
    }

    const $ = cheerio.load(response.body, { xmlMode: true });

    const sitemapLinks: string[] = [];

    $('sitemap loc').each((_, element) => {
      const value = $(element).text().trim();
      if (value) sitemapLinks.push(value);
    });

    // Process one level of sitemap indexes.
    for (const sitemapUrl of sitemapLinks.slice(0, 5)) {
      if (results.size >= maxCandidates) break;

      try {
        if (new URL(sitemapUrl).hostname.toLowerCase() !== host) continue;

        const nested = await safeFetch(sitemapUrl);
        if (!nested.ok || !nested.contentType.toLowerCase().includes('xml')) {
          continue;
        }

        const nestedXml = cheerio.load(nested.body, { xmlMode: true });

        nestedXml('url loc').each((_, element) => {
          const url = nestedXml(element).text().trim();
          if (url) add(url, '', '', 'domain');
        });
      } catch {
        // Ignore invalid nested sitemap entries.
      }
    }

    $('url loc').each((_, element) => {
      const url = $(element).text().trim();
      if (url) add(url, '', '', 'domain');
    });
  }

  // B. Crawl a bounded number of same-domain HTML pages.
  const maxPages = 10;

  while (
    queue.length > 0 &&
    visited.size < maxPages &&
    results.size < maxCandidates
  ) {
    const current = queue.shift()!;

    if (visited.has(current)) continue;
    visited.add(current);

    const response = await safeFetch(current);

    if (!response.ok ||
        !response.contentType.toLowerCase().includes('html')) {
      continue;
    }

    const $ = cheerio.load(response.body);

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        const absolute = new URL(href, current);

        if (absolute.hostname.toLowerCase() !== host) return;
        if (!['http:', 'https:'].includes(absolute.protocol)) return;

        const title = $(element).text().replace(/\s+/g, ' ').trim();
        const context = $(element).parent().text().replace(/\s+/g, ' ').trim();
        const combined = `${title} ${context} ${absolute.pathname}`;

        if (isTenderLike(combined)) {
          add(absolute.toString(), title, context, 'domain');
        }

        const path = absolute.pathname.toLowerCase();

        if (
          queue.length + visited.size < maxPages &&
          !visited.has(absolute.toString()) &&
          (
            path.includes('tender') ||
            path.includes('procurement') ||
            path.includes('notice') ||
            path.includes('rfp')
          )
        ) {
          queue.push(absolute.toString());
        }
      } catch {
        // Ignore malformed links.
      }
    });
  }

  // C. External search provider: query for notices on the entered domain.
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (apiKey) {
    for (const term of SEARCH_TERMS) {
      if (results.size >= maxCandidates) break;

      const query = `site:${host} tender ${term}`;

      try {
        const searchUrl = new URL(
          'https://api.search.brave.com/res/v1/web/search'
        );

        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('count', '10');

        const response = await fetch(searchUrl, {
          headers: {
            Accept: 'application/json',
            'X-Subscription-Token': apiKey,
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const payload = await response.json();

        const items = payload?.web?.results || [];

        for (const item of items) {
          if (results.size >= maxCandidates) break;

          if (typeof item.url !== 'string') continue;

          add(
            item.url,
            String(item.title || ''),
            String(item.description || ''),
            'search'
          );
        }
      } catch {
        // Search failure does not cancel domain discovery.
      }
    }
  }

  return Array.from(results.values()).slice(0, maxCandidates);
}
