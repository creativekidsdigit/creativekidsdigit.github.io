import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAppStore } from "@/store/useAppStore";

export default function Shell() {
  const [open, setOpen] = useState(false);
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  const theme = useAppStore((s) => s.settings.theme);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Reapply theme on changes
  useEffect(() => {
    const apply = () => {
      const dark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
        <div className="text-sm text-slate-500">Loading workspace…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/*
        Skip link — visually hidden until keyboard-focused. Lets keyboard
        users bypass the 16-item Sidebar and 4-item Topbar (~20 tab stops)
        that repeat on every route. Standard pattern; only present here
        because the nav is so dense.
      */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
