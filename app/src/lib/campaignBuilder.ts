// Campaign Builder — pure orchestration logic.
//
// The Builder does NOT define its own AI prompts. It picks existing built-in
// prompt templates from the Prompt Library by exact name and orchestrates many
// ai.generate() calls in parallel. This keeps the Builder a thin
// "compose every existing generator" workflow rather than a parallel
// implementation.
//
// Inputs:  product + selected platforms + selected objective.
// Output:  a list of BuilderTask, each referencing one prompt-template name,
//          one ContentKind, one display group, and an objective-derived
//          "additional instructions" hint that's appended to the user prompt
//          at execution time.

import type {
  Campaign,
  CampaignGoal,
  ContentKind,
  PromptTemplate,
} from "@/types";

// ---------------------------------------------------------------------------
// Platforms (8) — the user can multi-select. Each maps to one or more tasks.
// ---------------------------------------------------------------------------
export type BuilderPlatform =
  | "payhip"
  | "pinterest"
  | "email"
  | "blog"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "x";

export const PLATFORM_LABELS: Record<BuilderPlatform, string> = {
  payhip: "Payhip",
  pinterest: "Pinterest",
  email: "Email",
  blog: "Blog",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
};

export const ALL_PLATFORMS: BuilderPlatform[] = [
  "payhip",
  "pinterest",
  "email",
  "blog",
  "facebook",
  "instagram",
  "linkedin",
  "x",
];

// ---------------------------------------------------------------------------
// Objectives (6) — single-select. Sets the campaign framing hint.
// ---------------------------------------------------------------------------
export type BuilderObjective =
  | "product-launch"
  | "evergreen-sales"
  | "seasonal-promotion"
  | "back-to-school"
  | "holiday"
  | "lead-generation";

export const OBJECTIVE_LABELS: Record<BuilderObjective, string> = {
  "product-launch": "Product launch",
  "evergreen-sales": "Evergreen sales",
  "seasonal-promotion": "Seasonal promotion",
  "back-to-school": "Back-to-school",
  holiday: "Holiday",
  "lead-generation": "Lead generation",
};

export const ALL_OBJECTIVES: BuilderObjective[] = [
  "product-launch",
  "evergreen-sales",
  "seasonal-promotion",
  "back-to-school",
  "holiday",
  "lead-generation",
];

/**
 * Per-objective instructions that get appended to every task's user prompt.
 * This is what teaches the AI to keep the campaign tonally consistent across
 * 14 separate generations.
 */
export const OBJECTIVE_HINT: Record<BuilderObjective, string> = {
  "product-launch":
    "Campaign objective: PRODUCT LAUNCH. Frame every asset around this being a brand-new release. Lean into novelty, the 'just released' angle, and first-mover excitement without sounding desperate.",
  "evergreen-sales":
    "Campaign objective: EVERGREEN SALES. Avoid time-sensitive language and seasonal references. The asset should still feel relevant six months from now. Focus on the lasting transformation the product delivers.",
  "seasonal-promotion":
    "Campaign objective: SEASONAL PROMOTION. Frame around a current limited-time offer. Add gentle urgency (clear end date, scarcity language) without being pushy or hyped.",
  "back-to-school":
    "Campaign objective: BACK-TO-SCHOOL (August–September). Lean into preparing for the school year, easing routine transitions, and parent stress around homework and morning routines. Tone is calm and reassuring, not alarmist.",
  holiday:
    "Campaign objective: HOLIDAY SEASON. Reference family time, traditions, and gift-giving where the product fits. Avoid generic 'holiday cheer' filler — make it specific to what this product solves during the season.",
  "lead-generation":
    "Campaign objective: LEAD GENERATION. The CTA on every asset should point to a free resource or email signup, not direct purchase. The product is the eventual destination, not the immediate ask.",
};

/**
 * The user's chosen objective also drives the Campaign record's `goal` field
 * when the campaign is saved. This mapping keeps that consistent.
 */
export const OBJECTIVE_TO_GOAL: Record<BuilderObjective, CampaignGoal> = {
  "product-launch": "sales",
  "evergreen-sales": "sales",
  "seasonal-promotion": "sales",
  "back-to-school": "sales",
  holiday: "sales",
  "lead-generation": "leads",
};

// ---------------------------------------------------------------------------
// Tasks. Each BuilderTask is one ai.generate() call.
// ---------------------------------------------------------------------------

/** Logical grouping for display in the Review screen. */
export type BuilderGroup =
  | "product"
  | "seo"
  | "pinterest"
  | "blog"
  | "email"
  | "social";

export const GROUP_LABELS: Record<BuilderGroup, string> = {
  product: "Product",
  seo: "SEO",
  pinterest: "Pinterest",
  blog: "Blog",
  email: "Email",
  social: "Social",
};

export const GROUP_ORDER: BuilderGroup[] = [
  "product",
  "seo",
  "pinterest",
  "blog",
  "email",
  "social",
];

export interface BuilderTask {
  /** Stable id within a plan, used for React keys and per-task state. */
  id: string;
  /** Display label in the Review grid. */
  label: string;
  /** Which group this task renders in. */
  group: BuilderGroup;
  /** What kind of ContentItem gets created when the task succeeds. */
  contentKind: ContentKind;
  /**
   * Exact `name` of the built-in PromptTemplate to use. Looked up at run-time
   * against the store's prompts. If the template has been deleted by the
   * user, the task surfaces a clear error.
   */
  templateName: string;
}

// Helper for plan-builder readability.
function t(
  id: string,
  label: string,
  group: BuilderGroup,
  contentKind: ContentKind,
  templateName: string
): BuilderTask {
  return { id, label, group, contentKind, templateName };
}

