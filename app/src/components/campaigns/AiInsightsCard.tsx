import { useState } from "react";
import {
  Copy,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";
import { SectionCard } from "@/components/ui";
import { toast } from "@/components/Toast";
import { useAppStore } from "@/store/useAppStore";
import {
  INSIGHT_LENSES,
  generateCampaignInsight,
  type CampaignInsightOptions,
} from "@/lib/insights";
import { copyText, downloadFile, slugify } from "@/lib/util";
import type {
  Campaign,
  ContentItem,
  PerformanceSnapshot,
  Product,
} from "@/types";

interface Props {
  campaign: Campaign;
  products: Product[];
  linkedProducts: Product[];
  snapshots: PerformanceSnapshot[];
  generatedAssets: ContentItem[];
  peers: Campaign[];
  peerSnaps: PerformanceSnapshot[];
}

/**
 * AI Insights panel. Owns its own loading / error / output state so the page
 * orchestrator doesn't have to track it. All recommendations are labeled as
 * AI-generated so they can never be confused with recorded data.
 */
export default function AiInsightsCard({
  campaign,
  products,
  linkedProducts,
  snapshots,
  generatedAssets,
  peers,
  peerSnaps,
}: Props) {
  const settings = useAppStore((s) => s.settings);
  const saveContent = useAppStore((s) => s.saveContent);

  const [lens, setLens] = useState<CampaignInsightOptions["lens"]>("performance");
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    try {
      const out = await generateCampaignInsight(
        {
          campaign,
          products,
          product: linkedProducts[0] ?? null,
          snapshots,
          generatedAssets,
          peers,
          peerSnapshots: peerSnaps,
        },
        { lens },
        settings
      );
      setText(out);
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveToLibrary() {
    if (!text) return;
    await saveContent({
      productId: campaign.productIds[0],
      campaignId: campaign.id,
      kind: "other",
      templateId: `insight:${lens}`,
      title: `[AI Insight] ${campaign.name} — ${INSIGHT_LENSES.find((l) => l.id === lens)?.label}`,
      body: text,
      tags: ["ai-insight", `campaign:${campaign.id}`, lens],
      pinned: false,
    });
    toast.success("Insight saved to Content Library");
  }

  return (
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
          <label className="label" htmlFor="insight-lens">
            Analysis lens
          </label>
          <select
            id="insight-lens"
            className="input"
            value={lens}
            onChange={(e) =>
              setLens(e.target.value as CampaignInsightOptions["lens"])
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
          disabled={loading || snapshots.length === 0}
          onClick={onGenerate}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate insight
            </>
          )}
        </button>
        {snapshots.length === 0 && (
          <p className="text-[11px] text-slate-500">
            Add at least one performance snapshot to enable AI analysis.
          </p>
        )}
        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            {error}
          </p>
        )}
        {text && (
          <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-800 dark:bg-brand-900/20">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                AI-generated ·{" "}
                {INSIGHT_LENSES.find((l) => l.id === lens)?.label}
              </span>
              <div className="flex gap-1">
                <button
                  className="btn-ghost h-7 px-2 text-xs"
                  onClick={async () => {
                    const ok = await copyText(text);
                    if (ok) toast.success("Copied");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  className="btn-ghost h-7 px-2 text-xs"
                  onClick={() =>
                    downloadFile(
                      `${slugify(campaign.name)}-${lens}-insight.md`,
                      text,
                      "text/markdown"
                    )
                  }
                >
                  <Download className="h-3 w-3" />
                </button>
                <button
                  className="btn-secondary h-7 text-xs"
                  onClick={saveToLibrary}
                >
                  Save
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800 dark:text-slate-100">
              {text}
            </pre>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
