// AI prompt builders for the Product Research module. Every call routes
// through the existing ai.generate() — no new providers, no duplicate
// generation logic. Output is plain markdown the UI clearly labels as
// AI-generated.

import { generate } from "@/lib/ai";
import type {
  AppSettings,
  Competitor,
  Keyword,
  Opportunity,
  Product,
} from "@/types";

const SYSTEM_IDEA = `You are a digital-product strategist for a small creator (printables, workbooks, journals, ADHD/teacher resources). You generate SPECIFIC, ACTIONABLE product ideas — not generic categories. Every idea you propose is something one person could build in 1–4 weeks. You never propose ideas that already exist in the user's catalog.`;

const SYSTEM_BI = `You are a senior product strategist reviewing a creator's catalog + opportunity pipeline. You write clearly, name what you actually see in the data, and distinguish recommendations from facts. You write in plain markdown.`;

export interface AiOpportunityDraft {
  title: string;
  description: string;
  category: string;
  audience: string;
  keywords: string[];
  /** AI's own 0–100 ratings for each factor. UI shows these as defaults
   *  the user can adjust before saving. */
  factors: {
    searchDemand?: number;
    competition?: number;
    seasonality?: number;
    commercialIntent?: number;
    catalogFit?: number;
    reusability?: number;
    creationEffort?: number;
    revenuePotential?: number;
  };
  /** AI's optional rationale, shown inline so the user knows WHY. */
  rationale?: string;
}

/**
 * Ask the AI for `count` new opportunity drafts the user might pursue.
 *
 * The prompt is engineered to:
 *  - Use the existing catalog as catalog-fit context
 *  - Avoid duplicating existing product titles (the model gets the list)
 *  - Avoid duplicating existing opportunities-in-pipeline
 *  - Return structured JSON so the UI can render + save with one click
 */
export async function generateOpportunityIdeas(
  ctx: {
    products: Product[];
    opportunities: Opportunity[];
    keywords: Keyword[];
    competitors: Competitor[];
    /** Optional theme hint from the user (e.g. "back-to-school", "ADHD teens"). */
    hint?: string;
    /** How many ideas to ask for. UI caps this. */
    count: number;
  },
  settings: AppSettings
): Promise<AiOpportunityDraft[]> {
  const existingProducts = ctx.products.map((p) => ({
    title: p.title,
    category: p.category,
    audience: p.audience,
    problemSolved: p.problemSolved,
    keywords: p.keywords.slice(0, 6),
  }));
  const existingOpps = ctx.opportunities.map((o) => o.title);
  const seedKeywords = ctx.keywords
    .slice(0, 30)
    .map((k) => ({ term: k.term, type: k.type, topic: k.topic }));

  const user = `EXISTING CATALOG (${ctx.products.length} products)
${JSON.stringify(existingProducts, null, 2)}

EXISTING OPPORTUNITIES IN PIPELINE
${JSON.stringify(existingOpps, null, 2)}

KEYWORD SEEDS (${ctx.keywords.length} researched)
${JSON.stringify(seedKeywords, null, 2)}

BRAND VOICE / DEFAULT AUDIENCE
${settings.brandVoice}
${settings.defaultAudience}

${ctx.hint ? `THEME HINT FROM USER\n${ctx.hint}\n` : ""}
TASK
Propose ${ctx.count} NEW product ideas that this creator should consider next. Rules:
1. Each idea must be DIFFERENT from any existing catalog product (compare by title + topic).
2. Each idea must be DIFFERENT from any existing opportunity in the pipeline.
3. Each idea must be specific enough to build in 1–4 weeks of solo work.
4. Lean into the creator's existing audience and brand voice.
5. For each, estimate the 8 score factors (each 0–100):
   - searchDemand: how strong is search demand
   - competition: 100 means LOW competition (easy to rank)
   - seasonality: 100 means evergreen, lower means more time-bounded
   - commercialIntent: how likely searchers are to buy vs. browse
   - catalogFit: how well this fits the current catalog
   - reusability: how reusable the assets are across other products
   - creationEffort: 100 means LOW effort to produce
   - revenuePotential: expected lifetime revenue size

OUTPUT
Return ONLY a JSON array with this exact shape (no prose before or after):

[
  {
    "title": "...",
    "description": "...",
    "category": "...",
    "audience": "...",
    "keywords": ["...", "..."],
    "factors": { "searchDemand": 70, "competition": 60, "seasonality": 80, "commercialIntent": 75, "catalogFit": 85, "reusability": 70, "creationEffort": 65, "revenuePotential": 70 },
    "rationale": "..."
  },
  ...
]`;

  const result = await generate(
    {
      system: SYSTEM_IDEA,
      user,
      temperature: 0.7,
      maxTokens: 2200,
    },
    settings
  );
  return parseDrafts(result.text, ctx.count);
}

