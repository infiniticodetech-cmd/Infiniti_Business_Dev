/**
 * Canonicalizes URLs to eliminate duplicates caused by fragments,
 * tracking query parameters (utm_*, gclid, etc.), and casing differences.
 */

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'ref',
  'source',
  'mc_cid',
  'mc_eid',
]);

export function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());

    // Protocol must be http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${parsed.protocol}`);
    }

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Strip fragment/hash
    parsed.hash = '';

    // Strip default ports
    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = '';
    }

    // Remove tracking query parameters and sort remaining parameters
    const searchParams = new URLSearchParams(parsed.search);
    const cleanedParams = new URLSearchParams();

    const keys: string[] = [];
    for (const key of searchParams.keys()) {
      keys.push(key);
    }
    keys.sort();

    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      if (!TRACKING_PARAMS.has(lowerKey) && !lowerKey.startsWith('utm_')) {
        const values = searchParams.getAll(key);
        for (const val of values) {
          cleanedParams.append(key, val);
        }
      }
    }

    parsed.search = cleanedParams.toString() ? `?${cleanedParams.toString()}` : '';

    // Normalize pathname: ensure single leading slash and normalize trailing slashes (except root)
    let pathname = parsed.pathname.replace(/\/+/g, '/');
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    return parsed.toString();
  } catch (err) {
    throw new Error(`Failed to canonicalize URL '${rawUrl}': ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function registrableDomain(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    
    // Simple registrable domain extraction
    const parts = host.split('.');
    if (parts.length <= 2) {
      return host;
    }
    
    // Check for common second-level domains like .co.uk, .gov.uk, .com.au
    const slds = ['co.uk', 'gov.uk', 'ac.uk', 'org.uk', 'com.au', 'net.au', 'org.au'];
    const lastTwo = parts.slice(-2).join('.');
    if (slds.includes(lastTwo) && parts.length >= 3) {
      return parts.slice(-3).join('.');
    }

    return parts.slice(-2).join('.');
  } catch {
    return '';
  }
}
