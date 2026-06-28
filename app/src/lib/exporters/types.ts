// Exporter contract.
//
// Each exporter implements one common interface. The registry in `./index.ts`
// collects them and the UI selects applicable exporters by `scope`. Adding
// a new format (PDF, CSV, ConvertKit-shaped) is exactly: one new file under
// this directory, one line in the registry, zero UI changes.
//
// The interface deliberately does NOT mention any AI provider, store action,
// or storage key. Exporters are pure functions over a context object the UI
// hands them.

import type {
  Campaign,
  ContentItem,
  PerformanceSnapshot,
  Product,
} from "@/types";

/** Three scopes the UI currently exposes — each maps to a page surface. */
export type ExportScope = "asset" | "product" | "campaign";

/**
 * Single context shape, with optional fields per scope.
 *
 * Asset-scope exporters use `asset` (and optionally `product`/`campaign`).
 * Product-scope exporters use `product` + `assets`.
 * Campaign-scope exporters use `campaign` + `assets` + `products` + `snapshots`.
 *
 * The shape is intentionally unified rather than discriminated. The trade-off
 * is small runtime nullability checks inside exporters; the benefit is one
 * stable signature that the UI doesn't have to branch on.
 *
 * Filtering (e.g. "only approved", "only Pinterest assets") is applied by
 * the calling UI BEFORE the context is built. The exporter sees only what
 * the user chose to include.
 */
export interface ExporterContext {
  asset?: ContentItem;
  product?: Product;
  campaign?: Campaign;
  /** Already-filtered list — the exporter exports exactly these. */
  assets: ContentItem[];
  /** All products in the workspace; the exporter picks what it needs. */
  products: Product[];
  /** Only meaningful for campaign-scope exporters that emit a summary. */
  snapshots: PerformanceSnapshot[];
}

/**
 * Result of an exporter's optional `preview()` call. Lets the UI show the
 * user what will end up in the file before they commit. Pure-data only —
 * no Blob, no IO, no side effects.
 */
export interface ExportPreview {
  /** One row per file the export will contain. */
  entries: { path: string; size: number }[];
  /** Sum of all entry sizes in bytes. */
  totalSize: number;
  /** Human-readable summary line. */
  summary: string;
}

export interface Exporter {
  /** Stable identifier; used for registry lookup. */
  id: string;
  /** Human-readable label for buttons. */
  label: string;
  /** One-line description shown in tooltips and the preview modal. */
  description: string;
  /** MIME type the exporter produces. */
  mime: string;
  /** Which UI surface this exporter applies to. */
  scope: ExportScope;
  /** Compute the suggested download filename (pure, sync, no Blob built). */
  filenameFor(ctx: ExporterContext): string;
  /**
   * Optional: enumerate what would end up in the output without producing
   * the blob. Implementations should be cheap to call repeatedly.
   */
  preview?(ctx: ExporterContext): Promise<ExportPreview>;
  /** Produce the final file as a Blob. */
  produce(ctx: ExporterContext): Promise<Blob>;
}
