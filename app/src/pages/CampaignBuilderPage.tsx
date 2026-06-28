import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Rocket,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { generate } from "@/lib/ai";
import { interpolate } from "@/lib/template";
import { runWithConcurrency } from "@/lib/concurrency";
import { storage, K } from "@/lib/storage";
import {
  ALL_OBJECTIVES,
  ALL_PLATFORMS,
  GROUP_LABELS,
  GROUP_ORDER,
  OBJECTIVE_HINT,
  OBJECTIVE_LABELS,
  OBJECTIVE_TO_GOAL,
  PLATFORM_LABELS,
  buildPlan,
  defaultCampaignName,
  primaryCampaignPlatform,
  resolveTemplate,
  type BuilderGroup,
  type BuilderObjective,
  type BuilderPlatform,
  type BuilderTask,
} from "@/lib/campaignBuilder";
import { useQueryParam } from "@/lib/useQueryParam";
import { wordCount } from "@/lib/util";
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components/ui";
import { toast } from "@/components/Toast";

// =====================================================================
// Task state
// =====================================================================

type TaskStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "aborted";

interface TaskState extends BuilderTask {
  status: TaskStatus;
  /** Editable AI output once the task succeeds. */
  output: string;
  /**
   * Whether the asset will be included in the final Save. Defaults to true
   * on successful completion. The Review screen exposes Remove / Restore
   * actions so the user can curate which assets actually ship.
   */
  approved: boolean;
  error?: string;
  ms?: number;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Queued",
  running: "Generating…",
  succeeded: "Done",
  failed: "Failed",
  aborted: "Cancelled",
};

/** Concurrency cap for parallel AI calls — polite default that finishes
 *  ~15 tasks in well under a minute at typical provider latencies. */
const CONCURRENCY = 3;

// =====================================================================
// Draft persistence (resume-after-refresh)
// =====================================================================

interface BuilderDraft {
  productId: string;
  platforms: BuilderPlatform[];
  objective: BuilderObjective;
  campaignName: string;
  tasks: TaskState[];
  ts: number;
}

/** Drafts are intentionally tolerant: any field-shape failure → null and
 *  the user lands on a fresh form rather than a wedged page. */
function isDraft(v: unknown): v is BuilderDraft {
  if (typeof v !== "object" || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.productId === "string" &&
    Array.isArray(d.platforms) &&
    typeof d.objective === "string" &&
    typeof d.campaignName === "string" &&
    Array.isArray(d.tasks) &&
    typeof d.ts === "number"
  );
}

// =====================================================================
// Page
// =====================================================================

