import type { ProviderAdapter } from "../types";

const adapter: ProviderAdapter = {
  id: "anthropic",
  label: "Anthropic",
  defaultBaseUrl: "https://api.anthropic.com/v1",
  needsApiKey: true,
  suggestedModels: [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
    "claude-3-7-sonnet-latest",
    "claude-3-5-haiku-latest",
  ],
  async generate(opts, cfg) {
    const url = `${cfg.baseUrl || this.defaultBaseUrl}/messages`;
    const start = performance.now();
    const res = await fetch(url, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey ?? "",
        "anthropic-version": "2023-06-01",
        // Allow direct browser calls when the key is user-owned.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: opts.maxTokens ?? 1800,
        temperature: opts.temperature ?? 0.7,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Anthropic error ${res.status}: ${txt.slice(0, 400)}`);
    }
    const data = await res.json();
    const text: string =
      Array.isArray(data?.content) && data.content[0]?.type === "text"
        ? data.content.map((c: { type: string; text?: string }) => c.text || "").join("")
        : "";
    return {
      text,
      provider: "anthropic",
      model: cfg.model,
      ms: Math.round(performance.now() - start),
    };
  },
};

export default adapter;
