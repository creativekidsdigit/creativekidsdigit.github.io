// Exporter registry. The single source of truth for "what can the app
// emit out the side?" UI code reads this list to render Export menus and
// trigger downloads; new formats slot in by adding one file under this
// directory and one line below.

import { assetTextExporter } from "./assetText";
import { campaignZipExporter } from "./campaignZip";
import { productZipExporter } from "./productZip";
import type { Exporter, ExportScope } from "./types";

export const EXPORTERS: readonly Exporter[] = [
  assetTextExporter,
  productZipExporter,
  campaignZipExporter,
] as const;

export function getExporter(id: string): Exporter | undefined {
  return EXPORTERS.find((e) => e.id === id);
}

export function getExportersForScope(scope: ExportScope): readonly Exporter[] {
  return EXPORTERS.filter((e) => e.scope === scope);
}

export type {
  Exporter,
  ExporterContext,
  ExportPreview,
  ExportScope,
} from "./types";
