import { AIProvider, ProviderNotImplementedError, StructuredRequest, StructuredResult } from './provider';

/**
 * OpenAIProvider — Prepared, not implemented in this MVP phase.
 * Ready for future configuration-only switch.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  async generateStructured<T>(
    _req: StructuredRequest<T>,
    _model: string
  ): Promise<StructuredResult<T>> {
    throw new ProviderNotImplementedError(
      'OpenAI provider is prepared but not implemented in this phase.'
    );
  }

  async healthCheck(_model: string): Promise<{ ok: boolean; detail?: string }> {
    return { ok: false, detail: 'OpenAI provider is prepared but not implemented in this phase.' };
  }
}
