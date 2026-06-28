import { useMemo, useId, useState } from "react";
import {
  Plus,
  Star,
  Trash2,
  Search,
  History,
  RotateCcw,
  Save,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components/ui";
import { toast } from "@/components/Toast";
import Modal from "@/components/Modal";
import type { PromptTemplate } from "@/types";
import { formatRelative } from "@/lib/util";

const CATEGORIES = [
  "copy",
  "pinterest",
  "seo",
  "blog",
  "email",
  "social",
  "funnel",
  "custom",
];

export default function PromptLibraryPage() {
  const prompts = useAppStore((s) => s.prompts);
  const createPrompt = useAppStore((s) => s.createPrompt);
  const updatePrompt = useAppStore((s) => s.updatePrompt);
  const deletePrompt = useAppStore((s) => s.deletePrompt);
  const toggleFav = useAppStore((s) => s.toggleFavoritePrompt);
  const reset = useAppStore((s) => s.resetBuiltInPrompts);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [openNew, setOpenNew] = useState(false);

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      const text = `${p.name} ${p.description} ${p.userPromptTemplate}`.toLowerCase();
      const matchesQ = text.includes(q.toLowerCase());
      const matchesCat = cat === "all" || p.category === cat;
      const matchesFav = !favOnly || p.favorite;
      return matchesQ && matchesCat && matchesFav;
    });
  }, [prompts, q, cat, favOnly]);

  return (
    <>
      <PageHeader
        title="Prompt Library"
        description="Reusable building blocks for every generator. Edit, version, favorite, or write your own."
      >
        <button className="btn-secondary" onClick={() => {
          if (confirm("Re-seed the built-in templates? Your custom prompts will be kept.")) {
            reset();
            toast.success("Built-in templates re-seeded");
          }
        }}>
          <RotateCcw className="h-4 w-4" /> Reset built-ins
        </button>
        <button className="btn-primary" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" /> New prompt
        </button>
      </PageHeader>

      <div className="card mb-5 flex flex-wrap items-center gap-3 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Search prompts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input max-w-[180px]"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={favOnly}
            onChange={(e) => setFavOnly(e.target.checked)}
          />
          Favorites only
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No prompts match"
          hint="Adjust your filters or create a new template."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => setEditing(p)}
                  className="text-left font-medium text-slate-900 hover:underline dark:text-white"
                >
                  {p.name}
                </button>
                <button
                  onClick={() => toggleFav(p.id)}
                  className="btn-ghost h-7 w-7 p-0"
                  aria-label="Toggle favorite"
                >
                  <Star
                    className={`h-4 w-4 ${
                      p.favorite ? "fill-amber-400 text-amber-400" : "text-slate-400"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                {p.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone="info">{p.category}</Badge>
                {p.builtIn ? (
                  <Badge>built-in</Badge>
                ) : (
                  <Badge tone="success">custom</Badge>
                )}
                {p.versions.length > 0 && (
                  <span className="chip">
                    <History className="h-3 w-3" /> {p.versions.length} versions
                  </span>
                )}
                <span className="ml-auto text-[11px] text-slate-400">
                  {formatRelative(p.updatedAt)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-1">
                <button
                  className="btn-secondary h-7 text-xs"
                  onClick={() => setEditing(p)}
                >
                  Edit
                </button>
                {!p.builtIn && (
                  <button
                    className="btn-ghost h-7 text-xs"
                    onClick={async () => {
                      if (!confirm(`Delete "${p.name}"?`)) return;
                      await deletePrompt(p.id);
                      toast.success("Prompt deleted");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit: ${editing.name}` : ""}
        size="xl"
      >
        {editing && (
          <PromptEditor
            value={editing}
            onSave={async (patch) => {
              await updatePrompt(editing.id, patch);
              toast.success("Prompt saved");
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      {/* New modal */}
      <Modal open={openNew} onClose={() => setOpenNew(false)} title="New prompt" size="xl">
        <PromptEditor
          value={{
            id: "",
            name: "",
            category: "custom",
            description: "",
            systemPrompt: "",
            userPromptTemplate: "",
            favorite: false,
            builtIn: false,
            versions: [],
            createdAt: 0,
            updatedAt: 0,
          }}
          isNew
          onSave={async (patch) => {
            await createPrompt(patch);
            toast.success("Prompt created");
            setOpenNew(false);
          }}
          onCancel={() => setOpenNew(false)}
        />
      </Modal>
    </>
  );
}

function PromptEditor({
  value,
  onSave,
  onCancel,
  isNew = false,
}: {
  value: PromptTemplate;
  onSave: (patch: Partial<PromptTemplate>) => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  const [v, setV] = useState<PromptTemplate>(value);

  // Stable ids so labels associate with their controls.
  const idName = useId();
  const idCategory = useId();
  const idDescription = useId();
  const idSystem = useId();
  const idUser = useId();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={idName} className="label">
            Name
          </label>
          <input
            id={idName}
            className="input"
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={idCategory} className="label">
            Category
          </label>
          <select
            id={idCategory}
            className="input"
            value={v.category}
            onChange={(e) => setV({ ...v, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={idDescription} className="label">
          Description
        </label>
        <input
          id={idDescription}
          className="input"
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor={idSystem} className="label">
          System prompt
        </label>
        <textarea
          id={idSystem}
          className="input min-h-[120px] font-mono text-xs"
          value={v.systemPrompt}
          onChange={(e) => setV({ ...v, systemPrompt: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor={idUser} className="label">
          User prompt template — supports {"{{product.title}}, {{product.audience}}, {{settings.brandVoice}}"} etc.
        </label>
        <textarea
          id={idUser}
          className="input min-h-[260px] font-mono text-xs"
          value={v.userPromptTemplate}
          onChange={(e) => setV({ ...v, userPromptTemplate: e.target.value })}
        />
      </div>
      {v.versions.length > 0 && (
        <SectionCard title={`Version history (${v.versions.length})`}>
          <div className="max-h-40 overflow-y-auto text-xs">
            {[...v.versions].reverse().map((ver, i) => (
              <details
                key={i}
                className="border-b border-slate-100 py-1 dark:border-slate-800"
              >
                <summary className="cursor-pointer">
                  {new Date(ver.ts).toLocaleString()}
                </summary>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 dark:bg-slate-950">
                  {ver.userPromptTemplate}
                </pre>
              </details>
            ))}
          </div>
        </SectionCard>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={() =>
            onSave({
              name: v.name,
              category: v.category,
              description: v.description,
              systemPrompt: v.systemPrompt,
              userPromptTemplate: v.userPromptTemplate,
            })
          }
        >
          <Save className="h-4 w-4" />
          {isNew ? "Create" : "Save"}
        </button>
      </div>
    </div>
  );
}
