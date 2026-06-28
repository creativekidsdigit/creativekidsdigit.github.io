import { create } from "zustand";
import { storage, K } from "@/lib/storage";
import { uid, now } from "@/lib/id";
import { DEFAULT_SETTINGS, buildDefaultPrompts } from "@/lib/defaults";
import { sanitizers, sanitizeSettings } from "@/lib/migrate";
import {
  validateBackupHeader,
  summarizeImportSlice,
  type ImportSummary,
} from "@/lib/backupImport";
import type {
  AppSettings,
  Campaign,
  Competitor,
  ContentItem,
  Idea,
  Keyword,
  LaunchEvent,
  Opportunity,
  OpportunityScoreFactor,
  PerformanceSnapshot,
  Product,
  PromptTemplate,
  Task,
} from "@/types";
import { buildScore } from "@/lib/opportunityScore";

interface AppState {
  hydrated: boolean;
  settings: AppSettings;
  products: Product[];
  content: ContentItem[];
  prompts: PromptTemplate[];
  tasks: Task[];
  launches: LaunchEvent[];
  ideas: Idea[];
  campaigns: Campaign[];
  perfSnapshots: PerformanceSnapshot[];
  opportunities: Opportunity[];
  keywords: Keyword[];
  competitors: Competitor[];

  hydrate(): Promise<void>;

  // settings
  setSettings(patch: Partial<AppSettings>): Promise<void>;
  setProvider<K extends keyof AppSettings["providers"]>(
    id: K,
    patch: Partial<AppSettings["providers"][K]>
  ): Promise<void>;
  setTheme(t: AppSettings["theme"]): Promise<void>;

  // products
  createProduct(p: Partial<Product>): Promise<Product>;
  updateProduct(id: string, patch: Partial<Product>): Promise<void>;
  deleteProduct(id: string): Promise<void>;

  // content
  saveContent(c: Omit<ContentItem, "id" | "createdAt" | "updatedAt">): Promise<ContentItem>;
  updateContent(id: string, patch: Partial<ContentItem>): Promise<void>;
  deleteContent(id: string): Promise<void>;
  togglePinContent(id: string): Promise<void>;

  // prompts
  createPrompt(p: Partial<PromptTemplate>): Promise<PromptTemplate>;
  updatePrompt(id: string, patch: Partial<PromptTemplate>): Promise<void>;
  deletePrompt(id: string): Promise<void>;
  toggleFavoritePrompt(id: string): Promise<void>;
  resetBuiltInPrompts(): Promise<void>;

