import type { ProviderAdapter } from "../types";

// Local models via Ollama. Requires CORS to be enabled on the user's Ollama daemon
// (OLLAMA_ORIGINS=* ollama serve).
const adapter: ProviderAdapter = {
  id: "ollama",
  label: "Local (Ollama)",
  defaultBaseUrl: "http://localhost:11434",
  needsApiKey: false,
  suggestedModels: [
    "llama3.2",
    "llama3.1:8b",
    "qwen2.5:7b",
    "mistral",
    "phi3",
  ],
  async generate(opts, cfg) {
    const url = `${cfg.baseUrl || this.defaultBaseUrl}/api/chat`;
    const start = performance.now();
    const messages = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: opts.user });

    const res = await fetch(url, {
      method: "POST",
      signal: opts.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        stream: false,
        options: {
          temperature: opts.temperature ?? 0.7,
          num_predict: opts.maxTokens ?? 1800,
        },
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Ollama error ${res.status}: ${txt.slice(0, 400)}`);
    }
    const data = await res.json();
    const text: string = data?.message?.content ?? "";
    return {
      text,
      provider: "ollama",
      model: cfg.model,
      ms: Math.round(performance.now() - start),
    };
  },
};

export default adapter;
