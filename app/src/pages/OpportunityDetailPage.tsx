import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Package,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, EmptyState, Badge } from "@/components/ui";
import { toast } from "@/components/Toast";
import { formatRelative } from "@/lib/util";
import {
  FACTOR_DESCRIPTION,
  FACTOR_LABEL,
  scoreContributors,
} from "@/lib/opportunityScore";
import { recommendedNextAction } from "@/lib/opportunityNextAction";
import OpportunityForm from "@/components/research/OpportunityForm";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  TREND_LABEL,
  TREND_TONE,
  ScorePill,
} from "@/components/research/atoms";
import type { OpportunityStatus } from "@/types";

export default function OpportunityDetailPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();

  const opportunity = useAppStore((s) =>
    s.opportunities.find((o) => o.id === id)
  );
  const products = useAppStore((s) => s.products);
  const settings = useAppStore((s) => s.settings);
  const updateOpportunity = useAppStore((s) => s.updateOpportunity);
  const deleteOpportunity = useAppStore((s) => s.deleteOpportunity);
  const convertOpportunityToProduct = useAppStore(
    (s) => s.convertOpportunityToProduct
  );
  const autosave = useAppStore((s) => s.settings.autosave);

  const linkedProduct = useMemo(
    () =>
      opportunity?.linkedProductId
        ? products.find((p) => p.id === opportunity.linkedProductId)
        : undefined,
    [opportunity, products]
  );

  if (!opportunity) {
    return (
      <EmptyState
        title="Opportunity not found"
        hint="It may have been deleted."
        action={
          <Link to="/research" className="btn-secondary mt-3">
            <ArrowLeft className="h-4 w-4" /> Back to research
          </Link>
        }
      />
    );
  }

  async function onConvert() {
    if (!opportunity) return;
    if (opportunity.linkedProductId) {
      // Already linked — just navigate.
      nav(`/products/${opportunity.linkedProductId}`);
      return;
    }
    const ok = window.confirm(
      `Create a new product from "${opportunity.title}"?\n\nThis copies the opportunity's title, category, audience, problem statement, and keywords into a new Product. You can still keep iterating on the opportunity afterwards.`
    );
    if (!ok) return;
    const p = await convertOpportunityToProduct(opportunity.id);
    if (p) {
      toast.success(`Created product "${p.title}"`);
      nav(`/products/${p.id}`);
    } else {
      toast.error("Could not create product");
    }
  }

  return (
    <>
      <PageHeader
        title={opportunity.title}
        description={`${STATUS_LABEL[opportunity.status]} · ${opportunity.category || "—"}`}
      >
        <Link to="/research" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> All opportunities
        </Link>
        <button className="btn-primary" onClick={onConvert}>
          <Package className="h-4 w-4" aria-hidden="true" />{" "}
          {opportunity.linkedProductId
            ? "Open linked product"
            : "Convert to product"}
        </button>
        <button
          className="btn-danger"
          onClick={async () => {
            if (!confirm(`Delete "${opportunity.title}"?`)) return;
            await deleteOpportunity(opportunity.id);
            toast.success("Opportunity deleted");
            nav("/research");
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
        </button>
      </PageHeader>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Score" value={<ScorePill total={opportunity.score.total} />} />
        <Tile label="Trend">
          <Badge tone={TREND_TONE[opportunity.trend]}>
            {TREND_LABEL[opportunity.trend]}
          </Badge>
        </Tile>
        <Tile label="Source">
          <Badge tone={opportunity.source === "ai-generated" ? "info" : "default"}>
            {opportunity.source === "ai-generated" ? "AI-generated" : "Manual"}
          </Badge>
        </Tile>
        <Tile
          label="Updated"
          value={formatRelative(opportunity.updatedAt)}
        />
      </div>

      {/* Decision support — the steering's whole point: this module must
          help the user decide what to build next, not just present data. */}
      {(() => {
        const action = recommendedNextAction(opportunity);
        const contrib = scoreContributors(opportunity.score.factors, settings);
        const toneClass = {
          success:
            "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200",
          info: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-200",
          warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200",
          default:
            "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
        }[action.tone];
        return (
          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  Recommended next action
                </span>
              }
            >
              <div
                className={`flex items-start gap-3 rounded-md border p-3 ${toneClass}`}
              >
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{action.label}</div>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">
                    {action.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {action.id === "convert" && (
                      <button className="btn-primary h-7 text-xs" onClick={onConvert}>
                        <Package className="h-3 w-3" aria-hidden="true" /> Convert to product draft
                      </button>
                    )}
                    {action.id === "open-linked-product" &&
                      opportunity.linkedProductId && (
                        <Link
                          to={`/products/${opportunity.linkedProductId}`}
                          className="btn-primary h-7 text-xs"
                        >
                          <Package className="h-3 w-3" /> Open product
                        </Link>
                      )}
                    {action.id.startsWith("advance-to-") &&
                      (() => {
                        const target = action.id.replace(
                          "advance-to-",
                          ""
                        ) as OpportunityStatus;
                        return (
                          <button
                            className="btn-secondary h-7 text-xs"
                            onClick={async () => {
                              await updateOpportunity(opportunity.id, {
                                status: target,
                              });
                              toast.success(`Moved to ${STATUS_LABEL[target]}`);
                            }}
                          >
                            Move to {STATUS_LABEL[target]}
                          </button>
                        );
                      })()}
                    {action.id === "research-more" && (
                      <button
                        className="btn-secondary h-7 text-xs"
                        onClick={async () => {
                          await updateOpportunity(opportunity.id, {
                            status: "researching",
                          });
                          toast.success("Moved to Researching");
                        }}
                      >
                        Move to Researching
                      </button>
                    )}
                    {action.id === "rate-factors" && (
                      <span className="text-[11px] italic opacity-80">
                        Scroll down to the factor sliders.
                      </span>
                    )}
                    {action.id === "archive-low-score" && (
                      <button
                        className="btn-secondary h-7 text-xs"
                        onClick={async () => {
                          if (!confirm(`Delete "${opportunity.title}"?`)) return;
                          await deleteOpportunity(opportunity.id);
                          toast.success("Archived");
                          nav("/research");
                        }}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  Why this score
                  <span className="chip text-[10px]">
                    weight × value contribution
                  </span>
                </span>
              }
            >
              {contrib.drivers.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No factors rated yet. Use the sliders below to populate the
                  Opportunity Score model.
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      <TrendingUp className="h-3 w-3" /> Top drivers
                    </div>
                    <ul className="space-y-1">
                      {contrib.drivers.map((c) => (
                        <li
                          key={c.factor}
                          className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-xs dark:border-slate-800"
                          title={FACTOR_DESCRIPTION[c.factor]}
                        >
                          <span className="line-clamp-1">{FACTOR_LABEL[c.factor]}</span>
                          <span className="ml-2 inline-flex items-center gap-2 text-[10px] tabular-nums text-slate-500">
                            <span>{c.value}/100</span>
                            <span>×{c.weight}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {contrib.blockers.length > 0 && (
                    <div>
                      <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                        <TrendingDown className="h-3 w-3" aria-hidden="true" /> What's holding it back
                      </div>
                      <ul className="space-y-1">
                        {contrib.blockers.map((c) => (
                          <li
                            key={c.factor}
                            className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-xs dark:border-slate-800"
                            title={FACTOR_DESCRIPTION[c.factor]}
                          >
                            <span className="line-clamp-1">{FACTOR_LABEL[c.factor]}</span>
                            <span className="ml-2 text-[10px] tabular-nums text-slate-500">
                              {c.value}/100
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </div>
        );
      })()}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Edit opportunity">
            <OpportunityForm
              initial={opportunity}
              submitLabel={autosave ? "Save (autosaved)" : "Save"}
              autosave={
                autosave
                  ? (vals) => updateOpportunity(opportunity.id, vals)
                  : undefined
              }
              onSubmit={async (vals) => {
                await updateOpportunity(opportunity.id, vals);
                toast.success("Saved");
              }}
            />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Linked product">
            {linkedProduct ? (
              <Link
                to={`/products/${linkedProduct.id}`}
                className="flex items-center justify-between rounded border border-slate-100 p-2 hover:border-brand-300 dark:border-slate-800"
              >
                <span className="line-clamp-1 text-sm font-medium">
                  {linkedProduct.title}
                </span>
                <span className="text-xs text-slate-500">→</span>
              </Link>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  No product yet. Once you're ready, convert this opportunity
                  into a Product in one click — copies title, audience,
                  problem, and keywords across.
                </p>
                <button className="btn-primary w-full" onClick={onConvert}>
                  <Package className="h-4 w-4" /> Convert to product
                </button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Keywords">
            {opportunity.keywords.length === 0 ? (
              <p className="text-xs text-slate-500">No keywords attached.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {opportunity.keywords.map((k) => (
                  <li key={k} className="chip text-[11px]">
                    {k}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">
        {value ?? children}
      </div>
    </div>
  );
}
