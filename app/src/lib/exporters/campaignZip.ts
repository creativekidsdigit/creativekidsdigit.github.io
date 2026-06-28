// Campaign Bundle (ZIP) — the primary exporter.
//
// Produces a single .zip with every approved campaign asset, each in the
// shape its target platform actually wants (HTML for blog/Payhip, plain
// text for social/email/Pinterest, markdown for SEO reference docs), plus:
//   - README.md          The existing campaignSummary report
//   - manifest.json      Machine-readable metadata (campaign + products
//                        + per-asset format / file / tags / publishedAt)
//
// The exporter does NOT define its own formatters — it composes
// `lib/formatters.ts` and `lib/reports.ts`. Adding another format means
// extending those primitives, not branching here.

import { createZip, type ZipEntryInput } from "../zip";
import { format, type FormatId } from "../formatters";
import { campaignSummary } from "../reports";
import { slugify } from "../util";
import type { ContentItem, ContentKind } from "@/types";
import type { Exporter, ExporterContext } from "./types";

/**
 * What folder + extension + format does each kind of asset belong in?
 *
 * The choice is "what target platform will the user paste this into?":
 *   - Blog → HTML (WordPress / Substack / Ghost rich editors)
 *   - Payhip Sales Page → HTML (Payhip's rich editor)
 *   - SEO reference docs → markdown (the user reads them in a text editor)
 *   - Pinterest / Email / Social / Product copy → plain text (clipboard-paste)
 *   - Funnel docs → markdown (reference)
 *   - Other → markdown (safe default)
 */
function fileFormatFor(asset: ContentItem): {
  folder: string;
  ext: string;
  format: FormatId;
} {
  const titleLower = asset.title.toLowerCase();
  if (titleLower.includes("payhip sales page")) {
    return { folder: "product", ext: "html", format: "html" };
  }
  if (titleLower.includes("shopify description")) {
    return { folder: "product", ext: "html", format: "html" };
  }
  switch (asset.kind) {
    case "blog":
      return { folder: "blog", ext: "html", format: "html" };
    case "seo":
      return { folder: "seo", ext: "md", format: "markdown" };
    case "pinterest":
      return { folder: "pinterest", ext: "txt", format: "plain" };
    case "email":
      return { folder: "email", ext: "txt", format: "plain" };
    case "social":
      return { folder: "social", ext: "txt", format: "plain" };
    case "copy":
      return { folder: "product", ext: "txt", format: "plain" };
    case "funnel":
      return { folder: "funnel", ext: "md", format: "markdown" };
    default:
      return { folder: "other", ext: "md", format: "markdown" };
  }
}

/**
 * Strip the "Product · " prefix that the Campaign Builder bakes into asset
 * titles, leaving just the task label for cleaner filenames. Falls back to
 * the full title for manually-saved content that doesn't have the prefix.
 */
function assetFilenameBase(title: string, fallback: string): string {
  // The Builder uses " · " (with non-breaking-ish spaces around a middot)
  // as the separator. Split on the LAST occurrence so e.g. "A · B · C"
  // becomes "C".
  const sep = " · ";
  const last = title.lastIndexOf(sep);
  const raw = last >= 0 ? title.slice(last + sep.length) : title;
  return slugify(raw) || fallback;
}

interface ManifestAsset {
  id: string;
  kind: ContentKind;
  title: string;
  templateId: string;
  tags: string[];
  publishedAt: number | null;
  /** Relative to the archive root. */
  file: string;
  format: FormatId;
}

interface Manifest {
  schema: 1;
  exportedAt: string;
  campaign: {
    id: string;
    name: string;
    platform: string;
    goal: string;
    startDate: string;
    endDate?: string;
    status: string;
    tags: string[];
    notes: string;
  };
  products: {
    id: string;
    title: string;
    category: string;
    audience: string;
    problemSolved: string;
  }[];
  assets: ManifestAsset[];
}

/**
 * Build the in-memory file tree for a campaign bundle. Pure function —
 * no IO, deterministic output for a given context. Exported separately
 * for unit testing.
 */
