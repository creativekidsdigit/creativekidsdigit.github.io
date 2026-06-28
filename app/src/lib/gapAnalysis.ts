// Pure gap analysis. No IO, no AI calls. Compares the existing catalog
// against opportunities and other facts the platform already knows, and
// emits a list of structured observations the UI renders alongside the
// AI-generated Business Intelligence panel.
//
// These are FACTS derived from data, not recommendations. The Business
// Intelligence layer (lib/research.ts) calls AI for opinion-shaped
// recommendations and clearly labels its output. This module's output
// is what we display unlabeled because it's deterministic.

import type {
  Campaign,
  Opportunity,
  PerformanceSnapshot,
  Product,
} from "@/types";

export type GapSeverity = "info" | "note" | "opportunity";

export interface GapFinding {
  id: string;
  severity: GapSeverity;
  title: string;
  detail: string;
  /** Optional list of related entity ids that the UI can link to. */
  relatedProductIds?: string[];
  relatedOpportunityIds?: string[];
}

/** Known seasonal "windows" we look for coverage of. */
const SEASONS: { name: string; pattern: RegExp }[] = [
  { name: "Back-to-school", pattern: /back[\s-]?to[\s-]?school|school year/i },
  { name: "Halloween", pattern: /halloween|spooky/i },
  { name: "Thanksgiving", pattern: /thanksgiving|gratitude/i },
  { name: "Christmas / Holidays", pattern: /christmas|holiday|advent/i },
  { name: "Valentine's", pattern: /valentine/i },
  { name: "Easter", pattern: /easter|spring/i },
  { name: "Summer", pattern: /summer|vacation|camp/i },
  { name: "Mother's / Father's Day", pattern: /mother|father|parent/i },
];