export default function CampaignBuilderPage() {
  const nav = useNavigate();

  const products = useAppStore((s) => s.products);
  const prompts = useAppStore((s) => s.prompts);
  const settings = useAppStore((s) => s.settings);
  const createCampaign = useAppStore((s) => s.createCampaign);
  const saveContent = useAppStore((s) => s.saveContent);

  const initialProductId = useQueryParam("product");

  // ---------- config state ----------
  const [productId, setProductId] = useState<string>(
    initialProductId ?? products[0]?.id ?? ""
  );
  const [platforms, setPlatforms] = useState<BuilderPlatform[]>([
    "payhip",
    "pinterest",
    "email",
  ]);
  const [objective, setObjective] = useState<BuilderObjective>("product-launch");
  const [campaignName, setCampaignName] = useState<string>("");

  // ---------- run state ----------
  const [tasks, setTasks] = useState<TaskState[]>([]);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ---------- draft state ----------
  const [hydrated, setHydrated] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState<BuilderDraft | null>(null);

  // ---------- ids ----------
  const idProduct = useId();
  const idObjective = useId();
  const idName = useId();

  // ---------- draft load on mount ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await storage.get<unknown>(K.campaignBuilderDraft, null);
      if (cancelled) return;
      if (raw && isDraft(raw) && raw.tasks.length > 0) {
        setDraftAvailable(raw);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- draft autosave ----------
  // Persist the current builder state debounced. Only writes once tasks have
  // appeared — we don't pollute IDB just because the form is open.
  useEffect(() => {
    if (!hydrated) return;
    if (tasks.length === 0) return; // nothing meaningful to resume
    if (running) return; // avoid thrashing storage during the parallel run
    const handle = setTimeout(() => {
      const draft: BuilderDraft = {
        productId,
        platforms,
        objective,
        campaignName,
        tasks,
        ts: Date.now(),
      };
      void storage.set(K.campaignBuilderDraft, draft);
    }, 500);
    return () => clearTimeout(handle);
  }, [
    hydrated,
    tasks,
    running,
    productId,
    platforms,
    objective,
    campaignName,
  ]);

  function resumeDraft() {
    if (!draftAvailable) return;
    setProductId(draftAvailable.productId);
    setPlatforms(draftAvailable.platforms);
    setObjective(draftAvailable.objective);
    setCampaignName(draftAvailable.campaignName);
    setTasks(draftAvailable.tasks);
    nameTouched.current = true;
    setDraftAvailable(null);
    toast.success("Draft restored");
  }

  async function discardDraft() {
    await storage.del(K.campaignBuilderDraft);
    setDraftAvailable(null);
  }

  async function clearDraft() {
    await storage.del(K.campaignBuilderDraft);
  }

  // Keep selected product valid as the products list changes.
  useEffect(() => {
    if (!products.find((p) => p.id === productId)) {
      setProductId(products[0]?.id ?? "");
    }
  }, [products, productId]);

  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  // Live preview of what will be built.
  const previewPlan = useMemo(() => buildPlan(platforms), [platforms]);

  // Default campaign name follows product + objective until the user types.
  const nameTouched = useRef(false);
  useEffect(() => {
    if (nameTouched.current) return;
    if (product) setCampaignName(defaultCampaignName(product.title, objective));
    else setCampaignName("");
  }, [product, objective]);

  // ----- handlers -----

  function togglePlatform(p: BuilderPlatform) {
    setPlatforms((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
    );
  }

  /**
   * Build a single task's full system+user prompt by interpolating the
   * selected template against the product, and appending the objective hint.
   */
  function makePrompt(task: TaskState): {
    system: string;
    user: string;
    templateId: string;
  } | null {
    if (!product) return null;
    const tpl = resolveTemplate(prompts, task.templateName);
    if (!tpl) return null;
    const ctx = { product, settings };
    const system = interpolate(tpl.systemPrompt, ctx);
    const userBase = interpolate(tpl.userPromptTemplate, ctx);
    const user = `${userBase}\n\nADDITIONAL CAMPAIGN CONTEXT\n${OBJECTIVE_HINT[objective]}`;
    return { system, user, templateId: tpl.id };
  }

  async function executeTask(
    task: TaskState,
    signal: AbortSignal
  ): Promise<void> {
    const prepared = makePrompt(task);
    if (!prepared) {
      updateTask(task.id, {
        status: "failed",
        error: `Built-in template "${task.templateName}" not found. Open Prompt Library → "Reset built-ins" and try again.`,
      });
      return;
    }
    updateTask(task.id, { status: "running", error: undefined });
    try {
      const result = await generate(
        {
          system: prepared.system,
          user: prepared.user,
          temperature: 0.7,
          maxTokens: 2200,
          signal,
        },
        settings
      );
      updateTask(task.id, {
        status: "succeeded",
        output: result.text,
        ms: result.ms,
        approved: true, // auto-approve on success; user can Remove in review
      });
    } catch (e: unknown) {
      const isAbort =
        (e instanceof DOMException && e.name === "AbortError") ||
        signal.aborted;
      if (isAbort) {
        updateTask(task.id, { status: "aborted" });
      } else {
        updateTask(task.id, {
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  function updateTask(id: string, patch: Partial<TaskState>) {
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function onGenerate() {
    if (!product) {
      toast.error("Pick a product first.");
      return;
    }
    if (previewPlan.length === 0) {
      toast.error("No tasks to run — select at least one platform.");
      return;
    }
    // Wipe any partial draft from a previous attempt before starting fresh.
    await clearDraft();
    const initial: TaskState[] = previewPlan.map((t) => ({
      ...t,
      status: "pending",
      output: "",
      approved: false,
    }));
    setTasks(initial);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    await runWithConcurrency(
      initial,
      (task) => executeTask(task, controller.signal),
      CONCURRENCY
    );

    setRunning(false);
    abortRef.current = null;
  }

  function onCancel() {
    const ok = window.confirm(
      "Cancel campaign generation?\n\n" +
        "Completed assets will be kept and can still be reviewed and saved. " +
        "In-flight assets will stop, queued assets will be skipped."
    );
    if (!ok) return;
    abortRef.current?.abort();
    toast.info("Cancelling…");
  }

  async function onRegenerate(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const controller = new AbortController();
    await executeTask(
      { ...task, status: "running", output: "" },
      controller.signal
    );
  }

  function approve(taskId: string) {
    updateTask(taskId, { approved: true });
  }
  function remove(taskId: string) {
    updateTask(taskId, { approved: false });
  }
  function approveAll() {
    setTasks((cur) =>
      cur.map((t) =>
        t.status === "succeeded" ? { ...t, approved: true } : t
      )
    );
  }
  function removeAll() {
    setTasks((cur) =>
      cur.map((t) =>
        t.status === "succeeded" ? { ...t, approved: false } : t
      )
    );
  }

  async function onSaveCampaign() {
    if (!product) return;
    const approvedTasks = tasks.filter(
      (t) => t.status === "succeeded" && t.approved
    );
    if (approvedTasks.length === 0) {
      toast.error(
        "Nothing to save — approve at least one asset (or regenerate failed ones first)."
      );
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const campaign = await createCampaign({
        name:
          campaignName.trim() ||
          defaultCampaignName(product.title, objective),
        productIds: [product.id],
        platform: primaryCampaignPlatform(platforms),
        goal: OBJECTIVE_TO_GOAL[objective],
        startDate: today,
        status: "draft",
        notes:
          `Generated via Campaign Builder.\n` +
          `Objective: ${OBJECTIVE_LABELS[objective]}.\n` +
          `Platforms: ${platforms.map((p) => PLATFORM_LABELS[p]).join(", ") || "(product + SEO only)"}.`,
        tags: ["campaign-builder", objective, ...platforms],
      });

      // Save each approved asset. Each save is independent — if one fails,
      // we continue with the rest and report what failed. This honors
      // "atomic where practical": the Campaign record is created in a single
      // store action, each asset writes are isolated.
      const failedSaves: string[] = [];
      // Reverse iterate so the Content Library reads top-down in plan order.
      for (let i = approvedTasks.length - 1; i >= 0; i--) {
        const t = approvedTasks[i];
        const tpl = resolveTemplate(prompts, t.templateName);
        try {
          await saveContent({
            productId: product.id,
            campaignId: campaign.id,
            kind: t.contentKind,
            templateId: tpl?.id ?? `builder:${t.id}`,
            title: `${product.title} · ${t.label}`,
            body: t.output,
            tags: [
              "campaign-builder",
              objective,
              ...platforms,
              t.group,
            ],
            pinned: false,
          });
        } catch (e) {
          failedSaves.push(`${t.label}: ${(e as Error).message}`);
        }
      }

      if (failedSaves.length > 0) {
        toast.error(
          `${failedSaves.length} asset${failedSaves.length === 1 ? "" : "s"} failed to save. Campaign was still created.`
        );
        // eslint-disable-next-line no-console
        console.warn("[CampaignBuilder] partial save failures:", failedSaves);
      } else {
        toast.success(
          `Campaign saved with ${approvedTasks.length} asset${approvedTasks.length === 1 ? "" : "s"}.`
        );
      }

      // Successful save invalidates the draft.
      await clearDraft();
      nav(`/campaigns/${campaign.id}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ---------- derived UI bits ----------

  const completedCount = tasks.filter((t) => t.status === "succeeded").length;
  const failedCount = tasks.filter((t) => t.status === "failed").length;
  const runningCount = tasks.filter((t) => t.status === "running").length;
  const totalCount = tasks.length;
  const approvedCount = tasks.filter(
    (t) => t.status === "succeeded" && t.approved
  ).length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const reviewVisible = tasks.length > 0;
  const canSave = !running && !saving && approvedCount > 0;

  const tasksByGroup = useMemo(() => {
    const map = new Map<BuilderGroup, TaskState[]>();
    for (const t of tasks) {
      const arr = map.get(t.group) ?? [];
      arr.push(t);
      map.set(t.group, arr);
    }
    return map;
  }, [tasks]);

  // ---------- render ----------

  if (products.length === 0) {
    return (
      <>
        <PageHeader title="Campaign Builder" />
        <EmptyState
          title="Add a product first"
          hint="The Campaign Builder orchestrates every generator against a product. Create one and come back."
          action={
            <Link to="/products" className="btn-primary mt-3">
              Go to Products
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-brand-500" /> Campaign Builder
          </span>
        }
        description="One product, every platform. Pick targets and an objective, then generate a complete launch package in one workflow."
      />

      {/* Resume draft banner */}
      {draftAvailable && tasks.length === 0 && (
        <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Resume previous campaign?</strong> You have an unsaved
              draft from{" "}
              {new Date(draftAvailable.ts).toLocaleString()} with{" "}
              {draftAvailable.tasks.filter((t) => t.status === "succeeded").length}{" "}
              completed asset
              {draftAvailable.tasks.filter((t) => t.status === "succeeded")
                .length === 1
                ? ""
                : "s"}
              .
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={discardDraft}>
              Discard
            </button>
            <button className="btn-primary" onClick={resumeDraft}>
              Resume
            </button>
          </div>
        </div>
      )}

      {/* ============= SETUP ============= */}
      <SectionCard title="Setup" className="mb-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Product */}
          <div>
            <label htmlFor={idProduct} className="label">
              Product
            </label>
            <select
              id={idProduct}
              className="input"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={running}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {product && (
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                {product.problemSolved || "No problem statement yet."}
              </p>
            )}
          </div>

          {/* Campaign name */}
          <div>
            <label htmlFor={idName} className="label">
              Campaign name
            </label>
            <input
              id={idName}
              className="input"
              value={campaignName}
              onChange={(e) => {
                nameTouched.current = true;
                setCampaignName(e.target.value);
              }}
              disabled={running}
              placeholder={
                product
                  ? defaultCampaignName(product.title, objective)
                  : "Auto-generated from product + objective"
              }
            />
            <p className="mt-2 text-xs text-slate-500">
              Used as the Campaign Analytics record's title. You can rename it
              later.
            </p>
          </div>

          {/* Objective */}
          <div className="lg:col-span-2">
            <fieldset aria-labelledby={idObjective}>
              <legend id={idObjective} className="label">
                Campaign goal
              </legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ALL_OBJECTIVES.map((o) => (
                  <label
                    key={o}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition ${
                      objective === o
                        ? "border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="objective"
                      value={o}
                      checked={objective === o}
                      onChange={() => setObjective(o)}
                      disabled={running}
                      className="accent-brand-600"
                    />
                    {OBJECTIVE_LABELS[o]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Platforms */}
          <div className="lg:col-span-2">
            <fieldset>
              <legend className="label">Target platforms</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {ALL_PLATFORMS.map((p) => {
                  const checked = platforms.includes(p);
                  return (
                    <label
                      key={p}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition ${
                        checked
                          ? "border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 place-items-center rounded border ${
                          checked
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => togglePlatform(p)}
                        disabled={running}
                      />
                      {PLATFORM_LABELS[p]}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Product copy and SEO are always included. Each selected
                platform adds its own native assets.
              </p>
            </fieldset>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="text-xs text-slate-500">
            Plan: <strong>{previewPlan.length}</strong> asset
            {previewPlan.length === 1 ? "" : "s"} across{" "}
            <strong>
              {new Set(previewPlan.map((t) => t.group)).size}
            </strong>{" "}
            section
            {new Set(previewPlan.map((t) => t.group)).size === 1 ? "" : "s"}.
          </div>
          {running ? (
            <button className="btn-danger" onClick={onCancel}>
              <XCircle className="h-4 w-4" /> Cancel generation
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={onGenerate}
              disabled={!product || previewPlan.length === 0}
            >
              <Sparkles className="h-4 w-4" /> Generate campaign
            </button>
          )}
        </div>
      </SectionCard>

      {/* ============= GENERATION PROGRESS ============= */}
      {reviewVisible && (
        <SectionCard
          title="Progress"
          className="mb-5"
          action={
            completedCount > 0 && !running ? (
              <div className="flex gap-1 text-xs">
                <button className="btn-ghost" onClick={approveAll}>
                  <Eye className="h-3 w-3" /> Approve all
                </button>
                <button className="btn-ghost" onClick={removeAll}>
                  <EyeOff className="h-3 w-3" /> Remove all
                </button>
              </div>
            ) : null
          }
        >
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              {completedCount} / {totalCount} complete
              {runningCount > 0 && (
                <span className="ml-2 text-brand-600 dark:text-brand-300">
                  ({runningCount} running)
                </span>
              )}
              {failedCount > 0 && (
                <span className="ml-2 text-rose-600 dark:text-rose-400">
                  · {failedCount} failed
                </span>
              )}
              {approvedCount > 0 && (
                <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                  · {approvedCount} approved
                </span>
              )}
            </span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-pink-500 transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </SectionCard>
      )}

      {/* ============= REVIEW ============= */}
      {reviewVisible &&
        GROUP_ORDER.filter((g) => tasksByGroup.has(g)).map((group) => (
          <SectionCard
            key={group}
            title={GROUP_LABELS[group]}
            className="mb-5"
          >
            <div className="space-y-4">
              {(tasksByGroup.get(group) ?? []).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onRegenerate={() => onRegenerate(task.id)}
                  onApprove={() => approve(task.id)}
                  onRemove={() => remove(task.id)}
                  onEdit={(text) => updateTask(task.id, { output: text })}
                  disabledRegen={running}
                />
              ))}
            </div>
          </SectionCard>
        ))}

      {/* ============= SAVE ============= */}
      {reviewVisible && (
        <div className="card sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 p-4 shadow-lg">
          <div className="text-sm">
            {approvedCount > 0 ? (
              <>
                <strong>{approvedCount}</strong> approved asset
                {approvedCount === 1 ? "" : "s"} ready to save.
                {failedCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" /> {failedCount}{" "}
                    failed — regenerate or proceed.
                  </span>
                )}
              </>
            ) : running ? (
              "Generating…"
            ) : completedCount > 0 ? (
              <span className="text-slate-500">
                No assets approved yet. Click <strong>Approve</strong> on the ones you want to ship.
              </span>
            ) : (
              <span className="text-slate-500">No assets succeeded yet.</span>
            )}
          </div>
          <button
            className="btn-primary"
            disabled={!canSave}
            onClick={onSaveCampaign}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" /> Save campaign &amp; track
                <ExternalLink className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}

// =====================================================================
// TaskCard subcomponent
// =====================================================================

function TaskCard({
  task,
  onRegenerate,
  onApprove,
  onRemove,
  onEdit,
  disabledRegen,
}: {
  task: TaskState;
  onRegenerate: () => void;
  onApprove: () => void;
  onRemove: () => void;
  onEdit: (text: string) => void;
  disabledRegen: boolean;
}) {
  const id = useId();
  const isRemovedSuccess = task.status === "succeeded" && !task.approved;
  return (
    <div
      className={`rounded-lg border p-3 transition ${
        task.status === "failed"
          ? "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/30"
          : isRemovedSuccess
            ? "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-900/60"
            : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <StatusIcon status={task.status} approved={task.approved} />
          {task.label}
          {task.ms !== undefined && (
            <span className="text-[10px] text-slate-400">{task.ms}ms</span>
          )}
        </label>
        <div className="flex items-center gap-1">
          <Badge tone={statusTone(task)}>
            {task.status === "succeeded"
              ? task.approved
                ? "Approved"
                : "Removed"
              : STATUS_LABEL[task.status]}
          </Badge>
          {task.status === "succeeded" &&
            (task.approved ? (
              <button
                className="btn-ghost h-7 px-2 text-xs"
                onClick={onRemove}
                title="Exclude from save"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            ) : (
              <button
                className="btn-ghost h-7 px-2 text-xs"
                onClick={onApprove}
                title="Include in save"
              >
                <Check className="h-3 w-3" /> Approve
              </button>
            ))}
          {(task.status === "succeeded" ||
            task.status === "failed" ||
            task.status === "aborted") && (
            <button
              className="btn-ghost h-7 px-2 text-xs"
              onClick={onRegenerate}
              disabled={disabledRegen}
              aria-label={`Regenerate ${task.label}`}
            >
              <RotateCw className="h-3 w-3" /> Regenerate
            </button>
          )}
        </div>
      </div>
      {task.error && (
        <p className="mb-2 rounded border border-rose-200 bg-white p-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-200">
          {task.error}
        </p>
      )}
      {task.status === "succeeded" && (
        <>
          <textarea
            id={id}
            className="min-h-[140px] w-full resize-y rounded-md border border-slate-200 bg-white p-2.5 font-mono text-[12px] leading-relaxed text-slate-800 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={task.output}
            onChange={(e) => onEdit(e.target.value)}
          />
          <div className="mt-1 text-[10px] text-slate-400">
            {wordCount(task.output)} words · edits autosave to this draft
          </div>
        </>
      )}
      {task.status === "running" && (
        <div className="space-y-1.5">
          <div className="shimmer h-2.5 w-3/4 rounded" />
          <div className="shimmer h-2.5 w-5/6 rounded" />
          <div className="shimmer h-2.5 w-2/3 rounded" />
        </div>
      )}
      {task.status === "pending" && (
        <p className="text-xs text-slate-400">Queued — waiting for a worker.</p>
      )}
    </div>
  );
}

function StatusIcon({
  status,
  approved,
}: {
  status: TaskStatus;
  approved: boolean;
}) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-brand-500" />;
    case "succeeded":
      return approved ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <EyeOff className="h-4 w-4 text-slate-400" />
      );
    case "failed":
      return <XCircle className="h-4 w-4 text-rose-500" />;
    case "aborted":
      return <XCircle className="h-4 w-4 text-slate-400" />;
    default:
      return (
        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
      );
  }
}

function statusTone(
  t: TaskState
): "default" | "info" | "success" | "warn" | "danger" {
  if (t.status === "succeeded") return t.approved ? "success" : "default";
  if (t.status === "failed") return "danger";
  if (t.status === "running") return "info";
  if (t.status === "aborted") return "warn";
  return "default";
}
