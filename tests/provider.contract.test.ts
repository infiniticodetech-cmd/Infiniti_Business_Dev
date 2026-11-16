import { describe, it, expect, vi } from 'vitest';
import { resolve } from '../lib/ai/registry';
import { OpenAIProvider } from '../lib/ai/openai.provider';
import { OllamaProvider } from '../lib/ai/ollama.provider';
import { AIProvider, ProviderNotImplementedError, StructuredRequest } from '../lib/ai/provider';

describe('AI Provider Registry & Contract Tests', () => {
  it('resolves ollama provider by default', () => {
    const { provider, model } = resolve('analyze_opportunity');
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama');
    expect(model).toBeDefined();
  });

  it('fails with intentional ProviderNotImplementedError when using OpenAIProvider stub', async () => {
    const openai = new OpenAIProvider();
    expect(openai.name).toBe('openai');

    const dummyReq: StructuredRequest<{ ok: boolean }> = {
      task: 'analyze_opportunity',
      system: 'system',
      prompt: 'prompt',
      jsonSchema: {},
      parse: (raw) => raw as { ok: boolean },
    };

    await expect(openai.generateStructured(dummyReq, 'gpt-4o')).rejects.toThrow(
      ProviderNotImplementedError
    );

    const health = await openai.healthCheck('gpt-4o');
    expect(health.ok).toBe(false);
    expect(health.detail).toContain('prepared but not implemented');
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
