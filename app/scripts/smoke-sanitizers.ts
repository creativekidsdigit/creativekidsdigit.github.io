// Adversarial smoke test for the storage sanitizers.
// Run with: npx tsx scripts/smoke-sanitizers.ts
// This script is not part of the build. It verifies that the hydration
// layer recovers from every form of corruption we can think of.

import {
  sanitizers,
  sanitizeSettings,
  sanitizeProduct,
} from "../src/lib/migrate";

let failed = 0;
function check(name: string, condition: boolean, detail?: unknown) {
  const ok = !!condition;
  if (!ok) failed++;
  console.log(`${ok ? "  PASS" : "  FAIL"} — ${name}`);
  if (!ok && detail !== undefined) console.log("       ", detail);
}

console.log("\n== sanitizers — hostile inputs ==\n");

// products
check("null → empty array", sanitizers.products(null).length === 0);
check("string → empty array", sanitizers.products("oops").length === 0);
check("number → empty array", sanitizers.products(42).length === 0);
check("object → empty array", sanitizers.products({ x: 1 }).length === 0);
check(
  "array of garbage → empty",
  sanitizers.products([1, "x", null, undefined, {}, { id: "" }]).length === 0
);
check(
  "array of one valid + garbage → only valid kept",
  sanitizers.products([
    null,
    { id: "p1", title: "Toolkit" },
    "junk",
    { title: "no id" },
  ]).length === 1
);

// fields are normalized
const sample = sanitizeProduct({
  id: "p1",
  title: "Toolkit",
  benefits: "not an array",
  keywords: ["k1", 7, null, "k2"],
  status: "make-believe",
  platform: 999,
});
check("benefits=string is coerced to []", sample?.benefits.length === 0);
check(
  "keywords filters non-strings",
  JSON.stringify(sample?.keywords) === JSON.stringify(["k1", "k2"])
);
check("unknown status falls back to 'idea'", sample?.status === "idea");
check("non-string platform falls back to 'other'", sample?.platform === "other");

// settings
const settingsCorrupt = sanitizeSettings({
  activeProvider: "no-such-provider",
  theme: "rainbow",
  providers: {
    openai: { apiKey: "sk-real", model: "gpt-4o" },
    bogus: { whatever: 1 },
  },
  brandVoice: 42,
});
check(
  "unknown activeProvider falls back",
  settingsCorrupt.activeProvider === "openai"
);
check("invalid theme falls back to system", settingsCorrupt.theme === "system");
check(
  "preserves real openai apiKey",
  settingsCorrupt.providers.openai.apiKey === "sk-real"
);
check(
  "fills in missing providers (anthropic etc.)",
  !!settingsCorrupt.providers.anthropic &&
    !!settingsCorrupt.providers.google &&
    !!settingsCorrupt.providers.openrouter &&
    !!settingsCorrupt.providers.ollama
);
check(
  "non-string brandVoice falls back to default (non-empty)",
  typeof settingsCorrupt.brandVoice === "string" &&
    settingsCorrupt.brandVoice.length > 0
);

// content
check("content from null → []", sanitizers.content(null).length === 0);
check(
  "content with missing id is dropped",
  sanitizers.content([{ title: "x" }, { id: "c1", title: "ok" }]).length === 1
);

// prompts
check(
  "prompts: missing name dropped",
  sanitizers.prompts([{ id: "x" }, { id: "y", name: "Real" }]).length === 1
);
check(
  "prompts: malformed versions filtered, valid kept",
  (() => {
    const out = sanitizers.prompts([
      {
        id: "p",
        name: "Real",
        versions: [null, { ts: 1, systemPrompt: "s", userPromptTemplate: "u" }, 5],
      },
    ]);
    return out[0]?.versions.length === 1;
  })()
);

// tasks / launches / ideas
check("tasks: empty id dropped", sanitizers.tasks([{ title: "x" }]).length === 0);
check(
  "launches: invalid channel falls back to 'other'",
  sanitizers.launches([
    { id: "l1", productId: "p", channel: "myspace", date: "2026-01-01" },
  ])[0].channel === "other"
);
check(
  "ideas: empty text dropped",
  sanitizers.ideas([{ id: "i1", text: "" }, { id: "i2", text: "ok" }]).length === 1
);

console.log(`\n${failed === 0 ? "ALL SMOKE TESTS PASSED" : `${failed} FAILED`}\n`);
process.exit(failed === 0 ? 0 : 1);
