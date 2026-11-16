import { resolve } from '../registry';
import { StructuredResult } from '../provider';
import {
  AnalyzeOpportunityJsonSchema,
  AnalyzeOpportunityOutput,
  AnalyzeOpportunityOutputSchema,
} from '../schemas';
import { PROMPT_VERSION, SYSTEM_PROMPT_V1, renderUserPromptV1 } from '../prompts/analyze_opportunity.v1';

export async function analyzeOpportunity(params: {
  url: string;
  excerpt: string;
  promptHint: string;
}): Promise<StructuredResult<AnalyzeOpportunityOutput>> {
  const { provider, model } = resolve('analyze_opportunity');

  const result = await provider.generateStructured<AnalyzeOpportunityOutput>(
    {
      task: 'analyze_opportunity',
      system: SYSTEM_PROMPT_V1,
      prompt: renderUserPromptV1(params),
      jsonSchema: AnalyzeOpportunityJsonSchema,
      parse: (raw) => AnalyzeOpportunityOutputSchema.parse(raw),
      options: {
        temperature: 0,
        seed: 42,
        maxOutputTokens: 700,
      },
    },
    model
  );

  return result;
}

export { PROMPT_VERSION };
