import { Menu, Moon, Sun, Monitor, Zap, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import clsx from "clsx";

interface Props {
  onMenu: () => void;
}

export default function Topbar({ onMenu }: Props) {
  const theme = useAppStore((s) => s.settings.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const products = useAppStore((s) => s.products);
  const nav = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <button
          aria-label="Open menu"
          onClick={onMenu}
          className="btn-ghost h-9 w-9 p-0 md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 sm:flex"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search products…
          <span className="kbd">⌘K</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => nav("/copy")}
          className="btn-primary"
          title="Jump to the Copy Generator"
        >
          <Zap className="h-4 w-4" aria-hidden="true" />
          Quick Generate
        </button>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>

      {searchOpen && (
        <SearchPalette
          products={products}
          onClose={() => setSearchOpen(false)}
          onPick={(id) => {
            setSearchOpen(false);
            nav(`/products/${id}`);
          }}
        />
      )}
    </header>
  );
}

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;
}) {
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      onClick={() => setTheme(next)}
      className="btn-ghost h-9 w-9 p-0"
      title={`Theme: ${theme}. Click to change.`}
      aria-label="Toggle theme"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function SearchPalette({
  products,
  onClose,
  onPick,
}: {
  products: { id: string; title: string; category: string }[];
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const results = products
    .filter((p) =>
      `${p.title} ${p.category}`.toLowerCase().includes(q.toLowerCase())
    )
    .slice(0, 12);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products by title or category…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {results.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">
              No products match. Create one from the Products page.
            </div>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className={clsx(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <span className="font-medium">{p.title}</span>
              <span className="chip">{p.category || "uncategorized"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
