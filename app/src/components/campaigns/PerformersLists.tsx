import { Link } from "react-router-dom";
import { TrendingDown } from "lucide-react";
import { SectionCard, Badge, EmptyState } from "@/components/ui";
import { fmtMoney, fmtPct } from "@/lib/analytics";
import type { CampaignTotals } from "@/lib/analytics";
import type { Campaign } from "@/types";
import { STATUS_TONE } from "./atoms";

interface TopProps {
  rows: { campaign: Campaign; totals: CampaignTotals }[];
}

export function TopPerformersList({ rows }: TopProps) {
  return (
    <SectionCard title="Top-performing campaigns">
      {rows.length === 0 ? (
        <EmptyState
          title="No campaigns with revenue yet"
          hint="Record performance snapshots on a campaign to see rankings."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((x, i) => (
            <li
              key={x.campaign.id}
              className="flex items-center gap-3 rounded-lg border border-slate-100 p-2 dark:border-slate-800"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-900/40 dark:text-brand-200">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/campaigns/${x.campaign.id}`}
                  className="line-clamp-1 text-sm font-medium hover:underline"
                >
                  {x.campaign.name}
                </Link>
                <div className="text-[11px] text-slate-500">
                  {x.campaign.platform} · {fmtMoney(x.totals.revenue)} revenue ·{" "}
                  {x.totals.sales} sales · {fmtPct(x.totals.ctr)} CTR
                </div>
              </div>
              <Badge tone={STATUS_TONE[x.campaign.status]}>
                {x.campaign.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

interface UnderProps {
  rows: { campaign: Campaign; totals: CampaignTotals }[];
}

export function UnderperformersList({ rows }: UnderProps) {
  return (
    <SectionCard
      title="Underperforming campaigns"
      action={
        <span className="text-[11px] text-slate-500">
          CTR &lt; 0.5% or zero clicks
        </span>
      }
    >
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">
          No flagged underperformers in this window. Good sign.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 8).map((x) => (
            <li
              key={x.campaign.id}
              className="flex items-center gap-3 rounded-lg border border-slate-100 p-2 dark:border-slate-800"
            >
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/campaigns/${x.campaign.id}`}
                  className="line-clamp-1 text-sm font-medium hover:underline"
                >
                  {x.campaign.name}
                </Link>
                <div className="text-[11px] text-slate-500">
                  {x.campaign.platform} ·{" "}
                  {x.totals.impressions.toLocaleString()} impressions ·{" "}
                  {x.totals.clicks} clicks · {fmtPct(x.totals.ctr)} CTR
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
