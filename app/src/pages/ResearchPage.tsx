import { useMemo, useState } from "react";
import { Compass, Plus, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, Badge } from "@/components/ui";
import Modal from "@/components/Modal";
import { toast } from "@/components/Toast";
import PipelineKanban from "@/components/research/PipelineKanban";
import OpportunityForm from "@/components/research/OpportunityForm";
import IdeaGeneratorModal from "@/components/research/IdeaGeneratorModal";
import KeywordsTab from "@/components/research/KeywordsTab";
import CompetitorsTab from "@/components/research/CompetitorsTab";
import InsightsTab from "@/components/research/InsightsTab";
import { STATUS_LABEL, STATUS_ORDER } from "@/components/research/atoms";
import type { OpportunityStatus } from "@/types";

type Tab = "pipeline" | "keywords" | "competitors" | "insights";

const TABS: { id: Tab; label: string }[] = [
  { id: "pipeline", label: "Pipeline" },
  { id: "keywords", label: "Keywords" },
  { id: "competitors", label: "Competitors" },
  { id: "insights", label: "Insights" },
];

/**
 * Product Research main page.
 *
 * Single page with tabs (Pipeline / Keywords / Competitors / Insights) +
 * top-level Stats and quick actions (Generate Ideas, New Opportunity).
 *
 * The point: ONE place to decide what to build next, integrated with the
 * rest of the app via the Pipeline's "convert to product" action.
 */
export default function ResearchPage() {
  const opportunities = useAppStore((s) => s.opportunities);
  const keywords = useAppStore((s) => s.keywords);
  const competitors = useAppStore((s) => s.competitors);
  const products = useAppStore((s) => s.products);
  const createOpportunity = useAppStore((s) => s.createOpportunity);

  const [tab, setTab] = useState<Tab>("pipeline");
  const [openNew, setOpenNew] = useState(false);
  const [openIdeas, setOpenIdeas] = useState(false);

  // KPI tiles
  const stats = useMemo(() => {
    const byStatus = new Map<OpportunityStatus, number>();
    for (const s of STATUS_ORDER) byStatus.set(s, 0);
    for (const o of opportunities) {
      byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
    }
    const scored = opportunities.filter((o) => o.score.total > 0);
    const avgScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((s, o) => s + o.score.total, 0) / scored.length
          )
        : 0;
    const converted = opportunities.filter((o) => !!o.linkedProductId).length;
    return {
      total: opportunities.length,
      ideas: byStatus.get("idea") ?? 0,
      planned: byStatus.get("planned") ?? 0,
      creating: byStatus.get("creating") ?? 0,
      ready: byStatus.get("ready") ?? 0,
      published: byStatus.get("published") ?? 0,
      avgScore,
      converted,
      keywords: keywords.length,
      competitors: competitors.length,
    };
  }, [opportunities, keywords, competitors]);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-brand-500" /> Product Research
          </span>
        }
        description="Decide what to build next. AI-suggested ideas with a transparent score, a Kanban pipeline, keyword research, competitor notes, and AI-generated business insights."
      >
        <button className="btn-secondary" onClick={() => setOpenIdeas(true)}>
          <Sparkles className="h-4 w-4" /> Generate ideas
        </button>
        <button className="btn-primary" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" /> New opportunity
        </button>
      </PageHeader>

      {/* Stat tiles */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Opportunities" value={stats.total} />
        <Stat label="Avg score" value={stats.avgScore} />
        <Stat label="In creation" value={stats.creating} />
        <Stat label="Converted → product" value={stats.converted} />
        <Stat
          label={`Catalog (${products.length}) vs ideas (${stats.ideas})`}
          value={`${products.length} / ${stats.ideas}`}
        />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "text-brand-700 dark:text-brand-300"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab body */}
      {tab === "pipeline" && (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              Pipeline
              <span className="chip text-[10px]">
                drag cards between columns to change stage
              </span>
            </span>
          }
        >
          <PipelineKanban
            opportunities={opportunities}
            onNew={() => setOpenNew(true)}
          />
          {opportunities.length === 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
              No opportunities yet. Start with{" "}
              <button
                onClick={() => setOpenIdeas(true)}
                className="font-medium text-brand-600 hover:underline"
              >
                AI-generated ideas
              </button>{" "}
              or{" "}
              <button
                onClick={() => setOpenNew(true)}
                className="font-medium text-brand-600 hover:underline"
              >
                add one manually
              </button>
              .
            </div>
          )}
        </SectionCard>
      )}

      {tab === "keywords" && <KeywordsTab />}
      {tab === "competitors" && <CompetitorsTab />}
      {tab === "insights" && <InsightsTab />}

      {/* New opportunity modal */}
      <Modal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title="New opportunity"
        size="lg"
      >
        <OpportunityForm
          submitLabel="Create opportunity"
          onSubmit={async (vals) => {
            const o = await createOpportunity(vals);
            toast.success(`Created "${o.title}"`);
            setOpenNew(false);
          }}
        />
      </Modal>

      {/* AI Idea Generator modal */}
      <Modal
        open={openIdeas}
        onClose={() => setOpenIdeas(false)}
        title="Generate opportunity ideas with AI"
        size="lg"
      >
        <IdeaGeneratorModal onClose={() => setOpenIdeas(false)} />
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
