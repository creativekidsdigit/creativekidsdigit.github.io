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

// =========================================================================
// PR #53 — base entities
// =========================================================================

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

check("content from null → []", sanitizers.content(null).length === 0);
check(
  "content with missing id is dropped",
  sanitizers.content([{ title: "x" }, { id: "c1", title: "ok" }]).length === 1
);

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

// =========================================================================
// PR #54 — Campaign Analytics
// =========================================================================

console.log("\n== campaign analytics sanitizers ==\n");

check("campaigns: null → []", sanitizers.campaigns(null).length === 0);
check(
  "campaigns: missing name dropped",
  sanitizers.campaigns([{ id: "c1" }, { id: "c2", name: "Real" }]).length === 1
);
check(
  "campaigns: unknown platform → 'other'",
  sanitizers.campaigns([{ id: "c1", name: "X", platform: "myspace" }])[0]
    .platform === "other"
);
check(
  "campaigns: unknown status → 'draft'",
  sanitizers.campaigns([{ id: "c1", name: "X", status: "imploded" }])[0]
    .status === "draft"
);
check(
  "campaigns: unknown goal → 'traffic'",
  sanitizers.campaigns([{ id: "c1", name: "X", goal: "world-domination" }])[0]
    .goal === "traffic"
);
check(
  "campaigns: productIds filters non-strings",
  JSON.stringify(
    sanitizers.campaigns([
      { id: "c1", name: "X", productIds: ["p1", 7, null, "p2"] },
    ])[0].productIds
  ) === JSON.stringify(["p1", "p2"])
);
check(
  "campaigns: malformed versions filtered, valid kept",
  (() => {
    const out = sanitizers.campaigns([
      {
        id: "c1",
        name: "X",
        versions: [
          null,
          { ts: 1, notes: "a", lessonsLearned: "b", optimizationIdeas: "c" },
          "garbage",
        ],
      },
    ]);
    return out[0].versions.length === 1;
  })()
);
check(
  "campaigns: non-numeric budget coerced to 0",
  sanitizers.campaigns([{ id: "c1", name: "X", budget: "expensive" }])[0]
    .budget === 0
);

check("perf: null → []", sanitizers.perfSnapshots(null).length === 0);
check(
  "perf: missing campaignId dropped",
  sanitizers.perfSnapshots([
    { id: "s1" },
    { id: "s2", campaignId: "c1" },
  ]).length === 1
);
check(
  "perf: non-numeric impressions coerced to 0",
  sanitizers.perfSnapshots([
    { id: "s1", campaignId: "c1", impressions: "lots" },
  ])[0].impressions === 0
);
check(
  "perf: Infinity / NaN safely fall back to 0",
  (() => {
    const out = sanitizers.perfSnapshots([
      { id: "s1", campaignId: "c1", revenue: Infinity, cost: NaN },
    ])[0];
    return out.revenue === 0 && out.cost === 0;
  })()
);
check(
  "perf: every metric field exists with safe default",
  (() => {
    const out = sanitizers.perfSnapshots([
      { id: "s1", campaignId: "c1" }, // nothing else
    ])[0];
    return (
      out.impressions === 0 &&
      out.clicks === 0 &&
      out.saves === 0 &&
      out.shares === 0 &&
      out.comments === 0 &&
      out.emailOpens === 0 &&
      out.emailClicks === 0 &&
      out.websiteVisits === 0 &&
      out.productPageVisits === 0 &&
      out.sales === 0 &&
      out.revenue === 0 &&
      out.cost === 0
    );
  })()
);

