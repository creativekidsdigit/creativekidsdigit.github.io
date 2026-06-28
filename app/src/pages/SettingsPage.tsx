import { useId, useState } from "react";
import {
  Eye,
  EyeOff,
  Download,
  Upload,
  RefreshCcw,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { listProviders, generate } from "@/lib/ai";
import { PageHeader, SectionCard } from "@/components/ui";
import { toast } from "@/components/Toast";
import type { ProviderId } from "@/types";

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const setProvider = useAppStore((s) => s.setProvider);
  const setTheme = useAppStore((s) => s.setTheme);
  const exportAll = useAppStore((s) => s.exportAll);
  const importAll = useAppStore((s) => s.importAll);
  const resetWorkspace = useAppStore((s) => s.resetWorkspace);

  // Stable ids for label/htmlFor associations
  const idProvider = useId();
  const idModelTop = useId();
  const idBrandVoice = useId();
  const idAudience = useId();
  const idTheme = useId();
  const idAutosave = useId();
  const idImport = useId();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Connect your AI providers, set your brand voice, and manage your data."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="Active AI provider">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={idProvider} className="label">
                  Provider
                </label>
                <select
                  id={idProvider}
                  className="input"
                  value={settings.activeProvider}
                  onChange={(e) =>
                    setSettings({ activeProvider: e.target.value as ProviderId })
                  }
                >
                  {listProviders().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={idModelTop} className="label">
                  Model
                </label>
                <input
                  id={idModelTop}
                  className="input"
                  value={settings.providers[settings.activeProvider].model}
                  onChange={(e) =>
                    setProvider(settings.activeProvider, {
                      model: e.target.value,
                    })
                  }
                  list={`models-${settings.activeProvider}`}
                />
                <datalist id={`models-${settings.activeProvider}`}>
                  {listProviders()
                    .find((p) => p.id === settings.activeProvider)
                    ?.suggestedModels.map((m) => (
                      <option key={m} value={m} />
                    ))}
                </datalist>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="All providers">
            <div className="space-y-3">
              {listProviders().map((p) => (
                <ProviderRow key={p.id} providerId={p.id} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Brand voice">
            <p className="mb-2 text-xs text-slate-500">
              This is injected into every generation. Tell the AI exactly how
              your brand should sound.
            </p>
            <label htmlFor={idBrandVoice} className="sr-only">
              Brand voice
            </label>
            <textarea
              id={idBrandVoice}
              className="input min-h-[140px]"
              value={settings.brandVoice}
              onChange={(e) => setSettings({ brandVoice: e.target.value })}
            />
          </SectionCard>

          <SectionCard title="Default audience">
            <label htmlFor={idAudience} className="sr-only">
              Default audience
            </label>
            <input
              id={idAudience}
              className="input"
              value={settings.defaultAudience}
              onChange={(e) => setSettings({ defaultAudience: e.target.value })}
            />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Appearance">
            <label htmlFor={idTheme} className="label">
              Theme
            </label>
            <select
              id={idTheme}
              className="input"
              value={settings.theme}
              onChange={(e) =>
                setTheme(e.target.value as "light" | "dark" | "system")
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>

            <label htmlFor={idAutosave} className="label mt-4">
              Autosave product edits
            </label>
            <select
              id={idAutosave}
              className="input"
              value={settings.autosave ? "on" : "off"}
              onChange={(e) => setSettings({ autosave: e.target.value === "on" })}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </SectionCard>

          <SectionCard title="Data">
            <p className="text-xs text-slate-500">
              All data lives in your browser (IndexedDB). Export to back up,
              import to restore.
            </p>
            <div className="mt-3 grid gap-2">
              <button
                className="btn-secondary"
                onClick={async () => {
                  const json = await exportAll();
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `ai-copywriting-os-${new Date()
                    .toISOString()
                    .slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Backup downloaded (API keys redacted)");
                }}
              >
                <Download className="h-4 w-4" /> Export all data
              </button>

              <label htmlFor={idImport} className="btn-secondary cursor-pointer">
                <Upload className="h-4 w-4" /> Import backup
                <input
                  id={idImport}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const text = await f.text();
                    try {
                      await importAll(text);
                      toast.success("Backup imported");
                    } catch (err) {
                      toast.error("Import failed: " + (err as Error).message);
                    }
                  }}
                />
              </label>

              <button
                className="btn-secondary border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/30"
                onClick={async () => {
                  const ok = window.confirm(
                    "Reset workspace?\n\nThis will delete all products, " +
                      "content, prompts, tasks, launches, ideas, and " +
                      "settings stored in this browser. API keys will be " +
                      "cleared. This cannot be undone.\n\nUse Export first " +
                      "if you want a backup."
                  );
                  if (!ok) return;
                  await resetWorkspace();
                  toast.success("Workspace reset to factory state");
                }}
              >
                <AlertTriangle className="h-4 w-4" /> Reset workspace
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Keyboard shortcuts">
            <ul className="space-y-1.5 text-xs">
              <Shortcut keys="⌘K">Open product search</Shortcut>
              <Shortcut keys="⌘↵">Generate (in any workbench)</Shortcut>
              <Shortcut keys="Esc">Close modals</Shortcut>
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function ProviderRow({ providerId }: { providerId: ProviderId }) {
  const cfg = useAppStore((s) => s.settings.providers[providerId]);
  const settings = useAppStore((s) => s.settings);
  const setProvider = useAppStore((s) => s.setProvider);
  const adapter = listProviders().find((p) => p.id === providerId)!;
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  // Stable ids per provider row
  const idApiKey = useId();
  const idModel = useId();
  const idBaseUrl = useId();

  async function test() {
    setTesting(true);
    try {
      const result = await generate(
        {
          system: "You are a connectivity test.",
          user: "Reply with exactly: OK",
          maxTokens: 10,
          temperature: 0,
        },
        { ...settings, activeProvider: providerId }
      );
      const ok = /\bOK\b/i.test(result.text);
      if (ok) toast.success(`${adapter.label} connected (${result.ms}ms)`);
      else toast.info(`${adapter.label} replied: ${result.text.slice(0, 60)}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <summary className="flex cursor-pointer items-center justify-between text-sm">
        <span className="font-medium">{adapter.label}</span>
        <span className="text-xs text-slate-500">
          {cfg.apiKey || !adapter.needsApiKey ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Check className="h-3.5 w-3.5" /> configured
            </span>
          ) : (
            "not configured"
          )}
        </span>
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {adapter.needsApiKey && (
          <div className="sm:col-span-2">
            <label htmlFor={idApiKey} className="label">
              API key
            </label>
            <div className="flex items-center gap-2">
              <input
                id={idApiKey}
                className="input"
                type={showKey ? "text" : "password"}
                value={cfg.apiKey ?? ""}
                onChange={(e) =>
                  setProvider(providerId, { apiKey: e.target.value })
                }
                placeholder="sk-…"
                autoComplete="off"
              />
              <button
                type="button"
                className="btn-ghost h-9 w-9 p-0"
                aria-label={showKey ? "Hide API key" : "Show API key"}
                aria-pressed={showKey}
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Stored locally in this browser. Never sent anywhere except directly
              to the provider.
            </p>
          </div>
        )}
        <div>
          <label htmlFor={idModel} className="label">
            Model
          </label>
          <input
            id={idModel}
            className="input"
            value={cfg.model}
            onChange={(e) => setProvider(providerId, { model: e.target.value })}
            list={`models-row-${providerId}`}
          />
          <datalist id={`models-row-${providerId}`}>
            {adapter.suggestedModels.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor={idBaseUrl} className="label">
            Base URL (optional)
          </label>
          <input
            id={idBaseUrl}
            className="input"
            value={cfg.baseUrl ?? ""}
            placeholder={adapter.defaultBaseUrl}
            onChange={(e) =>
              setProvider(providerId, { baseUrl: e.target.value })
            }
          />
        </div>
        <div className="sm:col-span-2 flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={testing}
            onClick={test}
          >
            <RefreshCcw
              className={`h-4 w-4 ${testing ? "animate-spin" : ""}`}
            />
            Test connection
          </button>
        </div>
      </div>
    </details>
  );
}

function Shortcut({
  keys,
  children,
}: {
  keys: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between">
      <span>{children}</span>
      <span className="kbd">{keys}</span>
    </li>
  );
}
