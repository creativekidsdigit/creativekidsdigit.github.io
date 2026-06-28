// Public AI service. Modules call ai.generate(...) — never a provider directly.
import type { ProviderId, AppSettings } from "@/types";
import type { GenerateOptions, GenerateResult, ProviderAdapter } from "./types";
import openai from "./providers/openai";
import anthropic from "./providers/anthropic";
import google from "./providers/google";
import openrouter from "./providers/openrouter";
import ollama from "./providers/ollama";

const REGISTRY: Record<ProviderId, ProviderAdapter> = {
  openai,
  anthropic,
  google,
  openrouter,
  ollama,
};

export function getProvider(id: ProviderId): ProviderAdapter {
  return REGISTRY[id];
}

export function listProviders(): ProviderAdapter[] {
  return Object.values(REGISTRY);
}

export async function generate(
  opts: GenerateOptions,
  settings: AppSettings
): Promise<GenerateResult> {
  const pid = settings.activeProvider;
  const cfg = settings.providers[pid];
  const adapter = REGISTRY[pid];
  if (!adapter) throw new Error(`Unknown provider: ${pid}`);
  if (adapter.needsApiKey && !cfg?.apiKey) {
    throw new Error(
      `${adapter.label} requires an API key. Open Settings → AI Providers to add one.`
    );
  }
  if (!cfg?.model) {
    throw new Error(`${adapter.label}: no model selected in Settings.`);
  }
  return adapter.generate(opts, cfg);
}

export type { GenerateOptions, GenerateResult, ProviderAdapter };
