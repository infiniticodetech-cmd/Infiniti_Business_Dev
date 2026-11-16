export type AITask = 'analyze_opportunity';

export class ProviderNotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderNotImplementedError';
  }
}

export interface StructuredRequest<T> {
  task: AITask;
  system: string;
  prompt: string;
  jsonSchema: object;
  parse: (raw: unknown) => T;
  options?: {
    maxOutputTokens?: number;
    temperature?: number;
    seed?: number;
  };
}

export interface StructuredResult<T> {
  data: T;
  rawText: string;
  provider: string;
  model: string;
  usage: {
    promptTokens?: number;
    outputTokens?: number;
  };
  latencyMs: number;
}

export interface AIProvider {
  readonly name: string;
  generateStructured<T>(req: StructuredRequest<T>, model: string): Promise<StructuredResult<T>>;
  healthCheck(model: string): Promise<{ ok: boolean; detail?: string }>;
}
