import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Copy,
  Download,
  Save,
  Loader2,
  ChevronRight,
  Wand2,
  Settings,
  CheckCircle2,
  Undo2,
  Redo2,
  Upload,
  FileText,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { generate } from "@/lib/ai";
import { interpolate } from "@/lib/template";
import { copyText, downloadFile, slugify, wordCount } from "@/lib/util";
import { extractTextFromFile, isSupportedImportFile } from "@/lib/articleImport";
import { toast } from "./Toast";
import type { ContentKind, Product, PromptTemplate } from "@/types";
import clsx from "clsx";

interface Props {
  kind: ContentKind;
  title: string;
  description: string;
  /**
   * Limit which prompt templates show up in this workbench. If omitted,
   * all prompts whose category matches `kind` are shown.
   */
  templateFilter?: (tpl: PromptTemplate) => boolean;
  /** Initial product id (from query string for e.g. deep links). */
  initialProductId?: string;
}

interface HistoryEntry {
  text: string;
  ts: number;
}

export default function GeneratorWorkbench({
  kind,
  title,
  description,
  templateFilter,
  initialProductId,
}: Props) {
  const products = useAppStore((s) => s.products);
  const settings = useAppStore((s) => s.settings);
  const prompts = useAppStore((s) => s.prompts);
  const saveContent = useAppStore((s) => s.saveContent);

  const availablePrompts = useMemo(() => {
    const base = prompts.filter((p) => p.category === kind);
    return templateFilter ? base.filter(templateFilter) : base;
  }, [prompts, kind, templateFilter]);

  const [productId, setProductId] = useState<string>(
    initialProductId ?? products[0]?.id ?? ""
  );
  const [templateId, setTemplateId] = useState<string>(
    availablePrompts[0]?.id ?? ""
  );
  const [blogTitle, setBlogTitle] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [output, setOutput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "import">("generate");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [meta, setMeta] = useState<{ ms: number; provider: string; model: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep selected product/template in sync if data changes
  useEffect(() => {
    if (!products.find((p) => p.id === productId)) {
      setProductId(products[0]?.id ?? "");
    }
  }, [products, productId]);
  useEffect(() => {
    if (!availablePrompts.find((t) => t.id === templateId)) {
      setTemplateId(availablePrompts[0]?.id ?? "");
    }
  }, [availablePrompts, templateId]);

  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );
  const template = useMemo(
    () => availablePrompts.find((p) => p.id === templateId),
    [availablePrompts, templateId]
  );

  const makeBlogTitleInstruction = useMemo(() => {
    if (!product || !template) return "";
    const effectiveTitle = blogTitle.trim();
    if (effectiveTitle) {
      return `Use the blog title: ${effectiveTitle}. Include a line at the top of the response with BLOG_TITLE: ${effectiveTitle} and make the H1 heading exactly that title. Do not use the product name as the H1 or SEO title.`;
    }
    return `Suggest a strong blog post title based on this product and the selected template. Include a line at the top of the response with BLOG_TITLE: <suggested title>. Then use that title as the H1 heading and SEO title in the article.`;
  }, [blogTitle, product, template]);

  const previewUserPrompt = useMemo(() => {
    if (!template || !product) return "";
    const ctx = { product, settings, blogTitle };
    const base = interpolate(template.userPromptTemplate, ctx);
    const titleInstruction = makeBlogTitleInstruction
      ? `\n\nBLOG TITLE INSTRUCTION\n${makeBlogTitleInstruction}`
      : "";
    const extra = extraInstructions.trim()
      ? `\n\nADDITIONAL INSTRUCTIONS\n${extraInstructions.trim()}`
      : "";
    return `${base}${titleInstruction}${extra}`;
  }, [template, product, settings, extraInstructions, makeBlogTitleInstruction]);

  function parseBlogTitleFromOutput(text: string) {
    const match = text.match(/^\s*(?:BLOG_TITLE:|Blog Title:)\s*(.+)$/m);
    if (!match) {
      return { title: "", content: text };
    }
    const title = match[1].trim();
    const content = text.replace(/^\s*(?:BLOG_TITLE:|Blog Title:)\s*.+(?:\r?\n)+/, "").trimStart();
    return { title, content };
  }

  function pushHistory(text: string) {
    setHistory((h) => {
      const next = [...h.slice(0, historyIdx + 1), { text, ts: Date.now() }];
      return next.slice(-20);
    });
    setHistoryIdx((i) => Math.min(i + 1, 19));
  }

  async function onGenerate() {
    if (!product) {
      toast.error("Pick a product first.");
      return;
    }
    if (!template) {
      toast.error("Pick a template first.");
      return;
    }
    setLoading(true);
    setError(null);
    setMeta(null);
    try {
      const sys = interpolate(template.systemPrompt, { product, settings });
      const result = await generate(
        {
          system: sys,
          user: previewUserPrompt,
          temperature,
          maxTokens: 2200,
        },
        settings
      );
      const raw = result.text;
      const parsed = parseBlogTitleFromOutput(raw);
      if (!blogTitle.trim() && parsed.title) {
        setBlogTitle(parsed.title);
      }
      setOutput(parsed.content);
      setMeta({ ms: result.ms, provider: result.provider, model: result.model });
      pushHistory(parsed.content);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onImport(file: File | null | undefined) {
    if (!file) return;
    if (!isSupportedImportFile(file)) {
      const message = "Unsupported file type. Please upload a .docx, .pdf, .txt, .md, .html, or .htm file.";
      setImportError(message);
      setUploadProgress(message);
      toast.error(message);
      return;
    }

    setImporting(true);
    setImportError(null);
    setError(null);
    setUploadProgress("Preparing file...");
    try {
      setUploadProgress("Extracting text...");
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        const message = "No readable text was found in that file.";
        setImportError(message);
        setUploadProgress(message);
        toast.error(message);
        return;
      }

      setOutput(text);
      setSelectedFileName(file.name);
      setActiveTab("import");
      setUploadProgress("Imported successfully");
      pushHistory(text);
      toast.success("Article imported successfully");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setImportError(msg);
      setUploadProgress(msg);
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  }

  async function onRewriteWithAI() {
    if (!output.trim()) {
      const message = "Import or generate content before rewriting.";
      setImportError(message);
      toast.error(message);
      return;
    }
    if (!product) {
      toast.error("Pick a product first.");
      return;
    }
    if (!template) {
      toast.error("Pick a template first.");
      return;
    }

    setLoading(true);
    setError(null);
    setImportError(null);
    setUploadProgress("Rewriting with AI...");
    try {
      const sys = interpolate(template.systemPrompt, { product, settings });
      const userPrompt = [
        "Rewrite the following article using the selected template and product context.",
        "Keep the core ideas, improve clarity and flow, and adapt it for the target audience.",
        extraInstructions.trim()
          ? `Additional instructions:\n${extraInstructions.trim()}`
          : "",
        `Article to rewrite:\n${output}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const result = await generate(
        {
          system: sys,
          user: userPrompt,
          temperature,
          maxTokens: 2200,
        },
        settings
      );
      const text = result.text;
      setOutput(text);
      setMeta({ ms: result.ms, provider: result.provider, model: result.model });
      setUploadProgress("Rewrite complete");
      pushHistory(text);
      toast.success("Rewrite complete");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setUploadProgress(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function undo() {
    if (historyIdx <= 0) return;
    const i = historyIdx - 1;
    setHistoryIdx(i);
    setOutput(history[i].text);
  }
  function redo() {
    if (historyIdx >= history.length - 1) return;
    const i = historyIdx + 1;
    setHistoryIdx(i);
    setOutput(history[i].text);
  }

  async function onSave() {
    if (!output.trim()) return;
    if (!product || !template) return;
    const savedTitle = blogTitle.trim() || `${product.title} · ${template.name}`;
    const item = await saveContent({
      productId: product.id,
      kind,
      templateId: template.id,
      title: savedTitle,
      body: output,
      tags: [kind, template.category, ...product.keywords.slice(0, 3)],
      pinned: false,
    });
    toast.success(`Saved to Content Library`);
    return item;
  }

  async function onCopy() {
    const ok = await copyText(output);
    if (ok) toast.success("Copied to clipboard");
    else toast.error("Copy failed");
  }

  function onDownload() {
    if (!output) return;
    const slugBase = blogTitle.trim() || product?.title || "blog-post";
    const name = `${slugify(slugBase)}-${slugify(template?.name ?? kind)}.md`;
    downloadFile(name, output, "text/markdown");
  }

  // ⌘+Enter to generate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!loading && activeTab === "generate") onGenerate();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUserPrompt, template, product, temperature, loading, activeTab]);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <Wand2 className="h-6 w-6 text-brand-500" aria-hidden="true" /> {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          <Link to="/settings" className="hover:underline">
            {settings.providers[settings.activeProvider]?.model || "model"}
            <ChevronRight className="ml-0.5 inline h-3 w-3" />
            {settings.activeProvider}
          </Link>
        </div>
      </header>

      {products.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-10 text-center">
          <div className="text-sm font-medium">You need a product first</div>
          <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
            Every generator works off your product data — title, audience,
            problem, benefits, keywords. Create one and come back.
          </p>
          <Link to="/products" className="btn-primary mt-2">
            Go to Products
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-5">
          {/* LEFT: controls */}
          <div className="space-y-4 lg:col-span-2">
            <section className="card p-4">
              <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("generate")}
                  className={clsx(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition",
                    activeTab === "generate"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                  )}
                >
                  <Sparkles className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  Generate with AI
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("import")}
                  className={clsx(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition",
                    activeTab === "import"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                  )}
                >
                  <FileText className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  Import Existing Article
                </button>
              </div>

              {activeTab === "generate" ? (
                <>
                  <label className="label mt-4">Product</label>
                  <select
                    className="input"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>

                  {kind === "blog" && (
                    <div className="mt-4">
                      <label className="label">Blog Title</label>
                      <input
                        className="input"
                        value={blogTitle}
                        onChange={(e) => setBlogTitle(e.target.value)}
                        placeholder="Enter a custom blog title or leave blank for AI suggestion"
                        aria-required="true"
                      />
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        If left blank, the AI will suggest a strong title and use it as the H1 and SEO title.
                      </p>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="label">Template</label>
                    {availablePrompts.length === 0 ? (
                      <div className="rounded border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">
                        No templates in the "{kind}" category yet. Add one in the
                        Prompt Library.
                      </div>
                    ) : (
                      <select
                        className="input"
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                      >
                        {availablePrompts.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.favorite ? "★ " : ""}
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {template && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {template.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="label">Additional instructions (optional)</label>
                    <textarea
                      className="input min-h-[80px]"
                      placeholder="e.g. lean more playful, mention back-to-school, target Christmas, target teachers..."
                      value={extraInstructions}
                      onChange={(e) => setExtraInstructions(e.target.value)}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="label">
                      Creativity ({temperature.toFixed(1)})
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1.2}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-brand-600"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>precise</span>
                      <span>balanced</span>
                      <span>wild</span>
                    </div>
                  </div>

                  <button
                    disabled={loading || !template || !product}
                    onClick={onGenerate}
                    className="btn-primary mt-5 w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" aria-hidden="true" /> Generate{" "}
                        <span className="kbd ml-1">⌘↵</span>
                      </>
                    )}
                  </button>
                  {error && (
                    <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
                      {error}
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-4 space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragActive(true);
                    }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragActive(false);
                      onImport(e.dataTransfer.files?.[0]);
                    }}
                    className={clsx(
                      "rounded-lg border border-dashed p-4 text-sm transition",
                      isDragActive
                        ? "border-brand-500 bg-brand-50 text-slate-800 dark:border-brand-400 dark:bg-slate-800 dark:text-slate-100"
                        : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    )}
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      Drop a file here or click to upload.
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Supported formats: .docx, .pdf, .txt, .md, .html, and .htm.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf,.txt,.md,.html,.htm"
                    className="hidden"
                    onChange={(e) => {
                      onImport(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="btn-primary w-full"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Extracting…
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" aria-hidden="true" /> Upload Article
                      </>
                    )}
                  </button>

                  {selectedFileName ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Imported file: <span className="font-medium text-slate-700 dark:text-slate-200">{selectedFileName}</span>
                    </p>
                  ) : null}

                  {uploadProgress ? (
                    <p className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {uploadProgress}
                    </p>
                  ) : null}

                  {importError && (
                    <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
                      {importError}
                    </p>
                  )}
                </div>
              )}
            </section>

            {activeTab === "generate" ? (
              <details className="card p-4 text-xs">
                <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-200">
                  Preview the prompt that will be sent
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {previewUserPrompt || "(pick a product + template)"}
                </pre>
              </details>
            ) : null}
          </div>

          {/* RIGHT: output */}
          <div className="lg:col-span-3">
            <section className="card flex h-full flex-col p-4">
              <header className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Output
                  {meta && (
                    <span className="chip">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      {meta.provider} · {meta.model} · {meta.ms}ms
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-ghost h-8 w-8 p-0"
                    onClick={undo}
                    disabled={historyIdx <= 0}
                    aria-label="Undo last change"
                    title="Undo"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    className="btn-ghost h-8 w-8 p-0"
                    onClick={redo}
                    disabled={historyIdx >= history.length - 1}
                    aria-label="Redo last change"
                    title="Redo"
                  >
                    <Redo2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    className="btn-secondary h-8"
                    onClick={onRewriteWithAI}
                    disabled={!output || loading || importing}
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Rewrite with AI
                  </button>
                  <button
                    className="btn-secondary h-8"
                    onClick={onCopy}
                    disabled={!output}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy
                  </button>
                  <button
                    className="btn-secondary h-8"
                    onClick={onDownload}
                    disabled={!output}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> .md
                  </button>
                  <button
                    className="btn-primary h-8"
                    onClick={onSave}
                    disabled={!output}
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" /> Save
                  </button>
                </div>
              </header>

              {loading && !output ? (
                <div className="space-y-2">
                  <div className="shimmer h-3 w-3/4 rounded" />
                  <div className="shimmer h-3 w-full rounded" />
                  <div className="shimmer h-3 w-5/6 rounded" />
                  <div className="shimmer h-3 w-2/3 rounded" />
                  <div className="shimmer h-3 w-4/6 rounded" />
                </div>
              ) : (
                <textarea
                  className={clsx(
                    "min-h-[440px] flex-1 resize-y rounded-md border border-slate-200 bg-white p-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  )}
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  placeholder="Generated copy appears here. You can edit before saving."
                />
              )}

              {output && (
                <footer className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{wordCount(output)} words · editable</span>
                  <span>
                    History {history.length === 0 ? 0 : historyIdx + 1}/
                    {history.length}
                  </span>
                </footer>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
