import { useEffect, useId, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui";
import {
  FACTOR_DESCRIPTION,
  FACTOR_LABEL,
  SCORE_FACTORS,
  buildScore,
} from "@/lib/opportunityScore";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  TREND_LABEL,
  ScorePill,
} from "./atoms";
import type {
  Opportunity,
  OpportunityScoreFactor,
  OpportunityStatus,
  OpportunityTrend,
} from "@/types";

const TRENDS: OpportunityTrend[] = [
  "rising",
  "stable",
  "declining",
  "seasonal",
  "evergreen",
];

interface Props {
  initial?: Partial<Opportunity>;
  submitLabel?: string;
  onSubmit(values: Partial<Opportunity>): void;
  autosave?: (values: Partial<Opportunity>) => void;
}

/**
 * Reusable form for creating or editing an Opportunity. Includes the score
 * factor sliders so the scoring model is visible inline rather than tucked
 * behind a separate UI.
 */
export default function OpportunityForm({
  initial,
  onSubmit,
  submitLabel = "Save opportunity",
  autosave,
}: Props) {
  const settings = useAppStore((s) => s.settings);
  const [v, setV] = useState<Partial<Opportunity>>({
    title: "",
    description: "",
    category: "",
    audience: "",
    keywords: [],
    trend: "stable",
    status: "idea",
    notes: "",
    relatedProductIds: [],
    source: "manual",
    score: { total: 0, factors: {} },
    ...initial,
  });

  const idTitle = useId();
  const idDescription = useId();
  const idCategory = useId();
  const idAudience = useId();
  const idKeywords = useId();
  const idStatus = useId();
  const idTrend = useId();
  const idNotes = useId();

  // Live-recompute total when factors change locally.
  const totalFor = (factors: typeof v.score extends infer T ? T extends { factors: infer F } ? F : never : never) =>
    buildScore(factors as Record<OpportunityScoreFactor, number>, settings).total;

  useEffect(() => {
    if (!autosave) return;
    const t = setTimeout(() => autosave(v), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(v)]);

  function update<K extends keyof Opportunity>(k: K, val: Opportunity[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }
  function setFactor(f: OpportunityScoreFactor, n: number) {
    setV((s) => {
      const factors = { ...(s.score?.factors ?? {}), [f]: n };
      return {
        ...s,
        score: { total: totalFor(factors), factors },
      };
    });
  }

  const factors = v.score?.factors ?? {};
  const total = v.score?.total ?? 0;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <div className="sm:col-span-2">
        <label htmlFor={idTitle} className="label">
          Title
        </label>
        <input
          id={idTitle}
          className="input"
          value={v.title ?? ""}
          onChange={(e) => update("title", e.target.value)}
          required
          placeholder="e.g. ADHD After-School Reset Workbook (Teacher Edition)"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={idDescription} className="label">
          Description (the 1-paragraph elevator pitch)
        </label>
        <textarea
          id={idDescription}
          className="input min-h-[80px]"
          value={v.description ?? ""}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What is it, who's it for, why does it exist?"
        />
      </div>

      <div>
        <label htmlFor={idCategory} className="label">
          Category
        </label>
        <input
          id={idCategory}
          className="input"
          value={v.category ?? ""}
          onChange={(e) => update("category", e.target.value)}
        />
      </div>

      <div>
        <label htmlFor={idAudience} className="label">
          Audience
        </label>
        <input
          id={idAudience}
          className="input"
          value={v.audience ?? ""}
          onChange={(e) => update("audience", e.target.value)}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={idKeywords} className="label">
          Keywords (comma separated)
        </label>
        <input
          id={idKeywords}
          className="input"
          value={(v.keywords ?? []).join(", ")}
          onChange={(e) =>
            update(
              "keywords",
              e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            )
          }
          placeholder="adhd toolkit, after-school, teacher resources"
        />
      </div>

      <div>
        <label htmlFor={idStatus} className="label">
          Pipeline stage
        </label>
        <select
          id={idStatus}
          className="input"
          value={v.status}
          onChange={(e) => update("status", e.target.value as OpportunityStatus)}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={idTrend} className="label">
          Trend
        </label>
        <select
          id={idTrend}
          className="input"
          value={v.trend}
          onChange={(e) => update("trend", e.target.value as OpportunityTrend)}
        >
          {TRENDS.map((t) => (
            <option key={t} value={t}>
              {TREND_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={idNotes} className="label">
          Notes
        </label>
        <textarea
          id={idNotes}
          className="input min-h-[60px]"
          value={v.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Anything else worth remembering — sources, links, hypotheses."
        />
      </div>

      <fieldset className="sm:col-span-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Opportunity score · current: <ScorePill total={total} />
        </legend>
        <p className="mb-3 text-[11px] text-slate-500">
          Rate each factor 0–100. Weights are configured in the Settings.
          The total is a weighted average across the 8 factors.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SCORE_FACTORS.map((f) => (
            <FactorSlider
              key={f}
              factor={f}
              value={
                typeof factors[f] === "number"
                  ? (factors[f] as number)
                  : 50
              }
              onChange={(n) => setFactor(f, n)}
            />
          ))}
        </div>
      </fieldset>

      <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-2">
        <div className="text-xs text-slate-500">
          {initial?.source === "ai-generated" && (
            <Badge tone="info">AI-suggested · review before saving</Badge>
          )}
        </div>
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function FactorSlider({
  factor,
  value,
  onChange,
}: {
  factor: OpportunityScoreFactor;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {FACTOR_LABEL[factor]}
        </label>
        <span className="text-xs tabular-nums text-slate-500">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full accent-brand-600"
        title={FACTOR_DESCRIPTION[factor]}
      />
    </div>
  );
}
