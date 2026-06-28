// Pure helpers for the Settings → Import Backup flow.
//
// Why separate from useAppStore.importAll? The store action does IO
// (storage.set + hydrate). The helpers below are pure and therefore
// straightforward to smoke-test without any DOM, IDB, or Zustand setup.
//
// The store action calls these to produce the same answers; tests cover
// the logic, the store action just stitches them together with storage.

/**
 * Validate the top-level shape and version of a parsed backup object.
 *
 * The exporter writes `{ version: 1, ... }`. A future v2 exporter would
 * write `{ version: 2, ... }` — and an older app trying to import that
 * would silently truncate any new fields without warning. This guard
 * surfaces the mismatch instead of letting it become silent data loss.
 *
 * Returns `{ ok: true, version }` on success. Returns
 * `{ ok: false, error }` with a user-facing message on failure.
 */
export function validateBackupHeader(data: unknown):
  | { ok: true; version: number }
  | { ok: false; error: string; version?: number } {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "Backup file shape is unexpected." };
  }
  const obj = data as Record<string, unknown>;
  const version = typeof obj.version === "number" && Number.isFinite(obj.version)
    ? obj.version
    : 1;
  if (version > 1) {
    return {
      ok: false,
      version,
      error: `Backup format v${version} is newer than this app supports (v1). Update the app and try again.`,
    };
  }
  if (version < 1) {
    return {
      ok: false,
      version,
      error: `Backup format v${version} is not recognized.`,
    };
  }
  return { ok: true, version };
}

/**
 * Pass a raw backup slice through its sanitizer and report how many
 * entries were kept versus silently dropped.
 *
 * - `raw === undefined` → slice was absent from the backup; not an error,
 *   `droppedCount = 0`.
 * - `raw` is an array → `droppedCount = raw.length - kept.length`.
 * - `raw` is some other shape → the sanitizer returns `[]` and we count
 *   this as 1 drop so the user sees "1 slice was malformed."
 *
 * This is the lens through which Import surfaces partial corruption.
 * Previously sanitizers silently filtered bad rows; this counts them.
 */
export function summarizeImportSlice<T>(
  raw: unknown,
  sanitize: (v: unknown) => T[]
): { kept: T[]; droppedCount: number } {
  if (raw === undefined) {
    return { kept: [], droppedCount: 0 };
  }
  const kept = sanitize(raw);
  if (Array.isArray(raw)) {
    const dropped = Math.max(0, raw.length - kept.length);
    return { kept, droppedCount: dropped };
  }
  // The slice was present but the wrong shape entirely.
  return { kept, droppedCount: 1 };
}

/**
 * Map of slice name → number for the user-facing import summary.
 * The store's `importAll` returns this so callers can show a precise
 * "imported X products, dropped Y" message instead of a generic "done."
 */
export interface ImportSummary {
  imported: Partial<Record<string, number>>;
  dropped: Partial<Record<string, number>>;
}

/** Total number of dropped entries across every slice. */
export function totalDropped(summary: ImportSummary): number {
  return Object.values(summary.dropped).reduce<number>(
    (sum, n) => sum + (n ?? 0),
    0
  );
}

/**
 * Render a human-readable "5 products, 2 campaigns" list of the slices
 * that had drops. Returns an empty string when nothing was dropped.
 */
export function formatDroppedBreakdown(summary: ImportSummary): string {
  const parts: string[] = [];
  for (const [name, n] of Object.entries(summary.dropped)) {
    if (n && n > 0) parts.push(`${n} ${name}`);
  }
  return parts.join(", ");
}
