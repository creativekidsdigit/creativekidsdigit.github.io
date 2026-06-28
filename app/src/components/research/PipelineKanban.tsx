import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui";
import { toast } from "@/components/Toast";
import { recommendedNextAction } from "@/lib/opportunityNextAction";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_DESCRIPTION,
  TREND_LABEL,
  TREND_TONE,
  ScorePill,
} from "./atoms";
import type { Opportunity, OpportunityStatus } from "@/types";

interface Props {
  opportunities: Opportunity[];
  onNew(): void;
}

/**
 * Pipeline Kanban — one column per OpportunityStatus, drag-and-drop between
 * columns via the HTML5 drag API. No new dependencies; the drag UX is the
 * native browser one. Each card also exposes a status dropdown for keyboard
 * users who can't easily drag.
 */
export default function PipelineKanban({ opportunities, onNew }: Props) {
  const updateOpportunity = useAppStore((s) => s.updateOpportunity);
  const deleteOpportunity = useAppStore((s) => s.deleteOpportunity);
  const [dragOver, setDragOver] = useState<OpportunityStatus | null>(null);

  // Group by status
  const byStatus = new Map<OpportunityStatus, Opportunity[]>();
  for (const s of STATUS_ORDER) byStatus.set(s, []);
  for (const o of opportunities) {
    byStatus.get(o.status)!.push(o);
  }
  // Sort each column by score desc so the highest-priority opportunity floats up.
  for (const arr of byStatus.values()) {
    arr.sort((a, b) => b.score.total - a.score.total);
  }

  async function moveTo(id: string, status: OpportunityStatus) {
    await updateOpportunity(id, { status });
  }

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOverColumn(e: React.DragEvent, status: OpportunityStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== status) setDragOver(status);
  }
  async function onDrop(e: React.DragEvent, status: OpportunityStatus) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    await moveTo(id, status);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[1100px] gap-3">
        {STATUS_ORDER.map((status) => {
          const items = byStatus.get(status) ?? [];
          const isFirst = status === "idea";
          return (
            <section
              key={status}
              className={`flex w-[170px] shrink-0 flex-col rounded-lg border bg-slate-50/60 p-2 transition dark:bg-slate-900/40 ${
                dragOver === status
                  ? "border-brand-400 bg-brand-50/70 dark:border-brand-600 dark:bg-brand-900/30"
                  : "border-slate-200 dark:border-slate-700"
              }`}
              onDragOver={(e) => onDragOverColumn(e, status)}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(e, status)}
              aria-label={`Pipeline column: ${STATUS_LABEL[status]}`}
            >
              <header className="mb-2 px-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {items.length}
                  </span>
                </div>
                {isFirst && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {STATUS_DESCRIPTION[status]}
                  </p>
                )}
              </header>
              <div className="flex flex-1 flex-col gap-2">
                {items.map((o) => {
                  const action = recommendedNextAction(o);
                  return (
                  <article
                    key={o.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, o.id)}
                    className="card cursor-grab p-2 active:cursor-grabbing"
                    title="Drag to a different column to change stage"
                  >
                    <div className="mb-1 flex items-start justify-between gap-1">
                      <Link
                        to={`/research/${o.id}`}
                        className="line-clamp-2 text-xs font-medium hover:underline"
                      >
                        {o.title}
                      </Link>
                      <ScorePill total={o.score.total} />
                    </div>
                    <div className="mb-1 flex flex-wrap items-center gap-1">
                      <Badge tone={TREND_TONE[o.trend]}>
                        {TREND_LABEL[o.trend]}
                      </Badge>
                      {o.source === "ai-generated" && (
                        <Badge tone="info">AI</Badge>
                      )}
                      {o.linkedProductId && (
                        <Badge tone="success">→ product</Badge>
                      )}
                    </div>
                    <p
                      className="mb-1.5 line-clamp-1 text-[10px] italic text-slate-500"
                      title={action.reason}
                    >
                      Next: {action.label}
                    </p>
                    <div className="flex items-center justify-between gap-1">
                      <select
                        aria-label="Move to stage"
                        className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-900"
                        value={o.status}
                        onChange={(e) =>
                          moveTo(o.id, e.target.value as OpportunityStatus)
                        }
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete "${o.title}"?`)) return;
                          await deleteOpportunity(o.id);
                          toast.success("Deleted");
                        }}
                        className="btn-ghost h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        title="Delete"
                        aria-label={`Delete ${o.title}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <Link
                        to={`/research/${o.id}`}
                        className="btn-ghost h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        title="Open detail"
                        aria-label={`Open ${o.title}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </article>
                  );
                })}
                {items.length === 0 && (
                  <p className="rounded border border-dashed border-slate-200 p-3 text-center text-[10px] text-slate-400 dark:border-slate-700">
                    Empty
                  </p>
                )}
                {isFirst && (
                  <button
                    onClick={onNew}
                    className="btn-ghost h-7 justify-start text-[11px] text-brand-600"
                  >
                    <Plus className="h-3 w-3" /> Add idea
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