/** Extract the JSON array from a (possibly noisy) model response. */
function parseDrafts(raw: string, expectedCount: number): AiOpportunityDraft[] {
  // Strip ``` fences if present
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "");
  }
  // Find the first [ and last ] to be resilient to leading/trailing prose.
  const open = s.indexOf("[");
  const close = s.lastIndexOf("]");
  if (open >= 0 && close > open) s = s.slice(open, close + 1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: AiOpportunityDraft[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!title) continue;
    const factorsRaw =
      r.factors && typeof r.factors === "object"
        ? (r.factors as AiOpportunityDraft["factors"])
        : {};
    const keywords = Array.isArray(r.keywords)
      ? r.keywords.filter((x): x is string => typeof x === "string")
      : [];
    const draft: AiOpportunityDraft = {
      title,
      description: typeof r.description === "string" ? r.description : "",
      category: typeof r.category === "string" ? r.category : "",
      audience: typeof r.audience === "string" ? r.audience : "",
      keywords,
      factors: sanitizeFactors(factorsRaw),
    };
    if (typeof r.rationale === "string") draft.rationale = r.rationale;
    out.push(draft);
    if (out.length >= expectedCount) break;
  }
  return out;
}

function sanitizeFactors(
  v: AiOpportunityDraft["factors"]
): AiOpportunityDraft["factors"] {
  const out: AiOpportunityDraft["factors"] = {};
  for (const k of [
    "searchDemand",
    "competition",
    "seasonality",
    "commercialIntent",
    "catalogFit",
    "reusability",
    "creationEffort",
    "revenuePotential",
  ] as const) {
    const n = (v as Record<string, unknown>)[k];
    if (typeof n === "number" && Number.isFinite(n)) {
      out[k] = Math.max(0, Math.min(100, Math.round(n)));
    }
  }
  return out;
}

/**
 * Ask the AI for a free-form Business Intelligence summary of the workspace.
 * Returns markdown to render in the Insights tab. Always clearly labeled
 * AS AI-generated in the UI.
 */
export async function generateBusinessIntelligence(
  ctx: {
    products: Product[];
    opportunities: Opportunity[];
    keywords: Keyword[];
    competitors: Competitor[];
  },
  settings: AppSettings
): Promise<string> {
  const payload = {
    products: ctx.products.map((p) => ({
      title: p.title,
      category: p.category,
      audience: p.audience,
      pricing: p.pricing,
      status: p.status,
      tags: p.keywords.slice(0, 6),
    })),
    opportunities: ctx.opportunities.map((o) => ({
      title: o.title,
      category: o.category,
      status: o.status,
      trend: o.trend,
      score: o.score.total,
      keywords: o.keywords,
    })),
    keywords: ctx.keywords.map((k) => ({
      term: k.term,
      type: k.type,
      topic: k.topic,
    })),
    competitors: ctx.competitors.map((c) => ({
      title: c.productTitle,
      category: c.category,
      price: c.price,
      missingFeatures: c.missingFeatures,
    })),
  };

  const user = `WORKSPACE SNAPSHOT (JSON)
${JSON.stringify(payload, null, 2)}

TASK
Read the workspace carefully and produce a Business Intelligence brief in markdown.

REQUIRED SECTIONS (use these exact headings):
## What's working
2–4 specific observations grounded in the data. Quote concrete things you see.

## Gaps & opportunities
What's missing? What patterns suggest a profitable next move?

## Bundle / course candidates
If 3+ products cluster around a theme, name them and the suggested bundle/course angle.

## What to watch
Risks, possible duplicates, stalled ideas, or category over-concentration.

## Three concrete next moves
Numbered list of 3 specific things to do this week.

Rules:
- Every recommendation is your opinion; do not present recommendations as data.
- Where you cite numbers, use the ones in the snapshot. Do not invent metrics.
- Keep each section short — readable in 30 seconds.

Output: markdown only, no preamble.`;

  const result = await generate(
    {
      system: SYSTEM_BI,
      user,
      temperature: 0.4,
      maxTokens: 1500,
    },
    settings
  );
  return result.text.trim();
}
