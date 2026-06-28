import { useEffect, useState } from "react";
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
        <label className="label">Title</label>
        <input
          className="input"
          value={v.title ?? ""}
          onChange={(e) => update("title", e.target.value)}
          placeholder="ADHD After-School Reset Toolkit"
          required
        />
      </div>

      <div>
        <label className="label">Category</label>
        <input
          className="input"
          value={v.category ?? ""}
          onChange={(e) => update("category", e.target.value)}
          placeholder="ADHD parenting · Printables"
        />
      </div>

      <div>
        <label className="label">Audience</label>
        <input
          className="input"
          value={v.audience ?? ""}
          onChange={(e) => update("audience", e.target.value)}
          placeholder="Parents of kids 6–10 with ADHD"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="label">Problem solved</label>
        <textarea
          className="input min-h-[80px]"
          value={v.problemSolved ?? ""}
          onChange={(e) => update("problemSolved", e.target.value)}
          placeholder="After-school meltdowns and homework struggles."
        />
      </div>

      <div>
        <label className="label">Benefits (one per line)</label>
        <textarea
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
        <label className="label">Keywords (comma separated)</label>
        <textarea
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
        <label className="label">Pricing</label>
        <input
          className="input"
          value={v.pricing ?? ""}
          onChange={(e) => update("pricing", e.target.value)}
          placeholder="$19 · bundle $39"
        />
      </div>

      <div>
        <label className="label">Platform</label>
        <select
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
        <label className="label">Status</label>
        <select
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
        <label className="label">Launch date</label>
        <input
          type="date"
          className="input"
          value={v.launchDate ?? ""}
          onChange={(e) => update("launchDate", e.target.value)}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="label">Notes</label>
        <textarea
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
