import { useEffect, useId, useState } from "react";
import { Info } from "lucide-react";
import type { CampaignPlatform, PerformanceSnapshot } from "@/types";

interface Props {
  campaignId: string;
  campaignPlatform: CampaignPlatform;
  initial?: Partial<PerformanceSnapshot>;
  submitLabel?: string;
  onSubmit(values: Partial<PerformanceSnapshot>): void;
  onCancel?: () => void;
}

/**
 * Modal-friendly form for recording a single performance snapshot. Fields are
 * grouped so the user only sees what's relevant for their platform — email
 * stats hide for non-email campaigns, share/save/comment hide for email, etc.
 *
 * Every field is optional (defaults to 0). The user records whatever they
 * have from their platform dashboard for the period.
 */
export default function PerformanceEntryForm({
  campaignId,
  campaignPlatform,
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Add snapshot",
}: Props) {
  const [v, setV] = useState<Partial<PerformanceSnapshot>>({
    campaignId,
    date: new Date().toISOString().slice(0, 10),
    impressions: 0,
    clicks: 0,
    saves: 0,
    shares: 0,
    comments: 0,
    emailOpens: 0,
    emailClicks: 0,
    websiteVisits: 0,
    productPageVisits: 0,
    sales: 0,
    revenue: 0,
    cost: 0,
    notes: "",
    ...initial,
  });

  // ids for label associations
  const idDate = useId();
  const idImpressions = useId();
  const idClicks = useId();
  const idSaves = useId();
  const idShares = useId();
  const idComments = useId();
  const idEmailOpens = useId();
  const idEmailClicks = useId();
  const idWeb = useId();
  const idProdVisits = useId();
  const idSales = useId();
  const idRevenue = useId();
  const idCost = useId();
  const idNotes = useId();

  useEffect(() => {
    setV((s) => ({ ...s, campaignId }));
  }, [campaignId]);

  function num<K extends keyof PerformanceSnapshot>(
    k: K,
    val: PerformanceSnapshot[K]
  ) {
    setV((s) => ({ ...s, [k]: val }));
  }

  const isEmail = campaignPlatform === "email";
  const isSocial =
    campaignPlatform === "pinterest" ||
    campaignPlatform === "facebook" ||
    campaignPlatform === "instagram";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <div
        role="note"
        className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <div>
          <strong>Enter this period's totals</strong> (e.g. this week's new
          clicks), <strong>not</strong> the lifetime cumulative numbers shown
          on your platform's dashboard.
          <br />
          Snapshots are summed over time — entering cumulative totals will
          double-count.
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField id={idDate} label="Date" type="date" value={v.date ?? ""} onChange={(val) => num("date", val as string)} />
        <NumberField id={idImpressions} label="Impressions" value={v.impressions ?? 0} onChange={(val) => num("impressions", val as number)} />
        <NumberField id={idClicks} label="Clicks" value={v.clicks ?? 0} onChange={(val) => num("clicks", val as number)} />
      </div>

      {isSocial && (
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField id={idSaves} label="Saves / pins" value={v.saves ?? 0} onChange={(val) => num("saves", val as number)} />
          <NumberField id={idShares} label="Shares" value={v.shares ?? 0} onChange={(val) => num("shares", val as number)} />
          <NumberField id={idComments} label="Comments" value={v.comments ?? 0} onChange={(val) => num("comments", val as number)} />
        </div>
      )}

      {isEmail && (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField id={idEmailOpens} label="Email opens" value={v.emailOpens ?? 0} onChange={(val) => num("emailOpens", val as number)} />
          <NumberField id={idEmailClicks} label="Email clicks" value={v.emailClicks ?? 0} onChange={(val) => num("emailClicks", val as number)} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField id={idWeb} label="Website visits" value={v.websiteVisits ?? 0} onChange={(val) => num("websiteVisits", val as number)} />
        <NumberField id={idProdVisits} label="Product page visits" value={v.productPageVisits ?? 0} onChange={(val) => num("productPageVisits", val as number)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField id={idSales} label="Sales (orders)" value={v.sales ?? 0} onChange={(val) => num("sales", val as number)} />
        <NumberField id={idRevenue} label="Revenue" step="0.01" value={v.revenue ?? 0} onChange={(val) => num("revenue", val as number)} />
        <NumberField id={idCost} label="Cost / spend" step="0.01" value={v.cost ?? 0} onChange={(val) => num("cost", val as number)} />
      </div>

      <div>
        <label htmlFor={idNotes} className="label">
          Notes
        </label>
        <textarea
          id={idNotes}
          className="input min-h-[60px]"
          value={v.notes ?? ""}
          onChange={(e) => num("notes", e.target.value)}
          placeholder="Anything unusual this period — promo, holiday, algorithm change."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string | number;
  type?: "number" | "date";
  step?: string;
  onChange: (v: string | number) => void;
}
function NumberField({
  id,
  label,
  value,
  type = "number",
  step,
  onChange,
}: NumberFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        step={step}
        min={type === "number" ? "0" : undefined}
        className="input"
        value={value}
        onChange={(e) =>
          onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)
        }
      />
    </div>
  );
}
