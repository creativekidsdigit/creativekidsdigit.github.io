// Honest performance measurement for the Product Research module.
// Run with: npx tsx scripts/perf-research.ts
//
// Generates synthetic fixtures at three scales and times the operations
// that would dominate render cost in the page:
//   - analyzeGaps over the catalog + pipeline
//   - scoreContributors over every opportunity
//   - Kanban-style grouping by status + sort by score
//   - sanitizers.opportunities on a fresh hydrate

import { performance } from "node:perf_hooks";
import { analyzeGaps } from "../src/lib/gapAnalysis";
import { scoreContributors } from "../src/lib/opportunityScore";
import { sanitizers } from "../src/lib/migrate";
import type {
  Opportunity,
  OpportunityScoreFactor,
  Product,
  AppSettings,
} from "../src/types";

const FACTORS: OpportunityScoreFactor[] = [
  "searchDemand",
  "competition",
  "seasonality",
  "commercialIntent",
  "catalogFit",
  "reusability",
  "creationEffort",
  "revenuePotential",
];

const settings: AppSettings = {
  activeProvider: "openai",
  theme: "system",
  brandVoice: "",
  defaultAudience: "",
  autosave: true,
  providers: {
    openai: { id: "openai", model: "gpt-4o-mini", enabled: true },
    anthropic: { id: "anthropic", model: "claude-sonnet-4-5", enabled: true },
    google: { id: "google", model: "gemini-2.5-flash", enabled: true },
    openrouter: {
      id: "openrouter",
      model: "anthropic/claude-sonnet-4.5",
      enabled: true,
    },
    ollama: { id: "ollama", model: "llama3.2", enabled: true },
  },
};

function makeProduct(i: number): Product {
  return {
    id: `p${i}`,
    title: `Product ${i}`,
    category: ["ADHD", "Teachers", "Templates", "Journals"][i % 4],
    audience: ["parents", "teachers", "kids"][i % 3],
    problemSolved: "auto",
    benefits: ["a", "b"],
    keywords: ["k1", "k2"],
    pricing: "$19",
    platform: "payhip",
    status: "launched",
    notes: "",
    createdAt: 0,
    updatedAt: 0,
  };
}

function makeOpportunity(i: number): Opportunity {
  const factors: Partial<Record<OpportunityScoreFactor, number>> = {};
  for (const f of FACTORS) factors[f] = Math.floor(Math.random() * 100);
  return {
    id: `o${i}`,
    title: `Opportunity ${i}`,
    description: "auto",
    category: ["ADHD", "Teachers", "Templates"][i % 3],
    audience: "parents",
    keywords: ["seed"],
    trend: "stable",
    status: [
      "idea",
      "researching",
      "planned",
      "creating",
      "ready",
      "published",
      "optimizing",
    ][i % 7] as Opportunity["status"],
    score: { total: 0, factors },
    notes: "",
    relatedProductIds: [],
    source: i % 3 === 0 ? "ai-generated" : "manual",
    createdAt: Date.now() - i * 86400000,
    updatedAt: Date.now(),
  };
}

function time<T>(label: string, fn: () => T): T {
  const t0 = performance.now();
  const out = fn();
  const ms = performance.now() - t0;
  console.log(`  ${label.padEnd(48)} ${ms.toFixed(2).padStart(8)} ms`);
  return out;
}

function bench(label: string, productCount: number, oppCount: number) {
  console.log(`\n== ${label} (${productCount} products, ${oppCount} opportunities) ==\n`);
  const products = Array.from({ length: productCount }, (_, i) => makeProduct(i));
  const rawOpps = Array.from({ length: oppCount }, (_, i) => makeOpportunity(i));

  // Round-trip through the sanitizer to simulate hydrate cost.
  const opps = time("sanitizers.opportunities (hydrate)", () =>
    sanitizers.opportunities(rawOpps)
  );

  time("analyzeGaps (full catalog + pipeline)", () =>
    analyzeGaps(products, opps, [], [])
  );

  time("scoreContributors over EVERY opportunity", () => {
    for (const o of opps) scoreContributors(o.score.factors, settings);
  });

  time("Kanban group + sort by score (1 pass)", () => {
    const byStatus = new Map<string, Opportunity[]>();
    for (const o of opps) {
      const arr = byStatus.get(o.status) ?? [];
      arr.push(o);
      byStatus.set(o.status, arr);
    }
    for (const arr of byStatus.values()) {
      arr.sort((a, b) => b.score.total - a.score.total);
    }
  });
}

bench("Typical creator workload", 10, 50);
bench("Power user (1 year of pipeline)", 50, 500);
bench("Stress test", 200, 5000);