export function buildCampaignZipEntries(
  ctx: ExporterContext & { campaign: NonNullable<ExporterContext["campaign"]> }
): ZipEntryInput[] {
  const root = slugify(ctx.campaign.name) || "campaign";
  const entries: ZipEntryInput[] = [];

  // 1. README — reuses the existing campaignSummary markdown generator.
  entries.push({
    path: `${root}/README.md`,
    data: campaignSummary(ctx.campaign, ctx.snapshots, ctx.products),
  });

  // 2. Assets, grouped by their target folder and numbered for filesystem
  //    sort order. We process in createdAt-asc order so each folder reads
  //    top-down in the original generation sequence.
  const sortedAssets = [...ctx.assets].sort(
    (a, b) => a.createdAt - b.createdAt
  );
  const perFolderCount = new Map<string, number>();
  const manifestAssets: ManifestAsset[] = [];

  for (const asset of sortedAssets) {
    const ff = fileFormatFor(asset);
    const nextIdx = (perFolderCount.get(ff.folder) ?? 0) + 1;
    perFolderCount.set(ff.folder, nextIdx);

    const seq = String(nextIdx).padStart(2, "0");
    const base = assetFilenameBase(asset.title, `asset-${seq}`);
    const relPath = `${ff.folder}/${seq}-${base}.${ff.ext}`;
    const path = `${root}/${relPath}`;

    entries.push({
      path,
      data: format(asset.body, ff.format),
    });

    manifestAssets.push({
      id: asset.id,
      kind: asset.kind,
      title: asset.title,
      templateId: asset.templateId,
      tags: [...asset.tags],
      publishedAt: asset.publishedAt ?? null,
      file: relPath,
      format: ff.format,
    });
  }

  // 3. Manifest JSON — schema=1 so a future re-importer knows the shape.
  const linkedProducts = ctx.products.filter((p) =>
    ctx.campaign.productIds.includes(p.id)
  );
  const manifest: Manifest = {
    schema: 1,
    exportedAt: new Date().toISOString(),
    campaign: {
      id: ctx.campaign.id,
      name: ctx.campaign.name,
      platform: ctx.campaign.platform,
      goal: ctx.campaign.goal,
      startDate: ctx.campaign.startDate,
      endDate: ctx.campaign.endDate,
      status: ctx.campaign.status,
      tags: [...ctx.campaign.tags],
      notes: ctx.campaign.notes,
    },
    products: linkedProducts.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      audience: p.audience,
      problemSolved: p.problemSolved,
    })),
    assets: manifestAssets,
  };
  entries.push({
    path: `${root}/manifest.json`,
    data: JSON.stringify(manifest, null, 2),
  });

  return entries;
}

export const campaignZipExporter: Exporter = {
  id: "campaign-zip",
  label: "Campaign bundle (.zip)",
  scope: "campaign",
  description:
    "Every asset, formatted for its target platform, plus a README and machine-readable manifest.",
  mime: "application/zip",
  filenameFor: (ctx) =>
    `${slugify(ctx.campaign?.name ?? "campaign") || "campaign"}.zip`,
  async preview(ctx) {
    if (!ctx.campaign) throw new Error("campaign-zip: campaign is required");
    const entries = buildCampaignZipEntries(
      ctx as ExporterContext & { campaign: NonNullable<typeof ctx.campaign> }
    );
    return summarizeEntries(entries);
  },
  async produce(ctx) {
    if (!ctx.campaign) throw new Error("campaign-zip: campaign is required");
    const entries = buildCampaignZipEntries(
      ctx as ExporterContext & { campaign: NonNullable<typeof ctx.campaign> }
    );
    const bytes = createZip(entries);
    return new Blob([bytes as BlobPart], { type: "application/zip" });
  },
};

/**
 * Shared preview summary used by ZIP-style exporters.
 * Computes per-entry size in bytes (UTF-8) and the human-readable total.
 */
export function summarizeEntries(
  entries: readonly ZipEntryInput[]
): { entries: { path: string; size: number }[]; totalSize: number; summary: string } {
  const enc = new TextEncoder();
  const sized = entries.map((e) => ({
    path: e.path,
    size: typeof e.data === "string" ? enc.encode(e.data).length : e.data.length,
  }));
  const total = sized.reduce((s, e) => s + e.size, 0);
  return {
    entries: sized,
    totalSize: total,
    summary: `${sized.length} file${sized.length === 1 ? "" : "s"} \u00b7 ${formatBytes(total)}`,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
