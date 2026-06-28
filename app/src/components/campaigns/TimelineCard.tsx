import { AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/ui";
import { fmtMoney, type CampaignTotals } from "@/lib/analytics";
import { formatDate } from "@/lib/util";
import type { Campaign } from "@/types";
import { computeElapsed, computeTotalDays } from "./atoms";

interface Props {
  campaign: Campaign;
  totals: CampaignTotals;
}

/**
 * Timeline + budget progress card. Shows day-counter for finite campaigns
 * and a budget-burn bar with an over-budget warning when applicable.
 */
export default function TimelineCard({ campaign, totals }: Props) {
  const elapsedDays = computeElapsed(campaign.startDate, campaign.endDate);
  const totalDays = computeTotalDays(campaign.startDate, campaign.endDate);
  const progress =
    totalDays > 0 ? Math.min(1, Math.max(0, elapsedDays / totalDays)) : 0;

  return (
    <SectionCard title="Timeline">
      {totalDays === 0 ? (
        <p className="text-xs text-slate-500">
          Open-ended campaign (no end date set).
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>{formatDate(campaign.startDate)}</span>
            <span>
              Day {Math.max(0, Math.min(totalDays, elapsedDays))} / {totalDays}
            </span>
            <span>
              {campaign.endDate ? formatDate(campaign.endDate) : "—"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-pink-500 transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </>
      )}
      {totals.cost > 0 && campaign.budget > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Budget used</span>
            <span>
              {fmtMoney(totals.cost)} / {fmtMoney(campaign.budget)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full transition-all ${
                totals.cost > campaign.budget
                  ? "bg-rose-500"
                  : "bg-emerald-500"
              }`}
              style={{
                width: `${Math.min(100, (totals.cost / campaign.budget) * 100)}%`,
              }}
            />
          </div>
          {totals.cost > campaign.budget && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-3 w-3" />
              Over budget by {fmtMoney(totals.cost - campaign.budget)}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
