/**
 * Prefilter stage (PDF §4.1, D2-PIPE-07).
 * Filters out hiring posts, job listings, and irrelevant candidates before calling AI.
 */

const SHARED_URL_EXCLUSIONS = [
  '/jobs/',
  '/job/',
  '/careers/',
  '/career/',
  '/vacancy/',
  '/vacancies/',
  '/apply/',
];

const SHARED_TEXT_EXCLUSIONS = [
  'we are hiring',
  'apply now',
  'salary range',
  'competitive salary',
  'full-time role',
  'employment type',
  'job description',
];

const REQUEST_LANGUAGE_TERMS = [
  'request for proposal',
  'request for proposals',
  'rfp',
  'rfq',
  'tender',
  'expression of interest',
  'seeking',
  'looking for',
  'invites proposals',
  'invites bids',
  'procurement',
];

export interface PrefilterConfig {
  includeKeywords?: string[];
  excludeKeywords?: string[];
  excludeUrlPatterns?: string[];
}

export interface PrefilterResult {
  pass: boolean;
  reason?: string;
  rankScore: number;
}

export function prefilterCandidate(
  url: string,
  title: string,
  text: string,
  config: PrefilterConfig = {}
): PrefilterResult {
  const lowerUrl = url.toLowerCase();
  const lowerContent = `${title} ${text}`.toLowerCase();

  // 1. URL Pattern Exclusions
  const urlExclusions = [...SHARED_URL_EXCLUSIONS, ...(config.excludeUrlPatterns || [])];
  for (const pattern of urlExclusions) {
    if (lowerUrl.includes(pattern)) {
      return { pass: false, reason: `URL matched exclusion pattern: ${pattern}`, rankScore: 0 };
    }
  }

  // 2. Text Keyword Exclusions
  const textExclusions = [...SHARED_TEXT_EXCLUSIONS, ...(config.excludeKeywords || [])];
  for (const kw of textExclusions) {
    if (lowerContent.includes(kw)) {
      return { pass: false, reason: `Content matched exclusion keyword: ${kw}`, rankScore: 0 };
    }
  }

  // 3. Include Keywords & Scoring
  let rankScore = 0;
  let hasIncludeMatch = false;

  const includeKws = config.includeKeywords || [];
  if (includeKws.length > 0) {
    for (const kw of includeKws) {
      if (lowerContent.includes(kw.toLowerCase())) {
        hasIncludeMatch = true;
        rankScore += 10;
      }
    }
    if (!hasIncludeMatch) {
      return { pass: false, reason: 'No bot include keywords matched', rankScore: 0 };
    }
  } else {
    // If no specific keywords are configured, default pass
    hasIncludeMatch = true;
    rankScore += 5;
  }

  // 4. Request-Language Bonus Terms
  for (const term of REQUEST_LANGUAGE_TERMS) {
    if (lowerContent.includes(term)) {
      rankScore += 15;
    }
  }

  return {
    pass: true,
    rankScore,
  };
}
