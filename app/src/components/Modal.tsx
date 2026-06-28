import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === "sm"
      ? "max-w-sm"
      : size === "lg"
        ? "max-w-3xl"
        : size === "xl"
          ? "max-w-5xl"
          : "max-w-xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-12 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${sizeClass} rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="btn-ghost h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