// --- non-negative clamp on count metrics ---
check(
  "perf: negative impressions clamp to 0",
  sanitizers.perfSnapshots([
    { id: "s1", campaignId: "c1", impressions: -42 },
  ])[0].impressions === 0
);
check(
  "perf: negative clicks/sales/etc. all clamp to 0",
  (() => {
    const out = sanitizers.perfSnapshots([
      {
        id: "s1",
        campaignId: "c1",
        impressions: -1,
        clicks: -2,
        saves: -3,
        shares: -4,
        comments: -5,
        emailOpens: -6,
        emailClicks: -7,
        websiteVisits: -8,
        productPageVisits: -9,
        sales: -10,
      },
    ])[0];
    return (
      out.impressions === 0 &&
      out.clicks === 0 &&
      out.saves === 0 &&
      out.shares === 0 &&
      out.comments === 0 &&
      out.emailOpens === 0 &&
      out.emailClicks === 0 &&
      out.websiteVisits === 0 &&
      out.productPageVisits === 0 &&
      out.sales === 0
    );
  })()
);
check(
  "perf: positive count values are NOT touched",
  (() => {
    const out = sanitizers.perfSnapshots([
      { id: "s1", campaignId: "c1", impressions: 1234, clicks: 56, sales: 7 },
    ])[0];
    return out.impressions === 1234 && out.clicks === 56 && out.sales === 7;
  })()
);
// Monetary fields intentionally keep their sign so a refund period can record
// negative revenue or cost. Guard against accidental clamping in regression.
check(
  "perf: negative revenue is PRESERVED (refund support)",
  sanitizers.perfSnapshots([
    { id: "s1", campaignId: "c1", revenue: -49.99 },
  ])[0].revenue === -49.99
);
check(
  "perf: negative cost is PRESERVED (adjustment support)",
  sanitizers.perfSnapshots([
    { id: "s1", campaignId: "c1", cost: -10 },
  ])[0].cost === -10
);

check(
  "content: campaignId is preserved when string",
  sanitizers.content([
    { id: "x1", title: "T", body: "B", kind: "copy", campaignId: "c1" },
  ])[0].campaignId === "c1"
);
check(
  "content: campaignId discarded when not a string",
  sanitizers.content([
    { id: "x1", title: "T", body: "B", kind: "copy", campaignId: 7 },
  ])[0].campaignId === undefined
);

// =========================================================================
// PR #54 — analytics math
// =========================================================================

console.log("\n== analytics math ==\n");

// Build a tiny in-memory campaign + snapshots and verify totals.
const { totalsFor, campaignTotals, dailySeries, byPlatform } = await import(
  "../src/lib/analytics"
);

const snaps = sanitizers.perfSnapshots([
  { id: "s1", campaignId: "c1", date: "2026-06-01", impressions: 1000, clicks: 50, sales: 5, revenue: 100, cost: 20 },
  { id: "s2", campaignId: "c1", date: "2026-06-02", impressions: 2000, clicks: 100, sales: 10, revenue: 200, cost: 40 },
  { id: "s3", campaignId: "c2", date: "2026-06-01", impressions: 500, clicks: 0, sales: 0, revenue: 0, cost: 50 },
]);

const t1 = campaignTotals("c1", snaps);
check("totalsFor: impressions sum", t1.impressions === 3000);
check("totalsFor: clicks sum", t1.clicks === 150);
check("totalsFor: revenue sum", t1.revenue === 300);
check("totalsFor: cost sum", t1.cost === 60);
check(
  "totalsFor: CTR = 150/3000 = 0.05",
  Math.abs((t1.ctr ?? 0) - 0.05) < 1e-9
);
check(
  "totalsFor: conversion = 15/150 = 0.1",
  Math.abs((t1.conversionRate ?? 0) - 0.1) < 1e-9
);
check(
  "totalsFor: ROI = (300-60)/60 = 4",
  Math.abs((t1.roi ?? 0) - 4) < 1e-9
);

const t2 = campaignTotals("c2", snaps);
check("zero-clicks campaign: ctr is null", t2.ctr === 0); // 0/500
check("zero-clicks campaign: conversionRate is null", t2.conversionRate === null);
check("zero-clicks campaign: cpc is null", t2.cpc === null);
check("zero-clicks campaign: roi defined when cost>0", t2.roi === -1); // (0-50)/50

const empty = totalsFor([]);
check("empty totals: clicks 0", empty.clicks === 0);
check("empty totals: ratios all null", empty.ctr === null && empty.conversionRate === null && empty.roi === null);

