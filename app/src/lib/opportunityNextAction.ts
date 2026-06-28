// Recommended next action for an opportunity.
//
// The Product Research module is meant to drive DECISIONS, not just present
// data. Every opportunity gets a clearly-labeled "recommended next action"
// derived from its score band, pipeline status, and whether it's already
// been converted to a product. The recommendation is heuristic, not AI —
// users can read the rule and disagree with it.
//
// All copy is short imperative phrasing that fits in a single tile.

import type { Opportunity } from "@/types";
import { scoreBand } from "./opportunityScore";

export interface NextAction {
  /** Short imperative label (e.g. "Convert to product draft"). */
  label: string;
  /** One-sentence explanation of WHY this is the suggested next move. */
  reason: string;
  /** Visual tone for the recommendation card. */
  tone: "success" | "info" | "warn" | "default";
  /** Stable id so consumers can switch on the action without parsing strings. */
  id:
    | "convert"
    | "open-linked-product"
    | "advance-to-planned"
    | "advance-to-creating"
    | "advance-to-ready"
    | "advance-to-published"
    | "advance-to-optimizing"
    | "research-more"
    | "archive-low-score"
    | "rate-factors";
}

export function recommendedNextAction(o: Opportunity): NextAction {
  // 0. Already linked to a product — direct them there.
  if (o.linkedProductId) {
    return {
      id: "open-linked-product",
      label: "Open linked product",
      reason: "This opportunity is already converted into a product.",
      tone: "info",
    };
  }

  const band = scoreBand(o.score.total);
  const hasNoFactorsRated =
    Object.values(o.score.factors).filter((v) => typeof v === "number")
      .length === 0;

  // 1. Brand new opportunity with no factor ratings yet.
  if (hasNoFactorsRated && (o.status === "idea" || o.status === "researching")) {
    return {
      id: "rate-factors",
      label: "Rate the 8 factors",
      reason:
        "No factors have been rated yet. Score search demand, competition, fit, and effort to get a meaningful Opportunity Score.",
      tone: "warn",
    };
  }

  // 2. Low score in early stages — recommend archive.
  if (band === "low" && (o.status === "idea" || o.status === "researching")) {
    return {
      id: "archive-low-score",
      label: "Consider archiving",
      reason: `Score is ${o.score.total}/100. Either re-rate the factors or remove this opportunity so it doesn't dilute the pipeline.`,
      tone: "default",
    };
  }

  // 3. Per-stage default progression.
  switch (o.status) {
    case "idea":
      return band === "excellent" || band === "high"
        ? {
            id: "advance-to-planned",
            label: "Move to Planned",
            reason: `Score is ${o.score.total}/100. This is one of your higher-rated ideas — commit to building it.`,
            tone: "success",
          }
        : {
            id: "research-more",
            label: "Move to Researching",
            reason: "Score is decent but not strong. Spend an hour validating before committing.",
            tone: "info",
          };
    case "researching":
      return {
        id: "advance-to-planned",
        label: "Move to Planned",
        reason: "Research stage is done — commit or archive.",
        tone: "info",
      };
    case "planned":
      return {
        id: "convert",
        label: "Convert to product draft",
        reason: "Ready to commit. Create the Product record and start building.",
        tone: "success",
      };
    case "creating":
      return {
        id: "advance-to-ready",
        label: "Mark as Ready to launch",
        reason: "Once the product is built, move it to Ready.",
        tone: "info",
      };
    case "ready":
      return {
        id: "advance-to-published",
        label: "Launch & mark as Published",
        reason: "Use the Campaign Builder to launch, then move the opportunity to Published.",
        tone: "success",
      };
    case "published":
      return {
        id: "advance-to-optimizing",
        label: "Move to Optimizing",
        reason: "After launch, iterate on copy and channels based on early performance.",
        tone: "info",
      };
    case "optimizing":
      return {
        id: "open-linked-product",
        label: "Track performance",
        reason: "Use Campaign Analytics to see what's working and refine.",
        tone: "info",
      };
  }
}
