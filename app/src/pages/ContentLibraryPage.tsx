import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Pin,
  PinOff,
  Trash2,
  Copy,
  Download,
  Filter,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components/ui";
import { toast } from "@/components/Toast";
import { useQueryParam } from "@/lib/useQueryParam";
import { copyText, downloadFile, formatRelative, slugify, wordCount } from "@/lib/util";
import type { ContentKind } from "@/types";

const KINDS: ContentKind[] = [
  "copy",
  "pinterest",
  "seo",
  "blog",
  "email",
  "social",
  "funnel",
  "other",
];

export default function ContentLibraryPage() {
  const content = useAppStore((s) => s.content);
  const products = useAppStore((s) => s.products);
  const updateContent = useAppStore((s) => s.updateContent);
  const deleteContent = useAppStore((s) => s.deleteContent);
  const togglePin = useAppStore((s) => s.togglePinContent);

  const focusId = useQueryParam("focus");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ContentKind | "all">("all");
  const [productId, setProductId] = useState<string>("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(focusId);

  useEffect(() => {
    if (focusId) setActiveId(focusId);
  }, [focusId]);

  const filtered = useMemo(() => {
    return content
      .filter((c) => {
        const text = `${c.title} ${c.body} ${c.tags.join(" ")}`.toLowerCase();
        const matchesQ = text.includes(q.toLowerCase());
        const matchesKind = kind === "all" || c.kind === kind;
        const matchesProduct =
          productId === "all" || c.productId === productId;
        const matchesPin = !pinnedOnly || c.pinned;
        return matchesQ && matchesKind && matchesProduct && matchesPin;
      })
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
  }, [content, q, kind, productId, pinnedOnly]);

  const active = filtered.find((c) => c.id === activeId) ?? filtered[0];

  return (
    <>
      <PageHeader
        title="Content Library"
        description="Every piece of copy you've generated. Search, edit, export, or pin."
      />

      <div className="card mb-5 flex flex-wrap items-center gap-3 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Search saved content…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input max-w-[180px]"
          value={kind}
          onChange={(e) => setKind(e.target.value as ContentKind | "all")}
        >
          <option value="all">All kinds</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[220px]"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="all">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinnedOnly}
            onChange={(e) => setPinnedOnly(e.target.checked)}
          />
          Pinned only
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          hint="Generate content in any module and click Save — it'll appear here."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {filtered.map((c) => {
                const isActive = active?.id === c.id;
                const prod = products.find((p) => p.id === c.productId);
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`block w-full rounded-lg border p-3 text-left transition-colors ${
                      isActive
                        ? "border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="line-clamp-1 text-sm font-medium">
                        {c.title}
                      </div>
                      {c.pinned && (
                        <Pin className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                      <Badge tone="info">{c.kind}</Badge>
                      {prod && (
                        <span className="line-clamp-1">{prod.title}</span>
                      )}
                      <span className="ml-auto">{formatRelative(c.updatedAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            {active && (
              <SectionCard
                title={active.title}
                action={
                  <div className="flex items-center gap-1">
                    <button
                      className="btn-ghost h-8 w-8 p-0"
                      onClick={() => togglePin(active.id)}
                      title="Pin"
                    >
                      {active.pinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      className="btn-secondary h-8"
                      onClick={async () => {
                        const ok = await copyText(active.body);
                        if (ok) toast.success("Copied");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                    <button
                      className="btn-secondary h-8"
                      onClick={() =>
                        downloadFile(
                          `${slugify(active.title)}.md`,
                          active.body,
                          "text/markdown"
                        )
                      }
                    >
                      <Download className="h-3.5 w-3.5" /> .md
                    </button>
                    <button
                      className="btn-ghost h-8 w-8 p-0"
                      onClick={async () => {
                        if (!confirm("Delete this content?")) return;
                        await deleteContent(active.id);
                        toast.success("Deleted");
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                }
              >
                <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge tone="info">{active.kind}</Badge>
                  {active.tags.map((t) => (
                    <span key={t} className="chip">
                      <Filter className="h-3 w-3" />
                      {t}
                    </span>
                  ))}
                  <span className="ml-auto text-slate-400">
                    {wordCount(active.body)} words · {formatRelative(active.updatedAt)}
                  </span>
                </div>
                <textarea
                  className="min-h-[420px] w-full resize-y rounded-md border border-slate-200 bg-white p-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={active.body}
                  onChange={(e) =>
                    updateContent(active.id, { body: e.target.value })
                  }
                />
              </SectionCard>
            )}
          </div>
        </div>
      )}
    </>
  );
}
