import { useId, useMemo, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { SectionCard, Badge, EmptyState } from "@/components/ui";
import { toast } from "@/components/Toast";
import type { Keyword, KeywordType } from "@/types";

const TYPES: KeywordType[] = [
  "primary",
  "secondary",
  "long-tail",
  "question",
  "seasonal",
];

const TYPE_LABEL: Record<KeywordType, string> = {
  primary: "Primary",
  secondary: "Secondary",
  "long-tail": "Long-tail",
  question: "Question",
  seasonal: "Seasonal",
};

const TYPE_TONE: Record<
  KeywordType,
  "success" | "info" | "warn" | "danger" | "default"
> = {
  primary: "success",
  secondary: "info",
  "long-tail": "default",
  question: "warn",
  seasonal: "warn",
};

export default function KeywordsTab() {
  const keywords = useAppStore((s) => s.keywords);
  const createKeyword = useAppStore((s) => s.createKeyword);
  const updateKeyword = useAppStore((s) => s.updateKeyword);
  const deleteKeyword = useAppStore((s) => s.deleteKeyword);

  // Inline new-keyword form
  const [newTerm, setNewTerm] = useState("");
  const [newType, setNewType] = useState<KeywordType>("long-tail");
  const [newTopic, setNewTopic] = useState("");

  // Filters
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<KeywordType | "all">("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");

  const idTerm = useId();
  const idType = useId();
  const idTopic = useId();
  const idSearch = useId();

  const allTopics = useMemo(() => {
    const s = new Set<string>();
    keywords.forEach((k) => k.topic && s.add(k.topic));
    return [...s].sort();
  }, [keywords]);

  const filtered = useMemo(() => {
    return keywords.filter((k) => {
      if (typeFilter !== "all" && k.type !== typeFilter) return false;
      if (topicFilter !== "all" && k.topic !== topicFilter) return false;
      if (q.trim()) {
        const hay = `${k.term} ${k.topic} ${k.notes}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [keywords, typeFilter, topicFilter, q]);

  // Group by topic for the table display
  const byTopic = useMemo(() => {
    const m = new Map<string, Keyword[]>();
    for (const k of filtered) {
      const t = k.topic || "(uncategorized)";
      const arr = m.get(t) ?? [];
      arr.push(k);
      m.set(t, arr);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  async function onAdd() {
    if (!newTerm.trim()) {
      toast.error("Keyword term is required");
      return;
    }
    await createKeyword({
      term: newTerm.trim(),
      type: newType,
      topic: newTopic.trim(),
    });
    setNewTerm("");
    setNewTopic("");
    toast.success("Keyword added");
  }

  return (
    <div className="space-y-5">
      {/* Add */}
      <SectionCard title="Add keyword">
        <div className="grid gap-3 sm:grid-cols-[2fr,1fr,1fr,auto]">
          <div>
            <label htmlFor={idTerm} className="label">
              Term
            </label>
            <input
              id={idTerm}
              className="input"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="adhd after school routine"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAdd();
                }
              }}
            />
          </div>
          <div>
            <label htmlFor={idType} className="label">
              Type
            </label>
            <select
              id={idType}
              className="input"
              value={newType}
              onChange={(e) => setNewType(e.target.value as KeywordType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={idTopic} className="label">
              Topic (grouping)
            </label>
            <input
              id={idTopic}
              className="input"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="ADHD parenting"
              list="research-topic-suggestions"
            />
            <datalist id="research-topic-suggestions">
              {allTopics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="flex items-end">
            <button className="btn-primary" onClick={onAdd}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Filter bar */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <label htmlFor={idSearch} className="sr-only">
            Search keywords
          </label>
          <input
            id={idSearch}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Search keywords…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by type"
          className="input max-w-[160px]"
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as KeywordType | "all")
          }
        >
          <option value="all">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by topic"
          className="input max-w-[200px]"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option value="all">All topics</option>
          {allTopics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          title={keywords.length === 0 ? "No keywords yet" : "No keywords match your filters"}
          hint={
            keywords.length === 0
              ? "Add seed keywords above. They feed the AI Idea Generator and the gap analysis."
              : "Try clearing a filter."
          }
        />
      ) : (
        byTopic.map(([topic, items]) => (
          <SectionCard
            key={topic}
            title={
              <span className="flex items-center gap-2">
                {topic}
                <span className="chip text-[10px]">{items.length}</span>
              </span>
            }
          >
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center gap-2 py-2 text-sm"
                >
                  <Badge tone={TYPE_TONE[k.type]}>{TYPE_LABEL[k.type]}</Badge>
                  <input
                    aria-label={`Edit term for ${k.term}`}
                    className="min-w-[200px] flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:border-brand-400 focus:outline-none dark:hover:border-slate-700"
                    defaultValue={k.term}
                    onBlur={async (e) => {
                      const next = e.target.value.trim();
                      if (next && next !== k.term)
                        await updateKeyword(k.id, { term: next });
                    }}
                  />
                  <select
                    aria-label="Type"
                    className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    value={k.type}
                    onChange={(e) =>
                      updateKeyword(k.id, { type: e.target.value as KeywordType })
                    }
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete keyword "${k.term}"?`)) return;
                      await deleteKeyword(k.id);
                      toast.success("Keyword deleted");
                    }}
                    className="btn-ghost h-7 w-7 p-0"
                    aria-label={`Delete ${k.term}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        ))
      )}
    </div>
  );
}
