import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Download,
  History,
  Copy,
  FileDown,
  Loader2,
  ExternalLink,
  Pin,
  AlertTriangle,
  Send,
  Upload,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components/ui";
import Modal from "@/components/Modal";
import CampaignForm from "@/components/CampaignForm";
import PerformanceEntryForm from "@/components/PerformanceEntryForm";
import ImportDataModal from "@/components/ImportDataModal";
import { toast } from "@/components/Toast";
import { copyText, downloadFile, formatDate, formatRelative, slugify } from "@/lib/util";
import {
  campaignTotals,
  dailySeries,
  fmtMoney,
  fmtPct,
  padSeries,
} from "@/lib/analytics";
import { campaignSummary } from "@/lib/reports";
import ExportMenu from "@/components/ExportMenu";
import {
  INSIGHT_LENSES,
  generateCampaignInsight,
  type CampaignInsightOptions,
} from "@/lib/insights";
import type {
  CampaignStatus,
  PerformanceSnapshot,
} from "@/types";

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

export default function CampaignDetailPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();

  const campaign = useAppStore((s) => s.campaigns.find((c) => c.id === id));
  const products = useAppStore((s) => s.products);
  const allCampaigns = useAppStore((s) => s.campaigns);
  const allSnaps = useAppStore((s) => s.perfSnapshots);
  const content = useAppStore((s) => s.content);
  const settings = useAppStore((s) => s.settings);
  const updateCampaign = useAppStore((s) => s.updateCampaign);
  const deleteCampaign = useAppStore((s) => s.deleteCampaign);
  const addPerformance = useAppStore((s) => s.addPerformance);
  const updatePerformance = useAppStore((s) => s.updatePerformance);
  const deletePerformance = useAppStore((s) => s.deletePerformance);
  const saveContent = useAppStore((s) => s.saveContent);
  const updateContent = useAppStore((s) => s.updateContent);
  const autosave = useAppStore((s) => s.settings.autosave);

  const [addPerfOpen, setAddPerfOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editPerf, setEditPerf] = useState<PerformanceSnapshot | null>(null);
  const [insightLens, setInsightLens] =
    useState<CampaignInsightOptions["lens"]>("performance");
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightText, setInsightText] = useState<string>("");
  const [insightError, setInsightError] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);

  // ---------- derived ----------

  const snapshots = useMemo(
    () => allSnaps.filter((s) => s.campaignId === id),
    [allSnaps, id]
  );
  const sortedSnaps = useMemo(
    () => [...snapshots].sort((a, b) => b.date.localeCompare(a.date)),
    [snapshots]
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
  const series = useMemo(() => {
    const raw = dailySeries(snapshots);
    if (campaign?.startDate) {
      return padSeries(
        raw,
        campaign.startDate,
        campaign.endDate ?? new Date().toISOString().slice(0, 10)
      );
    }
    return raw;
  }, [snapshots, campaign]);

  // ---------- handlers ----------

  async function onGenerateInsight() {
    if (!campaign) return;
    setInsightLoading(true);
    setInsightError(null);
    try {
      const text = await generateCampaignInsight(
        {
          campaign,
          products,
          product: linkedProducts[0] ?? null,
          snapshots,
          generatedAssets,
          peers,
          peerSnapshots: peerSnaps,
        },
        { lens: insightLens },
        settings
      );
      setInsightText(text);
    } catch (e) {
      setInsightError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setInsightLoading(false);
    }
  }

  async function saveInsightToLibrary() {
    if (!insightText || !campaign) return;
    await saveContent({
      productId: campaign.productIds[0],
      campaignId: campaign.id,
      kind: "other",
      templateId: `insight:${insightLens}`,
      title: `[AI Insight] ${campaign.name} — ${INSIGHT_LENSES.find((l) => l.id === insightLens)?.label}`,
      body: insightText,
      tags: ["ai-insight", `campaign:${campaign.id}`, insightLens],
      pinned: false,
    });
    toast.success("Insight saved to Content Library");
  }

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

  const elapsedDays = computeElapsed(
    campaign.startDate,
    campaign.endDate
  );
  const totalDays = computeTotalDays(
    campaign.startDate,
    campaign.endDate
  );
  const progress =
    totalDays > 0 ? Math.min(1, Math.max(0, elapsedDays / totalDays)) : 0;

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={`${campaign.platform} · ${campaign.goal} · ${formatDate(campaign.startDate)}${campaign.endDate ? ` → ${formatDate(campaign.endDate)}` : ""}`}
      >
        <Link to="/campaigns" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> All campaigns
        </Link>
        <Link
          to={`/campaigns/${campaign.id}/publish`}
          className="btn-secondary"
        >
          <Send className="h-4 w-4" /> Publishing workspace
        </Link>
        <button className="btn-secondary" onClick={exportSummary}>
          <FileDown className="h-4 w-4" aria-hidden="true" /> Export summary
        </button>
        <ExportMenu
          scope="campaign"
          label="Export bundle"
          context={() => ({
            campaign,
            assets: generatedAssets,
            products,
            snapshots,
          })}
        />
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
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
        </button>
      </PageHeader>

      {/* ---------- KPI tiles ---------- */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Status" value={<Badge tone={STATUS_TONE[campaign.status]}>{campaign.status}</Badge>} />
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

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* ---------- Overview / editable form ---------- */}
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

          {/* ---------- Timeline ---------- */}
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
                  <span>{campaign.endDate ? formatDate(campaign.endDate) : "—"}</span>
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
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    Over budget by {fmtMoney(totals.cost - campaign.budget)}
                  </p>
                )}
              </div>
            )}
          </SectionCard>

          {/* ---------- Performance history ---------- */}
          <SectionCard
            title={`Performance history (${snapshots.length})`}
            action={
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary h-8"
                  onClick={() => setImportOpen(true)}
                  title="Import from a CSV file"
                >
                  <Upload className="h-3.5 w-3.5" /> Import data
                </button>
                <button
                  className="btn-primary h-8"
                  onClick={() => setAddPerfOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add snapshot
                </button>
              </div>
            }
          >
            {snapshots.length === 0 ? (
              <EmptyState
                title="No performance data yet"
                hint="Record what you see in your platform dashboard. Charts and AI insights light up once you add a snapshot."
                action={
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => setImportOpen(true)}
                    >
                      <Upload className="h-4 w-4" /> Import CSV
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => setAddPerfOpen(true)}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add first snapshot
                    </button>
                  </div>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2">Date</th>
                        <th className="text-right">Impr</th>
                        <th className="text-right">Clicks</th>
                        <th className="text-right">Sales</th>
                        <th className="text-right">Revenue</th>
                        <th className="text-right">Cost</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSnaps.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                        >
                          <td className="py-1.5 text-xs">{s.date}</td>
                          <td className="text-right tabular-nums">{s.impressions.toLocaleString()}</td>
                          <td className="text-right tabular-nums">{s.clicks.toLocaleString()}</td>
                          <td className="text-right tabular-nums">{s.sales}</td>
                          <td className="text-right tabular-nums">{fmtMoney(s.revenue)}</td>
                          <td className="text-right tabular-nums">{fmtMoney(s.cost)}</td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditPerf(s)}
                                className="btn-ghost h-6 px-2 text-[11px]"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm("Delete this snapshot?")) return;
                                  await deletePerformance(s.id);
                                  toast.success("Snapshot deleted");
                                }}
                                className="btn-ghost h-6 w-6 p-0"
                                aria-label="Delete snapshot"
                              >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ---------- Charts ---------- */}
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <Mini title="Impressions">
                    <LineChart data={series}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="impressions" stroke="#7c3aed" strokeWidth={2} dot={false} />
                    </LineChart>
                  </Mini>
                  <Mini title="Clicks">
                    <LineChart data={series}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="clicks" stroke="#ec4899" strokeWidth={2} dot={false} />
                    </LineChart>
                  </Mini>
                  <Mini title="Sales">
                    <LineChart data={series}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2} dot={false} />
                    </LineChart>
                  </Mini>
                  <Mini title="Revenue vs cost">
                    <LineChart data={series}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </Mini>
                </div>
              </>
            )}
          </SectionCard>

          {/* ---------- Version history (editorial) ---------- */}
          {campaign.versions.length > 0 && (
            <SectionCard
              title={`Version history (${campaign.versions.length})`}
              action={
                <span className="text-[11px] text-slate-500">
                  Snapshots of notes / lessons / ideas
                </span>
              }
            >
              <ul className="space-y-1 text-xs">
                {[...campaign.versions].reverse().map((ver, i) => (
                  <li
                    key={i}
                    className="rounded border border-slate-100 p-2 dark:border-slate-800"
                  >
                    <details>
                      <summary className="cursor-pointer text-slate-700 dark:text-slate-300">
                        <History className="mr-1 inline h-3 w-3" />
                        {new Date(ver.ts).toLocaleString()}
                      </summary>
                      <div className="mt-2 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                        {ver.notes && (
                          <div>
                            <strong>Notes:</strong>
                            <pre className="mt-1 whitespace-pre-wrap font-sans">{ver.notes}</pre>
                          </div>
                        )}
                        {ver.lessonsLearned && (
                          <div>
                            <strong>Lessons:</strong>
                            <pre className="mt-1 whitespace-pre-wrap font-sans">{ver.lessonsLearned}</pre>
                          </div>
                        )}
                        {ver.optimizationIdeas && (
                          <div>
                            <strong>Ideas:</strong>
                            <pre className="mt-1 whitespace-pre-wrap font-sans">{ver.optimizationIdeas}</pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>

        <div className="space-y-5">
          {/* ---------- Linked products ---------- */}
          <SectionCard title="Linked products">
            {linkedProducts.length === 0 ? (
              <p className="text-xs text-slate-500">
                No products linked. Edit the Overview form above to attribute
                performance.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {linkedProducts.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/products/${p.id}`}
                      className="flex items-center justify-between rounded border border-slate-100 p-2 hover:border-brand-300 dark:border-slate-800"
                    >
                      <span className="line-clamp-1 font-medium">{p.title}</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* ---------- Generated marketing assets ---------- */}
          <SectionCard
            title={`Generated assets (${generatedAssets.length})`}
            action={
              <div className="flex items-center gap-2 text-xs">
                {generatedAssets.length > 0 && (
                  <>
                    <span className="text-slate-500">
                      {generatedAssets.filter((c) => !!c.publishedAt).length}/
                      {generatedAssets.length} published
                    </span>
                    <Link
                      to={`/campaigns/${campaign.id}/publish`}
                      className="text-brand-600 hover:underline"
                    >
                      Open workspace →
                    </Link>
                  </>
                )}
                {generatedAssets.length === 0 ? null : (
                  <button
                    className="text-brand-600 hover:underline"
                    onClick={() => setAttachOpen(true)}
                  >
                    Attach more
                  </button>
                )}
              </div>
            }
          >
            {generatedAssets.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  No copy linked to this campaign yet. Attach existing content
                  from the Content Library, or set the campaign on new
                  generations.
                </p>
                <button
                  className="btn-secondary text-xs"
                  onClick={() => setAttachOpen(true)}
                >
                  <Pin className="h-3.5 w-3.5" aria-hidden="true" /> Attach content
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {generatedAssets.slice(0, 10).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded border border-slate-100 p-2 text-xs dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/library?focus=${c.id}`}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {c.title}
                      </Link>
                      <div className="text-[10px] text-slate-500">
                        {c.kind} · {formatRelative(c.updatedAt)}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await updateContent(c.id, { campaignId: undefined });
                        toast.success("Detached from campaign");
                      }}
                      className="btn-ghost h-6 px-2 text-[11px]"
                      aria-label="Detach asset"
                    >
                      Detach
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* ---------- AI Insights ---------- */}
          <SectionCard
            title={
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" /> AI Insights
                <span className="chip ml-1 text-[10px]">
                  AI-generated · review before acting
                </span>
              </span>
            }
          >
            <div className="space-y-3">
              <div>
                <label
                  className="label"
                  htmlFor="insight-lens"
                >
                  Analysis lens
                </label>
                <select
                  id="insight-lens"
                  className="input"
                  value={insightLens}
                  onChange={(e) =>
                    setInsightLens(
                      e.target.value as CampaignInsightOptions["lens"]
                    )
                  }
                >
                  {INSIGHT_LENSES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn-primary w-full"
                disabled={insightLoading || snapshots.length === 0}
                onClick={onGenerateInsight}
              >
                {insightLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> Generate insight
                  </>
                )}
              </button>
              {snapshots.length === 0 && (
                <p className="text-[11px] text-slate-500">
                  Add at least one performance snapshot to enable AI analysis.
                </p>
              )}
              {insightError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
                  {insightError}
                </p>
              )}
              {insightText && (
                <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-800 dark:bg-brand-900/20">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                      AI-generated · {INSIGHT_LENSES.find((l) => l.id === insightLens)?.label}
                    </span>
                    <div className="flex gap-1">
                      <button
                        className="btn-ghost h-7 px-2 text-xs"
                        onClick={async () => {
                          const ok = await copyText(insightText);
                          if (ok) toast.success("Copied");
                        }}
                      >
                        <Copy className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        className="btn-ghost h-7 px-2 text-xs"
                        onClick={() =>
                          downloadFile(
                            `${slugify(campaign.name)}-${insightLens}-insight.md`,
                            insightText,
                            "text/markdown"
                          )
                        }
                      >
                        <Download className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        className="btn-secondary h-7 text-xs"
                        onClick={saveInsightToLibrary}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800 dark:text-slate-100">
                    {insightText}
                  </pre>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ---------- Import performance data modal ---------- */}
      <ImportDataModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        context={{ campaignId: campaign.id, existingSnapshots: snapshots }}
      />

      {/* ---------- Add performance modal ---------- */}
      <Modal
        open={addPerfOpen}
        onClose={() => setAddPerfOpen(false)}
        title="Add performance snapshot"
        size="lg"
      >
        <PerformanceEntryForm
          campaignId={campaign.id}
          campaignPlatform={campaign.platform}
          onSubmit={async (vals) => {
            // Soft duplicate guard: warn (but don't block) if a snapshot
            // already exists for the same campaign + date. Snapshots are
            // additive — entering one twice double-counts — but a user may
            // legitimately log two different sources for the same day.
            const duplicate = snapshots.some((s) => s.date === vals.date);
            if (duplicate) {
              const proceed = window.confirm(
                "A snapshot already exists for this period.\n\n" +
                  "Snapshots are summed over time, so creating another may " +
                  "duplicate reporting for this date. Continue anyway?"
              );
              if (!proceed) return;
            }
            await addPerformance(vals);
            toast.success("Snapshot added");
            setAddPerfOpen(false);
          }}
          onCancel={() => setAddPerfOpen(false)}
        />
      </Modal>

      {/* ---------- Edit performance modal ---------- */}
      <Modal
        open={!!editPerf}
        onClose={() => setEditPerf(null)}
        title="Edit snapshot"
        size="lg"
      >
        {editPerf && (
          <PerformanceEntryForm
            campaignId={campaign.id}
            campaignPlatform={campaign.platform}
            initial={editPerf}
            submitLabel="Save changes"
            onSubmit={async (vals) => {
              await updatePerformance(editPerf.id, vals);
              toast.success("Snapshot updated");
              setEditPerf(null);
            }}
            onCancel={() => setEditPerf(null)}
          />
        )}
      </Modal>

      {/* ---------- Attach content modal ---------- */}
      <Modal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        title="Attach content to this campaign"
        size="lg"
      >
        <AttachContentPicker
          campaignId={campaign.id}
          onClose={() => setAttachOpen(false)}
        />
      </Modal>
    </>
  );
}

// ---------- helpers ----------

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
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

function Mini({
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

function computeElapsed(startDate?: string, endDate?: string): number {
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  const refStr =
    endDate && new Date(endDate).getTime() < Date.now()
      ? endDate
      : new Date().toISOString().slice(0, 10);
  const ref = new Date(refStr).getTime();
  return Math.max(0, Math.floor((ref - start) / 86400000));
}
function computeTotalDays(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function AttachContentPicker({
  campaignId,
  onClose,
}: {
  campaignId: string;
  onClose: () => void;
}) {
  const content = useAppStore((s) => s.content);
  const updateContent = useAppStore((s) => s.updateContent);
  const [q, setQ] = useState("");

  const available = useMemo(
    () =>
      content
        .filter((c) => c.campaignId !== campaignId)
        .filter((c) => {
          if (!q.trim()) return true;
          return `${c.title} ${c.kind} ${c.tags.join(" ")}`
            .toLowerCase()
            .includes(q.toLowerCase());
        })
        .slice(0, 50),
    [content, campaignId, q]
  );

  return (
    <div className="space-y-3">
      <input
        autoFocus
        className="input"
        placeholder="Search content…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {available.length === 0 ? (
        <p className="text-xs text-slate-500">
          No content available to attach. Generate some from any module first.
        </p>
      ) : (
        <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {available.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-slate-100 px-2 py-1.5 text-sm dark:border-slate-800"
            >
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1">{c.title}</div>
                <div className="text-[10px] text-slate-500">
                  {c.kind} · {formatRelative(c.updatedAt)}
                </div>
              </div>
              <button
                className="btn-secondary h-7 text-xs"
                onClick={async () => {
                  await updateContent(c.id, { campaignId });
                  toast.success("Attached");
                }}
              >
                Attach
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button className="btn-secondary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
