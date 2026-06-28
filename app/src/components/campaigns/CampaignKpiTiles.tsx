import { Badge } from "@/components/ui";
import { fmtMoney, fmtPct, type CampaignTotals } from "@/lib/analytics";
import type { Campaign } from "@/types";
import { STATUS_TONE, Tile } from "./atoms";

/** KPI tile grid for the Campaign Detail page header. */
export default function CampaignKpiTiles({
  campaign,
  totals,
}: {
  campaign: Campaign;
  totals: CampaignTotals;
}) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Status"
        value={<Badge tone={STATUS_TONE[campaign.status]}>{campaign.status}</Badge>}
      />
      <Tile label="Impressions" value={totals.impressions.toLocaleString()} />
      <Tile label="Clicks" value={totals.clicks.toLocaleString()} />
      <Tile label="CTR" value={fmtPct(totals.ctr)} />
      <Tile label="Sales" value={totals.sales.toLocaleString()} />
      <Tile label="Revenue" value={fmtMoney(totals.revenue)} />
      <Tile label="Cost" value={fmtMoney(totals.cost)} />
      <Tile
        label="ROI"
        value={fmtPct(totals.roi, 0)}
        accent={
          totals.roi === null ? undefined : totals.roi >= 0 ? "good" : "bad"
        }
      />
    </div>
  );
}
