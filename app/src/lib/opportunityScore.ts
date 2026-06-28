// Pure scoring math for the Product Research module.
//
// The Opportunity Score is a weighted average of 8 factors, each 0–100.
// Weights come from settings.researchScoreWeights and are user-editable
// in a small modal — the scoring model is therefore transparent (you
// see every weight) and configurable (you can change them and the
// effect is immediate across every opportunity).
//
// Missing factors default to a neutral 50 so a brand-new opportunity
// without any ratings scores 50 (i.e. "no signal yet"), not 0.

import type {
  AppSettings,
  OpportunityScore,
  OpportunityScoreFactor,
} from "@/types";

export const SCORE_FACTORS: OpportunityScoreFactor[] = [
  "searchDemand",
  "competition",
  "seasonality",
  "commercialIntent",
  "catalogFit",
  "reusability",
  "creationEffort",
  "revenuePotential",
];

export const FACTOR_LABEL: Record<OpportunityScoreFactor, string> = {
  searchDemand: "Search demand",
  competition: "Competition (lower-better)",
  seasonality: "Seasonality (evergreen-better)",
  commercialIntent: "Commercial intent",
  catalogFit: "Catalog fit",
  reusability: "Reusability",
  creationEffort: "Creation effort (lower-better)",
  revenuePotential: "Revenue potential",
};

export const FACTOR_DESCRIPTION: Record<OpportunityScoreFactor, string> = {
  searchDemand:
    "How many people are searching for this. 100 = strong demand.",
  competition:
    "Adjusted so 100 = LOW competition (easy to rank / less crowded).",
  seasonality:
    "100 = evergreen demand. Lower = more time-bounded (holiday-only, etc.).",
  commercialIntent:
    "How likely searchers are to buy versus browse. 100 = ready-to-buy.",
  catalogFit:
    "How well this fits your existing catalog and brand. 100 = perfect alignment.",
  reusability:
    "How much of this product / its assets could be reused across other launches.",
  creationEffort:
    "Adjusted so 100 = LOW effort (fast to produce). 0 = months of work.",
  revenuePotential:
    "Expected revenue size. 100 = high lifetime revenue, 0 = trivial.",
};

const NEUTRAL = 50;

/** Resolved weight map — guarantees every factor has a non-negative number. */
function resolveWeights(
  settings: AppSettings
): Record<OpportunityScoreFactor, number> {
  const cfg = settings.researchScoreWeights ?? {};
  const out = {} as Record<OpportunityScoreFactor, number>;
  for (const f of SCORE_FACTORS) {
    const w = cfg[f];
    out[f] = typeof w === "number" && Number.isFinite(w) && w >= 0 ? w : 1;
  }
  return out;
}

/**
 * Compute the 0–100 weighted-average score from the factor ratings and
 * the user's weight settings. Missing factors are treated as neutral (50)
 * so opportunities without any rating land at the midpoint, not zero.
 */
export function computeScoreTotal(
  factors: Partial<Record<OpportunityScoreFactor, number>>,
  settings: AppSettings
): number {
  const weights = resolveWeights(settings);
  let weightedSum = 0;
  let totalWeight = 0;
  for (const f of SCORE_FACTORS) {
    const w = weights[f];
    if (w <= 0) continue;
    const v = typeof factors[f] === "number" ? (factors[f] as number) : NEUTRAL;
    weightedSum += v * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/** Convenience: build a full OpportunityScore object from factors + settings. */
export function buildScore(
  factors: Partial<Record<OpportunityScoreFactor, number>>,
  settings: AppSettings
): OpportunityScore {
  return {
    total: computeScoreTotal(factors, settings),
    factors: { ...factors },
  };
}

/**
 * For UI: human-readable band for an overall score. Used for color coding
 * in the Kanban and the opportunity list.
 */
export function scoreBand(total: number): "low" | "medium" | "high" | "excellent" {
  if (total >= 80) return "excellent";
  if (total >= 65) return "high";
  if (total >= 45) return "medium";
  return "low";
}

/**
 * Per-factor contribution analysis used by the Opportunity Detail page to
 * answer "why did this score what it scored?" Returns the factors sorted by
 * weighted contribution so the UI can show the top contributors and the
 * top blockers without the user having to read every slider.
 *
 * The contribution of a factor = (factor value) × (factor weight). High
 * contribution means the factor is BOTH well-rated AND weighted heavily.
 */
export interface FactorContribution {
  factor: OpportunityScoreFactor;
  value: number; // 0-100 user/AI rating
  weight: number; // user-configured weight
  contribution: number; // value * weight
}

export function scoreContributors(
  factors: Partial<Record<OpportunityScoreFactor, number>>,
  settings: AppSettings
): {
  /** Factors with the highest contribution — the "why this scored high." */
  drivers: FactorContribution[];
  /** Factors with the lowest contribution — the "what's holding this back." */
  blockers: FactorContribution[];
} {
  const weights = resolveWeights(settings);
  const rows: FactorContribution[] = SCORE_FACTORS.map((f) => {
    const value =
      typeof factors[f] === "number" ? (factors[f] as number) : NEUTRAL;
    const weight = weights[f];
    return { factor: f, value, weight, contribution: value * weight };
  })
    // Skip factors with zero weight — they don't matter to the model.
    .filter((r) => r.weight > 0);

  const sorted = [...rows].sort((a, b) => b.contribution - a.contribution);
  return {
    drivers: sorted.slice(0, 3),
    blockers: [...rows]
      .sort((a, b) => a.value - b.value) // lowest value first regardless of weight
      .slice(0, 2)
      .filter((r) => r.value < NEUTRAL), // only show factors actually below neutral
  };
}
