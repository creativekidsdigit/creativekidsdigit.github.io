import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import clsx from "clsx";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; msg: string };

interface ToastState {
  toasts: Toast[];
  push(t: Omit<Toast, "id">): void;
  remove(id: string): void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 4200);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().push({ kind: "success", msg }),
  error: (msg: string) => useToastStore.getState().push({ kind: "error", msg }),
  info: (msg: string) => useToastStore.getState().push({ kind: "info", msg }),
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  useEffect(() => {
    /* no-op */
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg",
            t.kind === "success" &&
              "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
            t.kind === "error" &&
              "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
            t.kind === "info" &&
              "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
          )}
        >
          {t.kind === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {t.kind === "error" && <AlertTriangle className="h-4 w-4 shrink-0" />}
          {t.kind === "info" && <Info className="h-4 w-4 shrink-0" />}
          <div className="flex-1">{t.msg}</div>
          <button
            onClick={() => remove(t.id)}
            aria-label="Dismiss"
            className="-mr-1 -mt-0.5 p-1 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