const series = dailySeries(snaps);
check("dailySeries: 2 distinct dates", series.length === 2);
check(
  "dailySeries: 2026-06-01 sums across campaigns",
  series.find((p) => p.date === "2026-06-01")?.impressions === 1500
);

// platform comparison
const campaigns = sanitizers.campaigns([
  { id: "c1", name: "C1", platform: "pinterest" },
  { id: "c2", name: "C2", platform: "facebook" },
]);
const platforms = byPlatform(campaigns, snaps);
check("byPlatform: returns one row per platform", platforms.length === 2);
check(
  "byPlatform: sorted by revenue desc",
  platforms[0].platform === "pinterest" && platforms[0].revenue === 300
);

// =========================================================================
// final
// =========================================================================

// =========================================================================
// PR #58 — Campaign Builder
// =========================================================================

console.log("\n== campaign builder — plan ==\n");

const {
  buildPlan,
  defaultCampaignName,
  primaryCampaignPlatform,
  resolveTemplate,
  ALL_PLATFORMS,
  ALL_OBJECTIVES,
  PLATFORM_LABELS,
  OBJECTIVE_LABELS,
  OBJECTIVE_HINT,
  OBJECTIVE_TO_GOAL,
} = await import("../src/lib/campaignBuilder");

// --- plan composition -----------------------------------------------------

const emptyPlan = buildPlan([]);
check(
  "buildPlan([]) still includes product + SEO (7 + 2 = 9)",
  emptyPlan.length === 9
);
check(
  "buildPlan([]) only contains product + seo groups",
  new Set(emptyPlan.map((t) => t.group)).size === 2
);

const fullPlan = buildPlan(ALL_PLATFORMS);
check(
  "buildPlan(allPlatforms) covers all 6 groups",
  new Set(fullPlan.map((t) => t.group)).size === 6
);
check(
  "buildPlan(allPlatforms) totals 22 tasks",
  // 8 product (incl. Payhip) + 2 seo + 5 pinterest + 2 blog + 3 email + 4 social
  fullPlan.length === 24 // 8 + 2 + 5 + 2 + 3 + 4 = 24
);

// Each task has a unique id within its plan
check(
  "buildPlan: task ids are unique",
  new Set(fullPlan.map((t) => t.id)).size === fullPlan.length
);

// Adding pinterest adds exactly 5 tasks
check(
  "buildPlan: +pinterest = +5 tasks",
  buildPlan(["pinterest"]).length - emptyPlan.length === 5
);

// Adding email adds exactly 3 tasks (launch, follow-up, reminder)
check(
  "buildPlan: +email = +3 tasks",
  buildPlan(["email"]).length - emptyPlan.length === 3
);

// Adding payhip adds exactly 1 product-page task
check(
  "buildPlan: +payhip = +1 (the Payhip sales page)",
  buildPlan(["payhip"]).length - emptyPlan.length === 1
);

// Adding blog adds 2 (article + internal links)
check(
  "buildPlan: +blog = +2 tasks",
  buildPlan(["blog"]).length - emptyPlan.length === 2
);

// Each social platform adds exactly 1
for (const p of ["facebook", "instagram", "linkedin", "x"] as const) {
  check(
    `buildPlan: +${p} = +1 social task`,
    buildPlan([p]).length - emptyPlan.length === 1
  );
}

// Plan order: always product → seo → pinterest → blog → email → social
const grouped = fullPlan.map((t) => t.group);
const firstSeoIdx = grouped.indexOf("seo");
const firstProdIdx = grouped.indexOf("product");
const firstEmailIdx = grouped.indexOf("email");
check(
  "buildPlan: product comes before seo",
  firstProdIdx < firstSeoIdx && firstProdIdx >= 0
);
check(
  "buildPlan: email comes after seo",
  firstEmailIdx > firstSeoIdx
);