/**
 * Build the ordered task list for a given selection of platforms.
 *
 * Always included:
 *  - Product copy block (title / desc / benefits / features / FAQ / CTA)
 *  - SEO block (keyword map + meta pack)
 *
 * Conditionally included based on selected platforms.
 *
 * If `platforms` is empty, only product + SEO are produced — still useful for
 * cleaning up a product's marketplace listing.
 */
export function buildPlan(platforms: readonly BuilderPlatform[]): BuilderTask[] {
  const set = new Set(platforms);
  const tasks: BuilderTask[] = [];

  // --- Product ----------------------------------------------------------
  tasks.push(
    t("product-title", "Optimized title", "product", "copy", "Product Title"),
    t("product-short", "Short description", "product", "copy", "Short Description"),
    t("product-long", "Long description", "product", "copy", "Long Description"),
    t("product-benefits", "Benefits", "product", "copy", "Benefits List"),
    t("product-features", "Features", "product", "copy", "Features List"),
    t("product-faq", "FAQ", "product", "copy", "FAQ"),
    t("product-cta", "Call to action", "product", "copy", "Call to Action")
  );
  if (set.has("payhip")) {
    tasks.push(
      t(
        "product-payhip",
        "Payhip sales page",
        "product",
        "copy",
        "Payhip Sales Page"
      )
    );
  }

  // --- SEO --------------------------------------------------------------
  tasks.push(
    t(
      "seo-keywords",
      "Primary / secondary / long-tail keywords",
      "seo",
      "seo",
      "SEO — Keyword Map"
    ),
    t(
      "seo-meta",
      "Meta title, description & URL slug",
      "seo",
      "seo",
      "SEO — Meta Pack"
    )
  );

  // --- Pinterest --------------------------------------------------------
  if (set.has("pinterest")) {
    tasks.push(
      t(
        "pin-titles",
        "20 Pinterest titles",
        "pinterest",
        "pinterest",
        "Pinterest — 20 Titles"
      ),
      t(
        "pin-descriptions",
        "20 Pinterest descriptions",
        "pinterest",
        "pinterest",
        "Pinterest — 20 Descriptions"
      ),
      t(
        "pin-boards",
        "Board suggestions",
        "pinterest",
        "pinterest",
        "Pinterest — Board Ideas"
      ),
      t(
        "pin-overlays",
        "Pin text overlays",
        "pinterest",
        "pinterest",
        "Pinterest — Pin Text Overlays"
      ),
      t(
        "pin-image-prompts",
        "Pin image prompts",
        "pinterest",
        "pinterest",
        "Pinterest — Image Prompts"
      )
    );
  }

  // --- Blog --------------------------------------------------------------
  if (set.has("blog")) {
    tasks.push(
      t("blog-article", "SEO blog article", "blog", "blog", "Blog — How-To Article"),
      t(
        "blog-internal-links",
        "Internal linking suggestions",
        "blog",
        "seo",
        "SEO — Internal Linking"
      )
    );
  }

  // --- Email -------------------------------------------------------------
  if (set.has("email")) {
    tasks.push(
      t("email-launch", "Launch email", "email", "email", "Email — Launch"),
      t(
        "email-followup",
        "Follow-up nurture sequence",
        "email",
        "email",
        "Email — Follow-up Sequence"
      ),
      t(
        "email-reminder",
        "Promotional / reminder sequence",
        "email",
        "email",
        "Email — Promotional Campaign"
      )
    );
  }

  // --- Social ------------------------------------------------------------
  if (set.has("facebook"))
    tasks.push(
      t("social-facebook", "Facebook posts", "social", "social", "Social — Facebook")
    );
  if (set.has("instagram"))
    tasks.push(
      t(
        "social-instagram",
        "Instagram posts",
        "social",
        "social",
        "Social — Instagram"
      )
    );
  if (set.has("linkedin"))
    tasks.push(
      t("social-linkedin", "LinkedIn posts", "social", "social", "Social — LinkedIn")
    );
  if (set.has("x"))
    tasks.push(
      t("social-x", "X (Twitter) posts", "social", "social", "Social — X (Twitter)")
    );

  return tasks;
}

/**
 * Resolve a task's templateName against the store's prompts. Returns the
 * matching PromptTemplate or undefined if the user has deleted it.
 *
 * Prefers a built-in template, but falls back to a custom one with the same
 * name if no built-in exists.
 */
export function resolveTemplate(
  prompts: readonly PromptTemplate[],
  templateName: string
): PromptTemplate | undefined {
  return (
    prompts.find((p) => p.name === templateName && p.builtIn) ??
    prompts.find((p) => p.name === templateName)
  );
}

/**
 * Suggest a default campaign name from a product title + objective.
 * Used as the placeholder when the user lands on the Builder.
 */
export function defaultCampaignName(
  productTitle: string,
  objective: BuilderObjective
): string {
  return `${productTitle} — ${OBJECTIVE_LABELS[objective]}`;
}

/**
 * The platform recorded on the Campaign record. The Builder lets the user
 * pick multiple platforms, but Campaign Analytics tracks a single primary
 * platform. We pick the first selected, with a sensible default.
 */
export function primaryCampaignPlatform(
  platforms: readonly BuilderPlatform[]
): Campaign["platform"] {
  if (platforms.includes("pinterest")) return "pinterest";
  if (platforms.includes("email")) return "email";
  if (platforms.includes("blog")) return "organic-seo";
  if (platforms.includes("facebook")) return "facebook";
  if (platforms.includes("instagram")) return "instagram";
  if (platforms.includes("linkedin")) return "other";
  if (platforms.includes("x")) return "other";
  if (platforms.includes("payhip")) return "organic-seo";
  return "other";
}
