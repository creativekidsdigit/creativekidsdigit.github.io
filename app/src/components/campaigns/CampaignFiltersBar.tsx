import { useId } from "react";
import { Search } from "lucide-react";
import { SectionCard } from "@/components/ui";
import type { Product } from "@/types";
import type { CampaignFilters } from "@/lib/analytics";

const PLATFORMS = [
  "pinterest",
  "facebook",
  "instagram",
  "google",
  "email",
  "organic-seo",
  "other",
];
const STATUSES = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "completed",
  "archived",
];
const GOALS = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "sales",
  "retention",
  "other",
];

interface Props {
  filters: CampaignFilters;
  search: string;
  allTags: string[];
  products: Product[];
  setFilter<K extends keyof CampaignFilters>(k: K, v: CampaignFilters[K]): void;
  setSearch(s: string): void;
  onReset(): void;
}

export default function CampaignFiltersBar({
  filters,
  search,
  allTags,
  products,
  setFilter,
  setSearch,
  onReset,
}: Props) {
  const idFrom = useId();
  const idTo = useId();
  const idPlatform = useId();
  const idProduct = useId();
  const idStatus = useId();
  const idGoal = useId();
  const idTag = useId();
  const idSearch = useId();

  return (
    <SectionCard
      title="Filters"
      className="mb-5"
      action={
        <button className="btn-ghost text-xs" onClick={onReset}>
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
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
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
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
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
            value={filters.goal ?? ""}
            onChange={(e) => setFilter("goal", e.target.value)}
          >
            <option value="">All</option>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
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
            <Search className="h-4 w-4 text-slate-400" />
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
  );
}
