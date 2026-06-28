import { useId, useMemo, useState } from "react";
import { Plus, Trash2, ExternalLink, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { SectionCard, EmptyState } from "@/components/ui";
import Modal from "@/components/Modal";
import { toast } from "@/components/Toast";
import type { Competitor } from "@/types";

export default function CompetitorsTab() {
  const competitors = useAppStore((s) => s.competitors);
  const createCompetitor = useAppStore((s) => s.createCompetitor);
  const updateCompetitor = useAppStore((s) => s.updateCompetitor);
  const deleteCompetitor = useAppStore((s) => s.deleteCompetitor);

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [q, setQ] = useState("");

  const idSearch = useId();

  const filtered = useMemo(() => {
    if (!q.trim()) return competitors;
    const t = q.toLowerCase();
    return competitors.filter((c) =>
      `${c.productTitle} ${c.category} ${c.notes}`.toLowerCase().includes(t)
    );
  }, [competitors, q]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
          <label htmlFor={idSearch} className="sr-only">
            Search competitors
          </label>
          <input
            id={idSearch}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Search competitor products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" /> Add competitor
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            competitors.length === 0
              ? "No competitors logged yet"
              : "No competitors match"
          }
          hint="Log competitors to inform gap analysis. Do not copy their content — record observations."
          action={
            <button className="btn-primary mt-3" onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4" /> Add competitor
            </button>
          }
        />
      ) : (
        <SectionCard title={`Competitors (${filtered.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2">Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Strengths</th>
                  <th>Weaknesses / gaps</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2 align-top">
                      <button
                        onClick={() => setEditing(c)}
                        className="text-left font-medium hover:underline"
                      >
                        {c.productTitle}
                      </button>
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 inline-block text-slate-400 hover:text-brand-500"
                          aria-label="Open competitor URL"
                        >
                          <ExternalLink className="inline h-3 w-3" />
                        </a>
                      )}
                    </td>
                    <td className="align-top text-xs">{c.category || "—"}</td>
                    <td className="align-top text-xs">{c.price || "—"}</td>
                    <td className="max-w-[200px] align-top text-xs">
                      <p className="line-clamp-2">{c.strengths || "—"}</p>
                    </td>
                    <td className="max-w-[200px] align-top text-xs">
                      <p className="line-clamp-2">
                        {c.weaknesses || c.missingFeatures || "—"}
                      </p>
                    </td>
                    <td className="align-top">
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete "${c.productTitle}"?`)) return;
                          await deleteCompetitor(c.id);
                          toast.success("Competitor deleted");
                        }}
                        className="btn-ghost h-7 w-7 p-0"
                        aria-label={`Delete ${c.productTitle}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <Modal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title="Add competitor"
        size="lg"
      >
        <CompetitorForm
          onSubmit={async (vals) => {
            const c = await createCompetitor(vals);
            toast.success(`Logged "${c.productTitle}"`);
            setOpenNew(false);
          }}
          submitLabel="Add competitor"
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit: ${editing.productTitle}` : ""}
        size="lg"
      >
        {editing && (
          <CompetitorForm
            initial={editing}
            submitLabel="Save changes"
            onSubmit={async (vals) => {
              await updateCompetitor(editing.id, vals);
              toast.success("Updated");
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function CompetitorForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<Competitor>;
  onSubmit(values: Partial<Competitor>): void;
  submitLabel: string;
}) {
  const [v, setV] = useState<Partial<Competitor>>({
    productTitle: "",
    category: "",
    price: "",
    url: "",
    strengths: "",
    weaknesses: "",
    missingFeatures: "",
    notes: "",
    ...initial,
  });
  const idTitle = useId();
  const idCategory = useId();
  const idPrice = useId();
  const idUrl = useId();
  const idStrengths = useId();
  const idWeaknesses = useId();
  const idMissing = useId();
  const idNotes = useId();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <div className="sm:col-span-2">
        <label htmlFor={idTitle} className="label">
          Product title
        </label>
        <input
          id={idTitle}
          className="input"
          required
          value={v.productTitle ?? ""}
          onChange={(e) =>
            setV((s) => ({ ...s, productTitle: e.target.value }))
          }
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
          onChange={(e) => setV((s) => ({ ...s, category: e.target.value }))}
        />
      </div>
      <div>
        <label htmlFor={idPrice} className="label">
          Price
        </label>
        <input
          id={idPrice}
          className="input"
          value={v.price ?? ""}
          onChange={(e) => setV((s) => ({ ...s, price: e.target.value }))}
          placeholder="$19"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={idUrl} className="label">
          URL (optional)
        </label>
        <input
          id={idUrl}
          type="url"
          className="input"
          value={v.url ?? ""}
          onChange={(e) => setV((s) => ({ ...s, url: e.target.value }))}
          placeholder="https://…"
        />
      </div>
      <div>
        <label htmlFor={idStrengths} className="label">
          Strengths
        </label>
        <textarea
          id={idStrengths}
          className="input min-h-[60px]"
          value={v.strengths ?? ""}
          onChange={(e) => setV((s) => ({ ...s, strengths: e.target.value }))}
        />
      </div>
      <div>
        <label htmlFor={idWeaknesses} className="label">
          Weaknesses
        </label>
        <textarea
          id={idWeaknesses}
          className="input min-h-[60px]"
          value={v.weaknesses ?? ""}
          onChange={(e) => setV((s) => ({ ...s, weaknesses: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={idMissing} className="label">
          Missing features / gaps you could fill
        </label>
        <textarea
          id={idMissing}
          className="input min-h-[60px]"
          value={v.missingFeatures ?? ""}
          onChange={(e) =>
            setV((s) => ({ ...s, missingFeatures: e.target.value }))
          }
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={idNotes} className="label">
          Notes
        </label>
        <textarea
          id={idNotes}
          className="input min-h-[60px]"
          value={v.notes ?? ""}
          onChange={(e) => setV((s) => ({ ...s, notes: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
