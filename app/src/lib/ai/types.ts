import type { ProviderConfig, ProviderId } from "@/types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  onToken?: (chunk: string) => void; // streaming
  signal?: AbortSignal;
}

export interface GenerateResult {
  text: string;
  provider: ProviderId;
  model: string;
  ms: number;
}

// Every provider adapter implements this interface.
// Adding a new provider = create one file that exports a default object matching this.
export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  // Returns suggested models. The user can still type a custom one in Settings.
  suggestedModels: string[];
  defaultBaseUrl: string;
  needsApiKey: boolean;
  generate(opts: GenerateOptions, cfg: ProviderConfig): Promise<GenerateResult>;
}
