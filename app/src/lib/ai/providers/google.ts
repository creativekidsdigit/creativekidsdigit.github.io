import type { ProviderAdapter } from "../types";

const adapter: ProviderAdapter = {
  id: "google",
  label: "Google Gemini",
  defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
  needsApiKey: true,
  suggestedModels: [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
  async generate(opts, cfg) {
    const base = cfg.baseUrl || this.defaultBaseUrl;
    const url = `${base}/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey ?? "")}`;
    const start = performance.now();
    const res = await fetch(url, {
      method: "POST",
      signal: opts.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: opts.system
          ? { role: "system", parts: [{ text: opts.system }] }
          : undefined,
        contents: [{ role: "user", parts: [{ text: opts.user }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          maxOutputTokens: opts.maxTokens ?? 1800,
        },
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Google error ${res.status}: ${txt.slice(0, 400)}`);
    }
    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("") ?? "";
    return {
      text,
      provider: "google",
      model: cfg.model,
      ms: Math.round(performance.now() - start),
    };
  },
};

export default adapter;
