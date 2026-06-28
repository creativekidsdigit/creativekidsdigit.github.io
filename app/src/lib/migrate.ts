// Shape validators + light migrations for persisted entities.
//
// Each guard returns true only if the value passes minimal structural checks.
// Anything stricter (e.g. cross-field invariants) is intentionally left out —
// the goal is to recover from corruption without throwing away the user's
// data, not to enforce a full JSON schema at runtime.
//
// Each `sanitize*` function takes a raw value and returns a clean, typed
// instance with defaults filled in for missing optional fields. Unknown
// extra fields are preserved (forward-compat with the next schema bump).

import type {
  AppSettings,
  ContentItem,
  ContentKind,
  Idea,
  LaunchEvent,
  Platform,
  Product,
  ProductStatus,
  PromptTemplate,
  ProviderConfig,
  ProviderId,
  Task,
} from "@/types";
import { DEFAULT_SETTINGS } from "./defaults";
import { now } from "./id";

const PLATFORMS: Platform[] = [
  "payhip",
  "shopify",
  "etsy",
  "gumroad",
  "kdp",
  "pinterest",
  "own-site",
  "other",
];
const STATUSES: ProductStatus[] = [
  "idea",
  "drafting",
  "in-review",
  "ready",
  "launched",
  "paused",
  "retired",
];
const CONTENT_KINDS: ContentKind[] = [
  "copy",
  "pinterest",
  "seo",
  "blog",
  "email",
  "social",
  "funnel",
  "other",
];
const PROVIDER_IDS: ProviderId[] = [
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "ollama",
];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/** ---------- Products ---------- */

export function sanitizeProduct(v: unknown): Product | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  const title = asString(v.title);
  if (!id || !title) return null;
  const platform = (PLATFORMS as readonly string[]).includes(
    asString(v.platform)
  )
    ? (v.platform as Platform)
    : "other";
  const status = (STATUSES as readonly string[]).includes(asString(v.status))
    ? (v.status as ProductStatus)
    : "idea";
  return {
    id,
    title,
    category: asString(v.category),
    audience: asString(v.audience),
    problemSolved: asString(v.problemSolved),
    benefits: asStringArray(v.benefits),
    keywords: asStringArray(v.keywords),
    pricing: asString(v.pricing),
    platform,
    status,
    launchDate: typeof v.launchDate === "string" ? v.launchDate : undefined,
    notes: asString(v.notes),
    createdAt: asNumber(v.createdAt, now()),
    updatedAt: asNumber(v.updatedAt, now()),
  };
}

/** ---------- Content ---------- */

export function sanitizeContent(v: unknown): ContentItem | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  if (!id) return null;
  const kind = (CONTENT_KINDS as readonly string[]).includes(asString(v.kind))
    ? (v.kind as ContentKind)
    : "other";
  return {
    id,
    productId: typeof v.productId === "string" ? v.productId : undefined,
    kind,
    templateId: asString(v.templateId),
    title: asString(v.title, "Untitled"),
    body: asString(v.body),
    tags: asStringArray(v.tags),
    pinned: asBool(v.pinned),
    createdAt: asNumber(v.createdAt, now()),
    updatedAt: asNumber(v.updatedAt, now()),
  };
}

/** ---------- Prompts ---------- */

