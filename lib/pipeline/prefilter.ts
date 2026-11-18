
const SHARED_URL_EXCLUSIONS = [
  "/jobs/",
  "/job/",
  "/careers/",
  "/career/",
  "/vacancy/",
  "/vacancies/",
  "/apply/",
];

const SHARED_TEXT_EXCLUSIONS = [
  "we are hiring",
  "apply now",
  "salary range",
  "competitive salary",
  "full-time role",
  "employment type",
  "job description",
];

const REQUEST_LANGUAGE_TERMS = [
  "request for proposal",
  "request for proposals",
  "rfp",
  "rfq",
  "tender",
  "expression of interest",
  "seeking",
  "looking for",
  "invites proposals",
  "invites bids",
  "procurement",
];

export interface PrefilterConfig {
  includeKeywords?: string[];
  excludeKeywords?: string[];
  excludeUrlPatterns?: string[];
  allowHiringSignals?: boolean;
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

  // Bot 07 is specifically allowed to inspect public hiring signals.
  const urlExclusions = config.allowHiringSignals
    ? [...(config.excludeUrlPatterns || [])]
    : [
        ...SHARED_URL_EXCLUSIONS,
        ...(config.excludeUrlPatterns || []),
      ];

  for (const pattern of urlExclusions) {
    if (lowerUrl.includes(pattern.toLowerCase())) {
      return {
        pass: false,
        reason: `URL matched exclusion pattern: ${pattern}`,
        rankScore: 0,
      };
    }
  }

  const textExclusions = config.allowHiringSignals
    ? [...(config.excludeKeywords || [])]
    : [
        ...SHARED_TEXT_EXCLUSIONS,
        ...(config.excludeKeywords || []),
      ];

  for (const keyword of textExclusions) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      return {
        pass: false,
        reason: `Content matched exclusion keyword: ${keyword}`,
        rankScore: 0,
      };
    }
  }

  let rankScore = 0;
  const includeKeywords = config.includeKeywords || [];

  if (includeKeywords.length > 0) {
    const matched = includeKeywords.filter((keyword) =>
      lowerContent.includes(keyword.toLowerCase())
    );

    if (matched.length === 0) {
      return {
        pass: false,
        reason: "No bot include keywords matched",
        rankScore: 0,
      };
    }

    rankScore += matched.length * 10;
  } else {
    rankScore += 5;
  }

  for (const term of REQUEST_LANGUAGE_TERMS) {
    if (lowerContent.includes(term)) {
      rankScore += 15;
    }
  }

  return { pass: true, rankScore };
}
