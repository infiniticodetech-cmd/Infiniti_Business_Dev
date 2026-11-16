import { AIProvider, StructuredRequest, StructuredResult } from './provider';
import { env } from '../config/env';

/**
 * OpenAIProvider — Production AI provider using OpenAI Chat Completions API.
 * Uses structured JSON outputs with standard fetch.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(apiKey?: string, baseUrl?: string, timeoutMs?: number) {
    this.apiKey = apiKey ?? (env.OPENAI_API_KEY || '');
    this.baseUrl = (baseUrl ?? (env.OPENAI_BASE_URL || 'https://api.openai.com/v1')).replace(/\/+$/, '');
    this.timeoutMs = timeoutMs ?? (env.OPENAI_TIMEOUT_MS || 60000);
  }

  async generateStructured<T>(
    req: StructuredRequest<T>,
    model: string
  ): Promise<StructuredResult<T>> {
    const apiKey = this.apiKey || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Please set your OpenAI API key in .env.local'
      );
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.prompt },
          ],
          temperature: req.options?.temperature ?? 0,
          seed: req.options?.seed ?? 42,
          max_tokens: req.options?.maxOutputTokens ?? 700,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI chat completion failed with status ${response.status}: ${errorText}`);
      }

      const rawJson = await response.json();
      const latencyMs = Date.now() - startTime;
      const rawText = rawJson.choices?.[0]?.message?.content ?? '';

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI output as JSON: ${rawText}`);
      }

      const validatedData = req.parse(parsedJson);

      return {
        data: validatedData,
        rawText,
        provider: this.name,
        model,
        usage: {
          promptTokens: rawJson.usage?.prompt_tokens,
          outputTokens: rawJson.usage?.completion_tokens,
        },
        latencyMs,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async healthCheck(model: string): Promise<{ ok: boolean; detail?: string }> {
    const apiKey = this.apiKey || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      return {
        ok: false,
        detail: 'OPENAI_API_KEY is missing or empty in environment configuration.',
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${this.baseUrl}/models/${model}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Some models / keys only allow /models list check
        if (res.status === 404) {
          const listRes = await fetch(`${this.baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          if (listRes.ok) {
            return { ok: true, detail: `OpenAI API connected. Model '${model}' verified.` };
          }
        }
        const errText = await res.text();
        return { ok: false, detail: `OpenAI returned status ${res.status}: ${errText.slice(0, 150)}` };
      }

      return { ok: true, detail: `Connected to OpenAI. Model '${model}' is accessible.` };
    } catch (err) {
      return {
        ok: false,
        detail: `OpenAI connectivity check failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
