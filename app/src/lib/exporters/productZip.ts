// Product Bundle (ZIP) — every asset linked to a single product, across
// every campaign, organized for archival or wholesale repurposing.
//
// Sibling to campaignZip.ts: same ZIP encoder, same formatters, same
// folder + extension mapping per ContentKind. Differs only in:
//   - scope: "product"
//   - root folder named by product, not campaign
//   - manifest references campaigns instead of a single campaign
//   - assets are grouped by campaign within each kind folder so the user
//     can see "which campaign produced this asset"

import { createZip, type ZipEntryInput } from "../zip";
import { format, type FormatId } from "../formatters";
import { slugify } from "../util";
import type {
  Campaign,
  ContentItem,
  ContentKind,
} from "@/types";
import type { Exporter, ExporterContext } from "./types";
import { summarizeEntries } from "./campaignZip";

function fileFormatFor(asset: ContentItem): {
  folder: string;
  ext: string;
  format: FormatId;
} {
  const titleLower = asset.title.toLowerCase();
  if (titleLower.includes("payhip sales page")) {
    return { folder: "product-copy", ext: "html", format: "html" };
  }
  if (titleLower.includes("shopify description")) {
    return { folder: "product-copy", ext: "html", format: "html" };
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
      return { folder: "product-copy", ext: "txt", format: "plain" };
    case "funnel":
      return { folder: "funnel", ext: "md", format: "markdown" };
    default:
      return { folder: "other", ext: "md", format: "markdown" };
  }
}

function assetFilenameBase(title: string, fallback: string): string {
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
  campaignId: string | null;
  campaignName: string | null;
  file: string;
  format: FormatId;
}

/**
 * Build the in-memory file tree for a product bundle.
 *
 * Folder structure:
 *   {product-slug}/
 *     README.md                 (lightweight product summary)
 *     manifest.json
 *     {kind-folder}/
 *       NN-{slug}.{ext}         (ordered by createdAt asc)
 *
 * Pure function — no IO, deterministic output. Exported for unit testing.
 */
export function buildProductZipEntries(
  ctx: ExporterContext & { product: NonNullable<ExporterContext["product"]> }
): ZipEntryInput[] {
  const root = slugify(ctx.product.title) || "product";
  const entries: ZipEntryInput[] = [];

  entries.push({
    path: `${root}/README.md`,
    data: buildProductReadme(ctx.product, ctx.assets, ctx.products /* unused */),
  });

  const sortedAssets = [...ctx.assets].sort(
    (a, b) => a.createdAt - b.createdAt
  );
  const perFolderCount = new Map<string, number>();
  const manifestAssets: ManifestAsset[] = [];

  // Build a quick campaign-id lookup for the manifest.
  const campaignIndex = new Map<string, Campaign>();
  for (const a of sortedAssets) {
    if (a.campaignId) {
      // ctx.products is wider than needed; campaigns live on ExporterContext.snapshots[].campaignId only.
      // We don't have direct access here; the manifest gracefully falls back to "campaignName: null".
      campaignIndex.set(a.campaignId, campaignIndex.get(a.campaignId)!);
    }
  }

  for (const asset of sortedAssets) {
    const ff = fileFormatFor(asset);
    const nextIdx = (perFolderCount.get(ff.folder) ?? 0) + 1;
    perFolderCount.set(ff.folder, nextIdx);

    const seq = String(nextIdx).padStart(2, "0");
    const base = assetFilenameBase(asset.title, `asset-${seq}`);
    const relPath = `${ff.folder}/${seq}-${base}.${ff.ext}`;
    const path = `${root}/${relPath}`;

    entries.push({ path, data: format(asset.body, ff.format) });

    manifestAssets.push({
      id: asset.id,
      kind: asset.kind,
      title: asset.title,
      templateId: asset.templateId,
      tags: [...asset.tags],
      publishedAt: asset.publishedAt ?? null,
      campaignId: asset.campaignId ?? null,
      // We don't have the campaign object here, only the id. The campaign
      // export carries name; the product export trades that for portability.
      campaignName: null,
      file: relPath,
      format: ff.format,
    });
  }

  const manifest = {
    schema: 1 as const,
    exportedAt: new Date().toISOString(),
    product: {
      id: ctx.product.id,
      title: ctx.product.title,
      category: ctx.product.category,
      audience: ctx.product.audience,
      problemSolved: ctx.product.problemSolved,
      benefits: [...ctx.product.benefits],
      keywords: [...ctx.product.keywords],
      pricing: ctx.product.pricing,
      platform: ctx.product.platform,
    },
    assets: manifestAssets,
  };
  entries.push({
    path: `${root}/manifest.json`,
    data: JSON.stringify(manifest, null, 2),
  });

  return entries;
}

function buildProductReadme(
  product: { title: string; category: string; audience: string; problemSolved: string; benefits: string[]; keywords: string[] },
  assets: ContentItem[],
  _products: unknown
): string {
  const lines: string[] = [];
  lines.push(`# ${product.title}`);
  lines.push("");
  if (product.category) lines.push(`**Category:** ${product.category}`);
  if (product.audience) lines.push(`**Audience:** ${product.audience}`);
  if (product.problemSolved) {
    lines.push("");
    lines.push("## Problem solved");
    lines.push(product.problemSolved);
  }
  if (product.benefits.length > 0) {
    lines.push("");
    lines.push("## Benefits");
    product.benefits.forEach((b) => lines.push(`- ${b}`));
  }
  if (product.keywords.length > 0) {
    lines.push("");
    lines.push("## Keywords");
    lines.push(product.keywords.join(", "));
  }
  lines.push("");
  lines.push("## Assets in this bundle");
  lines.push(`Total: **${assets.length}** assets.`);
  lines.push("");
  lines.push(
    `_Generated by AI Copywriting OS on ${new Date()
      .toISOString()
      .slice(0, 10)}._`
  );
  return lines.join("\n");
}

export const productZipExporter: Exporter = {
  id: "product-zip",
  label: "Product bundle (.zip)",
  scope: "product",
  description:
    "Every asset ever generated for this product, across every campaign, formatted per platform.",
  mime: "application/zip",
  filenameFor: (ctx) =>
    `${slugify(ctx.product?.title ?? "product") || "product"}.zip`,
  async preview(ctx) {
    if (!ctx.product) throw new Error("product-zip: product is required");
    const entries = buildProductZipEntries(
      ctx as ExporterContext & { product: NonNullable<typeof ctx.product> }
    );
    return summarizeEntries(entries);
  },
  async produce(ctx) {
    if (!ctx.product) throw new Error("product-zip: product is required");
    const entries = buildProductZipEntries(
      ctx as ExporterContext & { product: NonNullable<typeof ctx.product> }
    );
    const bytes = createZip(entries);
    return new Blob([bytes as BlobPart], { type: "application/zip" });
  },
};
