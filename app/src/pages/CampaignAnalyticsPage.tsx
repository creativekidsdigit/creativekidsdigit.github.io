import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  FileDown,
  Filter,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components/ui";
import Modal from "@/components/Modal";
import CampaignForm from "@/components/CampaignForm";
import { toast } from "@/components/Toast";
import { downloadFile, formatDate, slugify } from "@/lib/util";
import {
  applyFilters,
  byPlatform,
  byProduct,
  campaignTotals,
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
import {
  monthlyReport,
  platformComparisonReport,
  productPerformanceReport,
  quarterlyReport,
  topCampaignsReport,
  weeklyReport,
} from "@/lib/reports";
import type { CampaignStatus } from "@/types";

const PIE_COLORS = [
  "#7c3aed",
  "#ec4899",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
];

const STATUS_TONE: Record<
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

  // ids for filter controls
  const idFrom = useId();
  const idTo = useId();
  const idPlatform = useId();
  const idProduct = useId();
  const idStatus = useId();
  const idGoal = useId();
  const idTag = useId();
  const idSearch = useId();

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

  const filteredIds = useMemo(() => new Set(filtered.map((c) => c.id)), [filtered]);
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
  const completedCount = filtered.filter((c) => c.status === "completed").length;

  const series = useMemo(() => {
    const raw = dailySeries(filteredSnaps);
    if (filters.from && filters.to) return padSeries(raw, filters.from, filters.to);
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

  const platforms = useMemo(() => byPlatform(filtered, filteredSnaps), [
    filtered,
    filteredSnaps,
  ]);
  const productBd = useMemo(
    () => byProduct(filtered, filteredSnaps, products),
    [filtered, filteredSnaps, products]
  );
  const top = useMemo(() => topCampaigns(filtered, filteredSnaps, "revenue", 5), [
    filtered,
    filteredSnaps,
  ]);
  const weak = useMemo(() => underperformers(filtered, filteredSnaps), [
    filtered,
    filteredSnaps,
  ]);

  // ---------- All tags for the tag filter ----------
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

  function downloadReport(kind: string, body: string) {
    downloadFile(
      `${kind}-${new Date().toISOString().slice(0, 10)}.md`,
      body,
      "text/markdown"
    );
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

      {/* ---------- Filters ---------- */}
      <SectionCard
        title="Filters"
        className="mb-5"
        action={
          <button
            className="btn-ghost text-xs"
            onClick={() => {
              const r = defaultRange();
              setFilters({ from: r.from, to: r.to });
              setSearch("");
            }}
          >
            Reset
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor={idFrom} className="label">
              From
            </label>
            <input
              id={idFrom}
              type="date"
              className="input"
              value={filters.from ?? ""}
              onChange={(e) => setFilter("from", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={idTo} className="label">
              To
            </label>
            <input
              id={idTo}
              type="date"
              className="input"
              value={filters.to ?? ""}
              onChange={(e) => setFilter("to", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={idPlatform} className="label">
              Platform
            </label>
            <select
              id={idPlatform}
              className="input"
              value={filters.platform ?? ""}
              onChange={(e) => setFilter("platform", e.target.value)}
            >
              <option value="">All</option>
              {["pinterest", "facebook", "instagram", "google", "email", "organic-seo", "other"].map(
                (p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label htmlFor={idProduct} className="label">
              Product
            </label>
            <select
              id={idProduct}
              className="input"
              value={filters.productId ?? ""}
              onChange={(e) => setFilter("productId", e.target.value)}
            >
              <option value="">All</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={idStatus} className="label">
              Status
            </label>
            <select
              id={idStatus}
              className="input"
              value={filters.status ?? ""}
              onChange={(e) => setFilter("status", e.target.value)}
            >
              <option value="">All</option>
              {["draft", "scheduled", "active", "paused", "completed", "archived"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label htmlFor={idGoal} className="label">
              Goal
            </label>
            <select
              id={idGoal}
              className="input"
              value={filters.goal ?? ""}
              onChange={(e) => setFilter("goal", e.target.value)}
            >
              <option value="">All</option>
              {["awareness", "traffic", "engagement", "leads", "sales", "retention", "other"].map(
                (g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label htmlFor={idTag} className="label">
              Tag
            </label>
            <select
              id={idTag}
              className="input"
              value={filters.tag ?? ""}
              onChange={(e) => setFilter("tag", e.target.value)}
            >
              <option value="">All</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={idSearch} className="label">
              Search
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id={idSearch}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="name, tag…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ---------- KPI tiles ---------- */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active" value={activeCount} icon={<TrendingUp className="h-4 w-4" />} />
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
          accent={totals.roi !== null ? (totals.roi >= 0 ? "good" : "bad") : undefined}
        />
        <StatTile label="Cost / click" value={fmtMoney(totals.cpc ?? NaN)} />
        <StatTile label="Cost / conversion" value={fmtMoney(totals.costPerConversion ?? NaN)} />
      </div>

      {/* ---------- Top + Underperforming ---------- */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Top-performing campaigns">
          {top.length === 0 ? (
            <EmptyState
              title="No campaigns with revenue yet"
              hint="Record performance snapshots on a campaign to see rankings."
            />
          ) : (
            <ul className="space-y-2">
              {top.map((x, i) => (
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
        <SectionCard
          title="Underperforming campaigns"
          action={
            <span className="text-[11px] text-slate-500">
              CTR &lt; 0.5% or zero clicks
            </span>
          }
        >
          {weak.length === 0 ? (
            <p className="text-xs text-slate-500">
              No flagged underperformers in this window. Good sign.
            </p>
          ) : (
            <ul className="space-y-2">
              {weak.slice(0, 8).map((x) => (
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
                      {x.campaign.platform} · {x.totals.impressions.toLocaleString()} impressions ·{" "}
                      {x.totals.clicks} clicks · {fmtPct(x.totals.ctr)} CTR
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ---------- Trend charts ---------- */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Traffic over time (impressions vs. clicks)">
          <Chart>
            <LineChart data={series}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="impressions" stroke="#7c3aed" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="clicks" stroke="#ec4899" dot={false} strokeWidth={2} />
            </LineChart>
          </Chart>
        </SectionCard>
        <SectionCard title="Revenue over time">
          <Chart>
            <LineChart data={series}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="cost" stroke="#f59e0b" dot={false} strokeWidth={2} />
            </LineChart>
          </Chart>
        </SectionCard>
        <SectionCard title="Conversion rate trend">
          <Chart>
            <LineChart data={seriesWithConvRate}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
              <Line
                type="monotone"
                dataKey="cr"
                stroke="#06b6d4"
                dot={false}
                strokeWidth={2}
                name="Conversion rate"
              />
            </LineChart>
          </Chart>
        </SectionCard>
        <SectionCard title="Traffic by source (platform share)">
          {platforms.length === 0 ? (
            <p className="text-xs text-slate-500">
              No platform activity in this window.
            </p>
          ) : (
            <Chart>
              <PieChart>
                <Pie
                  data={platforms}
                  dataKey="clicks"
                  nameKey="platform"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {platforms.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </Chart>
          )}
        </SectionCard>
        <SectionCard title="Platform comparison (revenue)">
          {platforms.length === 0 ? (
            <p className="text-xs text-slate-500">No data yet.</p>
          ) : (
            <Chart>
              <BarChart data={platforms}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </Chart>
          )}
        </SectionCard>
        <SectionCard title="Campaign comparison (revenue)">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-500">No data yet.</p>
          ) : (
            <Chart>
              <BarChart
                layout="vertical"
                data={filtered
                  .map((c) => ({
                    name: c.name,
                    revenue: campaignTotals(c.id, filteredSnaps).revenue,
                  }))
                  .filter((d) => d.revenue > 0)
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 10)}
              >
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={140}
                />
                <Tooltip />
                <Bar dataKey="revenue" fill="#ec4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </Chart>
          )}
        </SectionCard>
        <SectionCard title="Product comparison (attributed revenue)">
          {productBd.length === 0 ? (
            <p className="text-xs text-slate-500">No product attribution yet.</p>
          ) : (
            <Chart>
              <BarChart
                layout="vertical"
                data={productBd.slice(0, 8).map((p) => ({
                  name: p.product,
                  revenue: Math.round(p.revenue * 100) / 100,
                }))}
              >
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </Chart>
          )}
        </SectionCard>
      </div>

      {/* ---------- Campaign table ---------- */}
      <SectionCard title={`All campaigns (${filtered.length})`} className="mb-5">
        {filtered.length === 0 ? (
          <EmptyState
            title="No campaigns match your filters"
            hint="Create one to start tracking, or reset the filters above."
            action={
              <button
                onClick={() => setOpenNew(true)}
                className="btn-primary mt-3"
              >
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
                {filtered.map((c) => {
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
                      <td className="text-right tabular-nums">{fmtPct(t.roi, 0)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/campaigns/${c.id}`}
                            className="btn-ghost h-7 px-2 text-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete "${c.name}"?`)) return;
                              await deleteCampaign(c.id);
                              toast.success("Campaign deleted");
                            }}
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

      {/* ---------- Reports ---------- */}
      <SectionCard
        title="Reports"
        action={<span className="text-[11px] text-slate-500"><Filter className="mr-1 inline h-3 w-3" />Uses current filter window where applicable</span>}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ReportButton
            label="Weekly report"
            onClick={() => downloadReport("weekly-report", weeklyReport(campaigns, snapshots, products))}
          />
          <ReportButton
            label="Monthly report"
            onClick={() => downloadReport("monthly-report", monthlyReport(campaigns, snapshots, products))}
          />
          <ReportButton
            label="Quarterly report"
            onClick={() =>
              downloadReport("quarterly-report", quarterlyReport(campaigns, snapshots, products))
            }
          />
          <ReportButton
            label="Top campaigns"
            onClick={() =>
              downloadReport(
                "top-campaigns",
                topCampaignsReport(filtered, filteredSnaps)
              )
            }
          />
          <ReportButton
            label="Platform comparison"
            onClick={() =>
              downloadReport(
                "platform-comparison",
                platformComparisonReport(filtered, filteredSnaps)
              )
            }
          />
          <ReportButton
            label="Product performance"
            onClick={() =>
              downloadReport(
                "product-performance",
                productPerformanceReport(filtered, filteredSnaps, products)
              )
            }
          />
        </div>
      </SectionCard>

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

// ----- helpers -----

function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: "good" | "bad";
}) {
  const valueClass =
    accent === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-900 dark:text-white";
  // Display "—" instead of "NaN" / "Infinity"
  let display = value;
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
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`truncate text-lg font-semibold ${valueClass}`}>{display}</div>
      </div>
    </div>
  );
}

function Chart({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

function ReportButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="btn-secondary justify-start" onClick={onClick}>
      <FileDown className="h-4 w-4" aria-hidden="true" /> {label}
    </button>
  );
}
