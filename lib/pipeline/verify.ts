import { VerificationStatus, OpportunityCategory } from '../db/types';

export interface VerificationCheckDetail {
  id: string;
  name: string;
  passed: boolean;
  type: 'hard' | 'soft';
  reason?: string;
}

export interface VerificationInput {
  httpStatus: number;
  robotsAllowed: boolean;
  quoteInSource: boolean;
  publishedDate: string | null;
  maxAgeDays?: number;
  companyName: string | null;
  officialWebsite: string | null;
  isDuplicate?: boolean;
  isSuppressed?: boolean;
  isPiiScrubbed: boolean;
  aiCategory: OpportunityCategory;
  botCategory?: OpportunityCategory | null;
}

export interface VerificationResult {
  status: VerificationStatus;
  checks: Record<string, VerificationCheckDetail>;
  flags: string[];
}

export function verifyOpportunity(input: VerificationInput): VerificationResult {
  const checks: Record<string, VerificationCheckDetail> = {};
  const flags: string[] = [];

  // V1: Source URL valid and HTTP 200
  const v1Pass = input.httpStatus === 200 || input.httpStatus === 0; // 0 for feed/pre-provided text
  checks['V1_http_status'] = {
    id: 'V1',
    name: 'Source URL accessible with HTTP 200',
    passed: v1Pass,
    type: 'hard',
    reason: v1Pass ? undefined : `HTTP status ${input.httpStatus}`,
  };

  // V2: Domain policy & robots allowed
  const v2Pass = input.robotsAllowed;
  checks['V2_robots_policy'] = {
    id: 'V2',
    name: 'Domain allowed by robots.txt and policy',
    passed: v2Pass,
    type: 'hard',
    reason: v2Pass ? undefined : 'Disallowed by robots.txt or domain policy',
  };

  // V3: Evidence quote found verbatim in source
  const v3Pass = input.quoteInSource;
  checks['V3_quote_in_source'] = {
    id: 'V3',
    name: 'Evidence quote appears verbatim in source text',
    passed: v3Pass,
    type: 'hard',
    reason: v3Pass ? undefined : 'Quote not found in captured source text',
  };

  // V4: Recency (not in future, not older than max_age_days)
  const maxAge = input.maxAgeDays ?? 180;
  let v4Pass = true;
  let v4Type: 'hard' | 'soft' = 'hard';
  let v4Reason: string | undefined;

  if (input.publishedDate) {
    const pubTime = new Date(input.publishedDate).getTime();
    const now = Date.now();
    const ageDays = (now - pubTime) / 86400000;
    if (ageDays < -1) {
      v4Pass = false;
      v4Reason = 'Source publication date is in the future';
    } else if (ageDays > maxAge) {
      v4Pass = false;
      v4Reason = `Source published ${Math.round(ageDays)} days ago (exceeds ${maxAge}d limit)`;
    }
  } else {
    // Unknown date is a soft flag
    v4Pass = false;
    v4Type = 'soft';
    v4Reason = 'Publication date could not be established from source text';
    flags.push('Unknown publication date');
  }

  checks['V4_recency'] = {
    id: 'V4',
    name: 'Source date valid and not stale',
    passed: v4Pass,
    type: v4Type,
    reason: v4Reason,
  };

  // V5: Company identity present
  const hasCompanyName = !!input.companyName && input.companyName.trim().length >= 2;
  const hasWebsite = !!input.officialWebsite;
  const v5Pass = hasCompanyName;
  checks['V5_company_identity'] = {
    id: 'V5',
    name: 'Company identity identified in source',
    passed: v5Pass,
    type: 'hard',
    reason: v5Pass
      ? hasWebsite
        ? undefined
        : 'Official website not resolved (soft)'
      : 'Company name missing',
  };
  if (v5Pass && !hasWebsite) {
    flags.push('Official website not explicitly stated');
  }

  // V6: Duplicate check
  const v6Pass = !input.isDuplicate;
  checks['V6_duplicate_check'] = {
    id: 'V6',
    name: 'Deduplication check against existing records',
    passed: v6Pass,
    type: 'soft',
    reason: v6Pass ? undefined : 'Potential duplicate of existing opportunity',
  };
  if (!v6Pass) {
    flags.push('Potential duplicate record');
  }

  // V7: Suppression list
  const v7Pass = !input.isSuppressed;
  checks['V7_suppression_list'] = {
    id: 'V7',
    name: 'Not on suppression/do-not-contact list',
    passed: v7Pass,
    type: 'hard',
    reason: v7Pass ? undefined : 'Organization is on suppression list',
  };

  // V8: PII scrubbed
  const v8Pass = input.isPiiScrubbed;
  checks['V8_pii_scrubbed'] = {
    id: 'V8',
    name: 'PII scrub verified for stored excerpt',
    passed: v8Pass,
    type: 'hard',
    reason: v8Pass ? undefined : 'PII scrubbing failed',
  };

  // V9: Bot category consistency (cross-category allowed, but flagged)
  let v9Pass = true;
  if (input.botCategory && input.botCategory !== 'other') {
    if (input.aiCategory !== input.botCategory) {
      v9Pass = false;
      flags.push(`Category mismatch: Bot searches '${input.botCategory}', AI classified '${input.aiCategory}'`);
    }
  }
  checks['V9_category_consistency'] = {
    id: 'V9',
    name: 'Category consistency with discovering bot',
    passed: v9Pass,
    type: 'soft',
    reason: v9Pass ? undefined : 'AI category differs from bot hint',
  };

  // Determine final verification status
  let hasHardFail = false;
  let hasSoftFail = false;

  for (const c of Object.values(checks)) {
    if (!c.passed) {
      if (c.type === 'hard') hasHardFail = true;
      if (c.type === 'soft') hasSoftFail = true;
    }
  }

  let status: VerificationStatus = 'verified';
  if (hasHardFail) {
    status = 'failed';
  } else if (hasSoftFail) {
    status = 'needs_review';
  }

  return {
    status,
    checks,
    flags,
  };
}
