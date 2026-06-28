import { useId, useMemo, useState } from "react";
import { Loader2, Upload, FileText, AlertTriangle, CheckCircle2, SkipForward } from "lucide-react";
import Modal from "./Modal";
import { Badge } from "./ui";
import { toast } from "./Toast";
import { useAppStore } from "@/store/useAppStore";
import {
  getImportersForScope,
  type Importer,
  type ImporterSetup,
  type ImportContext,
  type ImportPreview,
  type MappableField,
} from "@/lib/importers";
import { MAPPABLE_FIELDS, FIELD_LABEL } from "@/lib/importers/types";
import type { PerformanceSnapshot } from "@/types";

/**
 * Import wizard for campaign performance data.
 *
 * Three phases:
 *   1. "pick"    — choose importer + select file
 *   2. "map"     — review/adjust the column → metric mapping
 *   3. "preview" — see per-row outcomes, commit
 *
 * The modal is intentionally registry-driven: it never branches on
 * importer id. Adding a Pinterest- or Payhip-specific importer later
 * is one new file in lib/importers/ — this component does not change.
 */
export default function ImportDataModal({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context: ImportContext;
}) {
  const importers = useMemo(() => getImportersForScope("campaign"), []);
  const addPerformance = useAppStore((s) => s.addPerformance);

  const [importerId, setImporterId] = useState<string>(
    importers[0]?.id ?? ""
  );
  const [phase, setPhase] = useState<"pick" | "map" | "preview">("pick");
  const [fileName, setFileName] = useState<string>("");
  const [setup, setSetup] = useState<ImporterSetup | null>(null);
  const [mapping, setMapping] = useState<Record<string, MappableField>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [includeSkipped, setIncludeSkipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputId = useId();
  const includeSkippedId = useId();

  const importer: Importer | undefined = useMemo(
    () => importers.find((i) => i.id === importerId),
    [importers, importerId]
  );

  function reset() {
    setPhase("pick");
    setFileName("");
    setSetup(null);
    setMapping({});
    setPreview(null);
    setIncludeSkipped(false);
    setBusy(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!f || !importer) return;
    // Light client-side validation that the extension is one this
    // importer claims to accept. We don't enforce — text/csv files
    // are sometimes mislabeled — but we surface a hint.
    const dot = f.name.lastIndexOf(".");
    const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : "";
    if (ext && !importer.accept.includes(ext)) {
      setError(
        `"${ext}" isn't a typical ${importer.label} extension. We'll try anyway.`
      );
    } else {
      setError(null);
    }
    setBusy(true);
    setFileName(f.name);
    try {
      const text = await f.text();
      const s = await importer.inspect(text);
      setSetup(s);
      setMapping({ ...s.suggestedMapping });
      setPhase("map");
    } catch (err) {
      setError((err as Error).message || "Could not read this file.");
      setFileName("");
    } finally {
      setBusy(false);
    }
  }

  async function runPreview() {
    if (!importer || !setup) return;
    setBusy(true);
    setError(null);
    try {
      const merged: ImporterSetup = { ...setup, suggestedMapping: mapping };
      const p = await importer.preview(merged, context);
      setPreview(p);
      setPhase("preview");
    } catch (err) {
      setError((err as Error).message || "Could not preview rows.");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    const toImport = preview.rows.filter(
      (r) => r.kind === "ok" || (includeSkipped && r.kind === "skip")
    );
    // Continue on per-row failure so one bad row doesn't strand the rest.
    // Each addPerformance is its own IDB transaction, so partial progress
    // is durably saved even if a later row fails. We collect failures and
    // surface them as a single summary at the end.
    let saved = 0;
    const failures: { date: string; reason: string }[] = [];
    for (const row of toImport) {
      if (row.kind === "error") continue;
      try {
        const draft: Partial<PerformanceSnapshot> = row.snapshot;
        await addPerformance(draft);
        saved++;
      } catch (err) {
        failures.push({
          date: row.snapshot.date,
          reason: (err as Error).message || "Unknown error",
        });
      }
    }
    setBusy(false);
    if (failures.length === 0) {
      toast.success(
        saved === 1 ? "Imported 1 snapshot" : `Imported ${saved} snapshots`
      );
      handleClose();
      return;
    }
    // Partial success: keep the modal open so the user can see what failed.
    toast.error(
      `Imported ${saved} of ${saved + failures.length}. ${failures.length} failed.`
    );
    const head = failures
      .slice(0, 5)
      .map((f) => `${f.date}: ${f.reason}`)
      .join("\n");
    const tail =
      failures.length > 5 ? `\n…and ${failures.length - 5} more` : "";
    setError(`Some rows could not be saved:\n${head}${tail}`);
  }

  // Detect mapping problems for the gate on the Preview button.
  const mappingIssues = useMemo(() => {
    const issues: string[] = [];
    const used = Object.values(mapping).filter((v) => v !== "ignore");
    if (!used.includes("date")) {
      issues.push("At least one column must map to 'Date'.");
    }
    const dup = used.filter((v, i) => used.indexOf(v) !== i);
    if (dup.length > 0) {
      issues.push(
        `Each metric can be mapped only once. Duplicate: ${[...new Set(dup)].join(", ")}.`
      );
    }
    return issues;
  }, [mapping]);

  if (!importer) {
    return (
      <Modal open={open} onClose={handleClose} title="Import data" size="md">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No importers are registered. This is a bug — please report it.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import performance data"
      size="xl"
    >
      <div className="space-y-4">
        {/* Sub-header: importer description */}
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {importer.description}
        </p>

        {/* Error / info banner */}
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ---------- Phase: pick ---------- */}
        {phase === "pick" && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/60">
            <input
              id={fileInputId}
              type="file"
              accept={importer.accept.join(",")}
              className="hidden"
              onChange={handleFile}
              disabled={busy}
            />
            <label
              htmlFor={fileInputId}
              className="btn-primary inline-flex cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Reading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" aria-hidden="true" /> Choose CSV file
                </>
              )}
            </label>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Accepts {importer.accept.join(", ")}. Files stay in your browser
              — nothing is uploaded.
            </p>
          </div>
        )}

        {/* ---------- Phase: map ---------- */}
        {phase === "map" && setup && (
          <>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-medium">{fileName}</span>
                <span className="text-slate-400">
                  · {setup.headers.length} columns
                </span>
              </span>
              <button
                type="button"
                className="text-slate-500 hover:underline"
                onClick={reset}
              >
                Choose different file
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Match each CSV column to one of this campaign's metrics. Mark
              columns you don't need as <em>Ignore</em>.
            </p>

            <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 font-medium">Column</th>
                    <th className="px-3 py-2 font-medium">Map to</th>
                    <th className="px-3 py-2 font-medium">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {setup.headers.map((h) => {
                    const sampleVal =
                      setup.sample.find((row) => row[h])?.[h] ?? "";
                    return (
                      <tr
                        key={h}
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                      >
                        <td className="px-3 py-1.5 font-mono">{h}</td>
                        <td className="px-3 py-1.5">
                          <select
                            className="input h-8 w-full text-xs"
                            value={mapping[h] ?? "ignore"}
                            onChange={(e) =>
                              setMapping({
                                ...mapping,
                                [h]: e.target.value as MappableField,
                              })
                            }
                          >
                            {MAPPABLE_FIELDS.map((f) => (
                              <option key={f} value={f}>
                                {FIELD_LABEL[f]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5 max-w-[20ch] truncate text-slate-500">
                          {sampleVal || (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {mappingIssues.length > 0 && (
              <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {mappingIssues.map((m) => (
                  <li key={m} className="flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={runPreview}
                disabled={busy || mappingIssues.length > 0}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Previewing…
                  </>
                ) : (
                  <>Preview {setup.sample.length > 0 ? "rows" : "import"}</>
                )}
              </button>
            </div>
          </>
        )}

        {/* ---------- Phase: preview ---------- */}
        {phase === "preview" && preview && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" /> {preview.okCount} ready
              </Badge>
              {preview.skipCount > 0 && (
                <Badge tone="warn">
                  <SkipForward className="h-3 w-3" /> {preview.skipCount}{" "}
                  duplicate
                </Badge>
              )}
              {preview.errorCount > 0 && (
                <Badge tone="danger">
                  <AlertTriangle className="h-3 w-3" /> {preview.errorCount}{" "}
                  error
                </Badge>
              )}
              <span className="ml-auto text-slate-500">
                from {fileName}
              </span>
            </div>

            <div className="max-h-80 overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 text-right font-medium">Impr</th>
                    <th className="px-3 py-2 text-right font-medium">Clicks</th>
                    <th className="px-3 py-2 text-right font-medium">Sales</th>
                    <th className="px-3 py-2 text-right font-medium">Revenue</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, idx) => {
                    if (row.kind === "error") {
                      return (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 bg-rose-50/40 last:border-0 dark:border-slate-800 dark:bg-rose-900/10"
                        >
                          <td className="px-3 py-1.5 text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1.5">
                            <Badge tone="danger">error</Badge>
                          </td>
                          <td className="px-3 py-1.5" colSpan={6}>
                            {row.reason}
                          </td>
                        </tr>
                      );
                    }
                    const s = row.snapshot;
                    return (
                      <tr
                        key={idx}
                        className={
                          row.kind === "skip"
                            ? "border-b border-slate-100 bg-amber-50/40 last:border-0 dark:border-slate-800 dark:bg-amber-900/10"
                            : "border-b border-slate-100 last:border-0 dark:border-slate-800"
                        }
                        title={row.kind === "skip" ? row.reason : undefined}
                      >
                        <td className="px-3 py-1.5 text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-1.5">
                          {row.kind === "ok" ? (
                            <Badge tone="success">ready</Badge>
                          ) : (
                            <Badge tone="warn">duplicate</Badge>
                          )}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums">{s.date}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {s.impressions.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {s.clicks.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {s.sales}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {s.revenue.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 max-w-[24ch] truncate text-slate-500">
                          {s.notes || (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {preview.skipCount > 0 && (
              <label
                htmlFor={includeSkippedId}
                className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
              >
                <input
                  id={includeSkippedId}
                  type="checkbox"
                  checked={includeSkipped}
                  onChange={(e) => setIncludeSkipped(e.target.checked)}
                />
                Also import duplicates ({preview.skipCount}). Snapshots are
                summed over time, so doing this may double-count.
              </label>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPhase("map")}
                disabled={busy}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={runImport}
                disabled={
                  busy ||
                  preview.okCount + (includeSkipped ? preview.skipCount : 0) ===
                    0
                }
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Importing…
                  </>
                ) : (
                  <>
                    Import{" "}
                    {preview.okCount +
                      (includeSkipped ? preview.skipCount : 0)}{" "}
                    snapshot
                    {preview.okCount +
                      (includeSkipped ? preview.skipCount : 0) ===
                    1
                      ? ""
                      : "s"}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