export function sanitizePrompt(v: unknown): PromptTemplate | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  const name = asString(v.name);
  if (!id || !name) return null;
  const versionsRaw = Array.isArray(v.versions) ? v.versions : [];
  const versions = versionsRaw
    .map((ver) => {
      if (!isObject(ver)) return null;
      return {
        ts: asNumber(ver.ts, now()),
        systemPrompt: asString(ver.systemPrompt),
        userPromptTemplate: asString(ver.userPromptTemplate),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  return {
    id,
    name,
    category: asString(v.category, "custom"),
    description: asString(v.description),
    systemPrompt: asString(v.systemPrompt),
    userPromptTemplate: asString(v.userPromptTemplate),
    favorite: asBool(v.favorite),
    builtIn: asBool(v.builtIn),
    versions,
    createdAt: asNumber(v.createdAt, now()),
    updatedAt: asNumber(v.updatedAt, now()),
  };
}

/** ---------- Tasks ---------- */

export function sanitizeTask(v: unknown): Task | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  if (!id) return null;
  return {
    id,
    title: asString(v.title, "Untitled task"),
    done: asBool(v.done),
    due: typeof v.due === "string" ? v.due : undefined,
    productId: typeof v.productId === "string" ? v.productId : undefined,
    createdAt: asNumber(v.createdAt, now()),
  };
}

/** ---------- Launches ---------- */

export function sanitizeLaunch(v: unknown): LaunchEvent | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  if (!id) return null;
  const channel = (PLATFORMS as readonly string[]).includes(asString(v.channel))
    ? (v.channel as Platform)
    : "other";
  const status =
    v.status === "live" || v.status === "complete" ? v.status : "scheduled";
  return {
    id,
    productId: asString(v.productId),
    date: asString(v.date, new Date().toISOString().slice(0, 10)),
    channel,
    status,
    notes: asString(v.notes),
  };
}

/** ---------- Ideas ---------- */

export function sanitizeIdea(v: unknown): Idea | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  const text = asString(v.text);
  if (!id || !text) return null;
  return {
    id,
    text,
    pinned: asBool(v.pinned),
    createdAt: asNumber(v.createdAt, now()),
  };
}

/** ---------- Settings ---------- */

function sanitizeProvider(
  id: ProviderId,
  v: unknown,
  fallback: ProviderConfig
): ProviderConfig {
  if (!isObject(v)) return fallback;
  return {
    id,
    apiKey: asString(v.apiKey, fallback.apiKey ?? ""),
    baseUrl: asString(v.baseUrl, fallback.baseUrl ?? ""),
    model: asString(v.model, fallback.model),
    enabled: asBool(v.enabled, fallback.enabled),
  };
}

export function sanitizeSettings(v: unknown): AppSettings {
  if (!isObject(v)) return { ...DEFAULT_SETTINGS };
  const activeProvider = (PROVIDER_IDS as readonly string[]).includes(
    asString(v.activeProvider)
  )
    ? (v.activeProvider as ProviderId)
    : DEFAULT_SETTINGS.activeProvider;
  const theme =
    v.theme === "light" || v.theme === "dark" || v.theme === "system"
      ? v.theme
      : DEFAULT_SETTINGS.theme;
  const providersRaw = isObject(v.providers) ? v.providers : {};
  const providers = Object.fromEntries(
    PROVIDER_IDS.map((id) => [
      id,
      sanitizeProvider(id, providersRaw[id], DEFAULT_SETTINGS.providers[id]),
    ])
  ) as AppSettings["providers"];
  return {
    activeProvider,
    providers,
    theme,
    brandVoice: asString(v.brandVoice, DEFAULT_SETTINGS.brandVoice),
    defaultAudience: asString(
      v.defaultAudience,
      DEFAULT_SETTINGS.defaultAudience
    ),
    autosave: asBool(v.autosave, DEFAULT_SETTINGS.autosave),
  };
}

/** ---------- Array sanitizers ---------- */

function sanitizeArray<T>(v: unknown, item: (raw: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const raw of v) {
    const clean = item(raw);
    if (clean) out.push(clean);
  }
  return out;
}

export const sanitizers = {
  products: (v: unknown): Product[] => sanitizeArray(v, sanitizeProduct),
  content: (v: unknown): ContentItem[] => sanitizeArray(v, sanitizeContent),
  prompts: (v: unknown): PromptTemplate[] => sanitizeArray(v, sanitizePrompt),
  tasks: (v: unknown): Task[] => sanitizeArray(v, sanitizeTask),
  launches: (v: unknown): LaunchEvent[] => sanitizeArray(v, sanitizeLaunch),
  ideas: (v: unknown): Idea[] => sanitizeArray(v, sanitizeIdea),
  settings: sanitizeSettings,
};
