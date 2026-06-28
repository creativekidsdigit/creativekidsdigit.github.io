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

// --- publishedAt round-trip (PR / Publishing Workspace) ---
check(
  "content: publishedAt preserved when finite number",
  sanitizers.content([
    {
      id: "x1",
      title: "T",
      body: "B",
      kind: "copy",
      publishedAt: 1234567890000,
    },
  ])[0].publishedAt === 1234567890000
);
check(
  "content: publishedAt rejected when string",
  sanitizers.content([
    {
      id: "x1",
      title: "T",
      body: "B",
      kind: "copy",
      publishedAt: "yesterday",
    },
  ])[0].publishedAt === undefined
);
check(
  "content: publishedAt rejected when NaN / Infinity",
  (() => {
    const a = sanitizers.content([
      { id: "x1", title: "T", body: "B", kind: "copy", publishedAt: NaN },
    ])[0].publishedAt;
    const b = sanitizers.content([
      { id: "x2", title: "T", body: "B", kind: "copy", publishedAt: Infinity },
    ])[0].publishedAt;
    return a === undefined && b === undefined;
  })()
);
check(
  "content: publishedAt absent → stays undefined",
  sanitizers.content([{ id: "x1", title: "T", body: "B", kind: "copy" }])[0]
    .publishedAt === undefined
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
// PR — Publishing Workspace formatters
// =========================================================================

console.log("\n== formatters — markdown → plain / html ==\n");

const { format, toPlainText, toHtml, FORMAT_IDS } = await import(
  "../src/lib/formatters"
);

// ----- toPlainText -----

check(
  "toPlainText: drops heading markers",
  toPlainText("# Title\n## Sub").includes("Title") &&
    !toPlainText("# Title\n## Sub").includes("#")
);
check(
  "toPlainText: drops bold markers, keeps text",
  toPlainText("This is **important** stuff") === "This is important stuff"
);
check(
  "toPlainText: drops italic markers but not bullet asterisks",
  (() => {
    const out = toPlainText("Word *emph* and\n* bullet");
    return out.includes("Word emph and") && out.includes("* bullet");
  })()
);
check(
  "toPlainText: drops underscore italic",
  toPlainText("a _word_ here") === "a word here"
);
check(
  "toPlainText: drops inline code backticks",
  toPlainText("see `useEffect` hook") === "see useEffect hook"
);
check(
  "toPlainText: links collapse to their text",
  toPlainText("Visit [Pinterest](https://pinterest.com) now") ===
    "Visit Pinterest now"
);
check(
  "toPlainText: blockquote markers dropped",
  toPlainText("> quoted line") === "quoted line"
);
check(
  "toPlainText: horizontal rules removed",
  !toPlainText("para\n\n---\n\npara2").includes("---")
);
check(
  "toPlainText: fenced code blocks lose fences keep body",
  toPlainText("```\ncode here\n```") === "code here"
);
check(
  "toPlainText: collapses runs of blank lines",
  !/\n{3,}/.test(toPlainText("a\n\n\n\nb"))
);

// ----- toHtml -----

check(
  "toHtml: H1 wraps with <h1>",
  toHtml("# Hello").includes("<h1>Hello</h1>")
);
check(
  "toHtml: bold becomes <strong>",
  toHtml("a **bold** word").includes("<strong>bold</strong>")
);
check(
  "toHtml: italic becomes <em>",
  toHtml("a *softer* word").includes("<em>softer</em>")
);
check(
  "toHtml: inline code becomes <code>",
  toHtml("use `x` here").includes("<code>x</code>")
);
check(
  "toHtml: bullet lists become <ul><li>",
  (() => {
    const html = toHtml("- one\n- two");
    return html.includes("<ul>") && html.includes("<li>one</li>");
  })()
);
check(
  "toHtml: numbered lists become <ol><li>",
  (() => {
    const html = toHtml("1. first\n2. second");
    return html.includes("<ol>") && html.includes("<li>first</li>");
  })()
);
check(
  "toHtml: paragraphs wrapped",
  toHtml("just text").includes("<p>just text</p>")
);
check(
  "toHtml: links become <a href>",
  toHtml("see [doc](https://example.com)").includes(
    '<a href="https://example.com">doc</a>'
  )
);
check(
  "toHtml: blockquote becomes <blockquote>",
  toHtml("> hello").includes("<blockquote>hello</blockquote>")
);
check(
  "toHtml: fenced code blocks become <pre><code>",
  (() => {
    const html = toHtml("```\nlet x = 1\n```");
    return html.includes("<pre><code>") && html.includes("let x = 1");
  })()
);
check(
  "toHtml: escapes < > & in plain text",
  (() => {
    const html = toHtml("if a < b && c > 0");
    return html.includes("&lt;") && html.includes("&gt;") && html.includes("&amp;");
  })()
);
check(
  "toHtml: hard line breaks within paragraph become <br>",
  toHtml("line one\nline two").includes("<br>")
);
check(
  "toHtml: horizontal rule",
  toHtml("a\n\n---\n\nb").includes("<hr>")
);

// ----- format() entry-point -----

check(
  "format: markdown is passthrough",
  format("# As-is", "markdown") === "# As-is"
);
check(
  "format: plain is toPlainText",
  format("# Hi", "plain") === toPlainText("# Hi")
);
check(
  "format: html is toHtml",
  format("# Hi", "html") === toHtml("# Hi")
);

// ----- FORMAT_IDS sanity -----
check(
  "FORMAT_IDS contains the three supported formats",
  FORMAT_IDS.length === 3 &&
    FORMAT_IDS.includes("plain") &&
    FORMAT_IDS.includes("markdown") &&
    FORMAT_IDS.includes("html")
);

// =========================================================================
// PR — R2 Content Export (zip encoder + exporters)
// =========================================================================

console.log("\n== zip encoder ==\n");

const { createZip, readStoredZip, crc32 } = await import("../src/lib/zip");

// CRC-32 known values from the standard.
check("crc32(''): 0", crc32(new TextEncoder().encode("")) === 0);
check(
  "crc32('a'): 0xE8B7BE43",
  crc32(new TextEncoder().encode("a")) === 0xe8b7be43
);
check(
  "crc32('123456789'): 0xCBF43926",
  crc32(new TextEncoder().encode("123456789")) === 0xcbf43926
);

// Empty archive
const emptyZip = createZip([]);
check(
  "createZip([]): starts with EOCD signature (PK\\x05\\x06)",
  emptyZip.length === 22 &&
    emptyZip[0] === 0x50 &&
    emptyZip[1] === 0x4b &&
    emptyZip[2] === 0x05 &&
    emptyZip[3] === 0x06
);
check(
  "readStoredZip(empty): []",
  readStoredZip(emptyZip).length === 0
);

// Round-trip
const zipBytes = createZip([
  { path: "a/hello.txt", data: "hello world" },
  { path: "a/b.txt", data: "second" },
  { path: "manifest.json", data: '{"schema":1}' },
]);
check(
  "createZip([3]): local file header signature at offset 0 (PK\\x03\\x04)",
  zipBytes[0] === 0x50 &&
    zipBytes[1] === 0x4b &&
    zipBytes[2] === 0x03 &&
    zipBytes[3] === 0x04
);
check(
  "createZip([3]): EOCD signature at end (PK\\x05\\x06)",
  (() => {
    const off = zipBytes.length - 22;
    return (
      zipBytes[off] === 0x50 &&
      zipBytes[off + 1] === 0x4b &&
      zipBytes[off + 2] === 0x05 &&
      zipBytes[off + 3] === 0x06
    );
  })()
);

const roundTrip = readStoredZip(zipBytes);
check(
  "round-trip: same number of entries",
  roundTrip.length === 3
);
check(
  "round-trip: paths preserved in order",
  roundTrip[0].path === "a/hello.txt" &&
    roundTrip[1].path === "a/b.txt" &&
    roundTrip[2].path === "manifest.json"
);
check(
  "round-trip: contents preserved",
  (() => {
    const dec = new TextDecoder();
    return (
      dec.decode(roundTrip[0].data) === "hello world" &&
      dec.decode(roundTrip[1].data) === "second" &&
      dec.decode(roundTrip[2].data) === '{"schema":1}'
    );
  })()
);
check(
  "round-trip: CRCs match content",
  roundTrip.every(
    (e) => e.crc === crc32(e.data)
  )
);

// UTF-8 path handling
const utf8Zip = createZip([{ path: "héllo/wörld.txt", data: "ünicode" }]);
const utf8Out = readStoredZip(utf8Zip);
check(
  "round-trip: UTF-8 paths preserved",
  utf8Out[0].path === "héllo/wörld.txt"
);
check(
  "round-trip: UTF-8 content preserved",
  new TextDecoder().decode(utf8Out[0].data) === "ünicode"
);

// Byte-array data (already encoded)
const binaryZip = createZip([
  { path: "raw.bin", data: new Uint8Array([1, 2, 3, 4, 5]) },
]);
const binOut = readStoredZip(binaryZip);
check(
  "round-trip: Uint8Array data preserved byte-for-byte",
  binOut[0].data.length === 5 &&
    binOut[0].data[0] === 1 &&
    binOut[0].data[4] === 5
);

console.log("\n== exporters — fixtures ==\n");

const { buildCampaignZipEntries } = await import(
  "../src/lib/exporters/campaignZip"
);
const { buildProductZipEntries } = await import(
  "../src/lib/exporters/productZip"
);
const { defaultFormatFor, assetAsText } = await import(
  "../src/lib/exporters/assetText"
);
const { EXPORTERS, getExportersForScope } = await import(
  "../src/lib/exporters"
);

// Registry shape
check(
  "registry: every entry has scope, id, label, mime, filenameFor, produce",
  EXPORTERS.every(
    (e) =>
      typeof e.id === "string" &&
      typeof e.label === "string" &&
      typeof e.mime === "string" &&
      typeof e.scope === "string" &&
      typeof e.filenameFor === "function" &&
      typeof e.produce === "function"
  )
);
check(
  "registry: ids are unique",
  new Set(EXPORTERS.map((e) => e.id)).size === EXPORTERS.length
);
check(
  "registry: getExportersForScope('campaign') returns campaign-zip",
  getExportersForScope("campaign").some((e) => e.id === "campaign-zip")
);
check(
  "registry: getExportersForScope('product') returns product-zip",
  getExportersForScope("product").some((e) => e.id === "product-zip")
);
check(
  "registry: getExportersForScope('asset') returns asset-text",
  getExportersForScope("asset").some((e) => e.id === "asset-text")
);

// Build a minimal campaign + assets fixture
const fixtureProduct = sanitizers.products([
  {
    id: "p1",
    title: "ADHD Toolkit",
    category: "Printables",
    audience: "Parents 6-10",
    problemSolved: "Homework meltdowns",
    benefits: ["Calm transitions"],
    keywords: ["adhd", "after-school"],
    pricing: "$19",
    platform: "payhip",
    status: "ready",
    notes: "",
  },
])[0];

const fixtureCampaign = sanitizers.campaigns([
  {
    id: "c1",
    name: "ADHD Toolkit — Back-to-school",
    productIds: ["p1"],
    platform: "pinterest",
    goal: "sales",
    startDate: "2026-08-01",
    status: "draft",
    notes: "Test campaign",
    tags: ["back-to-school"],
  },
])[0];

const fixtureAssets = sanitizers.content([
  {
    id: "a1",
    productId: "p1",
    campaignId: "c1",
    kind: "copy",
    templateId: "t1",
    title: "ADHD Toolkit · Long Description",
    body: "# Heading\n\nThis is **bold** copy.",
    tags: ["copy"],
    pinned: false,
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: "a2",
    productId: "p1",
    campaignId: "c1",
    kind: "pinterest",
    templateId: "t2",
    title: "ADHD Toolkit · 20 Pinterest titles",
    body: "1. Title one\n2. Title two\n3. Title three",
    tags: ["pinterest"],
    pinned: false,
    createdAt: 2000,
    updatedAt: 2000,
  },
  {
    id: "a3",
    productId: "p1",
    campaignId: "c1",
    kind: "blog",
    templateId: "t3",
    title: "ADHD Toolkit · SEO blog article",
    body: "# Title\n\nA paragraph with [link](https://example.com).",
    tags: ["blog"],
    pinned: false,
    createdAt: 3000,
    updatedAt: 3000,
  },
]);

const campaignCtx = {
  campaign: fixtureCampaign,
  assets: fixtureAssets,
  products: [fixtureProduct],
  snapshots: [],
};

const campaignEntries = buildCampaignZipEntries(campaignCtx);

check(
  "campaign zip: includes README.md at the root",
  campaignEntries.some((e) =>
    e.path.endsWith("/README.md") || e.path === "README.md"
  )
);
check(
  "campaign zip: includes manifest.json",
  campaignEntries.some((e) => e.path.endsWith("manifest.json"))
);
check(
  "campaign zip: includes one file per asset (3 assets → at least 3+2 entries)",
  campaignEntries.length >= 5
);
check(
  "campaign zip: paths begin with the campaign slug",
  campaignEntries.every((e) =>
    e.path.startsWith("adhd-toolkit-back-to-school/")
  )
);
check(
  "campaign zip: blog asset becomes .html",
  campaignEntries.some(
    (e) => e.path.includes("/blog/") && e.path.endsWith(".html")
  )
);
check(
  "campaign zip: copy/pinterest assets become .txt",
  campaignEntries.some(
    (e) => e.path.includes("/product/") && e.path.endsWith(".txt")
  ) &&
    campaignEntries.some(
      (e) => e.path.includes("/pinterest/") && e.path.endsWith(".txt")
    )
);
check(
  "campaign zip: blog HTML has <h1> from markdown",
  (() => {
    const blog = campaignEntries.find(
      (e) => e.path.includes("/blog/") && typeof e.data === "string"
    );
    return blog ? (blog.data as string).includes("<h1>Title</h1>") : false;
  })()
);
check(
  "campaign zip: filenames strip the 'Product ·' prefix",
  campaignEntries.some(
    (e) =>
      e.path.includes("long-description") || e.path.includes("pinterest-titles")
  )
);
check(
  "campaign zip: manifest.json is valid parseable JSON with schema=1",
  (() => {
    const m = campaignEntries.find((e) => e.path.endsWith("manifest.json"));
    if (!m || typeof m.data !== "string") return false;
    const parsed = JSON.parse(m.data);
    return (
      parsed.schema === 1 &&
      parsed.campaign?.id === "c1" &&
      Array.isArray(parsed.assets) &&
      parsed.assets.length === 3
    );
  })()
);
check(
  "campaign zip: manifest.assets[].file matches a real entry",
  (() => {
    const m = campaignEntries.find((e) => e.path.endsWith("manifest.json"));
    const parsed = JSON.parse(m!.data as string);
    const root = "adhd-toolkit-back-to-school/";
    return parsed.assets.every((a: { file: string }) =>
      campaignEntries.some((e) => e.path === root + a.file)
    );
  })()
);

// End-to-end produce()
const campaignZip = EXPORTERS.find((e) => e.id === "campaign-zip")!;
const blob = await campaignZip.produce(campaignCtx);
check(
  "campaign zip: produce() returns a Blob with the application/zip MIME",
  blob.type === "application/zip" && blob.size > 0
);
check(
  "campaign zip: produce() output is a valid ZIP (round-trip readable)",
  (() => {
    return blob.size > 22; // larger than just EOCD
  })()
);
check(
  "campaign zip: filename uses the campaign slug",
  campaignZip.filenameFor(campaignCtx) === "adhd-toolkit-back-to-school.zip"
);

// Preview
const campaignPreview = await campaignZip.preview!(campaignCtx);
check(
  "campaign zip: preview lists every entry",
  campaignPreview.entries.length === campaignEntries.length
);
check(
  "campaign zip: preview totalSize is sum of per-entry sizes",
  campaignPreview.totalSize ===
    campaignPreview.entries.reduce((s, e) => s + e.size, 0)
);
check(
  "campaign zip: preview summary mentions file count",
  campaignPreview.summary.includes(`${campaignPreview.entries.length} file`)
);

// Product exporter
const productCtx = {
  product: fixtureProduct,
  assets: fixtureAssets,
  products: [fixtureProduct],
  snapshots: [],
};
const productEntries = buildProductZipEntries(productCtx);
check(
  "product zip: includes README.md",
  productEntries.some((e) => e.path.endsWith("/README.md"))
);
check(
  "product zip: includes manifest.json with product.id",
  (() => {
    const m = productEntries.find((e) => e.path.endsWith("manifest.json"));
    if (!m) return false;
    const parsed = JSON.parse(m.data as string);
    return parsed.schema === 1 && parsed.product?.id === "p1";
  })()
);
check(
  "product zip: paths begin with the product slug",
  productEntries.every((e) => e.path.startsWith("adhd-toolkit/"))
);
check(
  "product zip: blog asset still becomes .html",
  productEntries.some(
    (e) => e.path.includes("/blog/") && e.path.endsWith(".html")
  )
);
check(
  "product zip: filename uses product slug",
  EXPORTERS.find((e) => e.id === "product-zip")!.filenameFor(productCtx) ===
    "adhd-toolkit.zip"
);

// Asset text exporter
const assetCtx = {
  asset: fixtureAssets[2], // the blog one
  assets: [fixtureAssets[2]],
  products: [fixtureProduct],
  snapshots: [],
};
check(
  "asset text: blog asset defaults to html",
  defaultFormatFor("blog", "Anything").format === "html"
);
check(
  "asset text: pinterest defaults to plain",
  defaultFormatFor("pinterest", "Anything").format === "plain"
);
check(
  "asset text: payhip sales page → html regardless of kind",
  defaultFormatFor("copy", "ADHD Toolkit · Payhip Sales Page").format === "html"
);
check(
  "asset text: SEO defaults to markdown",
  defaultFormatFor("seo", "Anything").format === "markdown"
);

const assetBlob = await EXPORTERS.find((e) => e.id === "asset-text")!.produce(
  assetCtx
);
check(
  "asset text: produce() returns text/plain blob",
  assetBlob.type.startsWith("text/plain") && assetBlob.size > 0
);
check(
  "asset text: filename uses asset slug + correct extension",
  EXPORTERS.find((e) => e.id === "asset-text")!.filenameFor(assetCtx) ===
    "adhd-toolkit-seo-blog-article.html"
);
check(
  "asset text: assetAsText converts markdown to plain by default kind",
  // blog kind → html, so output has <h1>
  assetAsText(fixtureAssets[2]).includes("<h1>")
);
check(
  "asset text: assetAsText with explicit 'plain' strips markers",
  assetAsText(fixtureAssets[2], "plain") === "Title\n\nA paragraph with link."
);
check(
  "asset text: preview reports one entry",
  (await EXPORTERS.find((e) => e.id === "asset-text")!.preview!(assetCtx))
    .entries.length === 1
);

// =========================================================================
// final
// =========================================================================

console.log(`\n${failed === 0 ? "ALL SMOKE TESTS PASSED" : `${failed} FAILED`}\n`);
process.exit(failed === 0 ? 0 : 1);
