// Single-asset text exporter.
//
// Exports one ContentItem as a text file in the user-chosen format
// (plain / markdown / html), driven by lib/formatters.ts. Used in the
// Content Library and Publishing Workspace via the shared ExportMenu.
//
// This exporter is small because it composes existing primitives:
// the format conversion lives in lib/formatters, the asset already
// has its body, so we only have to choose the extension and produce
// the blob.

import { format, type FormatId } from "../formatters";
import { slugify } from "../util";
import type { ContentKind } from "@/types";
import type { Exporter, ExporterContext } from "./types";
import { formatBytes } from "./campaignZip";

/**
 * Pick the default format for an asset based on its kind. Same heuristic
 * the ZIP exporters use, kept consistent so a user who exports a single
 * asset gets the same output they'd find inside the campaign bundle.
 */
export function defaultFormatFor(
  kind: ContentKind,
  title: string
): { ext: string; format: FormatId } {
  const titleLower = title.toLowerCase();
  if (titleLower.includes("payhip sales page")) return { ext: "html", format: "html" };
  if (titleLower.includes("shopify description")) return { ext: "html", format: "html" };
  switch (kind) {
    case "blog":
      return { ext: "html", format: "html" };
    case "seo":
      return { ext: "md", format: "markdown" };
    case "pinterest":
    case "email":
    case "social":
    case "copy":
      return { ext: "txt", format: "plain" };
    case "funnel":
      return { ext: "md", format: "markdown" };
    default:
      return { ext: "md", format: "markdown" };
  }
}

export const assetTextExporter: Exporter = {
  id: "asset-text",
  label: "This asset (text file)",
  scope: "asset",
  description:
    "Download a single asset in its platform-appropriate format (plain text, markdown, or HTML).",
  mime: "text/plain",
  filenameFor: (ctx) => {
    if (!ctx.asset) return "asset.txt";
    const { ext } = defaultFormatFor(ctx.asset.kind, ctx.asset.title);
    const base = slugify(ctx.asset.title) || "asset";
    return `${base}.${ext}`;
  },
  async preview(ctx) {
    if (!ctx.asset) throw new Error("asset-text: asset is required");
    const { ext, format: fmt } = defaultFormatFor(
      ctx.asset.kind,
      ctx.asset.title
    );
    const body = format(ctx.asset.body, fmt);
    const size = new TextEncoder().encode(body).length;
    const base = slugify(ctx.asset.title) || "asset";
    return {
      entries: [{ path: `${base}.${ext}`, size }],
      totalSize: size,
      summary: `1 file \u00b7 ${formatBytes(size)}`,
    };
  },
  async produce(ctx) {
    if (!ctx.asset) throw new Error("asset-text: asset is required");
    const { format: fmt } = defaultFormatFor(ctx.asset.kind, ctx.asset.title);
    const body = format(ctx.asset.body, fmt);
    return new Blob([body], { type: "text/plain;charset=utf-8" });
  },
};

/**
 * Convenience for the ExportMenu: produce just the text (for clipboard
 * copy) without going through Blob. Bypasses the Exporter interface
 * because clipboard semantics aren't part of the universal contract —
 * not every exporter (e.g. ZIP) has a sensible text-form output.
 */
export function assetAsText(
  asset: ExporterContext["asset"],
  fmt?: FormatId
): string {
  if (!asset) return "";
  const chosenFmt = fmt ?? defaultFormatFor(asset.kind, asset.title).format;
  return format(asset.body, chosenFmt);
}
