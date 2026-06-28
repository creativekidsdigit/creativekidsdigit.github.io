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
  kind: ContentKind;
  templateId: string; // which generator template produced it
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
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
