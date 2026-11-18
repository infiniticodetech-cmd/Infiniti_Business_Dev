
import type { OpportunityCategory } from "@/lib/db/types";

export interface BotConfig {
  id: number;
  code: string;
  name: string;
  category: OpportunityCategory | null;
  promptHint: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  excludeUrlPatterns: string[];
  allowHiringSignals?: boolean;
}

export const BOT_CONFIGS: Record<number, BotConfig> = {
  6: {
    id: 6,
    code: "public_project_request_finder",
    name: "Public Project Request Finder",
    category: null,
    promptHint:
      "Identify public-sector or private-sector technology project requests, tenders, RFPs, RFQs, procurement notices, and expressions of interest. Require explicit evidence of a technology requirement.",
    includeKeywords: [
      "request for proposal",
      "request for proposals",
      "rfp",
      "rfq",
      "tender",
      "e-tender",
      "procurement",
      "expression of interest",
      "invites bids",
      "invitation to bid",
      "software development",
      "IT services",
      "information technology",
      "digital platform",
      "website development",
      "application development",
    ],
    excludeKeywords: [
      "result of tender",
      "tender awarded",
      "contract awarded",
      "cancelled tender",
    ],
    excludeUrlPatterns: [],
  },

  7: {
    id: 7,
    code: "tech_hiring_signal_analyst",
    name: "Technology Hiring Signal Analyst",
    category: null,
    promptHint:
      "Analyse publicly available technology hiring announcements as business-development signals. Identify evidence of technology team expansion, software engineering needs, AI/ML hiring, cloud migration, data engineering, or digital transformation. Hiring is a market signal, not proof that the company is buying external services. Never extract personal names, personal emails, or phone numbers.",
    includeKeywords: [
      "software engineer",
      "software developer",
      "frontend developer",
      "backend developer",
      "full stack developer",
      "AI engineer",
      "machine learning engineer",
      "data engineer",
      "cloud engineer",
      "DevOps engineer",
      "mobile app developer",
      "technology team",
      "engineering team",
      "digital transformation",
    ],
    excludeKeywords: [],
    excludeUrlPatterns: [],
    allowHiringSignals: true,
  },

  8: {
    id: 8,
    code: "crm_erp_opportunity_finder",
    name: "CRM/ERP Opportunity Finder",
    category: "custom_software",
    promptHint:
      "Find explicit public requirements for CRM, ERP, enterprise software, business management systems, inventory systems, billing systems, customer relationship management, or enterprise resource planning. Do not assume a company needs a CRM or ERP merely because it is growing.",
    includeKeywords: [
      "CRM",
      "customer relationship management",
      "ERP",
      "enterprise resource planning",
      "inventory management system",
      "business management software",
      "sales management system",
      "HR management system",
      "finance management system",
      "accounting software",
      "enterprise software",
      "system integration",
      "legacy system modernization",
    ],
    excludeKeywords: [],
    excludeUrlPatterns: [],
  },

  9: {
    id: 9,
    code: "digital_presence_review",
    name: "Digital Presence Review",
    category: "website",
    promptHint:
      "Review public evidence of a company's digital presence and identify explicitly stated website redevelopment, accessibility, mobile usability, performance, content-management, or digital-platform requirements. Do not claim a website is defective based only on an unsupported visual impression. Separate observable facts from hypotheses.",
    includeKeywords: [
      "website redesign",
      "website redevelopment",
      "website development",
      "web development",
      "website maintenance",
      "mobile friendly",
      "mobile responsive",
      "website accessibility",
      "website performance",
      "page speed",
      "content management system",
      "CMS",
      "digital platform",
      "online portal",
      "ecommerce website",
    ],
    excludeKeywords: [],
    excludeUrlPatterns: [],
  },

  10: {
    id: 10,
    code: "it_outsourcing_partner_finder",
    name: "IT Outsourcing Partner Finder",
    category: null,
    promptHint:
      "Identify public requests for IT outsourcing, software development partners, managed IT services, application maintenance, dedicated development teams, technology implementation partners, and external IT vendors. Distinguish an explicit request for an external partner from a general technology announcement.",
    includeKeywords: [
      "IT outsourcing",
      "software outsourcing",
      "outsourcing partner",
      "technology partner",
      "implementation partner",
      "IT services provider",
      "managed IT services",
      "application maintenance",
      "software development partner",
      "dedicated development team",
      "vendor registration",
      "empanelment",
      "request for proposal",
      "RFP",
      "expression of interest",
    ],
    excludeKeywords: [],
    excludeUrlPatterns: [],
  },
};

export function getBotConfig(botId: number): BotConfig | undefined {
  return BOT_CONFIGS[botId];
}
