import { registrableDomain } from './canonicalize';
import { supabaseAdmin } from '../db/admin';

export type PolicyResult =
  | { allowed: true }
  | { allowed: false; reason: 'blocked_robots' | 'blocked_auth' | 'blocked_captcha' | 'blocked_manual' | 'suppressed'; details?: string };

// In-memory cache for policy to avoid DB round-trip on every URL
const policyCache = new Map<string, { status: string; blockedUntil: number | null; cachedAt: number }>();
const suppressionCache = new Set<string>();
let suppressionLastLoaded = 0;

export async function assertAllowed(url: string): Promise<PolicyResult> {
  const domain = registrableDomain(url);
  if (!domain) {
    return { allowed: false, reason: 'blocked_manual', details: 'Invalid domain' };
  }

  const now = Date.now();

  // 1. Check suppression list cache (refresh every 10 minutes)
  if (!process.env.VITEST && now - suppressionLastLoaded > 600000) {
    try {
      const { data } = await supabaseAdmin
        .from('suppression_list')
        .select('domain, email')
        .abortSignal(AbortSignal.timeout(1000));
      suppressionCache.clear();
      if (data) {
        for (const row of data as any[]) {
          if (row.domain) suppressionCache.add(row.domain.toLowerCase());
        }
      }
      suppressionLastLoaded = now;
    } catch {
      // In offline/mock mode continue with in-memory set
    }
  }

  if (suppressionCache.has(domain)) {
    return { allowed: false, reason: 'suppressed', details: 'Domain is in suppression list' };
  }

  // 2. Check domain policy cache (refresh after 5 minutes)
  const cached = policyCache.get(domain);
  if (cached && now - cached.cachedAt < 300000) {
    if (cached.status !== 'allowed') {
      if (cached.blockedUntil && cached.blockedUntil < now) {
        // Cooldown expired
        policyCache.delete(domain);
      } else {
        return {
          allowed: false,
          reason: cached.status as 'blocked_robots' | 'blocked_auth' | 'blocked_captcha' | 'blocked_manual',
          details: 'Cached policy restriction',
        };
      }
    }
  }

  if (!process.env.VITEST) {
    try {
      const { data } = await supabaseAdmin
        .from('domain_policy')
        .select('status, blocked_until')
        .eq('domain', domain)
        .abortSignal(AbortSignal.timeout(1000))
        .maybeSingle();

      const row = data as any;
      if (row && row.status !== 'allowed') {
        const blockedUntilMs = row.blocked_until ? new Date(row.blocked_until).getTime() : null;
        if (!blockedUntilMs || blockedUntilMs > now) {
          policyCache.set(domain, {
            status: row.status,
            blockedUntil: blockedUntilMs,
            cachedAt: now,
          });
          return {
            allowed: false,
            reason: row.status as any,
            details: `Domain policy status: ${row.status}`,
          };
        }
      }
    } catch {
      // If DB check fails, proceed cautiously
    }
  }

  policyCache.set(domain, { status: 'allowed', blockedUntil: null, cachedAt: now });
  return { allowed: true };
}

export async function markDomainBlocked(
  domain: string,
  status: 'blocked_robots' | 'blocked_auth' | 'blocked_captcha' | 'blocked_manual',
  cooldownDays = 30,
  notes = ''
) {
  const blockedUntil = new Date(Date.now() + cooldownDays * 86400000).toISOString();
  policyCache.set(domain, {
    status,
    blockedUntil: new Date(blockedUntil).getTime(),
    cachedAt: Date.now(),
  });

  if (!process.env.VITEST) {
    try {
      await (supabaseAdmin.from('domain_policy') as any).upsert({
        domain,
        status,
        blocked_until: blockedUntil,
        notes,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Ignore DB upsert failure in test/offline modes
    }
  }
}
