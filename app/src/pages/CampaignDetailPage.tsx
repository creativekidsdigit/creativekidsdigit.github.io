import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui";
import CampaignForm from "@/components/CampaignForm";
import { toast } from "@/components/Toast";
import { downloadFile, formatDate, slugify } from "@/lib/util";
import { campaignTotals } from "@/lib/analytics";
import { campaignSummary } from "@/lib/reports";
import CampaignKpiTiles from "@/components/campaigns/CampaignKpiTiles";
import TimelineCard from "@/components/campaigns/TimelineCard";
import PerformanceHistoryCard from "@/components/campaigns/PerformanceHistoryCard";
import VersionHistoryCard from "@/components/campaigns/VersionHistoryCard";
import {
  GeneratedAssetsCard,
  LinkedProductsCard,
} from "@/components/campaigns/SidePanels";
import AiInsightsCard from "@/components/campaigns/AiInsightsCard";

export default function CampaignDetailPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();

  const campaign = useAppStore((s) => s.campaigns.find((c) => c.id === id));
  const products = useAppStore((s) => s.products);
  const allCampaigns = useAppStore((s) => s.campaigns);
  const allSnaps = useAppStore((s) => s.perfSnapshots);
  const content = useAppStore((s) => s.content);
  const updateCampaign = useAppStore((s) => s.updateCampaign);
  const deleteCampaign = useAppStore((s) => s.deleteCampaign);
  const autosave = useAppStore((s) => s.settings.autosave);

  // ---------- derived ----------

  const snapshots = useMemo(
    () => allSnaps.filter((s) => s.campaignId === id),
    [allSnaps, id]
  );
  const totals = useMemo(() => campaignTotals(id, snapshots), [snapshots, id]);
  const linkedProducts = useMemo(
    () => products.filter((p) => campaign?.productIds.includes(p.id)),
    [products, campaign]
  );
  const generatedAssets = useMemo(
    () => content.filter((c) => c.campaignId === id),
    [content, id]
  );
  const peers = useMemo(
    () =>
      allCampaigns
        .filter((c) => c.id !== id && c.platform === campaign?.platform)
        .slice(0, 8),
    [allCampaigns, id, campaign]
  );
  const peerSnaps = useMemo(
    () => allSnaps.filter((s) => peers.some((p) => p.id === s.campaignId)),
    [allSnaps, peers]
  );

  // ---------- handlers ----------

  function exportSummary() {
    if (!campaign) return;
    const body = campaignSummary(campaign, snapshots, products);
    downloadFile(
      `${slugify(campaign.name)}-summary.md`,
      body,
      "text/markdown"
    );
  }

  // ---------- render ----------

  if (!campaign) {
    return (
      <EmptyState
        title="Campaign not found"
        hint="It may have been deleted."
        action={
          <Link to="/campaigns" className="btn-secondary mt-3">
            <ArrowLeft className="h-4 w-4" /> Back to campaigns
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={`${campaign.platform} · ${campaign.goal} · ${formatDate(campaign.startDate)}${campaign.endDate ? ` → ${formatDate(campaign.endDate)}` : ""}`}
      >
        <Link to="/campaigns" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> All campaigns
        </Link>
        <button className="btn-secondary" onClick={exportSummary}>
          <FileDown className="h-4 w-4" /> Export summary
        </button>
        <button
          className="btn-danger"
          onClick={async () => {
            if (!confirm(`Delete "${campaign.name}" and its performance data?`))
              return;
            await deleteCampaign(campaign.id);
            toast.success("Campaign deleted");
            nav("/campaigns");
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </PageHeader>

      <CampaignKpiTiles campaign={campaign} totals={totals} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="Overview">
            <CampaignForm
              initial={campaign}
              submitLabel={autosave ? "Save (autosaved)" : "Save"}
              autosave={
                autosave
                  ? (vals) => updateCampaign(campaign.id, vals)
                  : undefined
              }
              onSubmit={async (vals) => {
                await updateCampaign(campaign.id, vals);
                toast.success("Saved");
              }}
            />
          </SectionCard>

          <TimelineCard campaign={campaign} totals={totals} />

          <PerformanceHistoryCard
            campaign={campaign}
            snapshots={snapshots}
          />

          <VersionHistoryCard versions={campaign.versions} />
        </div>

        <div className="space-y-5">
          <LinkedProductsCard products={linkedProducts} />
          <GeneratedAssetsCard
            campaignId={campaign.id}
            assets={generatedAssets}
          />
          <AiInsightsCard
            campaign={campaign}
            products={products}
            linkedProducts={linkedProducts}
            snapshots={snapshots}
            generatedAssets={generatedAssets}
            peers={peers}
            peerSnaps={peerSnaps}
          />
        </div>
      </div>
    </>
  );
}
