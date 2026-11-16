import crypto from 'crypto';
import { supabaseAdmin } from '../db/admin';
import { analyzeOpportunity, PROMPT_VERSION } from '../ai/tasks/analyzeOpportunity';
import { AnalyzeOpportunityOutput, AnalyzeOpportunityOutputSchema } from '../ai/schemas';
import { resolve } from '../ai/registry';

export interface UnderstandResult {
  analysis: AnalyzeOpportunityOutput;
  contentHash: string;
  fromCache: boolean;
  quoteInSource: boolean;
  latencyMs: number;
}

export function computeContentHash(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function checkQuoteInSource(quote: string, sourceText: string): boolean {
  if (!quote || !sourceText) return false;
  const normQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
  const normSource = sourceText.toLowerCase().replace(/\s+/g, ' ').trim();
  return normSource.includes(normQuote);
}

export async function understandOpportunity(params: {
  url: string;
  excerpt: string;
  promptHint: string;
}): Promise<UnderstandResult> {
  const contentHash = computeContentHash(params.excerpt);
  const { provider, model } = resolve('analyze_opportunity');
  const task = 'analyze_opportunity';

  // 1. Check AI Result Cache (skip remote DB call in vitest test runner)
  if (!process.env.VITEST) {
    try {
      const { data: cached } = await supabaseAdmin
        .from('ai_analyses')
        .select('output, valid, error, latency_ms')
        .eq('content_hash', contentHash)
        .eq('task', task)
        .eq('prompt_version', PROMPT_VERSION)
        .eq('provider', provider.name)
        .eq('model', model)
        .abortSignal(AbortSignal.timeout(1000))
        .maybeSingle();

      const row = cached as any;
      if (row && row.valid && row.output) {
        const parsed = AnalyzeOpportunityOutputSchema.safeParse(row.output);
        if (parsed.success) {
          const quoteInSource = checkQuoteInSource(parsed.data.evidence_quote, params.excerpt);
          return {
            analysis: parsed.data,
            contentHash,
            fromCache: true,
            quoteInSource,
            latencyMs: row.latency_ms || 0,
          };
        }
      }
    } catch {
      // If cache lookup errors, proceed with fresh generation
    }
  }

  // 2. Call AI Gateway (with single repair retry if needed)
  let analysis: AnalyzeOpportunityOutput;
  let latencyMs = 0;
  let rawText = '';
  let promptTokens = 0;
  let outputTokens = 0;
  let valid = true;
  let errorMessage: string | null = null;

  try {
    const result = await analyzeOpportunity({
      url: params.url,
      excerpt: params.excerpt,
      promptHint: params.promptHint,
    });
    analysis = result.data;
    latencyMs = result.latencyMs;
    rawText = result.rawText;
    promptTokens = result.usage.promptTokens || 0;
    outputTokens = result.usage.outputTokens || 0;
  } catch (firstError) {
    // Single repair-retry attempt
    try {
      const retryResult = await analyzeOpportunity({
        url: params.url,
        excerpt: params.excerpt,
        promptHint: `${params.promptHint}. Return strictly conforming JSON matching the schema.`,
      });
      analysis = retryResult.data;
      latencyMs = retryResult.latencyMs;
      rawText = retryResult.rawText;
      promptTokens = retryResult.usage.promptTokens || 0;
      outputTokens = retryResult.usage.outputTokens || 0;
    } catch (secondError) {
      valid = false;
      errorMessage = secondError instanceof Error ? secondError.message : String(secondError);

      if (!process.env.VITEST) {
        try {
          await (supabaseAdmin.from('ai_analyses') as any).upsert({
            content_hash: contentHash,
            task,
            prompt_version: PROMPT_VERSION,
            provider: provider.name,
            model,
            output: null,
            valid: false,
            error: errorMessage,
            latency_ms: 0,
          });
        } catch {}
      }

      throw new Error(`AI analysis failed: ${errorMessage}`);
    }
  }

  // 3. Hallucination Guard: Verbatim Quote Check (D2-AI-02)
  const quoteInSource = checkQuoteInSource(analysis.evidence_quote, params.excerpt);
  if (!quoteInSource) {
    // Downgrade signal by one level when quote is not verbatim
    if (analysis.signal_strength === 'explicit_request') {
      analysis.signal_strength = 'strong_signal';
    } else if (analysis.signal_strength === 'strong_signal') {
      analysis.signal_strength = 'weak_signal';
    } else if (analysis.signal_strength === 'weak_signal') {
      analysis.signal_strength = 'none';
    }
  }

  // 4. Save Valid Result to ai_analyses
  if (!process.env.VITEST) {
    try {
      await (supabaseAdmin.from('ai_analyses') as any).upsert({
        content_hash: contentHash,
        task,
        prompt_version: PROMPT_VERSION,
        provider: provider.name,
        model,
        output: analysis as any,
        valid: true,
        error: null,
        prompt_tokens: promptTokens,
        output_tokens: outputTokens,
        latency_ms: latencyMs,
      });
    } catch {}
  }

  return {
    analysis,
    contentHash,
    fromCache: false,
    quoteInSource,
    latencyMs,
  };
}
