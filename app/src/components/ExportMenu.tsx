import { useEffect, useRef, useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { toast } from "./Toast";
import Modal from "./Modal";
import { downloadBlob } from "@/lib/util";
import {
  getExportersForScope,
  type ExportPreview,
  type Exporter,
  type ExporterContext,
  type ExportScope,
} from "@/lib/exporters";

/**
 * Shared export trigger.
 *
 * Renders one button per Exporter applicable to the given scope. Each
 * Exporter's `preview()` (if defined) is shown in a modal so the user can
 * see what will land in the file before committing.
 *
 * The UI is intentionally read-only over the registry: adding a new
 * format never touches this component.
 */
export default function ExportMenu({
  scope,
  context,
  label,
  variant = "secondary",
}: {
  scope: ExportScope;
  /** Lazy thunk — the heavy assets/products arrays are only read on click. */
  context: () => ExporterContext;
  /** Override the default trigger label (e.g. "Export campaign", "Download bundle"). */
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const exporters = getExportersForScope(scope);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<{
    exporter: Exporter;
    preview: ExportPreview;
    ctx: ExporterContext;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close the popover on outside click.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (exporters.length === 0) return null;

  async function runPreview(exporter: Exporter) {
    if (!exporter.preview) return;
    setBusyId(exporter.id);
    try {
      const ctx = context();
      const preview = await exporter.preview(ctx);
      setPreviewState({ exporter, preview, ctx });
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function runDownload(exporter: Exporter, ctxArg?: ExporterContext) {
    setBusyId(exporter.id);
    try {
      const ctx = ctxArg ?? context();
      const blob = await exporter.produce(ctx);
      const filename = exporter.filenameFor(ctx);
      downloadBlob(filename, blob);
      toast.success(`Downloaded ${filename}`);
      setOpen(false);
      setPreviewState(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  // Single-exporter case: skip the dropdown chrome and render a direct button.
  if (exporters.length === 1) {
    const exporter = exporters[0];
    return (
      <>
        <div className="inline-flex items-center gap-1">
          <button
            className={
              variant === "primary" ? "btn-primary" : "btn-secondary"
            }
            disabled={busyId !== null}
            onClick={() => runDownload(exporter)}
            title={exporter.description}
          >
            {busyId === exporter.id ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Exporting…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> {label ?? exporter.label}
              </>
            )}
          </button>
          {exporter.preview && (
            <button
              className="btn-ghost h-9 w-9 p-0"
              disabled={busyId !== null}
              onClick={() => runPreview(exporter)}
              aria-label={`Preview ${exporter.label}`}
              title="Preview contents"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
        <PreviewModal
          state={previewState}
          onClose={() => setPreviewState(null)}
          onConfirm={(e, ctx) => runDownload(e, ctx)}
          busy={busyId !== null}
        />
      </>
    );
  }

  // Multi-exporter case: dropdown.
  return (
    <>
      <div className="relative inline-block" ref={ref}>
        <button
          className={variant === "primary" ? "btn-primary" : "btn-secondary"}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Download className="h-4 w-4" /> {label ?? "Export"}
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {exporters.map((e) => (
              <div
                key={e.id}
                role="menuitem"
                className="flex items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="block w-full text-left font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busyId !== null}
                    onClick={() => runDownload(e)}
                  >
                    {e.label}
                  </button>
                  <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                    {e.description}
                  </div>
                  {e.preview && (
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline disabled:opacity-60"
                      disabled={busyId !== null}
                      onClick={() => runPreview(e)}
                    >
                      <Eye className="h-3 w-3" /> Preview contents
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <PreviewModal
        state={previewState}
        onClose={() => setPreviewState(null)}
        onConfirm={(e, ctx) => runDownload(e, ctx)}
        busy={busyId !== null}
      />
    </>
  );
}

/* -------- preview modal -------- */

function PreviewModal({
  state,
  onClose,
  onConfirm,
  busy,
}: {
  state: { exporter: Exporter; preview: ExportPreview; ctx: ExporterContext } | null;
  onClose: () => void;
  onConfirm: (exporter: Exporter, ctx: ExporterContext) => void;
  busy: boolean;
}) {
  if (!state) return null;
  const { exporter, preview, ctx } = state;
  const filename = exporter.filenameFor(ctx);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Preview: ${exporter.label}`}
      size="lg"
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {exporter.description}
        </p>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-950">
          <div className="mb-2 flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>
              <strong>File:</strong> {filename}
            </span>
            <span>{preview.summary}</span>
          </div>
          {preview.entries.length === 0 ? (
            <p className="text-slate-500">Empty export — no entries.</p>
          ) : (
            <ul className="max-h-72 space-y-0.5 overflow-y-auto font-mono">
              {preview.entries.map((e) => (
                <li
                  key={e.path}
                  className="flex items-center justify-between text-slate-700 dark:text-slate-300"
                >
                  <span className="truncate">{e.path}</span>
                  <span className="ml-3 shrink-0 text-slate-400">
                    {formatBytesLocal(e.size)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onConfirm(exporter, ctx)}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Exporting…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Download
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function formatBytesLocal(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
