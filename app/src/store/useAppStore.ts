import { create } from "zustand";
import { storage, K } from "@/lib/storage";
import { uid, now } from "@/lib/id";
import { DEFAULT_SETTINGS, buildDefaultPrompts } from "@/lib/defaults";
import type {
  AppSettings,
  ContentItem,
  Idea,
  LaunchEvent,
  Product,
  PromptTemplate,
  Task,
} from "@/types";

interface AppState {
  hydrated: boolean;
  settings: AppSettings;
  products: Product[];
  content: ContentItem[];
  prompts: PromptTemplate[];
  tasks: Task[];
  launches: LaunchEvent[];
  ideas: Idea[];

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

  // utility
  exportAll(): Promise<string>;
  importAll(json: string): Promise<void>;
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

  async hydrate() {
    const [settings, products, content, prompts, tasks, launches, ideas] =
      await Promise.all([
        storage.get<AppSettings>(K.settings, DEFAULT_SETTINGS),
        storage.get<Product[]>(K.products, []),
        storage.get<ContentItem[]>(K.content, []),
        storage.get<PromptTemplate[]>(K.prompts, []),
        storage.get<Task[]>(K.tasks, []),
        storage.get<LaunchEvent[]>(K.launches, []),
        storage.get<Idea[]>(K.ideas, []),
      ]);

    // Merge any newly-added default settings keys for forward-compat
    const mergedSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      providers: {
        ...DEFAULT_SETTINGS.providers,
        ...(settings?.providers ?? {}),
      },
    };

    // Seed built-in prompts on first run
    const finalPrompts =
      prompts && prompts.length > 0 ? prompts : buildDefaultPrompts();
    if (!prompts || prompts.length === 0) {
      await storage.set(K.prompts, finalPrompts);
    }

    set({
      hydrated: true,
      settings: mergedSettings,
      products,
      content,
      prompts: finalPrompts,
      tasks,
      launches,
      ideas,
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
      },
      null,
      2
    );
  },
  async importAll(json) {
    const data = JSON.parse(json);
    if (data.settings) await storage.set(K.settings, data.settings);
    if (data.products) await storage.set(K.products, data.products);
    if (data.content) await storage.set(K.content, data.content);
    if (data.prompts) await storage.set(K.prompts, data.prompts);
    if (data.tasks) await storage.set(K.tasks, data.tasks);
    if (data.launches) await storage.set(K.launches, data.launches);
    if (data.ideas) await storage.set(K.ideas, data.ideas);
    await get().hydrate();
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
