// Shared atomic bits for the Product Research module. Keeps the page-level
// orchestrators small and the visual treatments consistent across tabs.

import type { ReactNode } from "react";
import type { OpportunityStatus, OpportunityTrend } from "@/types";
import { scoreBand } from "@/lib/opportunityScore";

export const STATUS_ORDER: OpportunityStatus[] = [
  "idea",
  "researching",
  "planned",
  "creating",
  "ready",
  "published",
  "optimizing",
];

export const STATUS_LABEL: Record<OpportunityStatus, string> = {
  idea: "Ideas",
  researching: "Researching",
  planned: "Planned",
  creating: "Creating",
  ready: "Ready to launch",
  published: "Published",
  optimizing: "Optimizing",
};

export const STATUS_DESCRIPTION: Record<OpportunityStatus, string> = {
  idea: "Captured but not yet evaluated.",
  researching: "Validating demand, competition, fit.",
  planned: "Committed; not yet started.",
  creating: "Actively being built.",
  ready: "Built, awaiting launch.",
  published: "Shipped and selling.",
  optimizing: "Live; iterating on copy / channels.",
};

export const TREND_LABEL: Record<OpportunityTrend, string> = {
  rising: "Rising",
  stable: "Stable",
  declining: "Declining",
  seasonal: "Seasonal",
  evergreen: "Evergreen",
};

export const TREND_TONE: Record<
  OpportunityTrend,
  "success" | "info" | "warn" | "danger" | "default"
> = {
  rising: "success",
  stable: "info",
  declining: "danger",
  seasonal: "warn",
  evergreen: "success",
};

/** Color-coded pill for a 0–100 score. */
export function ScorePill({ total }: { total: number }) {
  const band = scoreBand(total);
  const cls =
    band === "excellent"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
      : band === "high"
        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
        : band === "medium"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}
      title={`Opportunity score: ${total}/100 (${band})`}
    >
      {total}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </div>
  );
}
