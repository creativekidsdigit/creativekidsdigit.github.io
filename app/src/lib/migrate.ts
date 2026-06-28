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
  Campaign,
  CampaignGoal,
  CampaignPlatform,
  CampaignStatus,
  ContentItem,
  ContentKind,
  Idea,
  LaunchEvent,
  PerformanceSnapshot,
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
/**
 * Like `asNumber`, but additionally clamps negative values to zero. Used for
 * count-type metrics (impressions, clicks, sales, etc.) where a negative
 * value is meaningless and would silently corrupt charts and aggregates.
 * Monetary fields (revenue, cost) deliberately do NOT use this — they can be
 * negative to represent refunds or adjustments.
 */
function asNonNegativeNumber(v: unknown, fallback = 0): number {
  const n = asNumber(v, fallback);
  return n < 0 ? 0 : n;
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
    campaignId: typeof v.campaignId === "string" ? v.campaignId : undefined,
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

/** ---------- Campaigns ---------- */

const CAMPAIGN_PLATFORMS: CampaignPlatform[] = [
  "pinterest",
  "facebook",
  "instagram",
  "google",
  "email",
  "organic-seo",
  "other",
];
const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "completed",
  "archived",
];
const CAMPAIGN_GOALS: CampaignGoal[] = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "sales",
  "retention",
  "other",
];

export function sanitizeCampaign(v: unknown): Campaign | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  const name = asString(v.name);
  if (!id || !name) return null;
  const platform = (CAMPAIGN_PLATFORMS as readonly string[]).includes(
    asString(v.platform)
  )
    ? (v.platform as CampaignPlatform)
    : "other";
  const status = (CAMPAIGN_STATUSES as readonly string[]).includes(
    asString(v.status)
  )
    ? (v.status as CampaignStatus)
    : "draft";
  const goal = (CAMPAIGN_GOALS as readonly string[]).includes(
    asString(v.goal)
  )
    ? (v.goal as CampaignGoal)
    : "traffic";
  const versionsRaw = Array.isArray(v.versions) ? v.versions : [];
  const versions = versionsRaw
    .map((ver) => {
      if (!isObject(ver)) return null;
      return {
        ts: asNumber(ver.ts, now()),
        notes: asString(ver.notes),
        lessonsLearned: asString(ver.lessonsLearned),
        optimizationIdeas: asString(ver.optimizationIdeas),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  return {
    id,
    name,
    productIds: asStringArray(v.productIds),
    platform,
    goal,
    startDate: asString(
      v.startDate,
      new Date().toISOString().slice(0, 10)
    ),
    endDate: typeof v.endDate === "string" ? v.endDate : undefined,
    budget: asNumber(v.budget, 0),
    status,
    notes: asString(v.notes),
    tags: asStringArray(v.tags),
    audienceNotes: asString(v.audienceNotes),
    lessonsLearned: asString(v.lessonsLearned),
    optimizationIdeas: asString(v.optimizationIdeas),
    versions,
    createdAt: asNumber(v.createdAt, now()),
    updatedAt: asNumber(v.updatedAt, now()),
  };
}

export function sanitizePerformance(
  v: unknown
): PerformanceSnapshot | null {
  if (!isObject(v)) return null;
  const id = asString(v.id);
  const campaignId = asString(v.campaignId);
  if (!id || !campaignId) return null;
  return {
    id,
    campaignId,
    date: asString(v.date, new Date().toISOString().slice(0, 10)),
    // Count metrics: negatives are meaningless, clamp to zero. This protects
    // every downstream chart, KPI tile, and AI insight from absurd values
    // (typed by the user, imported from a backup, or written by future code).
    impressions: asNonNegativeNumber(v.impressions, 0),
    clicks: asNonNegativeNumber(v.clicks, 0),
    saves: asNonNegativeNumber(v.saves, 0),
    shares: asNonNegativeNumber(v.shares, 0),
    comments: asNonNegativeNumber(v.comments, 0),
    emailOpens: asNonNegativeNumber(v.emailOpens, 0),
    emailClicks: asNonNegativeNumber(v.emailClicks, 0),
    websiteVisits: asNonNegativeNumber(v.websiteVisits, 0),
    productPageVisits: asNonNegativeNumber(v.productPageVisits, 0),
    sales: asNonNegativeNumber(v.sales, 0),
    // Monetary fields stay signed — a negative revenue/cost line can validly
    // represent a refund or accounting adjustment in a single period.
    revenue: asNumber(v.revenue, 0),
    cost: asNumber(v.cost, 0),
    notes: asString(v.notes),
    createdAt: asNumber(v.createdAt, now()),
    updatedAt: asNumber(v.updatedAt, now()),
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
  campaigns: (v: unknown): Campaign[] => sanitizeArray(v, sanitizeCampaign),
  perfSnapshots: (v: unknown): PerformanceSnapshot[] =>
    sanitizeArray(v, sanitizePerformance),
  settings: sanitizeSettings,
};