  // tasks
  addTask(t: Partial<Task>): Promise<void>;
  updateTask(id: string, patch: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  toggleTask(id: string): Promise<void>;

  // launches
  addLaunch(e: Partial<LaunchEvent>): Promise<void>;
  updateLaunch(id: string, patch: Partial<LaunchEvent>): Promise<void>;
  deleteLaunch(id: string): Promise<void>;

  // ideas
  addIdea(text: string): Promise<void>;
  togglePinIdea(id: string): Promise<void>;
  deleteIdea(id: string): Promise<void>;

  // campaigns
  createCampaign(c: Partial<Campaign>): Promise<Campaign>;
  updateCampaign(id: string, patch: Partial<Campaign>): Promise<void>;
  deleteCampaign(id: string): Promise<void>;

  // performance snapshots
  addPerformance(p: Partial<PerformanceSnapshot>): Promise<PerformanceSnapshot>;
  updatePerformance(id: string, patch: Partial<PerformanceSnapshot>): Promise<void>;
  deletePerformance(id: string): Promise<void>;

  // research — opportunities
  createOpportunity(o: Partial<Opportunity>): Promise<Opportunity>;
  updateOpportunity(id: string, patch: Partial<Opportunity>): Promise<void>;
  setOpportunityFactor(
    id: string,
    factor: OpportunityScoreFactor,
    value: number
  ): Promise<void>;
  deleteOpportunity(id: string): Promise<void>;
  /** One-click "opportunity → Product". Returns the new product. */
  convertOpportunityToProduct(id: string): Promise<Product | null>;

  // research — keywords
  createKeyword(k: Partial<Keyword>): Promise<Keyword>;
  updateKeyword(id: string, patch: Partial<Keyword>): Promise<void>;
  deleteKeyword(id: string): Promise<void>;

  // research — competitors
  createCompetitor(c: Partial<Competitor>): Promise<Competitor>;
  updateCompetitor(id: string, patch: Partial<Competitor>): Promise<void>;
  deleteCompetitor(id: string): Promise<void>;

  // utility
  exportAll(): Promise<string>;
  importAll(json: string): Promise<ImportSummary>;
  resetWorkspace(): Promise<void>;
}

function emptyProduct(p: Partial<Product>): Product {
  return {
    id: p.id ?? uid("prd"),
    title: p.title ?? "Untitled product",
    category: p.category ?? "",
    audience: p.audience ?? "",
    problemSolved: p.problemSolved ?? "",
    benefits: p.benefits ?? [],
    keywords: p.keywords ?? [],
    pricing: p.pricing ?? "",
    platform: p.platform ?? "payhip",
    status: p.status ?? "idea",
    launchDate: p.launchDate,
    notes: p.notes ?? "",
    createdAt: p.createdAt ?? now(),
    updatedAt: now(),
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  settings: DEFAULT_SETTINGS,
  products: [],
  content: [],
  prompts: [],
  tasks: [],
  launches: [],
  ideas: [],
  campaigns: [],
  perfSnapshots: [],
  opportunities: [],
  keywords: [],
  competitors: [],

  async hydrate() {
    // Read everything in parallel, then run each blob through a shape guard.
    // Bad/missing values fall back to safe defaults so a single malformed key
    // never wedges the entire app.
    const [
      rawSettings,
      rawProducts,
      rawContent,
      rawPrompts,
      rawTasks,
      rawLaunches,
      rawIdeas,
      rawCampaigns,
      rawPerf,
      rawOpportunities,
      rawKeywords,
      rawCompetitors,
    ] = await Promise.all([
      storage.get<unknown>(K.settings, null),
      storage.get<unknown>(K.products, []),
      storage.get<unknown>(K.content, []),
      storage.get<unknown>(K.prompts, []),
      storage.get<unknown>(K.tasks, []),
      storage.get<unknown>(K.launches, []),
      storage.get<unknown>(K.ideas, []),
      storage.get<unknown>(K.campaigns, []),
      storage.get<unknown>(K.perfSnapshots, []),
      storage.get<unknown>(K.opportunities, []),
      storage.get<unknown>(K.keywords, []),
      storage.get<unknown>(K.competitors, []),
    ]);

    const settings = sanitizeSettings(rawSettings);
    const products = sanitizers.products(rawProducts);
    const content = sanitizers.content(rawContent);
    const tasks = sanitizers.tasks(rawTasks);
    const launches = sanitizers.launches(rawLaunches);
    const ideas = sanitizers.ideas(rawIdeas);
    const campaigns = sanitizers.campaigns(rawCampaigns);
    const perfSnapshots = sanitizers.perfSnapshots(rawPerf);
    const opportunities = sanitizers.opportunities(rawOpportunities);
    const keywords = sanitizers.keywords(rawKeywords);
    const competitors = sanitizers.competitors(rawCompetitors);
    const storedPrompts = sanitizers.prompts(rawPrompts);

    // Seed built-in prompts on first run (or after a reset)
    const finalPrompts =
      storedPrompts.length > 0 ? storedPrompts : buildDefaultPrompts();
    if (storedPrompts.length === 0) {
      await storage.set(K.prompts, finalPrompts);
    }

    set({
      hydrated: true,
      settings,
      products,
      content,
      prompts: finalPrompts,
      tasks,
      launches,
      ideas,
      campaigns,
      perfSnapshots,
      opportunities,
      keywords,
      competitors,
    });
  },

  // settings
  async setSettings(patch) {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await storage.set(K.settings, next);
  },
  async setProvider(id, patch) {
    const s = get().settings;
    const next: AppSettings = {
      ...s,
      providers: {
        ...s.providers,
        [id]: { ...s.providers[id], ...patch },
      },
    };
    set({ settings: next });
    await storage.set(K.settings, next);
  },
  async setTheme(t) {
    await get().setSettings({ theme: t });
    try {
      localStorage.setItem("aicw.theme", t);
    } catch {
      /* ignore */
    }
    const dark =
      t === "dark" ||
      (t === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  },

  // products
  async createProduct(p) {
    const prod = emptyProduct(p);
    const next = [prod, ...get().products];
    set({ products: next });
    await storage.set(K.products, next);
    return prod;
  },
  async updateProduct(id, patch) {
    const next = get().products.map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: now() } : p
    );
    set({ products: next });
    await storage.set(K.products, next);
  },
  async deleteProduct(id) {
    const next = get().products.filter((p) => p.id !== id);
    set({ products: next });
    await storage.set(K.products, next);
  },

  // content
  async saveContent(c) {
    const item: ContentItem = {
      id: uid("cnt"),
      createdAt: now(),
      updatedAt: now(),
      ...c,
    };
    const next = [item, ...get().content];
    set({ content: next });
    await storage.set(K.content, next);
    return item;
  },
  async updateContent(id, patch) {
    const next = get().content.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: now() } : c
    );
    set({ content: next });
    await storage.set(K.content, next);
  },
  async deleteContent(id) {
    const next = get().content.filter((c) => c.id !== id);
    set({ content: next });
    await storage.set(K.content, next);
  },
  async togglePinContent(id) {
    const next = get().content.map((c) =>
      c.id === id ? { ...c, pinned: !c.pinned, updatedAt: now() } : c
    );
    set({ content: next });
    await storage.set(K.content, next);
  },

  // prompts
  async createPrompt(p) {
    const item: PromptTemplate = {
      id: uid("tpl"),
      name: p.name ?? "Untitled prompt",
      category: p.category ?? "custom",
      description: p.description ?? "",
      systemPrompt: p.systemPrompt ?? "",
      userPromptTemplate: p.userPromptTemplate ?? "",
      favorite: false,
      builtIn: false,
      versions: [],
      createdAt: now(),
      updatedAt: now(),
    };
    const next = [item, ...get().prompts];
    set({ prompts: next });
    await storage.set(K.prompts, next);
    return item;
  },
  async updatePrompt(id, patch) {
    const next = get().prompts.map((p) => {
      if (p.id !== id) return p;
      const isContentChange =
        (patch.systemPrompt !== undefined && patch.systemPrompt !== p.systemPrompt) ||
        (patch.userPromptTemplate !== undefined &&
          patch.userPromptTemplate !== p.userPromptTemplate);
      const versions = isContentChange
        ? [
            ...p.versions,
            {
              ts: now(),
              systemPrompt: p.systemPrompt,
              userPromptTemplate: p.userPromptTemplate,
            },
          ].slice(-20)
        : p.versions;
      return { ...p, ...patch, versions, updatedAt: now() };
    });
    set({ prompts: next });
    await storage.set(K.prompts, next);
  },
  async deletePrompt(id) {
    const next = get().prompts.filter((p) => p.id !== id);
    set({ prompts: next });
    await storage.set(K.prompts, next);
  },
  async toggleFavoritePrompt(id) {
    const next = get().prompts.map((p) =>
      p.id === id ? { ...p, favorite: !p.favorite, updatedAt: now() } : p
    );
    set({ prompts: next });
    await storage.set(K.prompts, next);
  },
  async resetBuiltInPrompts() {
    const custom = get().prompts.filter((p) => !p.builtIn);
    const next = [...buildDefaultPrompts(), ...custom];
    set({ prompts: next });
    await storage.set(K.prompts, next);
  },

  // tasks
  async addTask(t) {
    const item: Task = {
      id: uid("tsk"),
      title: t.title ?? "New task",
      done: false,
      due: t.due,
      productId: t.productId,
      createdAt: now(),
    };
    const next = [item, ...get().tasks];
    set({ tasks: next });
    await storage.set(K.tasks, next);
  },
  async updateTask(id, patch) {
    const next = get().tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    set({ tasks: next });
    await storage.set(K.tasks, next);
  },
  async deleteTask(id) {
    const next = get().tasks.filter((t) => t.id !== id);
    set({ tasks: next });
    await storage.set(K.tasks, next);
  },
  async toggleTask(id) {
    const next = get().tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    set({ tasks: next });
    await storage.set(K.tasks, next);
  },

  // launches
  async addLaunch(e) {
    const item: LaunchEvent = {
      id: uid("lnc"),
      productId: e.productId ?? "",
      date: e.date ?? new Date().toISOString().slice(0, 10),
      channel: e.channel ?? "payhip",
      status: e.status ?? "scheduled",
      notes: e.notes ?? "",
    };
    const next = [item, ...get().launches];
    set({ launches: next });
    await storage.set(K.launches, next);
  },
  async updateLaunch(id, patch) {
    const next = get().launches.map((l) =>
      l.id === id ? { ...l, ...patch } : l
    );
    set({ launches: next });
    await storage.set(K.launches, next);
  },
  async deleteLaunch(id) {
    const next = get().launches.filter((l) => l.id !== id);
    set({ launches: next });
    await storage.set(K.launches, next);
  },

  // ideas
  async addIdea(text) {
    const item: Idea = {
      id: uid("idea"),
      text: text.trim(),
      pinned: false,
      createdAt: now(),
    };
    if (!item.text) return;
    const next = [item, ...get().ideas];
    set({ ideas: next });
    await storage.set(K.ideas, next);
  },
  async togglePinIdea(id) {
    const next = get().ideas.map((i) =>
      i.id === id ? { ...i, pinned: !i.pinned } : i
    );
    set({ ideas: next });
    await storage.set(K.ideas, next);
  },
  async deleteIdea(id) {
    const next = get().ideas.filter((i) => i.id !== id);
    set({ ideas: next });
    await storage.set(K.ideas, next);
  },

  // campaigns
  async createCampaign(c) {
    const item: Campaign = {
      id: uid("cmp"),
      name: c.name ?? "Untitled campaign",
      productIds: c.productIds ?? [],
      platform: c.platform ?? "pinterest",
      goal: c.goal ?? "traffic",
      startDate:
        c.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: c.endDate,
      budget: c.budget ?? 0,
      status: c.status ?? "draft",
      notes: c.notes ?? "",
      tags: c.tags ?? [],
      audienceNotes: c.audienceNotes ?? "",
      lessonsLearned: c.lessonsLearned ?? "",
      optimizationIdeas: c.optimizationIdeas ?? "",
      versions: [],
      createdAt: now(),
      updatedAt: now(),
    };
    const next = [item, ...get().campaigns];
    set({ campaigns: next });
    await storage.set(K.campaigns, next);
    return item;
  },
  async updateCampaign(id, patch) {
    const next = get().campaigns.map((c) => {
      if (c.id !== id) return c;
      // Editorial version: push a snapshot when any of the long-form fields
      // changes, capped at 20 entries. Mirrors PromptTemplate behavior.
      const editorialChanged =
        (patch.notes !== undefined && patch.notes !== c.notes) ||
        (patch.lessonsLearned !== undefined &&
          patch.lessonsLearned !== c.lessonsLearned) ||
        (patch.optimizationIdeas !== undefined &&
          patch.optimizationIdeas !== c.optimizationIdeas);
      const versions = editorialChanged
        ? [
            ...c.versions,
            {
              ts: now(),
              notes: c.notes,
              lessonsLearned: c.lessonsLearned,
              optimizationIdeas: c.optimizationIdeas,
            },
          ].slice(-20)
        : c.versions;
      return { ...c, ...patch, versions, updatedAt: now() };
    });
    set({ campaigns: next });
    await storage.set(K.campaigns, next);
  },
  async deleteCampaign(id) {
    const nextCampaigns = get().campaigns.filter((c) => c.id !== id);
    // Cascade-delete the campaign's performance snapshots. Content items
    // are intentionally NOT deleted — they keep their campaignId but become
    // orphaned references, which the UI handles by ignoring unknown ids.
    const nextPerf = get().perfSnapshots.filter((p) => p.campaignId !== id);
    set({ campaigns: nextCampaigns, perfSnapshots: nextPerf });
    await Promise.all([
      storage.set(K.campaigns, nextCampaigns),
      storage.set(K.perfSnapshots, nextPerf),
    ]);
  },

  // performance snapshots
  async addPerformance(p) {
    const item: PerformanceSnapshot = {
      id: uid("perf"),
      campaignId: p.campaignId ?? "",
      date: p.date ?? new Date().toISOString().slice(0, 10),
      impressions: p.impressions ?? 0,
      clicks: p.clicks ?? 0,
      saves: p.saves ?? 0,
      shares: p.shares ?? 0,
      comments: p.comments ?? 0,
      emailOpens: p.emailOpens ?? 0,
      emailClicks: p.emailClicks ?? 0,
      websiteVisits: p.websiteVisits ?? 0,
      productPageVisits: p.productPageVisits ?? 0,
      sales: p.sales ?? 0,
      revenue: p.revenue ?? 0,
      cost: p.cost ?? 0,
      notes: p.notes ?? "",
      createdAt: now(),
      updatedAt: now(),
    };
    const next = [item, ...get().perfSnapshots];
    set({ perfSnapshots: next });
    await storage.set(K.perfSnapshots, next);
    return item;
  },
  async updatePerformance(id, patch) {
    const next = get().perfSnapshots.map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: now() } : p
    );
    set({ perfSnapshots: next });
    await storage.set(K.perfSnapshots, next);
  },
  async deletePerformance(id) {
    const next = get().perfSnapshots.filter((p) => p.id !== id);
    set({ perfSnapshots: next });
    await storage.set(K.perfSnapshots, next);
  },

  // research — opportunities
  async createOpportunity(o) {
    const factors = o.score?.factors ?? {};
    const score = buildScore(factors, get().settings);
    const item: Opportunity = {
      id: uid("opp"),
      title: o.title ?? "Untitled opportunity",
      description: o.description ?? "",
      category: o.category ?? "",
      audience: o.audience ?? "",
      keywords: o.keywords ?? [],
      trend: o.trend ?? "stable",
      status: o.status ?? "idea",
      score,
      notes: o.notes ?? "",
      linkedProductId: o.linkedProductId,
      relatedProductIds: o.relatedProductIds ?? [],
      source: o.source ?? "manual",
      createdAt: now(),
      updatedAt: now(),
    };
    const next = [item, ...get().opportunities];
    set({ opportunities: next });
    await storage.set(K.opportunities, next);
    return item;
  },
  async updateOpportunity(id, patch) {
    const settings = get().settings;
    const next = get().opportunities.map((o) => {
      if (o.id !== id) return o;
      // If `score.factors` is being patched, recompute the total. If only
      // `score.total` is patched explicitly (e.g. AI sets it), trust it.
      let nextScore = o.score;
      if (patch.score?.factors !== undefined) {
        nextScore = buildScore(
          { ...o.score.factors, ...patch.score.factors },
          settings
        );
      } else if (patch.score) {
        nextScore = patch.score;
      }
      return { ...o, ...patch, score: nextScore, updatedAt: now() };
    });
    set({ opportunities: next });
    await storage.set(K.opportunities, next);
  },
  async setOpportunityFactor(id, factor, value) {
    const settings = get().settings;
    const next = get().opportunities.map((o) => {
      if (o.id !== id) return o;
      const factors = { ...o.score.factors, [factor]: value };
      return {
        ...o,
        score: buildScore(factors, settings),
        updatedAt: now(),
      };
    });
    set({ opportunities: next });
    await storage.set(K.opportunities, next);
  },
  async deleteOpportunity(id) {
    const next = get().opportunities.filter((o) => o.id !== id);
    set({ opportunities: next });
    await storage.set(K.opportunities, next);
  },
  async convertOpportunityToProduct(id) {
    const o = get().opportunities.find((x) => x.id === id);
    if (!o) return null;
    // If this opportunity already produced a product, return that — don't
    // create duplicates on re-click.
    if (o.linkedProductId) {
      return get().products.find((p) => p.id === o.linkedProductId) ?? null;
    }
    const product = await get().createProduct({
      title: o.title,
      category: o.category,
      audience: o.audience,
      problemSolved: o.description,
      keywords: o.keywords,
      notes: `Created from opportunity. Original notes:\n${o.notes}`.trim(),
      status: "idea",
    });
    // Persist the back-reference and advance the pipeline status.
    await get().updateOpportunity(o.id, {
      linkedProductId: product.id,
      status: o.status === "idea" || o.status === "researching" ? "creating" : o.status,
    });
    return product;
  },

  // research — keywords
  async createKeyword(k) {
    const item: Keyword = {
      id: uid("kw"),
      term: k.term ?? "",
      type: k.type ?? "long-tail",
      topic: k.topic ?? "",
      trend: k.trend,
      notes: k.notes ?? "",
      createdAt: now(),
      updatedAt: now(),
    };
    if (!item.term.trim()) throw new Error("Keyword term is required");
    const next = [item, ...get().keywords];
    set({ keywords: next });
    await storage.set(K.keywords, next);
    return item;
  },
  async updateKeyword(id, patch) {
    const next = get().keywords.map((k) =>
      k.id === id ? { ...k, ...patch, updatedAt: now() } : k
    );
    set({ keywords: next });
    await storage.set(K.keywords, next);
  },
  async deleteKeyword(id) {
    const next = get().keywords.filter((k) => k.id !== id);
    set({ keywords: next });
    await storage.set(K.keywords, next);
  },

  // research — competitors
  async createCompetitor(c) {
    const item: Competitor = {
      id: uid("cmp"),
      productTitle: c.productTitle ?? "Untitled competitor",
      category: c.category ?? "",
      price: c.price ?? "",
      url: c.url,
      strengths: c.strengths ?? "",
      weaknesses: c.weaknesses ?? "",
      missingFeatures: c.missingFeatures ?? "",
      notes: c.notes ?? "",
      createdAt: now(),
      updatedAt: now(),
    };
    const next = [item, ...get().competitors];
    set({ competitors: next });
    await storage.set(K.competitors, next);
    return item;
  },
  async updateCompetitor(id, patch) {
    const next = get().competitors.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: now() } : c
    );
    set({ competitors: next });
    await storage.set(K.competitors, next);
  },
  async deleteCompetitor(id) {
    const next = get().competitors.filter((c) => c.id !== id);
    set({ competitors: next });
    await storage.set(K.competitors, next);
  },

  // utility
  async exportAll() {
    const s = get();
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: { ...s.settings, providers: redactKeys(s.settings.providers) },
        products: s.products,
        content: s.content,
        prompts: s.prompts,
        tasks: s.tasks,
        launches: s.launches,
        ideas: s.ideas,
        campaigns: s.campaigns,
        perfSnapshots: s.perfSnapshots,
        opportunities: s.opportunities,
        keywords: s.keywords,
        competitors: s.competitors,
      },
      null,
      2
    );
  },
  async importAll(json) {
    // 1. Parse. Bad JSON → fail with a user-facing message rather than
    //    a raw SyntaxError surfacing through the ErrorBoundary.
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      throw new Error("Backup file is not valid JSON.");
    }

    // 2. Validate the top-level shape and the version field. A future v2
    //    backup imported by today's v1 app would silently truncate any
    //    newly-added fields — refuse instead.
    const header = validateBackupHeader(data);
    if (!header.ok) throw new Error(header.error);

    const obj = data as Record<string, unknown>;
    const summary: ImportSummary = { imported: {}, dropped: {} };

    // 3. Per-slice import. Each slice runs through its sanitizer and we
    //    record both how many were kept and how many were silently
    //    dropped, so the caller can show a precise "X imported, Y skipped"
    //    message instead of a vague "done".
    async function applySlice<T>(
      storageKey: string,
      name: string,
      raw: unknown,
      sanitize: (v: unknown) => T[]
    ): Promise<void> {
      const { kept, droppedCount } = summarizeImportSlice(raw, sanitize);
      if (raw === undefined) return; // slice absent — neither imported nor dropped
      summary.imported[name] = kept.length;
      if (droppedCount > 0) summary.dropped[name] = droppedCount;
      await storage.set(storageKey, kept);
    }

    await applySlice(K.products, "products", obj.products, sanitizers.products);
    await applySlice(K.content, "content", obj.content, sanitizers.content);
    await applySlice(K.prompts, "prompts", obj.prompts, sanitizers.prompts);
    await applySlice(K.tasks, "tasks", obj.tasks, sanitizers.tasks);
    await applySlice(K.launches, "launches", obj.launches, sanitizers.launches);
    await applySlice(K.ideas, "ideas", obj.ideas, sanitizers.ideas);
    await applySlice(
      K.campaigns,
      "campaigns",
      obj.campaigns,
      sanitizers.campaigns
    );
    await applySlice(
      K.perfSnapshots,
      "perfSnapshots",
      obj.perfSnapshots,
      sanitizers.perfSnapshots
    );
    await applySlice(
      K.opportunities,
      "opportunities",
      obj.opportunities,
      sanitizers.opportunities
    );
    await applySlice(K.keywords, "keywords", obj.keywords, sanitizers.keywords);
    await applySlice(
      K.competitors,
      "competitors",
      obj.competitors,
      sanitizers.competitors
    );

    // Settings is a single object, not an array. Sanitize and write.
    if (obj.settings !== undefined) {
      await storage.set(K.settings, sanitizeSettings(obj.settings));
      summary.imported.settings = 1;
    }

    await get().hydrate();
    return summary;
  },
  async resetWorkspace() {
    await storage.clearAll();
    // Re-seed built-in prompts so the app remains usable immediately
    // after a reset, without requiring a full page reload.
    const seeded = buildDefaultPrompts();
    await storage.set(K.prompts, seeded);
    set({
      settings: DEFAULT_SETTINGS,
      products: [],
      content: [],
      prompts: seeded,
      tasks: [],
      launches: [],
      ideas: [],
      campaigns: [],
      perfSnapshots: [],
      opportunities: [],
      keywords: [],
      competitors: [],
    });
  },
}));

function redactKeys(providers: AppSettings["providers"]) {
  const out: AppSettings["providers"] = { ...providers };
  for (const id of Object.keys(out) as (keyof AppSettings["providers"])[]) {
    if (out[id]?.apiKey) {
      out[id] = { ...out[id], apiKey: "" };
    }
  }
  return out;
}
