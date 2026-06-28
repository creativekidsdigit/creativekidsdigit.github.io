// Adversarial smoke test for the storage sanitizers.
// Run with: npx tsx scripts/smoke-sanitizers.ts
// This script is not part of the build. It verifies that the hydration
// layer recovers from every form of corruption we can think of.

import {
  sanitizers,
  sanitizeSettings,
  sanitizeProduct,
} from "../src/lib/migrate";
import { parseCsv, parseCsvAsRecords } from "../src/lib/csvParse";
import {
  genericCsvImporter,
  parseDate,
  parseNumber,
} from "../src/lib/importers/genericCsv";
import type {
  ImportContext,
  ImporterSetup,
} from "../src/lib/importers/types";
import type { PerformanceSnapshot } from "../src/types";
import {
  validateBackupHeader,
  summarizeImportSlice,
  totalDropped,
  formatDroppedBreakdown,
  type ImportSummary,
} from "../src/lib/backupImport";

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
// PR — Product Research module
// =========================================================================

console.log("\n== product research — sanitizers ==\n");

// Opportunity sanitizer
check(
  "opportunity: null → []",
  sanitizers.opportunities(null).length === 0
);
check(
  "opportunity: missing title dropped",
  sanitizers.opportunities([{ id: "o1" }, { id: "o2", title: "Real idea" }])
    .length === 1
);
check(
  "opportunity: unknown status → 'idea'",
  sanitizers.opportunities([{ id: "o1", title: "X", status: "imploded" }])[0]
    .status === "idea"
);
check(
  "opportunity: unknown trend → 'stable'",
  sanitizers.opportunities([{ id: "o1", title: "X", trend: "rocket" }])[0]
    .trend === "stable"
);
check(
  "opportunity: source defaults to 'manual'",
  sanitizers.opportunities([{ id: "o1", title: "X" }])[0].source === "manual"
);
check(
  "opportunity: source accepts 'ai-generated'",
  sanitizers.opportunities([
    { id: "o1", title: "X", source: "ai-generated" },
  ])[0].source === "ai-generated"
);
check(
  "opportunity: score factor values clamped to [0,100]",
  (() => {
    const out = sanitizers.opportunities([
      {
        id: "o1",
        title: "X",
        score: { total: 200, factors: { searchDemand: -50, competition: 500 } },
      },
    ])[0];
    return (
      out.score.total === 100 &&
      out.score.factors.searchDemand === 0 &&
      out.score.factors.competition === 100
    );
  })()
);
check(
  "opportunity: non-numeric factors dropped",
  (() => {
    const out = sanitizers.opportunities([
      {
        id: "o1",
        title: "X",
        score: { total: 50, factors: { searchDemand: "high" } },
      },
    ])[0];
    return !("searchDemand" in out.score.factors);
  })()
);
check(
  "opportunity: linkedProductId preserved when string",
  sanitizers.opportunities([
    { id: "o1", title: "X", linkedProductId: "p1" },
  ])[0].linkedProductId === "p1"
);

// Keyword sanitizer
check(
  "keyword: missing term dropped",
  sanitizers.keywords([{ id: "k1" }, { id: "k2", term: "adhd" }]).length === 1
);
check(
  "keyword: unknown type → 'long-tail'",
  sanitizers.keywords([{ id: "k1", term: "x", type: "weird" }])[0].type ===
    "long-tail"
);
check(
  "keyword: invalid trend dropped to undefined",
  sanitizers.keywords([
    { id: "k1", term: "x", trend: "exploding" },
  ])[0].trend === undefined
);

// Competitor sanitizer
check(
  "competitor: missing productTitle dropped",
  sanitizers.competitors([{ id: "c1" }, { id: "c2", productTitle: "Acme" }])
    .length === 1
);
check(
  "competitor: url preserved when string",
  sanitizers.competitors([
    { id: "c1", productTitle: "Acme", url: "https://acme.test" },
  ])[0].url === "https://acme.test"
);

// =========================================================================
// PR — Product Research — opportunity scoring math
// =========================================================================

console.log("\n== product research — opportunityScore ==\n");

