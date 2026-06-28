import { Link } from "react-router-dom";
import { ExternalLink, Plus } from "lucide-react";
import { SectionCard, Badge, EmptyState } from "@/components/ui";
import { campaignTotals, fmtCompact, fmtMoney, fmtPct } from "@/lib/analytics";
import { formatDate } from "@/lib/util";
import type { Campaign, PerformanceSnapshot } from "@/types";
import { STATUS_TONE } from "./atoms";

interface Props {
  campaigns: Campaign[];
  filteredSnaps: PerformanceSnapshot[];
  onDelete(id: string, name: string): void;
  onCreate(): void;
}

export default function CampaignsTable({
  campaigns,
  filteredSnaps,
  onDelete,
  onCreate,
}: Props) {
  return (
    <SectionCard title={`All campaigns (${campaigns.length})`} className="mb-5">
      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns match your filters"
          hint="Create one to start tracking, or reset the filters above."
          action={
            <button onClick={onCreate} className="btn-primary mt-3">
              <Plus className="h-4 w-4" /> New campaign
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2">Campaign</th>
                <th>Platform</th>
                <th>Status</th>
                <th className="text-right">Impr</th>
                <th className="text-right">Clicks</th>
                <th className="text-right">CTR</th>
                <th className="text-right">Sales</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">ROI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const t = campaignTotals(c.id, filteredSnaps);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2">
                      <Link
                        to={`/campaigns/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div className="text-[11px] text-slate-500">
                        {formatDate(c.startDate)}
                        {c.endDate ? ` → ${formatDate(c.endDate)}` : ""}
                      </div>
                    </td>
                    <td className="text-xs">{c.platform}</td>
                    <td>
                      <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="text-right tabular-nums">
                      {fmtCompact(t.impressions)}
                    </td>
                    <td className="text-right tabular-nums">
                      {fmtCompact(t.clicks)}
                    </td>
                    <td className="text-right tabular-nums">{fmtPct(t.ctr)}</td>
                    <td className="text-right tabular-nums">{t.sales}</td>
                    <td className="text-right tabular-nums">
                      {fmtMoney(t.revenue)}
                    </td>
                    <td className="text-right tabular-nums">
                      {fmtPct(t.roi, 0)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/campaigns/${c.id}`}
                          className="btn-ghost h-7 px-2 text-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => onDelete(c.id, c.name)}
                          className="btn-ghost h-7 px-2 text-xs"
                          aria-label={`Delete ${c.name}`}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
