import { useEffect, useId, useState } from "react";
import type { Platform, Product, ProductStatus } from "@/types";

const PLATFORMS: Platform[] = [
  "payhip",
  "shopify",
  "etsy",
  "gumroad",
  "kdp",
  "pinterest",
  "own-site",
  "other",
];
const STATUSES: ProductStatus[] = [
  "idea",
  "drafting",
  "in-review",
  "ready",
  "launched",
  "paused",
  "retired",
];

interface Props {
  initial?: Partial<Product>;
  onSubmit(values: Partial<Product>): void;
  submitLabel?: string;
  autosave?: (values: Partial<Product>) => void;
}

export default function ProductForm({
  initial,
  onSubmit,
  submitLabel = "Save product",
  autosave,
}: Props) {
  const [v, setV] = useState<Partial<Product>>({
    title: "",
    category: "",
    audience: "",
    problemSolved: "",
    benefits: [],
    keywords: [],
    pricing: "",
    platform: "payhip",
    status: "idea",
    launchDate: "",
    notes: "",
    ...initial,
  });

  // One stable id per field so labels are properly associated with controls.
  // Each useId() returns a unique, SSR-safe string per form instance.
  const idTitle = useId();
  const idCategory = useId();
  const idAudience = useId();
  const idProblem = useId();
  const idBenefits = useId();
  const idKeywords = useId();
  const idPricing = useId();
  const idPlatform = useId();
  const idStatus = useId();
  const idLaunch = useId();
  const idNotes = useId();

  // Lightweight autosave debounce
  useEffect(() => {
    if (!autosave) return;
    const t = setTimeout(() => autosave(v), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(v)]);

  function update<K extends keyof Product>(k: K, val: Product[K]) {
    setV((s) => ({ ...s, [k]: val }));
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
        <label htmlFor={idTitle} className="label">
          Title
        </label>
        <input
          id={idTitle}
          className="input"
          value={v.title ?? ""}
          onChange={(e) => update("title", e.target.value)}
          placeholder="ADHD After-School Reset Toolkit"
          required
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
          placeholder="ADHD parenting · Printables"
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
          placeholder="Parents of kids 6–10 with ADHD"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={idProblem} className="label">
          Problem solved
        </label>
        <textarea
          id={idProblem}
          className="input min-h-[80px]"
          value={v.problemSolved ?? ""}
          onChange={(e) => update("problemSolved", e.target.value)}
          placeholder="After-school meltdowns and homework struggles."
        />
      </div>

      <div>
        <label htmlFor={idBenefits} className="label">
          Benefits (one per line)
        </label>
        <textarea
          id={idBenefits}
          className="input min-h-[100px]"
          value={(v.benefits ?? []).join("\n")}
          onChange={(e) =>
            update(
              "benefits",
              e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder={"Calm transitions\nLess yelling\nVisual cues"}
        />
      </div>

      <div>
        <label htmlFor={idKeywords} className="label">
          Keywords (comma separated)
        </label>
        <textarea
          id={idKeywords}
          className="input min-h-[100px]"
          value={(v.keywords ?? []).join(", ")}
          onChange={(e) =>
            update(
              "keywords",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="adhd after school, visual schedule, calm down corner"
        />
      </div>

      <div>
        <label htmlFor={idPricing} className="label">
          Pricing
        </label>
        <input
          id={idPricing}
          className="input"
          value={v.pricing ?? ""}
          onChange={(e) => update("pricing", e.target.value)}
          placeholder="$19 · bundle $39"
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
          onChange={(e) => update("platform", e.target.value as Platform)}
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
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
          value={v.status}
          onChange={(e) => update("status", e.target.value as ProductStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={idLaunch} className="label">
          Launch date
        </label>
        <input
          id={idLaunch}
          type="date"
          className="input"
          value={v.launchDate ?? ""}
          onChange={(e) => update("launchDate", e.target.value)}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={idNotes} className="label">
          Notes
        </label>
        <textarea
          id={idNotes}
          className="input min-h-[100px]"
          value={v.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Any extra context the AI should know about this product."
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