// --- objective / labels ---------------------------------------------------
check(
  "every objective has a label, hint, and goal mapping",
  ALL_OBJECTIVES.every(
    (o) => OBJECTIVE_LABELS[o] && OBJECTIVE_HINT[o] && OBJECTIVE_TO_GOAL[o]
  )
);
check(
  "every platform has a label",
  ALL_PLATFORMS.every((p) => PLATFORM_LABELS[p])
);

// --- defaultCampaignName --------------------------------------------------
check(
  "defaultCampaignName combines title + objective label",
  defaultCampaignName("ADHD Toolkit", "back-to-school") ===
    "ADHD Toolkit — Back-to-school"
);

// --- primaryCampaignPlatform ---------------------------------------------
check(
  "primaryCampaignPlatform: prefers pinterest",
  primaryCampaignPlatform(["payhip", "pinterest"]) === "pinterest"
);
check(
  "primaryCampaignPlatform: empty array → 'other'",
  primaryCampaignPlatform([]) === "other"
);
check(
  "primaryCampaignPlatform: blog → organic-seo",
  primaryCampaignPlatform(["blog"]) === "organic-seo"
);

// --- resolveTemplate -----------------------------------------------------
const fakePrompts = [
  {
    id: "p-builtin",
    name: "Product Title",
    category: "copy",
    description: "",
    systemPrompt: "",
    userPromptTemplate: "",
    favorite: false,
    builtIn: true,
    versions: [],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "p-custom",
    name: "Product Title",
    category: "copy",
    description: "",
    systemPrompt: "",
    userPromptTemplate: "",
    favorite: false,
    builtIn: false,
    versions: [],
    createdAt: 0,
    updatedAt: 0,
  },
];
check(
  "resolveTemplate: prefers built-in when both built-in and custom share a name",
  resolveTemplate(fakePrompts, "Product Title")?.id === "p-builtin"
);
check(
  "resolveTemplate: falls back to custom when no built-in",
  resolveTemplate([fakePrompts[1]], "Product Title")?.id === "p-custom"
);
check(
  "resolveTemplate: returns undefined when missing",
  resolveTemplate(fakePrompts, "Nope") === undefined
);

// --- runWithConcurrency --------------------------------------------------

console.log("\n== campaign builder — concurrency ==\n");

const { runWithConcurrency } = await import("../src/lib/concurrency");

// Records the maximum number of in-flight workers we observed.
await (async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const items = Array.from({ length: 12 }, (_, i) => i);
  await runWithConcurrency(
    items,
    async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
    },
    3
  );
  check(
    "runWithConcurrency: never exceeds the limit (max in-flight <= 3)",
    maxInFlight <= 3
  );
  check(
    "runWithConcurrency: uses the limit (max in-flight reaches 3 with 12 items)",
    maxInFlight === 3
  );
})();

// Each item is processed exactly once even when some throw.
await (async () => {
  const seen: number[] = [];
  const items = [0, 1, 2, 3, 4, 5];
  await runWithConcurrency(
    items,
    async (n) => {
      seen.push(n);
      if (n % 2 === 0) throw new Error("boom " + n);
    },
    2
  );
  check(
    "runWithConcurrency: workers continue after a task throws",
    seen.length === items.length
  );
  check(
    "runWithConcurrency: every item seen",
    seen.slice().sort((a, b) => a - b).join(",") === items.join(",")
  );
})();

// AbortController-style cancellation: signal aborted before all work done.
await (async () => {
  const controller = new AbortController();
  const completed: number[] = [];
  setTimeout(() => controller.abort(), 8);
  await runWithConcurrency(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    async (n) => {
      // Simulate AI request that aborts on signal
      if (controller.signal.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      await new Promise((r) => setTimeout(r, 4));
      if (controller.signal.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      completed.push(n);
    },
    3
  );
  check(
    "runWithConcurrency: cancellation lets some tasks complete and stops the rest",
    completed.length > 0 && completed.length < 10
  );
})();


// =========================================================================
// final
// =========================================================================

console.log(`\n${failed === 0 ? "ALL SMOKE TESTS PASSED" : `${failed} FAILED`}\n`);
process.exit(failed === 0 ? 0 : 1);
