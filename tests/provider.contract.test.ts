import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from '../lib/ai/registry';
import { OpenAIProvider } from '../lib/ai/openai.provider';
import { OllamaProvider } from '../lib/ai/ollama.provider';
import { AIProvider, StructuredRequest } from '../lib/ai/provider';

describe('AI Provider Registry & Contract Tests', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('resolves openai provider by default', () => {
    const { provider, model } = resolve('analyze_opportunity');
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.name).toBe('openai');
    expect(model).toBe('gpt-4o-mini');
  });

  it('handles OpenAI missing API key cleanly in generateStructured and healthCheck', async () => {
    const openai = new OpenAIProvider('');
    expect(openai.name).toBe('openai');

    const dummyReq: StructuredRequest<{ ok: boolean }> = {
      task: 'analyze_opportunity',
      system: 'system',
      prompt: 'prompt',
      jsonSchema: {},
      parse: (raw) => raw as { ok: boolean },
    };

    await expect(openai.generateStructured(dummyReq, 'gpt-4o-mini')).rejects.toThrow(
      'OPENAI_API_KEY is not set'
    );

    const health = await openai.healthCheck('gpt-4o-mini');
    expect(health.ok).toBe(false);
    expect(health.detail).toContain('OPENAI_API_KEY is missing');
  });

  it('successfully generates structured output via OpenAIProvider with mocked fetch', async () => {
    const mockResponsePayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({ is_relevant: true, score: 95 }),
          },
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 45,
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponsePayload,
      text: async () => JSON.stringify(mockResponsePayload),
    } as any);

    const openai = new OpenAIProvider('sk-mock-key-12345');
    const dummyReq: StructuredRequest<{ is_relevant: boolean; score: number }> = {
      task: 'analyze_opportunity',
      system: 'system prompt',
      prompt: 'user prompt',
      jsonSchema: { type: 'object' },
      parse: (raw) => raw as { is_relevant: boolean; score: number },
    };

    const result = await openai.generateStructured(dummyReq, 'gpt-4o-mini');
    expect(result.data.is_relevant).toBe(true);
    expect(result.data.score).toBe(95);
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.usage.promptTokens).toBe(120);
    expect(result.usage.outputTokens).toBe(45);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('verifies OllamaProvider conforms to AIProvider contract', () => {
    const ollama = new OllamaProvider('http://localhost:11434');
    expect(ollama.name).toBe('ollama');
    expect(typeof ollama.generateStructured).toBe('function');
    expect(typeof ollama.healthCheck).toBe('function');
  });

  it('verifies that any compliant AIProvider conforms to the interface contract', async () => {
    // Mock compliant provider
    const mockProvider: AIProvider = {
      name: 'mock-llm',
      generateStructured: vi.fn().mockResolvedValue({
        data: { test: true },
        rawText: '{"test":true}',
        provider: 'mock-llm',
        model: 'mock-model',
        usage: { promptTokens: 10, outputTokens: 5 },
        latencyMs: 42,
      }),
      healthCheck: vi.fn().mockResolvedValue({ ok: true, detail: 'Healthy' }),
    };

    const req: StructuredRequest<{ test: boolean }> = {
      task: 'analyze_opportunity',
      system: 'Test System',
      prompt: 'Test Prompt',
      jsonSchema: { type: 'object' },
      parse: (raw) => raw as { test: boolean },
    };

    const result = await mockProvider.generateStructured(req, 'mock-model');
    expect(result.data.test).toBe(true);
    expect(result.provider).toBe('mock-llm');
    expect(result.latencyMs).toBe(42);

    const health = await mockProvider.healthCheck('mock-model');
    expect(health.ok).toBe(true);
  });
});
