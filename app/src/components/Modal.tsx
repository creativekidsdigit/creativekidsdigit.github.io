import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

// Selector for elements that should participate in the focus trap.
// Mirrors the WAI-ARIA Authoring Practices guidance for dialog focus.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  // Focus management + Escape + Tab trap. All in one effect so the
  // cleanup function reliably runs on every open→close transition
  // (including unmount-while-open), which is what restores focus to
  // the element that triggered the modal.
  useEffect(() => {
    if (!open) return;

    // Capture whatever had focus before the modal opened. We'll restore
    // it on close. `as HTMLElement | null` is correct because document
    // root in test envs can be null and SVG elements don't have .focus().
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // On open, move focus into the panel unless something inside already
    // has it (e.g. an <input autoFocus /> in the children).
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      // Fallback to the panel itself so focus is at least inside the dialog.
      (first ?? panel).focus();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const p = panelRef.current;
      if (!p) return;
      const focusables = Array.from(
        p.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(
        // querySelector can't express "visible", so filter by offsetParent
        // (null = display:none ancestor, or detached). The dialog header's
        // close button is always present, so the list is never empty.
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focusables.length === 0) {
        // Nothing inside to focus; swallow Tab so focus can't leak out.
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !p.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !p.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Restore focus only if the previously-focused element is still
      // in the document (it may have been removed during the modal's
      // lifetime — e.g. a delete-confirmation modal whose trigger row
      // got removed from the table).
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Dialog"}
        tabIndex={-1}
        className={`w-full ${sizeClass} rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2
            id={titleId}
            className="text-sm font-semibold text-slate-800 dark:text-slate-100"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label={title ? `Close ${title}` : "Close dialog"}
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