const {
  buildScore,
  computeScoreTotal,
  scoreBand,
  scoreContributors,
} = await import("../src/lib/opportunityScore");

const testSettings: import("../src/types").AppSettings = {
  activeProvider: "openai",
  theme: "system",
  brandVoice: "",
  defaultAudience: "",
  autosave: true,
  providers: {
    openai: { id: "openai", model: "gpt-4o-mini", enabled: true },
    anthropic: { id: "anthropic", model: "claude-sonnet-4-5", enabled: true },
    google: { id: "google", model: "gemini-2.5-flash", enabled: true },
    openrouter: { id: "openrouter", model: "anthropic/claude-sonnet-4.5", enabled: true },
    ollama: { id: "ollama", model: "llama3.2", enabled: true },
  },
  researchScoreWeights: {
    searchDemand: 1,
    competition: 1,
    seasonality: 1,
    commercialIntent: 1,
    catalogFit: 1,
    reusability: 1,
    creationEffort: 1,
    revenuePotential: 1,
  },
};

check(
  "score: all 50s → 50",
  computeScoreTotal(
    {
      searchDemand: 50,
      competition: 50,
      seasonality: 50,
      commercialIntent: 50,
      catalogFit: 50,
      reusability: 50,
      creationEffort: 50,
      revenuePotential: 50,
    },
    testSettings
  ) === 50
);
check(
  "score: missing factors default to neutral (50)",
  computeScoreTotal({}, testSettings) === 50
);
check(
  "score: all 100s with equal weights → 100",
  computeScoreTotal(
    {
      searchDemand: 100,
      competition: 100,
      seasonality: 100,
      commercialIntent: 100,
      catalogFit: 100,
      reusability: 100,
      creationEffort: 100,
      revenuePotential: 100,
    },
    testSettings
  ) === 100
);
check(
  "score: weighted average respects weights",
  (() => {
    // Explicit 0 weights for unspecified factors so the math is unambiguous.
    const weighted: import("../src/types").AppSettings = {
      ...testSettings,
      researchScoreWeights: {
        searchDemand: 4, // dominant
        revenuePotential: 1,
        competition: 0,
        seasonality: 0,
        commercialIntent: 0,
        catalogFit: 0,
        reusability: 0,
        creationEffort: 0,
      },
    };
    // searchDemand 80, revenuePotential 20 → (4*80 + 1*20) / 5 = 68
    const total = computeScoreTotal(
      { searchDemand: 80, revenuePotential: 20 },
      weighted
    );
    return total === 68;
  })()
);
check(
  "scoreBand thresholds: 80↑ excellent, 65↑ high, 45↑ medium",
  scoreBand(85) === "excellent" &&
    scoreBand(70) === "high" &&
    scoreBand(50) === "medium" &&
    scoreBand(20) === "low"
);
check(
  "buildScore: returns total + factors",
  (() => {
    const s = buildScore({ searchDemand: 100, competition: 0 }, testSettings);
    return s.total >= 0 && "factors" in s;
  })()
);

// scoreContributors
check(
  "contributors: drivers are top 3 by contribution",
  (() => {
    const out = scoreContributors(
      {
        searchDemand: 100,
        competition: 10,
        seasonality: 90,
        commercialIntent: 80,
        catalogFit: 50,
      },
      testSettings
    );
    const driverNames = out.drivers.map((d) => d.factor);
    return (
      driverNames.length === 3 &&
      driverNames.includes("searchDemand") &&
      driverNames.includes("seasonality") &&
      driverNames.includes("commercialIntent")
    );
  })()
);
check(
  "contributors: blockers only include below-neutral (50)",
  (() => {
    const out = scoreContributors(
      {
        searchDemand: 100,
        competition: 20, // below neutral
        creationEffort: 30, // below neutral
        catalogFit: 90,
      },
      testSettings
    );
    return (
      out.blockers.length === 2 &&
      out.blockers.every((b) => b.value < 50)
    );
  })()
);
check(
  "contributors: no blockers when every factor is above neutral",
  scoreContributors(
    {
      searchDemand: 80,
      competition: 70,
      seasonality: 60,
      commercialIntent: 75,
      catalogFit: 85,
      reusability: 70,
      creationEffort: 60,
      revenuePotential: 90,
    },
    testSettings
  ).blockers.length === 0
);

