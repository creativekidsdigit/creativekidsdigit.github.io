// Shared domain types for the AI Copywriting OS

export type Platform =
  | "payhip"
  | "shopify"
  | "etsy"
  | "gumroad"
  | "kdp"
  | "pinterest"
  | "own-site"
  | "other";

export type ProductStatus =
  | "idea"
  | "drafting"
  | "in-review"
  | "ready"
  | "launched"
  | "paused"
  | "retired";

export interface Product {
  id: string;
  title: string;
  category: string;
  audience: string;
  problemSolved: string;
  benefits: string[];
  keywords: string[];
  pricing: string;
  platform: Platform;
  status: ProductStatus;
  launchDate?: string; // ISO date
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export type ContentKind =
  | "copy"
  | "pinterest"
  | "seo"
  | "blog"
  | "email"
  | "social"
  | "funnel"
  | "other";

export interface ContentItem {
  id: string;
  productId?: string;
  /**
   * Optional link back to a campaign. Lets the Campaign Detail page list
   * every generated marketing asset belonging to a campaign without needing
   * a separate join table. Set by the Copy Generator when a campaign is
   * active, or manually from the Campaign Detail page.
   */
  campaignId?: string;
  kind: ContentKind;
  templateId: string; // which generator template produced it
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  /**
   * Optional timestamp (ms since epoch) for when the user marked this asset
   * as published to its target platform from the Publishing Workspace.
   * Lets us show "X of N published" progress on a campaign without
   * needing platform integrations.
   */
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string; // can include {{product.title}} etc.
  favorite: boolean;
  builtIn: boolean;
  versions: { ts: number; systemPrompt: string; userPromptTemplate: string }[];
  createdAt: number;
  updatedAt: number;
}

export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter"
  | "ollama";

export interface ProviderConfig {
  id: ProviderId;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

export interface AppSettings {
  activeProvider: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
  theme: "light" | "dark" | "system";
  brandVoice: string;
  defaultAudience: string;
  autosave: boolean;
}

export type Task = {
  id: string;
  title: string;
  done: boolean;
  due?: string;
  productId?: string;
  createdAt: number;
};

export type LaunchEvent = {
  id: string;
  productId: string;
  date: string; // ISO
  channel: Platform;
  status: "scheduled" | "live" | "complete";
  notes: string;
};

export type Idea = {
  id: string;
  text: string;
  pinned: boolean;
  createdAt: number;
};


// ============================================================================
// Campaign Analytics
// ============================================================================

export type CampaignPlatform =
  | "pinterest"
  | "facebook"
  | "instagram"
  | "google"
  | "email"
  | "organic-seo"
  | "other";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export type CampaignGoal =
  | "awareness"
  | "traffic"
  | "engagement"
  | "leads"
  | "sales"
  | "retention"
  | "other";

export interface Campaign {
  id: string;
  name: string;
  productIds: string[];
  platform: CampaignPlatform;
  goal: CampaignGoal;
  startDate: string; // ISO yyyy-mm-dd
  endDate?: string; // ISO yyyy-mm-dd
  budget: number; // currency-agnostic; user-chosen units
  status: CampaignStatus;
  notes: string;
  tags: string[];
  audienceNotes: string;
  lessonsLearned: string;
  optimizationIdeas: string;
  /**
   * Editorial version history. Mirrors the PromptTemplate pattern — every
   * substantive edit to notes / lessons / ideas pushes a snapshot. Capped
   * at 20 entries to keep storage bounded.
   */
  versions: {
    ts: number;
    notes: string;
    lessonsLearned: string;
    optimizationIdeas: string;
  }[];
  createdAt: number;
  updatedAt: number;
}

/**
 * A point-in-time performance measurement for a single campaign.
 *
 * Each snapshot represents a period's totals (e.g. "this week"). Aggregates
 * across snapshots are computed as sums, so the user enters platform data
 * the same way they read it from a dashboard — no delta math required.
 *
 * `cost` is the actual spend recorded for this period; budget on the parent
 * Campaign is the planned spend. ROI = (sum(revenue) - sum(cost)) / sum(cost).
 */
export interface PerformanceSnapshot {
  id: string;
  campaignId: string;
  date: string; // ISO yyyy-mm-dd
  impressions: number;
  clicks: number;
  saves: number;
  shares: number;
  comments: number;
  emailOpens: number;
  emailClicks: number;
  websiteVisits: number;
  productPageVisits: number;
  sales: number; // count of sales (orders)
  revenue: number;
  cost: number;
  notes: string;
  createdAt: number;
  updatedAt: number;
}
