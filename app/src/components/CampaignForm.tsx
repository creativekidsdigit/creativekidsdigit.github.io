import { useEffect, useId, useState } from "react";
import { Check } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type {
  Campaign,
  CampaignGoal,
  CampaignPlatform,
  CampaignStatus,
} from "@/types";

const PLATFORMS: CampaignPlatform[] = [
  "pinterest",
  "facebook",
  "instagram",
  "google",
  "email",
  "organic-seo",
  "other",
];
const STATUSES: CampaignStatus[] = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "completed",
  "archived",
];
const GOALS: CampaignGoal[] = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "sales",
  "retention",
  "other",
];

interface Props {
  initial?: Partial<Campaign>;
  submitLabel?: string;
  onSubmit(values: Partial<Campaign>): void;
  autosave?: (values: Partial<Campaign>) => void;
}

export default function CampaignForm({
  initial,
  onSubmit,
  submitLabel = "Save campaign",
  autosave,
}: Props) {
  const products = useAppStore((s) => s.products);

  const [v, setV] = useState<Partial<Campaign>>({
    name: "",
    productIds: [],
    platform: "pinterest",
    goal: "traffic",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    budget: 0,
    status: "draft",
    notes: "",
    tags: [],
    audienceNotes: "",
    lessonsLearned: "",
    optimizationIdeas: "",
    ...initial,
  });

  // useId per field → proper htmlFor associations
  const idName = useId();
  const idPlatform = useId();
  const idGoal = useId();
  const idStart = useId();
  const idEnd = useId();
  const idBudget = useId();
  const idStatus = useId();
  const idTags = useId();
  const idNotes = useId();
  const idAudience = useId();
  const idLessons = useId();
  const idIdeas = useId();
  const idProducts = useId();

  useEffect(() => {
    if (!autosave) return;
    const t = setTimeout(() => autosave(v), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(v)]);

  function update<K extends keyof Campaign>(k: K, val: Campaign[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  function toggleProduct(pid: string) {
    setV((s) => {
      const set = new Set(s.productIds ?? []);
      if (set.has(pid)) set.delete(pid);
      else set.add(pid);
      return { ...s, productIds: [...set] };
    });
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <div className="sm:col-span-2">
        <label htmlFor={idName} className="label">
          Campaign name
        </label>
        <input
          id={idName}
          className="input"
          value={v.name ?? ""}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Back-to-school Pinterest push — Sept"
          required
        />
      </div>

      <div>
        <label htmlFor={idPlatform} className="label">
          Platform
        </label>
        <select
          id={idPlatform}
          className="input"
          value={v.platform}
          onChange={(e) => update("platform", e.target.value as CampaignPlatform)}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={idGoal} className="label">
          Goal
        </label>
        <select
          id={idGoal}
          className="input"
          value={v.goal}
          onChange={(e) => update("goal", e.target.value as CampaignGoal)}
        >
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={idStart} className="label">
          Start date
        </label>
        <input
          id={idStart}
          type="date"
          className="input"
          value={v.startDate ?? ""}
          onChange={(e) => update("startDate", e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor={idEnd} className="label">
          End date (optional)
        </label>
        <input
          id={idEnd}
          type="date"
          className="input"
          value={v.endDate ?? ""}
          onChange={(e) => update("endDate", e.target.value)}
        />
      </div>

      <div>
        <label htmlFor={idBudget} className="label">
          Budget
        </label>
        <input
          id={idBudget}
          type="number"
          step="0.01"
          min="0"
          className="input"
          value={v.budget ?? 0}
          onChange={(e) => update("budget", parseFloat(e.target.value) || 0)}
        />
      </div>

      <div>
        <label htmlFor={idStatus} className="label">
          Status
        </label>
        <select
          id={idStatus}
          className="input"
          value={v.status}
          onChange={(e) => update("status", e.target.value as CampaignStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={idTags} className="label">
          Tags (comma separated)
        </label>
        <input
          id={idTags}
          className="input"
          value={(v.tags ?? []).join(", ")}
          onChange={(e) =>
            update(
              "tags",
              e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            )
          }
          placeholder="back-to-school, adhd, q3"
        />
      </div>

      <fieldset className="sm:col-span-2" aria-labelledby={idProducts}>
        <legend id={idProducts} className="label">
          Linked products
        </legend>
        {products.length === 0 ? (
          <p className="text-xs text-slate-500">
            No products yet. Create one first so you can attribute this
            campaign's performance.
          </p>
        ) : (
          <div className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700 sm:grid-cols-2">
            {products.map((p) => {
              const checked = (v.productIds ?? []).includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded border ${
                      checked
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <span className="line-clamp-1">{p.title}</span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="sm:col-span-2">
        <label htmlFor={idNotes} className="label">
          Notes
        </label>
        <textarea
          id={idNotes}
          className="input min-h-[80px]"
          value={v.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="What's the angle, the offer, the hypothesis you're testing?"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={idAudience} className="label">
          Audience notes
        </label>
        <textarea
          id={idAudience}
          className="input min-h-[60px]"
          value={v.audienceNotes ?? ""}
          onChange={(e) => update("audienceNotes", e.target.value)}
          placeholder="Who you're targeting and why. Demographic, behavioral, or platform-specific."
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={idLessons} className="label">
          Lessons learned
        </label>
        <textarea
          id={idLessons}
          className="input min-h-[60px]"
          value={v.lessonsLearned ?? ""}
          onChange={(e) => update("lessonsLearned", e.target.value)}
          placeholder="What surprised you, what failed, what worked."
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={idIdeas} className="label">
          Optimization ideas
        </label>
        <textarea
          id={idIdeas}
          className="input min-h-[60px]"
          value={v.optimizationIdeas ?? ""}
          onChange={(e) => update("optimizationIdeas", e.target.value)}
          placeholder="Next iteration ideas: copy tests, audience expansions, budget shifts."
        />
      </div>

      <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
