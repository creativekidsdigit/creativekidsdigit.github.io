import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Loader2,
  Copy,
  Lightbulb,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { SectionCard, Badge, EmptyState } from "@/components/ui";
import { toast } from "@/components/Toast";
import { copyText } from "@/lib/util";
import { analyzeGaps, type GapFinding } from "@/lib/gapAnalysis";
import { generateBusinessIntelligence } from "@/lib/research";

const SEVERITY_TONE: Record<
  GapFinding["severity"],
  "success" | "info" | "warn" | "danger" | "default"
> = {
  info: "default",
  note: "warn",
  opportunity: "success",
};

const SEVERITY_ICON: Record<GapFinding["severity"], React.ReactNode> = {
  info: <AlertCircle className="h-3.5 w-3.5" />,
  note: <AlertCircle className="h-3.5 w-3.5" />,
  opportunity: <TrendingUp className="h-3.5 w-3.5" />,
};

export default function InsightsTab() {
  const products = useAppStore((s) => s.products);
  const opportunities = useAppStore((s) => s.opportunities);
  const campaigns = useAppStore((s) => s.campaigns);
  const snapshots = useAppStore((s) => s.perfSnapshots);
  const keywords = useAppStore((s) => s.keywords);
  const competitors = useAppStore((s) => s.competitors);
  const settings = useAppStore((s) => s.settings);

  const findings = useMemo(
    () => analyzeGaps(products, opportunities, campaigns, snapshots),
    [products, opportunities, campaigns, snapshots]
  );

  const [biLoading, setBiLoading] = useState(false);
  const [biText, setBiText] = useState<string>("");
  const [biError, setBiError] = useState<string | null>(null);

  async function onGenerateBi() {
    setBiLoading(true);
    setBiError(null);
    try {
      const text = await generateBusinessIntelligence(
        { products, opportunities, keywords, competitors },
        settings
      );
      setBiText(text);
    } catch (e) {
      setBiError((e as Error).message);
    } finally {
      setBiLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Gap analysis — deterministic */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-brand-500" /> Gap Analysis
            <span className="chip text-[10px]">{findings.length}</span>
          </span>
        }
      >
        {findings.length === 0 ? (
          <EmptyState
            title="No gaps surfaced"
            hint="Add products and opportunities to see structured analysis."
          />
        ) : (
          <ul className="space-y-2">
            {findings.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{f.title}</span>
                  <Badge tone={SEVERITY_TONE[f.severity]}>
                    <span className="inline-flex items-center gap-1">
                      {SEVERITY_ICON[f.severity]}
                      {f.severity}
                    </span>
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {f.detail}
                </p>
                {f.relatedOpportunityIds &&
                  f.relatedOpportunityIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {f.relatedOpportunityIds.map((id) => (
                        <Link
                          key={id}
                          to={`/research/${id}`}
                          className="chip text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          {id}
                        </Link>
                      ))}
                    </div>
                  )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* AI Business Intelligence */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-500" /> AI Business Intelligence
            <span className="chip text-[10px]">AI-generated · review before acting</span>
          </span>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Generates a strategic brief from your catalog, opportunities,
            keywords, and competitors. These are recommendations, not facts.
          </p>
          <button
            className="btn-primary w-full"
            onClick={onGenerateBi}
            disabled={biLoading}
          >
            {biLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />{" "}
                {biText ? "Regenerate brief" : "Generate brief"}
              </>
            )}
          </button>
          {biError && (
            <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {biError}
            </p>
          )}
          {biText && (
            <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-800 dark:bg-brand-900/20">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  AI-generated business brief
                </span>
                <button
                  className="btn-ghost h-7 px-2 text-xs"
                  onClick={async () => {
                    const ok = await copyText(biText);
                    if (ok) toast.success("Copied");
                  }}
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800 dark:text-slate-100">
                {biText}
              </pre>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
