import { useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "@/components/Toast";
import { Badge } from "@/components/ui";
import {
  generateOpportunityIdeas,
  type AiOpportunityDraft,
} from "@/lib/research";
import { buildScore } from "@/lib/opportunityScore";
import { ScorePill } from "./atoms";

interface Props {
  onClose: () => void;
  onCreated?: (count: number) => void;
}

/**
 * Modal that asks the AI for N opportunity drafts and lets the user pick
 * which ones to save. Multi-select with a single "Save selected" action so
 * the user can save 1, 3, or all in one go.
 */
export default function IdeaGeneratorModal({ onClose, onCreated }: Props) {
  const products = useAppStore((s) => s.products);
  const opportunities = useAppStore((s) => s.opportunities);
  const keywords = useAppStore((s) => s.keywords);
  const competitors = useAppStore((s) => s.competitors);
  const settings = useAppStore((s) => s.settings);
  const createOpportunity = useAppStore((s) => s.createOpportunity);

  const [hint, setHint] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<AiOpportunityDraft[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function onGenerate() {
    setLoading(true);
    setError(null);
    try {
      const out = await generateOpportunityIdeas(
        { products, opportunities, keywords, competitors, hint: hint.trim() || undefined, count },
        settings
      );
      if (out.length === 0) {
        setError(
          "AI returned no parseable ideas. Try again or rephrase the hint."
        );
      } else {
        setDrafts(out);
        setSelected(new Set(out.map((_, i) => i)));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function onSaveSelected() {
    if (selected.size === 0) {
      toast.error("Select at least one idea to save.");
      return;
    }
    setLoading(true);
    try {
      let saved = 0;
      for (const i of selected) {
        const d = drafts[i];
        if (!d) continue;
        await createOpportunity({
          title: d.title,
          description: d.description,
          category: d.category,
          audience: d.audience,
          keywords: d.keywords,
          trend: "stable",
          status: "idea",
          source: "ai-generated",
          score: { total: 0, factors: d.factors },
          notes: d.rationale ? `AI rationale: ${d.rationale}` : "",
        });
        saved++;
      }
      toast.success(`Saved ${saved} idea${saved === 1 ? "" : "s"} to the pipeline`);
      onCreated?.(saved);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
        <strong>AI-generated suggestions.</strong> The AI uses your existing
        catalog, opportunities, and keywords as context to avoid duplicates,
        then proposes new ideas with estimated scores. Review carefully before
        saving — these are hypotheses, not facts.
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="idea-hint">
            Theme hint (optional)
          </label>
          <input
            id="idea-hint"
            className="input"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="e.g. back-to-school, ADHD teens, teacher resources"
            disabled={loading}
          />
        </div>
        <div>
          <label className="label" htmlFor="idea-count">
            How many
          </label>
          <select
            id="idea-count"
            className="input"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value, 10))}
            disabled={loading}
          >
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} ideas
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="btn-primary w-full"
        onClick={onGenerate}
        disabled={loading}
      >
        {loading && drafts.length === 0 ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Generating…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Generate ideas
          </>
        )}
      </button>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              <strong>{drafts.length}</strong> ideas generated ·{" "}
              <strong>{selected.size}</strong> selected
            </span>
            <div className="flex gap-2">
              <button
                className="btn-ghost text-xs"
                onClick={() => setSelected(new Set(drafts.map((_, i) => i)))}
              >
                Select all
              </button>
              <button
                className="btn-ghost text-xs"
                onClick={() => setSelected(new Set())}
              >
                Select none
              </button>
            </div>
          </div>
          <ul className="space-y-2">
            {drafts.map((d, i) => (
              <li
                key={i}
                className={`rounded-lg border p-3 transition ${
                  selected.has(i)
                    ? "border-brand-400 bg-brand-50/40 dark:border-brand-700 dark:bg-brand-900/20"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
                      selected.has(i)
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {selected.has(i) && <Check className="h-3 w-3" aria-hidden="true" />}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected.has(i)}
                    onChange={() => toggle(i)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{d.title}</span>
                      {/* Compute the preview score with the SAME weighted
                          formula used post-save, so the number the user sees
                          here matches what lands in the pipeline. */}
                      <ScorePill
                        total={buildScore(d.factors, settings).total}
                      />
                    </div>
                    {d.description && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {d.description}
                      </p>
                    )}
                    {d.rationale && (
                      <p className="mt-1 text-[11px] italic text-slate-500">
                        {d.rationale}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {d.category && <Badge>{d.category}</Badge>}
                      {d.audience && <Badge tone="info">{d.audience}</Badge>}
                      {d.keywords.slice(0, 4).map((k) => (
                        <span key={k} className="chip text-[10px]">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
          <button
            className="btn-primary w-full"
            disabled={loading || selected.size === 0}
            onClick={onSaveSelected}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                Save {selected.size} selected to pipeline
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
