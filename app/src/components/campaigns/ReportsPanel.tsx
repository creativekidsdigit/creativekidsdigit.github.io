import { Filter } from "lucide-react";
import { SectionCard } from "@/components/ui";
import { downloadFile } from "@/lib/util";
import {
  monthlyReport,
  platformComparisonReport,
  productPerformanceReport,
  quarterlyReport,
  topCampaignsReport,
  weeklyReport,
} from "@/lib/reports";
import type { Campaign, PerformanceSnapshot, Product } from "@/types";
import { ReportButton } from "./atoms";

interface Props {
  /** All campaigns — used by the time-windowed reports. */
  campaigns: Campaign[];
  /** All snapshots — used by the time-windowed reports. */
  snapshots: PerformanceSnapshot[];
  /** Currently-filtered campaigns — used by filter-aware reports. */
  filteredCampaigns: Campaign[];
  /** Snapshots scoped to the current filter window. */
  filteredSnaps: PerformanceSnapshot[];
  products: Product[];
}

export default function ReportsPanel({
  campaigns,
  snapshots,
  filteredCampaigns,
  filteredSnaps,
  products,
}: Props) {
  function downloadReport(kind: string, body: string) {
    downloadFile(
      `${kind}-${new Date().toISOString().slice(0, 10)}.md`,
      body,
      "text/markdown"
    );
  }

  return (
    <SectionCard
      title="Reports"
      action={
        <span className="text-[11px] text-slate-500">
          <Filter className="mr-1 inline h-3 w-3" />
          Uses current filter window where applicable
        </span>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <ReportButton
          label="Weekly report"
          onClick={() =>
            downloadReport(
              "weekly-report",
              weeklyReport(campaigns, snapshots, products)
            )
          }
        />
        <ReportButton
          label="Monthly report"
          onClick={() =>
            downloadReport(
              "monthly-report",
              monthlyReport(campaigns, snapshots, products)
            )
          }
        />
        <ReportButton
          label="Quarterly report"
          onClick={() =>
            downloadReport(
              "quarterly-report",
              quarterlyReport(campaigns, snapshots, products)
            )
          }
        />
        <ReportButton
          label="Top campaigns"
          onClick={() =>
            downloadReport(
              "top-campaigns",
              topCampaignsReport(filteredCampaigns, filteredSnaps)
            )
          }
        />
        <ReportButton
          label="Platform comparison"
          onClick={() =>
            downloadReport(
              "platform-comparison",
              platformComparisonReport(filteredCampaigns, filteredSnaps)
            )
          }
        />
        <ReportButton
          label="Product performance"
          onClick={() =>
            downloadReport(
              "product-performance",
              productPerformanceReport(
                filteredCampaigns,
                filteredSnaps,
                products
              )
            )
          }
        />
      </div>
    </SectionCard>
  );
}
