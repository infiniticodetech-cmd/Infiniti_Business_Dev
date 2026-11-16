import { AIProvider, StructuredRequest, StructuredResult } from './provider';
import { env } from '../config/env';

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl?: string, timeoutMs?: number) {
    this.baseUrl = baseUrl || env.OLLAMA_BASE_URL;
    this.timeoutMs = timeoutMs || env.OLLAMA_TIMEOUT_MS;
  }

  async generateStructured<T>(
    req: StructuredRequest<T>,
    model: string
  ): Promise<StructuredResult<T>> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          format: req.jsonSchema,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.prompt },
          ],
          options: {
            temperature: req.options?.temperature ?? 0,
            seed: req.options?.seed ?? 42,
            num_ctx: env.OLLAMA_NUM_CTX,
            num_predict: req.options?.maxOutputTokens ?? 700,
          },
          keep_alive: '30m',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama chat failed with status ${response.status}: ${errorText}`);
      }

      const rawJson = await response.json();
      const latencyMs = Date.now() - startTime;
      const rawText = rawJson.message?.content ?? '';

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Failed to parse Ollama output as JSON: ${rawText}`);
      }

      const validatedData = req.parse(parsedJson);

      return {
        data: validatedData,
        rawText,
        provider: this.name,
        model,
        usage: {
          promptTokens: rawJson.prompt_eval_count,
          outputTokens: rawJson.eval_count,
        },
        latencyMs,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async healthCheck(model: string): Promise<{ ok: boolean; detail?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { ok: false, detail: `Ollama returned status ${res.status}` };
      }

      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models : [];
      const hasModel = models.some(
        (m: { name?: string }) => m.name === model || m.name?.startsWith(`${model}:`)
      );

      if (!hasModel) {
        return {
          ok: false,
          detail: `Model '${model}' not found in installed models (${models.map((m: { name: string }) => m.name).join(', ')})`,
        };
      }

      return { ok: true, detail: `Ollama reachable and model '${model}' is ready.` };
    } catch (err) {
      return {
        ok: false,
        detail: `Could not connect to Ollama at ${this.baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
