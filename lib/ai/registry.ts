import { AIProvider, AITask } from './provider';
import { OllamaProvider } from './ollama.provider';
import { OpenAIProvider } from './openai.provider';
import { env } from '../config/env';

const providers: Record<string, AIProvider> = {
  ollama: new OllamaProvider(),
  openai: new OpenAIProvider(),
};

interface TaskRouteConfig {
  provider: string;
  model: string;
}

export function resolve(task: AITask): { provider: AIProvider; model: string } {
  let routingMap: Record<string, TaskRouteConfig> = {};

  try {
    routingMap = JSON.parse(env.AI_TASK_ROUTING);
  } catch (err) {
    console.warn('Failed to parse AI_TASK_ROUTING, falling back to env defaults', err);
  }

  const route = routingMap[task];
  const providerName = route?.provider || env.AI_PROVIDER;
  const model = route?.model || env.OLLAMA_MODEL;

  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`AI Provider '${providerName}' is not registered`);
  }

  return { provider, model };
}
