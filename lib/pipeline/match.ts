import { supabaseAdmin } from '../db/admin';
import { OpportunityCategory } from '../db/types';

export interface ServiceProfileRow {
  service_key: string;
  name: string;
  category: OpportunityCategory;
  keywords: string[];
  active: boolean;
  approved_by_owner: boolean;
}

export interface MatchResult {
  matchedServiceKeys: string[];
  fitPoints: number;
  flags: string[];
}

// Fallback in-memory service profile matching 0003_seed.sql
const DEFAULT_SERVICE_PROFILES: ServiceProfileRow[] = [
  {
    service_key: 'website_development',
    name: 'Website Design, Redevelopment & Maintenance',
    category: 'website',
    keywords: ['website', 'web design', 'redesign', 'redevelopment', 'cms', 'web development', 'wordpress', 'nextjs'],
    active: true,
    approved_by_owner: true,
  },
  {
    service_key: 'mobile_app_development',
    name: 'Mobile Application Development',
    category: 'mobile_app',
    keywords: ['mobile app', 'ios', 'android', 'cross-platform', 'flutter', 'react native', 'mobile application'],
    active: true,
    approved_by_owner: true,
  },
  {
    service_key: 'custom_software',
    name: 'Custom Software & B2B Portals',
    category: 'custom_software',
    keywords: ['custom software', 'portal', 'platform', 'internal tool', 'web application', 'bespoke', 'saas'],
    active: true,
    approved_by_owner: true,
  },
  {
    service_key: 'ai_solutions',
    name: 'AI Solutions & Conversational Agents',
    category: 'ai_solution',
    keywords: ['chatbot', 'ai assistant', 'document processing', 'llm', 'machine learning', 'ai integration', 'rag'],
    active: true,
    approved_by_owner: true,
  },
  {
    service_key: 'workflow_automation',
    name: 'Workflow Automation & Integrations',
    category: 'workflow_automation',
    keywords: ['workflow automation', 'process automation', 'integration', 'rpa', 'automate', 'webhook', 'n8n'],
    active: true,
    approved_by_owner: true,
  },
  {
    service_key: 'crm_erp_integration',
    name: 'CRM & ERP Systems Implementation',
    category: 'custom_software',
    keywords: ['crm', 'erp', 'customer management', 'system integration', 'salesforce', 'hubspot'],
    active: true,
    approved_by_owner: true,
  },
];

const MIN_CRITERIA_EXCLUDE = ['internship', 'volunteer', 'unpaid', 'free of charge', 'equity only'];

export async function matchOpportunity(
  category: OpportunityCategory,
  title: string,
  statedRequirement: string,
  evidenceQuote: string
): Promise<MatchResult> {
  let services = DEFAULT_SERVICE_PROFILES;

  // In test environment or offline, avoid waiting on remote DB connection
  if (!process.env.VITEST) {
    try {
      const { data } = await supabaseAdmin
        .from('service_profile')
        .select('service_key, name, category, keywords, active, approved_by_owner')
        .eq('active', true)
        .eq('approved_by_owner', true)
        .abortSignal(AbortSignal.timeout(1000));
      if (data && data.length > 0) {
        services = data as ServiceProfileRow[];
      }
    } catch {
      // In test/mock mode use default profiles
    }
  }

  const combinedText = `${title} ${statedRequirement} ${evidenceQuote}`.toLowerCase();
  const matchedServiceKeys: string[] = [];
  const flags: string[] = [];

  let maxCategoryAndKeywords = false;
  let hasCategoryOrKeyword = false;

  for (const s of services) {
    const categoryMatches = s.category === category;
    let keywordHits = 0;

    for (const kw of s.keywords) {
      if (combinedText.includes(kw.toLowerCase())) {
        keywordHits++;
      }
    }

    if (categoryMatches || keywordHits > 0) {
      matchedServiceKeys.push(s.service_key);
      hasCategoryOrKeyword = true;

      if (categoryMatches && keywordHits >= 2) {
        maxCategoryAndKeywords = true;
      }
    }
  }

  // Calculate Fit Points
  let fitPoints = 0;
  if (maxCategoryAndKeywords) {
    fitPoints = 25;
  } else if (hasCategoryOrKeyword) {
    fitPoints = 15;
  } else {
    fitPoints = 0;
  }

  // Check minimum project criteria (e.g. excluded volunteer/unpaid keywords)
  for (const excluded of MIN_CRITERIA_EXCLUDE) {
    if (combinedText.includes(excluded)) {
      flags.push(`Violates minimum criteria: contains '${excluded}'`);
      fitPoints = Math.min(fitPoints, 10);
    }
  }

  return {
    matchedServiceKeys,
    fitPoints,
    flags,
  };
}
