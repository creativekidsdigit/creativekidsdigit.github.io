// AI-driven campaign insights. Wraps the existing ai.generate() so insights
// flow through the same provider abstraction as every other generation in
// the app — no model choices are duplicated here.
//
// Every prompt is designed to consume a JSON snapshot of the campaign + its
// performance, plus optional cross-campaign context (best/worst peers), and
// return markdown the UI can render directly.

import type {
  AppSettings,
  Campaign,
  ContentItem,
  PerformanceSnapshot,
  Product,
} from "@/types";
import { generate } from "@/lib/ai";
import { campaignTotals, fmtPct } from "@/lib/analytics";

interface InsightContext {
  campaign: Campaign;
  product?: Product | null;
  products: Product[];
  snapshots: PerformanceSnapshot[]; // for this campaign
  generatedAssets: ContentItem[]; // copy items linked to this campaign
  peers: Campaign[]; // other campaigns for comparison
  peerSnapshots: PerformanceSnapshot[]; // perf for peers
}

/**
 * Builds the JSON context block we hand to the AI. Deliberately compact —
 * we do NOT send raw IDs or timestamps the model doesn't need.
 */
function contextJSON(ctx: InsightContext): string {
  const t = campaignTotals(ctx.campaign.id, ctx.snapshots);
  const peerSummaries = ctx.peers.slice(0, 8).map((p) => {
    const pt = campaignTotals(p.id, ctx.peerSnapshots);
    return {
      name: p.name,
      platform: p.platform,
      goal: p.goal,
      status: p.status,
      totals: {
        impressions: pt.impressions,
        clicks: pt.clicks,
        ctr: pt.ctr,
        sales: pt.sales,
        revenue: pt.revenue,
        cost: pt.cost,
        roi: pt.roi,
      },
    };
  });
  const linkedProducts = ctx.products
    .filter((p) => ctx.campaign.productIds.includes(p.id))
    .map((p) => ({
      title: p.title,
      audience: p.audience,
      problemSolved: p.problemSolved,
      keywords: p.keywords,
    }));
  return JSON.stringify(
    {
      campaign: {
        name: ctx.campaign.name,
        platform: ctx.campaign.platform,
        goal: ctx.campaign.goal,
        status: ctx.campaign.status,
        startDate: ctx.campaign.startDate,
        endDate: ctx.campaign.endDate,
        budget: ctx.campaign.budget,
        notes: ctx.campaign.notes,
        audienceNotes: ctx.campaign.audienceNotes,
        tags: ctx.campaign.tags,
      },
      products: linkedProducts,
      performance: {
        totals: {
          impressions: t.impressions,
          clicks: t.clicks,
          ctr: t.ctr,
          ctrPct: fmtPct(t.ctr),
          sales: t.sales,
          conversionRate: t.conversionRate,
          revenue: t.revenue,
          cost: t.cost,
          roi: t.roi,
          cpc: t.cpc,
          costPerConversion: t.costPerConversion,
        },
        snapshotCount: ctx.snapshots.length,
        timeline: ctx.snapshots
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((s) => ({
            date: s.date,
            impressions: s.impressions,
            clicks: s.clicks,
            sales: s.sales,
            revenue: s.revenue,
            cost: s.cost,
          })),
      },
      generatedAssets: ctx.generatedAssets.slice(0, 12).map((a) => ({
        kind: a.kind,
        title: a.title,
        // Truncate body — we want patterns, not 50KB of context per asset.
        preview: a.body.slice(0, 280),
      })),
      peers: peerSummaries,
    },
    null,
    2
  );
}

const SYSTEM = `You are a senior growth analyst reviewing a single marketing campaign for a small digital-product creator. You read the data carefully and give specific, actionable recommendations grounded in the numbers. You never invent data the user hasn't provided. You write in plain markdown with clear section headers.`;

export interface CampaignInsightOptions {
  /** Which lens to apply. Each maps to a tailored prompt. */
  lens:
    | "performance"
    | "headlines"
    | "ctas"
    | "keywords"
    | "platforms"
    | "underperforming"
    | "improvements"
    | "budget"
    | "seasonal";
}

const LENS_PROMPT: Record<CampaignInsightOptions["lens"], string> = {
  performance: `Summarize this campaign's performance in 4 short sections:
1. What the numbers say (in plain English)
2. What's working
3. What isn't working
4. The single highest-leverage next action
Use the totals and timeline above. Quote specific numbers.`,

  headlines: `Look at the generated assets (titles, headlines, hooks). Based on the campaign's CTR and conversion rate plus any patterns in the asset titles, identify:
- 3 headline patterns most likely to be driving engagement
- 3 headline patterns to avoid in the next campaign
- 5 new headline ideas for this product/audience
Be concrete. No generic copywriting advice.`,

  ctas: `Analyze the call-to-action language in the generated assets. Identify:
- The 3 most likely-effective CTA phrasings for THIS audience
- 5 CTA variations to test next
Tie each suggestion to a specific piece of evidence in the data.`,

  keywords: `Based on the product keywords, the campaign goal, and the platform, identify:
- The 5 keywords / phrases most likely contributing to whatever traffic exists
- 8 long-tail keywords this campaign isn't yet capturing but should
- 3 keywords to deprioritize
Cite the platform and goal explicitly.`,

  platforms: `Compare this campaign's platform to the peer campaigns provided. Which platforms appear to be driving the best ROI for THIS creator's products? Recommend either staying with the current platform or reallocating effort. Be specific about which peer campaign(s) you're comparing against.`,

  underperforming: `If this campaign is underperforming (low CTR, low conversion, low ROI), diagnose the most likely cause from the data. If it is performing well, say so clearly and instead suggest how to scale it. Distinguish between targeting, creative, offer, and platform-fit issues.`,

  improvements: `Give exactly 5 concrete improvements ranked by expected impact. Each must reference a specific number in the data and propose a measurable change.`,

  budget: `Given the campaign budget, the cost-to-date, the CPC, and the cost per conversion, advise:
1. Whether to increase, hold, or decrease budget
2. A specific budget number to test in the next period
3. What metric to watch to validate or kill the change
Justify each with the actual numbers.`,

  seasonal: `Identify 3 seasonal opportunities for THIS product over the next 6 months that would be a natural fit for the campaign's audience and platform. Each opportunity must include: the season/event, why this audience cares, and 2 specific angles to test.`,
};

const LENS_LABEL: Record<CampaignInsightOptions["lens"], string> = {
  performance: "Performance summary",
  headlines: "Best-performing headlines",
  ctas: "Best-performing CTAs",
  keywords: "Winning keywords",
  platforms: "High-performing platforms",
  underperforming: "Underperforming diagnosis",
  improvements: "Suggested improvements",
  budget: "Budget recommendation",
  seasonal: "Seasonal opportunities",
};

export const INSIGHT_LENSES = (
  Object.keys(LENS_LABEL) as CampaignInsightOptions["lens"][]
).map((id) => ({ id, label: LENS_LABEL[id] }));

export async function generateCampaignInsight(
  ctx: InsightContext,
  opts: CampaignInsightOptions,
  settings: AppSettings
): Promise<string> {
  const lensPrompt = LENS_PROMPT[opts.lens];
  const user = `CAMPAIGN DATA (JSON)
${contextJSON(ctx)}

TASK
${lensPrompt}

OUTPUT
Markdown. No preamble. Start with a short bold takeaway line.`;
  const result = await generate(
    {
      system: SYSTEM,
      user,
      temperature: 0.4,
      maxTokens: 1500,
    },
    settings
  );
  return result.text.trim();
}
