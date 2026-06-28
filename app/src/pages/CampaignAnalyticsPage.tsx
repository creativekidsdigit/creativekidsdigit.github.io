import { useMemo, useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui";
import Modal from "@/components/Modal";
import CampaignForm from "@/components/CampaignForm";
import { toast } from "@/components/Toast";
import {
  applyFilters,
  byPlatform,
  byProduct,
  dailySeries,
  fmtCompact,
  fmtMoney,
  fmtPct,
  padSeries,
  snapshotsInRange,
  topCampaigns,
  underperformers,
  type CampaignFilters,
} from "@/lib/analytics";
import CampaignFiltersBar from "@/components/campaigns/CampaignFiltersBar";
import {
  TopPerformersList,
  UnderperformersList,
} from "@/components/campaigns/PerformersLists";
import CampaignTrendCharts from "@/components/campaigns/CampaignTrendCharts";
import CampaignsTable from "@/components/campaigns/CampaignsTable";
import ReportsPanel from "@/components/campaigns/ReportsPanel";
import { StatTile } from "@/components/campaigns/atoms";

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function CampaignAnalyticsPage() {
  const campaigns = useAppStore((s) => s.campaigns);
  const snapshots = useAppStore((s) => s.perfSnapshots);
  const products = useAppStore((s) => s.products);
  const createCampaign = useAppStore((s) => s.createCampaign);
  const deleteCampaign = useAppStore((s) => s.deleteCampaign);

  const [openNew, setOpenNew] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CampaignFilters>(() => {
    const r = defaultRange();
    return { from: r.from, to: r.to };
  });

  // ---------- derived ----------

  const filtered = useMemo(() => {
    const base = applyFilters(campaigns, filters);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) =>
      `${c.name} ${c.platform} ${c.goal} ${c.tags.join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }, [campaigns, filters, search]);

  const filteredIds = useMemo(
    () => new Set(filtered.map((c) => c.id)),
    [filtered]
  );
  const filteredSnaps = useMemo(
    () =>
      snapshotsInRange(
        snapshots.filter((s) => filteredIds.has(s.campaignId)),
        filters.from,
        filters.to
      ),
    [snapshots, filteredIds, filters.from, filters.to]
  );

  const totals = useMemo(() => {
    let imp = 0,
      clk = 0,
      sal = 0,
      rev = 0,
      cost = 0;
    for (const s of filteredSnaps) {
      imp += s.impressions;
      clk += s.clicks;
      sal += s.sales;
      rev += s.revenue;
      cost += s.cost;
    }
    return {
      impressions: imp,
      clicks: clk,
      sales: sal,
      revenue: rev,
      cost,
      ctr: imp > 0 ? clk / imp : null,
      conversionRate: clk > 0 ? sal / clk : null,
      roi: cost > 0 ? (rev - cost) / cost : null,
      cpc: clk > 0 ? cost / clk : null,
      costPerConversion: sal > 0 ? cost / sal : null,
    };
  }, [filteredSnaps]);

  const activeCount = filtered.filter((c) => c.status === "active").length;
  const completedCount = filtered.filter(
    (c) => c.status === "completed"
  ).length;

  const series = useMemo(() => {
    const raw = dailySeries(filteredSnaps);
    if (filters.from && filters.to)
      return padSeries(raw, filters.from, filters.to);
    return raw;
  }, [filteredSnaps, filters.from, filters.to]);

  const seriesWithConvRate = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        // for the conversion rate chart we need percentages; null-safe
        cr: p.clicks > 0 ? (p.sales / p.clicks) * 100 : 0,
      })),
    [series]
  );

  const platforms = useMemo(
    () => byPlatform(filtered, filteredSnaps),
    [filtered, filteredSnaps]
  );
  const productBd = useMemo(
    () => byProduct(filtered, filteredSnaps, products),
    [filtered, filteredSnaps, products]
  );
  const top = useMemo(
    () => topCampaigns(filtered, filteredSnaps, "revenue", 5),
    [filtered, filteredSnaps]
  );
  const weak = useMemo(
    () => underperformers(filtered, filteredSnaps),
    [filtered, filteredSnaps]
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    campaigns.forEach((c) => c.tags.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [campaigns]);

  // ---------- handlers ----------

  function setFilter<K extends keyof CampaignFilters>(
    k: K,
    v: CampaignFilters[K]
  ) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  function resetFilters() {
    const r = defaultRange();
    setFilters({ from: r.from, to: r.to });
    setSearch("");
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteCampaign(id);
    toast.success("Campaign deleted");
  }

  // ---------- render ----------

  return (
    <>
      <PageHeader
        title="Campaign Analytics"
        description="Track every marketing campaign and see what's actually driving traffic, engagement, and sales."
      >
        <button className="btn-primary" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" /> New campaign
        </button>
      </PageHeader>

      <CampaignFiltersBar
        filters={filters}
        search={search}
        allTags={allTags}
        products={products}
        setFilter={setFilter}
        setSearch={setSearch}
        onReset={resetFilters}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active"
          value={activeCount}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatTile label="Completed" value={completedCount} />
        <StatTile label="Total campaigns" value={filtered.length} />
        <StatTile label="Snapshots" value={filteredSnaps.length} />
        <StatTile label="Impressions" value={fmtCompact(totals.impressions)} />
        <StatTile label="Clicks" value={fmtCompact(totals.clicks)} />
        <StatTile label="CTR" value={fmtPct(totals.ctr)} />
        <StatTile label="Conversion" value={fmtPct(totals.conversionRate)} />
        <StatTile label="Sales" value={totals.sales.toLocaleString()} />
        <StatTile label="Revenue" value={fmtMoney(totals.revenue)} />
        <StatTile label="Cost" value={fmtMoney(totals.cost)} />
        <StatTile
          label="ROI"
          value={fmtPct(totals.roi, 0)}
          accent={
            totals.roi !== null
              ? totals.roi >= 0
                ? "good"
                : "bad"
              : undefined
          }
        />
        <StatTile label="Cost / click" value={fmtMoney(totals.cpc ?? NaN)} />
        <StatTile
          label="Cost / conversion"
          value={fmtMoney(totals.costPerConversion ?? NaN)}
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <TopPerformersList rows={top} />
        <UnderperformersList rows={weak} />
      </div>

      <CampaignTrendCharts
        series={series}
        seriesWithConvRate={seriesWithConvRate}
        platforms={platforms}
        productBd={productBd}
        campaigns={filtered}
        filteredSnaps={filteredSnaps}
      />

      <CampaignsTable
        campaigns={filtered}
        filteredSnaps={filteredSnaps}
        onDelete={handleDelete}
        onCreate={() => setOpenNew(true)}
      />

      <ReportsPanel
        campaigns={campaigns}
        snapshots={snapshots}
        filteredCampaigns={filtered}
        filteredSnaps={filteredSnaps}
        products={products}
      />

      <Modal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title="New campaign"
        size="lg"
      >
        <CampaignForm
          submitLabel="Create campaign"
          onSubmit={async (vals) => {
            const c = await createCampaign(vals);
            toast.success(`Created "${c.name}"`);
            setOpenNew(false);
          }}
        />
      </Modal>
    </>
  );
}
