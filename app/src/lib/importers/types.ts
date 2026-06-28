// Importer contract for the Analytics Import MVP.
//
// Mirrors the Exporter pattern shipped in PR #60 so the codebase has
// one mental model for "things that move data across the boundary."
// Each importer is a small file that knows how to turn a raw input
// (today: a CSV file) into a list of PerformanceSnapshot drafts for
// a single campaign. The UI never branches on importer type — it
// reads the registry and renders applicable buttons.

import type { PerformanceSnapshot } from "@/types";

/**
 * The only scope today: imports always target one campaign at a time.
 * Future scopes (e.g. "import for all campaigns in a workspace") can be
 * added without changing this contract — they just add a new value to
 * the union.
 */
export type ImportScope = "campaign";

/**
 * Where the importer is being invoked. Today: always a campaign id
 * because the only entry point is the Campaign Detail page.
 */
export interface ImportContext {
  campaignId: string;
  /** Existing snapshots for this campaign — used for duplicate detection. */
  existingSnapshots: PerformanceSnapshot[];
}

/**
 * Per-row outcome the user sees in the preview modal before committing.
 *
 * `kind = "ok"`     row parsed cleanly, ready to save
 * `kind = "skip"`   row is a duplicate (same campaign + date) of an
 *                   existing snapshot; preselected to skip
 * `kind = "error"`  row is invalid (missing date, no metric mapped, etc.)
 *                   shown so the user can fix the source and re-import
 */
export type ImportRowOutcome =
  | { kind: "ok"; snapshot: Omit<PerformanceSnapshot, "id" | "createdAt" | "updatedAt"> }
  | { kind: "skip"; snapshot: Omit<PerformanceSnapshot, "id" | "createdAt" | "updatedAt">; reason: string }
  | { kind: "error"; reason: string; rawRow: Record<string, string> };

export interface ImportPreview {
  /** Per-row outcomes in the same order as the input file. */
  rows: ImportRowOutcome[];
  /** Counts the modal renders as a summary line. */
  okCount: number;
  skipCount: number;
  errorCount: number;
}

export interface Importer {
  /** Stable identifier — used for registry lookup. */
  id: string;
  /** Human-readable label shown in the picker. */
  label: string;
  /** One-sentence description shown in the modal sub-header. */
  description: string;
  scope: ImportScope;
  /** Accepted file extensions, lowercase with a leading dot (e.g. ".csv"). */
  accept: string[];
  /**
   * Inspect the file BEFORE asking the user to commit. Returns a
   * `setup` payload the UI uses to render a column-mapping table.
   * Strongly typed per-importer via the generic parameter; callers
   * treat it as `unknown` until they pass it back to `commit()`.
   */
  inspect(fileText: string): Promise<ImporterSetup>;
  /**
   * Run the importer's logic with the user-confirmed setup and
   * produce a row-by-row preview. The UI shows this preview and lets
   * the user save the OK rows in one batch.
   */
  preview(
    setup: ImporterSetup,
    ctx: ImportContext
  ): Promise<ImportPreview>;
}

/**
 * Opaque shape returned by `inspect()` — each importer carries the
 * info it needs to render its mapping UI. The UI reads `headers` and
 * `suggestedMapping` to populate the column-mapping table; everything
 * else is implementation-private state.
 */
export interface ImporterSetup {
  /** Header columns detected in the file. */
  headers: string[];
  /** Importer's first-pass guess at how each header maps to a metric. */
  suggestedMapping: Record<string, MappableField>;
  /** Sample rows for the UI to display. */
  sample: Record<string, string>[];
  /** Whatever else the importer needs to remember for `preview()`. */
  raw: unknown;
}

/**
 * Fields the user can map a CSV column to. This is a closed set that
 * matches the existing PerformanceSnapshot model — the steering said
 * "reuse existing analytics models." Anything not in this list is
 * available as "(ignore)".
 */
export type MappableField =
  | "ignore"
  | "date"
  | "impressions"
  | "clicks"
  | "saves"
  | "shares"
  | "comments"
  | "emailOpens"
  | "emailClicks"
  | "websiteVisits"
  | "productPageVisits"
  | "sales"
  | "revenue"
  | "cost"
  | "notes";

export const MAPPABLE_FIELDS: MappableField[] = [
  "ignore",
  "date",
  "impressions",
  "clicks",
  "saves",
  "shares",
  "comments",
  "emailOpens",
  "emailClicks",
  "websiteVisits",
  "productPageVisits",
  "sales",
  "revenue",
  "cost",
  "notes",
];

export const FIELD_LABEL: Record<MappableField, string> = {
  ignore: "— Ignore this column —",
  date: "Date (required)",
  impressions: "Impressions",
  clicks: "Clicks",
  saves: "Saves / pins",
  shares: "Shares",
  comments: "Comments",
  emailOpens: "Email opens",
  emailClicks: "Email clicks",
  websiteVisits: "Website visits",
  productPageVisits: "Product page visits",
  sales: "Sales (orders)",
  revenue: "Revenue",
  cost: "Cost / spend",
  notes: "Notes",
};