// =========================================================================
// PR — Product Research — recommendedNextAction
// =========================================================================

console.log("\n== product research — recommendedNextAction ==\n");

const { recommendedNextAction } = await import(
  "../src/lib/opportunityNextAction"
);

function mockOpp(
  overrides: Partial<import("../src/types").Opportunity>
): import("../src/types").Opportunity {
  return {
    id: "o1",
    title: "X",
    description: "",
    category: "",
    audience: "",
    keywords: [],
    trend: "stable",
    status: "idea",
    score: { total: 50, factors: {} },
    notes: "",
    relatedProductIds: [],
    source: "manual",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

check(
  "next-action: linked product → open-linked-product",
  recommendedNextAction(mockOpp({ linkedProductId: "p1" })).id ===
    "open-linked-product"
);
check(
  "next-action: idea with no factors → rate-factors",
  recommendedNextAction(
    mockOpp({ status: "idea", score: { total: 0, factors: {} } })
  ).id === "rate-factors"
);
check(
  "next-action: idea with low score → archive-low-score",
  recommendedNextAction(
    mockOpp({
      status: "idea",
      score: { total: 30, factors: { searchDemand: 30 } },
    })
  ).id === "archive-low-score"
);
check(
  "next-action: idea with excellent score → advance-to-planned",
  recommendedNextAction(
    mockOpp({
      status: "idea",
      score: { total: 85, factors: { searchDemand: 85 } },
    })
  ).id === "advance-to-planned"
);
check(
  "next-action: planned → convert to product",
  recommendedNextAction(
    mockOpp({
      status: "planned",
      score: { total: 70, factors: { searchDemand: 70 } },
    })
  ).id === "convert"
);
check(
  "next-action: ready → advance-to-published",
  recommendedNextAction(
    mockOpp({
      status: "ready",
      score: { total: 70, factors: { searchDemand: 70 } },
    })
  ).id === "advance-to-published"
);

// =========================================================================
// PR — Product Research — gapAnalysis additions
// =========================================================================

console.log("\n== product research — gapAnalysis ==\n");

const { analyzeGaps } = await import("../src/lib/gapAnalysis");

function mockProduct(
  overrides: Partial<import("../src/types").Product>
): import("../src/types").Product {
  return {
    id: "p" + Math.random().toString(36).slice(2, 6),
    title: "Unnamed",
    category: "",
    audience: "",
    problemSolved: "",
    benefits: [],
    keywords: [],
    pricing: "",
    platform: "payhip",
    status: "ready",
    notes: "",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

check(
  "gaps: empty catalog gets the 'start with opportunities' note",
  analyzeGaps([], [], [], []).some((f) => f.id === "empty:catalog")
);

check(
  "gaps: missing beginner detected when catalog has no entry-level product",
  (() => {
    const products = [
      mockProduct({ title: "ADHD Mastery Workbook" }),
      mockProduct({ title: "Calm Corner Premium" }),
    ];
    const out = analyzeGaps(products, [], [], []);
    return out.some((f) => f.id === "tier:beginner-missing");
  })()
);

check(
  "gaps: beginner present → no beginner-missing finding",
  (() => {
    const products = [
      mockProduct({ title: "ADHD Mastery Workbook" }),
      mockProduct({ title: "Getting Started With Calm Mornings" }),
    ];
    const out = analyzeGaps(products, [], [], []);
    return !out.some((f) => f.id === "tier:beginner-missing");
  })()
);

check(
  "gaps: missing premium detected when catalog has no upper tier",
  (() => {
    const products = [
      mockProduct({ title: "Beginner ADHD Toolkit" }),
      mockProduct({ title: "Standard Worksheet Pack" }),
    ];
    const out = analyzeGaps(products, [], [], []);
    return out.some((f) => f.id === "tier:premium-missing");
  })()
);

check(
  "gaps: premium present → no premium-missing finding",
  (() => {
    const products = [
      mockProduct({ title: "Beginner ADHD Toolkit" }),
      mockProduct({ title: "ADHD Mastery — Premium Edition" }),
    ];
    const out = analyzeGaps(products, [], [], []);
    return !out.some((f) => f.id === "tier:premium-missing");
  })()
);

check(
  "gaps: solo categories get a 'companion' finding",
  (() => {
    const products = [
      mockProduct({ title: "Beginner Workbook", category: "ADHD" }),
      mockProduct({ title: "Teacher Toolkit", category: "Teachers" }),
    ];
    const out = analyzeGaps(products, [], [], []);
    return out.some((f) => f.id === "companion:singletons");
  })()
);

check(
  "gaps: seasonal coverage detects missing Halloween/Christmas",
  (() => {
    const products = [
      mockProduct({ title: "Beginner Workbook" }),
      mockProduct({ title: "Calm Routine" }),
    ];
    const out = analyzeGaps(products, [], [], []);
    return out.some((f) => f.id === "season:halloween");
  })()
);

// =========================================================================
// PR #62 — Analytics Import (CSV parser, normalizers, generic importer)
// =========================================================================

console.log("\n== analytics import — CSV parser ==\n");

check(
  "parseCsv: empty string → no rows",
  parseCsv("").length === 0
);

check(
  "parseCsv: single header row",
  (() => {
    const r = parseCsv("a,b,c");
    return r.length === 1 && r[0].length === 3 && r[0][2] === "c";
  })()
);

check(
  "parseCsv: LF line endings",
  (() => {
    const r = parseCsv("a,b\n1,2\n3,4");
    return r.length === 3 && r[1][0] === "1" && r[2][1] === "4";
  })()
);

check(
  "parseCsv: CRLF line endings",
  (() => {
    const r = parseCsv("a,b\r\n1,2\r\n3,4\r\n");
    return r.length === 3 && r[2][0] === "3";
  })()
);

check(
  "parseCsv: BOM is stripped",
  (() => {
    const r = parseCsv("\uFEFFcol\n1");
    return r[0][0] === "col";
  })()
);

check(
  "parseCsv: quoted field with comma",
  (() => {
    const r = parseCsv('a,b\n"hello, world",2');
    return r[1][0] === "hello, world" && r[1][1] === "2";
  })()
);

check(
  "parseCsv: escaped quote inside quoted field",
  (() => {
    const r = parseCsv('a\n"he said ""hi"""');
    return r[1][0] === 'he said "hi"';
  })()
);

check(
  "parseCsv: quoted field with newline inside",
  (() => {
    const r = parseCsv('a,b\n"line1\nline2",x');
    return r.length === 2 && r[1][0] === "line1\nline2" && r[1][1] === "x";
  })()
);

check(
  "parseCsv: trailing blank rows are dropped",
  (() => {
    const r = parseCsv("a,b\n1,2\n\n\n");
    return r.length === 2;
  })()
);

check(
  "parseCsv: file without trailing newline still captures last row",
  (() => {
    const r = parseCsv("a,b\n1,2");
    return r.length === 2 && r[1][1] === "2";
  })()
);

check(
  "parseCsvAsRecords: header normalization (trim)",
  (() => {
    const { headers, rows } = parseCsvAsRecords("  Date  ,  Clicks  \n2026-01-01,10");
    return headers[0] === "Date" && headers[1] === "Clicks" && rows[0]["Date"] === "2026-01-01";
  })()
);

check(
  "parseCsvAsRecords: missing trailing cells become empty strings",
  (() => {
    const { rows } = parseCsvAsRecords("a,b,c\n1,2");
    return rows[0]["a"] === "1" && rows[0]["b"] === "2" && rows[0]["c"] === "";
  })()
);

check(
  "parseCsvAsRecords: empty string → empty headers & rows",
  (() => {
    const { headers, rows } = parseCsvAsRecords("");
    return headers.length === 0 && rows.length === 0;
  })()
);

console.log("\n== analytics import — parseDate ==\n");

check("parseDate: ISO yyyy-mm-dd", parseDate("2026-08-15") === "2026-08-15");
check(
  "parseDate: ISO datetime slices off time",
  parseDate("2026-08-15T12:34:56Z") === "2026-08-15"
);
check(
  "parseDate: US m/d/yyyy",
  parseDate("8/15/2026") === "2026-08-15"
);
check(
  "parseDate: US m/d/yyyy with zero padding",
  parseDate("08/05/2026") === "2026-08-05"
);
check(
  "parseDate: D/M/Y when first slot > 12",
  parseDate("15/08/2026") === "2026-08-15"
);
check(
  "parseDate: 'Aug 15, 2026' fallback via Date.parse",
  parseDate("Aug 15, 2026") === "2026-08-15"
);
check(
  "parseDate: whitespace tolerated",
  parseDate("  2026-08-15  ") === "2026-08-15"
);
check("parseDate: empty string → null", parseDate("") === null);
check("parseDate: garbage string → null", parseDate("not-a-date") === null);
check(
  "parseDate: invalid month (13) → null",
  parseDate("2026-13-01") === null
);
check(
  "parseDate: invalid day (32) → null",
  parseDate("2026-01-32") === null
);
check(
  "parseDate: out-of-range year → null",
  parseDate("1750-01-01") === null
);

console.log("\n== analytics import — parseNumber ==\n");

check("parseNumber: empty string → 0", parseNumber("") === 0);
check("parseNumber: whitespace → 0", parseNumber("   ") === 0);
check("parseNumber: plain integer", parseNumber("42") === 42);
check("parseNumber: decimal", parseNumber("12.5") === 12.5);
check(
  "parseNumber: thousands separator",
  parseNumber("1,234.56") === 1234.56
);
check(
  "parseNumber: currency prefix $",
  parseNumber("$19.99") === 19.99
);
check(
  "parseNumber: currency prefix € (and trailing whitespace tolerated upstream)",
  parseNumber("€19.99") === 19.99
);
check(
  "parseNumber: K suffix → x1000",
  parseNumber("1.2K") === 1200
);
check(
  "parseNumber: M suffix → x1,000,000",
  parseNumber("3M") === 3_000_000
);
check(
  "parseNumber: B suffix lower/upper case",
  parseNumber("2b") === 2_000_000_000
);
check(
  "parseNumber: percent suffix returns raw number",
  parseNumber("12%") === 12
);
check(
  "parseNumber: combined currency + thousands",
  parseNumber("$1,234,567.89") === 1234567.89
);
check(
  "parseNumber: garbage → 0",
  parseNumber("not-a-number") === 0
);
check(
  "parseNumber: negative integer preserved",
  parseNumber("-50") === -50
);
check(
  "parseNumber: negative decimal (refund-style)",
  parseNumber("-19.99") === -19.99
);

console.log("\n== analytics import — genericCsvImporter.inspect ==\n");

check(
  "inspect: returns headers, suggestedMapping, sample, raw",
  (async () => {
    const text =
      "Date,Impressions,Clicks,Orders,Revenue\n" +
      "2026-08-15,1000,50,5,99.95\n" +
      "2026-08-16,1500,80,8,159.92\n";
    const s = await genericCsvImporter.inspect(text);
    return (
      s.headers.length === 5 &&
      s.headers[0] === "Date" &&
      s.suggestedMapping["Date"] === "date" &&
      s.suggestedMapping["Impressions"] === "impressions" &&
      s.suggestedMapping["Clicks"] === "clicks" &&
      s.suggestedMapping["Orders"] === "sales" &&
      s.suggestedMapping["Revenue"] === "revenue" &&
      Array.isArray(s.sample) &&
      s.sample.length === 2
    );
  })()
);

check(
  "inspect: duplicate field guesses deduplicate to 'ignore'",
  (async () => {
    // Two columns would both hint at "clicks" — second becomes 'ignore'.
    const text = "Pin clicks,Link clicks,Date\n1,2,2026-08-15\n";
    const s = await genericCsvImporter.inspect(text);
    const mapped = Object.values(s.suggestedMapping).filter((v) => v === "clicks");
    return mapped.length === 1 && s.suggestedMapping["Date"] === "date";
  })()
);

check(
  "inspect: completely unrecognized headers → all 'ignore' except where they fuzzy-match",
  (async () => {
    const text = "Foo,Bar,Baz\n1,2,3\n";
    const s = await genericCsvImporter.inspect(text);
    const vals = Object.values(s.suggestedMapping);
    // Defensive: every value is a valid MappableField; nothing crashes.
    return vals.every((v) =>
      [
        "ignore",
        "date",
        "impressions",
        "clicks",
        "saves",
        "shares",
        "comments",
        "emailOpens",
        "emailClicks",
        "websiteVisits",
        "productPageVisits",
        "sales",
        "revenue",
        "cost",
        "notes",
      ].includes(v)
    );
  })()
);

check(
  "inspect: sample slice is capped at 5 rows",
  (async () => {
    const lines = ["Date,Clicks"];
    for (let i = 0; i < 12; i++) lines.push(`2026-08-${(i + 1).toString().padStart(2, "0")},${i}`);
    const s = await genericCsvImporter.inspect(lines.join("\n"));
    return s.sample.length === 5;
  })()
);

console.log("\n== analytics import — genericCsvImporter.preview ==\n");

function emptyCtx(): ImportContext {
  return { campaignId: "c1", existingSnapshots: [] };
}

function existingCtx(dates: string[]): ImportContext {
  const snaps: PerformanceSnapshot[] = dates.map((d, i) => ({
    id: `s${i}`,
    campaignId: "c1",
    date: d,
    impressions: 0,
    clicks: 0,
    saves: 0,
    shares: 0,
    comments: 0,
    emailOpens: 0,
    emailClicks: 0,
    websiteVisits: 0,
    productPageVisits: 0,
    sales: 0,
    revenue: 0,
    cost: 0,
    notes: "",
    createdAt: 0,
    updatedAt: 0,
  }));
  return { campaignId: "c1", existingSnapshots: snaps };
}

check(
  "preview: maps a clean CSV into ok rows",
  (async () => {
    const text =
      "Date,Impressions,Clicks,Orders,Revenue\n" +
      "2026-08-15,1000,50,5,99.95\n" +
      "2026-08-16,1500,80,8,159.92\n";
    const setup = await genericCsvImporter.inspect(text);
    const p = await genericCsvImporter.preview(setup, emptyCtx());
    if (p.rows.length !== 2 || p.okCount !== 2) return false;
    const first = p.rows[0];
    return (
      first.kind === "ok" &&
      first.snapshot.date === "2026-08-15" &&
      first.snapshot.impressions === 1000 &&
      first.snapshot.clicks === 50 &&
      first.snapshot.sales === 5 &&
      first.snapshot.revenue === 99.95 &&
      first.snapshot.campaignId === "c1"
    );
  })()
);

check(
  "preview: duplicate date → skip kind (default)",
  (async () => {
    const text = "Date,Clicks\n2026-08-15,50\n2026-08-16,80\n";
    const setup = await genericCsvImporter.inspect(text);
    const p = await genericCsvImporter.preview(
      setup,
      existingCtx(["2026-08-15"])
    );
    return (
      p.okCount === 1 &&
      p.skipCount === 1 &&
      p.errorCount === 0 &&
      p.rows[0].kind === "skip" &&
      p.rows[1].kind === "ok"
    );
  })()
);

check(
  "preview: no date column mapped → every row is an error",
  (async () => {
    const text = "Foo,Clicks\nx,50\ny,80\n";
    const setup = await genericCsvImporter.inspect(text);
    // Force-clear any accidental 'date' mapping.
    const mapping = { ...setup.suggestedMapping };
    for (const k of Object.keys(mapping)) {
      if (mapping[k] === "date") mapping[k] = "ignore";
    }
    const merged: ImporterSetup = { ...setup, suggestedMapping: mapping };
    const p = await genericCsvImporter.preview(merged, emptyCtx());
    return p.errorCount === 2 && p.okCount === 0 && p.rows[0].kind === "error";
  })()
);

check(
  "preview: unparseable date → error row",
  (async () => {
    const text = "Date,Clicks\nnot-a-date,50\n2026-08-16,80\n";
    const setup = await genericCsvImporter.inspect(text);
    const p = await genericCsvImporter.preview(setup, emptyCtx());
    return (
      p.errorCount === 1 &&
      p.okCount === 1 &&
      p.rows[0].kind === "error" &&
      p.rows[1].kind === "ok"
    );
  })()
);

check(
  "preview: count metrics clamp negative values to 0",
  (async () => {
    const text = "Date,Clicks,Sales\n2026-08-15,-50,-5\n";
    const setup = await genericCsvImporter.inspect(text);
    const p = await genericCsvImporter.preview(setup, emptyCtx());
    if (p.rows[0].kind !== "ok") return false;
    return p.rows[0].snapshot.clicks === 0 && p.rows[0].snapshot.sales === 0;
  })()
);

check(
  "preview: revenue and cost remain signed (refund support)",
  (async () => {
    const text = "Date,Revenue,Cost\n2026-08-15,-19.99,-5\n";
    const setup = await genericCsvImporter.inspect(text);
    const p = await genericCsvImporter.preview(setup, emptyCtx());
    if (p.rows[0].kind !== "ok") return false;
    return (
      p.rows[0].snapshot.revenue === -19.99 &&
      p.rows[0].snapshot.cost === -5
    );
  })()
);

check(
  "preview: notes column carried through when mapped",
  (async () => {
    const text = "Date,Notes\n2026-08-15,Pinned to ADHD board\n";
    const setup = await genericCsvImporter.inspect(text);
    const p = await genericCsvImporter.preview(setup, emptyCtx());
    return (
      p.rows[0].kind === "ok" &&
      p.rows[0].snapshot.notes === "Pinned to ADHD board"
    );
  })()
);

check(
  "preview: unmapped metric columns default to 0",
  (async () => {
    const text = "Date,Clicks\n2026-08-15,50\n";
    const setup = await genericCsvImporter.inspect(text);
    const p = await genericCsvImporter.preview(setup, emptyCtx());
    if (p.rows[0].kind !== "ok") return false;
    const s = p.rows[0].snapshot;
    return (
      s.clicks === 50 &&
      s.impressions === 0 &&
      s.saves === 0 &&
      s.shares === 0 &&
      s.comments === 0 &&
      s.emailOpens === 0 &&
      s.emailClicks === 0 &&
      s.websiteVisits === 0 &&
      s.productPageVisits === 0 &&
      s.sales === 0 &&
      s.revenue === 0 &&
      s.cost === 0 &&
      s.notes === ""
    );
  })()
);

check(
  "preview: campaignId from context is stamped on every snapshot",
  (async () => {
    const text = "Date,Clicks\n2026-08-15,50\n2026-08-16,80\n";
    const setup = await genericCsvImporter.inspect(text);
    const p = await genericCsvImporter.preview(setup, {
      campaignId: "campaign-XYZ",
      existingSnapshots: [],
    });
    return p.rows.every(
      (r) => r.kind === "error" || r.snapshot.campaignId === "campaign-XYZ"
    );
  })()
);

// =========================================================================
// PR #65 (Reliability) — Backup import header + slice summarization
// =========================================================================

console.log("\n== backup import — validateBackupHeader ==\n");

check(
  "header: missing version defaults to v1, OK",
  (() => {
    const r = validateBackupHeader({ exportedAt: "2026-01-01" });
    return r.ok === true && r.version === 1;
  })()
);

check(
  "header: explicit v1 is OK",
  (() => {
    const r = validateBackupHeader({ version: 1, products: [] });
    return r.ok === true && r.version === 1;
  })()
);

check(
  "header: v2 is rejected with descriptive error",
  (() => {
    const r = validateBackupHeader({ version: 2, products: [] });
    return (
      r.ok === false &&
      r.version === 2 &&
      r.error.includes("v2") &&
      r.error.includes("newer")
    );
  })()
);

check(
  "header: v3 is rejected (any version > 1)",
  (() => {
    const r = validateBackupHeader({ version: 3 });
    return r.ok === false && r.version === 3;
  })()
);

check(
  "header: v0 is rejected (any version < 1)",
  (() => {
    const r = validateBackupHeader({ version: 0 });
    return r.ok === false && r.version === 0;
  })()
);

check(
  "header: null is rejected with shape error",
  (() => {
    const r = validateBackupHeader(null);
    return r.ok === false && r.error.includes("shape");
  })()
);

check(
  "header: string is rejected with shape error",
  (() => {
    const r = validateBackupHeader("oops");
    return r.ok === false && r.error.includes("shape");
  })()
);

check(
  "header: array at top level is rejected (must be object)",
  (() => {
    const r = validateBackupHeader([1, 2, 3]);
    return r.ok === false && r.error.includes("shape");
  })()
);

check(
  "header: non-finite version (NaN) falls back to 1",
  (() => {
    const r = validateBackupHeader({ version: NaN });
    return r.ok === true && r.version === 1;
  })()
);

console.log("\n== backup import — summarizeImportSlice ==\n");

check(
  "slice: undefined input → 0 kept, 0 dropped",
  (() => {
    const r = summarizeImportSlice(undefined, sanitizers.products);
    return r.kept.length === 0 && r.droppedCount === 0;
  })()
);

check(
  "slice: array of 3 valid products → 3 kept, 0 dropped",
  (() => {
    const r = summarizeImportSlice(
      [
        { id: "p1", title: "A" },
        { id: "p2", title: "B" },
        { id: "p3", title: "C" },
      ],
      sanitizers.products
    );
    return r.kept.length === 3 && r.droppedCount === 0;
  })()
);

check(
  "slice: 5 mixed (3 valid, 2 malformed) → 3 kept, 2 dropped",
  (() => {
    const r = summarizeImportSlice(
      [
        { id: "p1", title: "A" },
        null,
        { id: "p2", title: "B" },
        { /* no id */ title: "C" },
        { id: "p3", title: "D" },
      ],
      sanitizers.products
    );
    return r.kept.length === 3 && r.droppedCount === 2;
  })()
);

check(
  "slice: all malformed → 0 kept, N dropped",
  (() => {
    const r = summarizeImportSlice(
      [null, undefined, "garbage", { junk: true }],
      sanitizers.products
    );
    return r.kept.length === 0 && r.droppedCount === 4;
  })()
);

check(
  "slice: wrong shape (object instead of array) → counts as 1 drop",
  (() => {
    const r = summarizeImportSlice(
      { not: "an array" },
      sanitizers.products
    );
    return r.kept.length === 0 && r.droppedCount === 1;
  })()
);

check(
  "slice: string instead of array → 1 drop",
  (() => {
    const r = summarizeImportSlice("oops", sanitizers.products);
    return r.kept.length === 0 && r.droppedCount === 1;
  })()
);

check(
  "slice: empty array → 0 kept, 0 dropped",
  (() => {
    const r = summarizeImportSlice([], sanitizers.products);
    return r.kept.length === 0 && r.droppedCount === 0;
  })()
);

console.log("\n== backup import — totalDropped + formatDroppedBreakdown ==\n");

check(
  "totalDropped: empty summary → 0",
  totalDropped({ imported: {}, dropped: {} }) === 0
);

check(
  "totalDropped: sums across slices",
  (() => {
    const s: ImportSummary = {
      imported: { products: 10 },
      dropped: { products: 3, campaigns: 2, keywords: 0 },
    };
    return totalDropped(s) === 5;
  })()
);

check(
  "formatDroppedBreakdown: empty → empty string",
  formatDroppedBreakdown({ imported: {}, dropped: {} }) === ""
);

check(
  "formatDroppedBreakdown: lists only non-zero entries",
  (() => {
    const s: ImportSummary = {
      imported: {},
      dropped: { products: 3, campaigns: 0, keywords: 2 },
    };
    const out = formatDroppedBreakdown(s);
    return (
      out.includes("3 products") &&
      out.includes("2 keywords") &&
      !out.includes("campaigns")
    );
  })()
);

check(
  "formatDroppedBreakdown: single slice formatted cleanly",
  (() => {
    const s: ImportSummary = {
      imported: {},
      dropped: { perfSnapshots: 7 },
    };
    return formatDroppedBreakdown(s) === "7 perfSnapshots";
  })()
);

// =========================================================================
// final
// =========================================================================

console.log(`\n${failed === 0 ? "ALL SMOKE TESTS PASSED" : `${failed} FAILED`}\n`);
process.exit(failed === 0 ? 0 : 1);
