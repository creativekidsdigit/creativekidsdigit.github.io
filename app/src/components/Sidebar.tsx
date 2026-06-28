import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PenSquare,
  Pin,
  Search,
  Mail,
  FileText,
  Share2,
  Target,
  Bot,
  Library,
  BarChart3,
  TrendingUp,
  Rocket,
  Compass,
  Settings,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/research", label: "Product Research", icon: Compass },
  { to: "/builder", label: "Campaign Builder", icon: Rocket },
  { to: "/copy", label: "Copy Generator", icon: PenSquare },
  { to: "/pinterest", label: "Pinterest", icon: Pin },
  { to: "/seo", label: "SEO", icon: Search },
  { to: "/email", label: "Email Marketing", icon: Mail },
  { to: "/blog", label: "Blog Generator", icon: FileText },
  { to: "/social", label: "Social Media", icon: Share2 },
  { to: "/funnels", label: "Sales Funnels", icon: Target },
  { to: "/campaigns", label: "Campaign Analytics", icon: TrendingUp },
  { to: "/prompts", label: "Prompt Library", icon: Bot },
  { to: "/library", label: "Content Library", icon: Library },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  // Close the mobile slide-out when the user presses Escape. Listener is
  // attached only while the overlay is open so it never affects desktop
  // (md:translate-x-0 keeps the sidebar permanently visible there).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* mobile overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Primary navigation"
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 text-white shadow-md">
            <span className="font-bold">AI</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Copywriting OS</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Marketing command center
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  "mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          v0.1 · data stays in your browser
        </div>
      </aside>
    </>
  );
}