/** Pull a normalized "topic surface" string from a Product for matching. */
function productSurface(p: Product): string {
  return [
    p.title,
    p.category,
    p.audience,
    p.notes,
    p.keywords.join(" "),
    p.benefits.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Run gap analysis over the current workspace. Returns a list of findings
 * the UI can render as cards.
 */
export function analyzeGaps(
  products: Product[],
  opportunities: Opportunity[],
  _campaigns: Campaign[],
  _snapshots: PerformanceSnapshot[]
): GapFinding[] {
  const out: GapFinding[] = [];

  // 1. Seasonal coverage — for each season window we know about, do any
  //    products mention it? Surface the missing ones as "opportunity".
  for (const s of SEASONS) {
    const hit = products.some((p) => s.pattern.test(productSurface(p)));
    if (!hit) {
      out.push({
        id: `season:${s.name.toLowerCase()}`,
        severity: "opportunity",
        title: `No product for ${s.name}`,
        detail: `Your catalog has nothing matching the ${s.name} window. Consider whether your audience would buy a themed bundle.`,
      });
    }
  }

  // 2. Category concentration — if 3+ products share a category, suggest
  //    a bundle.
  const byCategory = new Map<string, Product[]>();
  for (const p of products) {
    const k = (p.category || "uncategorized").trim().toLowerCase();
    if (!k || k === "uncategorized") continue;
    const arr = byCategory.get(k) ?? [];
    arr.push(p);
    byCategory.set(k, arr);
  }
  for (const [cat, ps] of byCategory) {
    if (ps.length >= 3) {
      out.push({
        id: `bundle:${cat}`,
        severity: "opportunity",
        title: `Bundle opportunity in "${cat}"`,
        detail: `You have ${ps.length} products in this category. A bundle product could lift average order value.`,
        relatedProductIds: ps.map((p) => p.id),
      });
    }
  }

  // 3. Audience coverage — are most products targeting parents but few
  //    targeting teachers / kids directly? Surface the imbalance.
  const audiences = products
    .map((p) => p.audience.toLowerCase())
    .filter(Boolean);
  const parents = audiences.filter((a) => /parent|family/.test(a)).length;
  const teachers = audiences.filter((a) => /teacher|educator/.test(a)).length;
  const kids = audiences.filter((a) => /kid|child|student/.test(a)).length;
  if (parents >= 3 && teachers === 0) {
    out.push({
      id: "audience:teachers-missing",
      severity: "opportunity",
      title: "Strong parent resources, no teacher products",
      detail:
        "Your catalog skews toward parents. Teachers buy similar resources in different formats — consider a teacher-targeted variant.",
    });
  }
  if (parents >= 3 && kids === 0) {
    out.push({
      id: "audience:kids-missing",
      severity: "note",
      title: "All-parent catalog with no kid-facing product",
      detail:
        "Direct-to-kid products (workbooks, journals) often complement parent guides.",
    });
  }

  // 4. Opportunities that promise high scores but have stalled in early
  //    pipeline stages — surface so they don't get forgotten.
  const stalled = opportunities.filter(
    (o) =>
      o.score.total >= 70 &&
      (o.status === "idea" || o.status === "researching") &&
      Date.now() - o.createdAt > 30 * 86400000
  );
  for (const o of stalled) {
    out.push({
      id: `stalled:${o.id}`,
      severity: "note",
      title: `High-scoring idea stalled: "${o.title}"`,
      detail: `This opportunity scored ${o.score.total}/100 but has been in "${o.status}" for over 30 days. Promote or archive.`,
      relatedOpportunityIds: [o.id],
    });
  }

  // 5. Duplicate-risk — opportunities that look like an existing product.
  const productTitlesNorm = products.map((p) => p.title.toLowerCase());
  for (const o of opportunities) {
    if (o.linkedProductId) continue;
    const cand = o.title.toLowerCase();
    const dupe = productTitlesNorm.some((t) => similar(cand, t));
    if (dupe) {
      out.push({
        id: `dupe:${o.id}`,
        severity: "info",
        title: `Possible duplicate: "${o.title}"`,
        detail: "An existing product has a similar title. Verify this opportunity isn't already covered.",
        relatedOpportunityIds: [o.id],
      });
    }
  }

  // 6. Empty catalog
  if (products.length === 0 && opportunities.length === 0) {
    out.push({
      id: "empty:catalog",
      severity: "info",
      title: "Start with a few opportunities",
      detail:
        "Use the Idea Generator to seed your pipeline with AI-suggested opportunities, or add one manually.",
    });
  }

  // 7. Beginner / starter coverage. Many catalogs skip the entry-level
  //    product and lose traffic from people not ready for the premium one.
  if (products.length >= 2) {
    const hasBeginner = products.some((p) =>
      /\b(beginner|starter|basic|intro|getting started|101)\b/i.test(
        productSurface(p)
      )
    );
    if (!hasBeginner) {
      out.push({
        id: "tier:beginner-missing",
        severity: "opportunity",
        title: "No beginner / starter resource",
        detail:
          "Your catalog has no entry-level product. Beginner-tagged products convert different traffic than your mainline products.",
      });
    }

    // 8. Premium tier coverage. If there's no premium / pro / advanced
    //    variant, the user is leaving headroom (and bigger margin) on the table.
    const hasPremium = products.some((p) =>
      /\b(premium|pro|advanced|complete|ultimate|deluxe|mastery)\b/i.test(
        productSurface(p)
      )
    );
    if (!hasPremium) {
      out.push({
        id: "tier:premium-missing",
        severity: "opportunity",
        title: "No premium / advanced version",
        detail:
          "Your catalog has no premium-tier product. A 'complete' or 'advanced' variant typically commands 2–3x the price of the base SKU.",
      });
    }
  }

  // 9. Companion / supporting products. If there's a strong category with
  //    only a single product, recommend a companion. (Distinct from #2 which
  //    looks for ≥3 to suggest a bundle.)
  const singletons: [string, Product][] = [];
  for (const [cat, ps] of byCategory) {
    if (ps.length === 1) singletons.push([cat, ps[0]]);
  }
  if (singletons.length > 0 && singletons.length <= 5) {
    out.push({
      id: "companion:singletons",
      severity: "note",
      title: `${singletons.length} solo product${singletons.length === 1 ? "" : "s"} could use a companion`,
      detail:
        "Categories with a single product don't yet have a companion (worksheet, template, mini-course). Companions lift average order value with less effort than a brand-new line.",
      relatedProductIds: singletons.map(([, p]) => p.id),
    });
  }

  return out;
}

/**
 * Cheap string-similarity: returns true if 60%+ of the shorter string's
 * tokens appear in the longer one. Used only for "possible duplicate"
 * detection; false positives are acceptable, the user makes the call.
 */
function similar(a: string, b: string): boolean {
  const stop = new Set(["the", "a", "an", "and", "of", "for", "to", "in"]);
  const tokens = (s: string) =>
    s
      .split(/[^\w]+/)
      .filter((t) => t && !stop.has(t))
      .map((t) => t.toLowerCase());
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const setLonger = new Set(longer);
  const hits = shorter.filter((t) => setLonger.has(t)).length;
  return hits / shorter.length >= 0.6;
}
