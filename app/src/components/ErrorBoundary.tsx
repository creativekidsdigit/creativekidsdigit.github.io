import { Component, type ReactNode } from "react";
import { storage } from "@/lib/storage";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it and shows a recovery screen.
 *
 * This is the last line of defense for "the IndexedDB blob got into a shape
 * the new code can't render". The user can copy the error, export a backup
 * (existing data may still be readable via export), or reset the workspace
 * to factory state.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Surface to console; we deliberately do NOT phone home anywhere.
    console.error("[ErrorBoundary]", error, info);
  }

  reload = () => {
    window.location.reload();
  };

  reset = async () => {
    const ok = window.confirm(
      "Reset workspace?\n\nThis will delete all products, content, prompts, " +
        "tasks, launches, ideas, and settings stored in this browser. " +
        "API keys will be cleared. This cannot be undone."
    );
    if (!ok) return;
    await storage.clearAll();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-rose-700 dark:text-rose-300">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The app hit an unexpected error. Your data is still saved in this
            browser. You can reload, or — if reloading keeps failing — reset
            the workspace to factory state.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-rose-700 dark:bg-slate-950 dark:text-rose-300">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={this.reload}
              className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Reload app
            </button>
            <button
              onClick={this.reset}
              className="rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-900/30"
            >
              Reset workspace
            </button>
          </div>
        </div>
      </div>
    );
  }
}
