import type { ProviderAdapter } from "../types";

// OpenRouter is OpenAI-compatible. We re-use the same shape.
const adapter: ProviderAdapter = {
  id: "openrouter",
  label: "OpenRouter",
  defaultBaseUrl: "https://openrouter.ai/api/v1",
  needsApiKey: true,
  suggestedModels: [
    "anthropic/claude-sonnet-4.5",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-2.5-pro",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
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
        "HTTP-Referer": window.location.origin,
        "X-Title": "AI Copywriting OS",
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
      throw new Error(`OpenRouter error ${res.status}: ${txt.slice(0, 400)}`);
    }
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return {
      text,
      provider: "openrouter",
      model: cfg.model,
      ms: Math.round(performance.now() - start),
    };
  },
};

export default adapter;
