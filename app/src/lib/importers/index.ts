// Importer registry. Single source of truth for "where can data come from?"
//
// Adding a new platform-specific importer (Pinterest, Payhip, ConvertKit,
// GA) is one new file under this directory + one entry below. The UI
// reads `getImportersForScope("campaign")` to render its picker — it
// never branches on importer id.

import { genericCsvImporter } from "./genericCsv";
import type { Importer, ImportScope } from "./types";

export const IMPORTERS: readonly Importer[] = [
  genericCsvImporter,
] as const;

export function getImportersForScope(
  scope: ImportScope
): readonly Importer[] {
  return IMPORTERS.filter((i) => i.scope === scope);
}

export function getImporter(id: string): Importer | undefined {
  return IMPORTERS.find((i) => i.id === id);
}

export type {
  Importer,
  ImportContext,
  ImportPreview,
  ImportRowOutcome,
  ImportScope,
  ImporterSetup,
  MappableField,
} from "./types";
export { MAPPABLE_FIELDS, FIELD_LABEL } from "./types";
