import type { ProviderAdapter } from "../types";

const adapter: ProviderAdapter = {
  id: "openai",
  label: "OpenAI",
  defaultBaseUrl: "https://api.openai.com/v1",
  needsApiKey: true,
  suggestedModels: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    "o4-mini",
  ],
  async generate(opts, cfg) {
    const url = `${cfg.baseUrl || this.defaultBaseUrl}/chat/completions`;
    const start = performance.now();
    const messages = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: opts.user });

    const res = await fetch(url, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey ?? ""}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 1800,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`OpenAI error ${res.status}: ${txt.slice(0, 400)}`);
    }
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return {
      text,
      provider: "openai",
      model: cfg.model,
      ms: Math.round(performance.now() - start),
    };
  },
};

export default adapter;
