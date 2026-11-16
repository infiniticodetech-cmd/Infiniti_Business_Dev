import { z } from 'zod';

export const OpportunityCategorySchema = z.enum([
  'website',
  'mobile_app',
  'custom_software',
  'ai_solution',
  'workflow_automation',
  'other',
  'none',
]);

export const SignalStrengthSchema = z.enum([
  'explicit_request',
  'strong_signal',
  'weak_signal',
  'none',
]);

export const IndustrySchema = z.enum([
  'agriculture',
  'automotive',
  'construction_real_estate',
  'education',
  'energy_utilities',
  'finance_insurance',
  'food_hospitality',
  'government_public_sector',
  'healthcare',
  'logistics_transport',
  'manufacturing',
  'media_marketing',
  'nonprofit',
  'professional_services',
  'retail_ecommerce',
  'technology',
  'travel_tourism',
  'other',
  'unknown',
]);

export const ScopeClaritySchema = z.enum(['clear', 'partial', 'vague']);

export const HypothesisSchema = z.object({
  text: z.string().max(250),
  basis: z.string().max(250),
});

export const AnalyzeOpportunityOutputSchema = z.object({
  is_relevant: z.boolean(),
  category: OpportunityCategorySchema,
  signal_strength: SignalStrengthSchema,
  company_name: z.string().nullable(),
  company_website_stated: z.string().nullable(),
  industry: IndustrySchema,
  location: z.string().nullable(),
  title: z.string().max(120),
  stated_requirement: z.string().max(400),
  evidence_quote: z.string().max(300),
  scope_clarity: ScopeClaritySchema,
  published_date_stated: z.string().nullable(),
  hypotheses: z.array(HypothesisSchema).max(2),
  reason: z.string().max(200),
});

export type AnalyzeOpportunityOutput = z.infer<typeof AnalyzeOpportunityOutputSchema>;

/**
 * Portable JSON Schema matching the Zod schema above for LLM structured output.
 */
export const AnalyzeOpportunityJsonSchema = {
  type: 'object',
  properties: {
    is_relevant: { type: 'boolean' },
    category: {
      type: 'string',
      enum: ['website', 'mobile_app', 'custom_software', 'ai_solution', 'workflow_automation', 'other', 'none'],
    },
    signal_strength: {
      type: 'string',
      enum: ['explicit_request', 'strong_signal', 'weak_signal', 'none'],
    },
    company_name: { type: ['string', 'null'] },
    company_website_stated: { type: ['string', 'null'] },
    industry: {
      type: 'string',
      enum: [
        'agriculture',
        'automotive',
        'construction_real_estate',
        'education',
        'energy_utilities',
        'finance_insurance',
        'food_hospitality',
        'government_public_sector',
        'healthcare',
        'logistics_transport',
        'manufacturing',
        'media_marketing',
        'nonprofit',
        'professional_services',
        'retail_ecommerce',
        'technology',
        'travel_tourism',
        'other',
        'unknown',
      ],
    },
    location: { type: ['string', 'null'] },
    title: { type: 'string', maxLength: 120 },
    stated_requirement: { type: 'string', maxLength: 400 },
    evidence_quote: { type: 'string', maxLength: 300 },
    scope_clarity: {
      type: 'string',
      enum: ['clear', 'partial', 'vague'],
    },
    published_date_stated: { type: ['string', 'null'] },
    hypotheses: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', maxLength: 250 },
          basis: { type: 'string', maxLength: 250 },
        },
        required: ['text', 'basis'],
      },
    },
    reason: { type: 'string', maxLength: 200 },
  },
  required: [
    'is_relevant',
    'category',
    'signal_strength',
    'company_name',
    'company_website_stated',
    'industry',
    'location',
    'title',
    'stated_requirement',
    'evidence_quote',
    'scope_clarity',
    'published_date_stated',
    'hypotheses',
    'reason',
  ],
};
