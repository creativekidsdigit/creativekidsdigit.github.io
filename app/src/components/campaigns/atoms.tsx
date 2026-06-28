// Shared atomic UI bits and constants for the Campaign Analytics and
// Campaign Detail pages. Extracted as part of the maintainability refactor —
// zero behavior changes, zero visual changes. Just code organization so the
// orchestrator pages stay small and the pieces are independently testable.

import type { ReactNode } from "react";
import { FileDown } from "lucide-react";
import { ResponsiveContainer } from "recharts";
import type { CampaignStatus } from "@/types";

export const PIE_COLORS = [
  "#7c3aed",
  "#ec4899",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
];

export const STATUS_TONE: Record<
  CampaignStatus,
  "default" | "info" | "success" | "warn" | "danger"
> = {
  draft: "default",
  scheduled: "info",
  active: "success",
  paused: "warn",
  completed: "info",
  archived: "danger",
};

/**
 * Compact KPI tile used in the dashboard grid. Slightly richer than `Tile`
 * (supports an icon and accent colors) because the dashboard has many tiles
 * and benefits from visual hierarchy.
 */
export function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: "good" | "bad";
}) {
  const valueClass =
    accent === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-900 dark:text-white";
  // Display "—" instead of "NaN" / "Infinity"
  let display: string | number = value;
  if (typeof value === "string" && (value === "NaN" || value === "Infinity")) {
    display = "—";
  } else if (typeof value === "number" && !Number.isFinite(value)) {
    display = "—";
  }
  return (
    <div className="card flex items-center gap-3 p-3">
      {icon && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className={`truncate text-lg font-semibold ${valueClass}`}>
          {display}
        </div>
      </div>
    </div>
  );
}

/** Simpler tile used by the campaign detail page header KPIs. */
export function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: "good" | "bad";
}) {
  const cls =
    accent === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : "";
  return (
    <div className="card p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

/** Fixed-height responsive chart wrapper used across the dashboard. */
export function ChartContainer({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

/** Smaller chart wrapper for the detail page's 2x2 grid of mini trends. */
export function MiniChart({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="h-40">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

/** Single report-download button used in the dashboard's Reports panel. */
export function ReportButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="btn-secondary justify-start" onClick={onClick}>
      <FileDown className="h-4 w-4" /> {label}
    </button>
  );
}

/** Elapsed days since campaign start, capped at today (or end date if past). */
export function computeElapsed(startDate?: string, endDate?: string): number {
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  const refStr =
    endDate && new Date(endDate).getTime() < Date.now()
      ? endDate
      : new Date().toISOString().slice(0, 10);
  const ref = new Date(refStr).getTime();
  return Math.max(0, Math.floor((ref - start) / 86400000));
}

/** Total days between start and end. Returns 0 for open-ended campaigns. */
export function computeTotalDays(
  startDate?: string,
  endDate?: string
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.max(0, Math.floor((end - start) / 86400000));
}
