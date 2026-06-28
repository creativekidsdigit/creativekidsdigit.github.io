// Pure analytics aggregations. No React, no IO — everything here is a function
// of (campaigns, perfSnapshots, products) and can be unit-tested deterministically.
//
// All money values are in the user's chosen currency (we don't convert).
// All percentages are returned as 0..1 (not 0..100) so charts can format them.

import type {
  Campaign,
  PerformanceSnapshot,
  Product,
} from "@/types";

export interface CampaignTotals {
  impressions: number;
  clicks: number;
  saves: number;
  shares: number;
  comments: number;
  emailOpens: number;
  emailClicks: number;
  websiteVisits: number;
  productPageVisits: number;
  sales: number;
  revenue: number;
  cost: number;
  /** clicks / impressions; null if no impressions */
  ctr: number | null;
  /** sales / clicks; null if no clicks */
  conversionRate: number | null;
  /** (revenue - cost) / cost; null if no cost */
  roi: number | null;
  /** cost / clicks; null if no clicks */
  cpc: number | null;
  /** cost / sales; null if no sales */
  costPerConversion: number | null;
}

const EMPTY_TOTALS = (): CampaignTotals => ({
  impressions: 0,
  clicks: 0,
  saves: 0,
  shares: 0,
  comments: 0,
  emailOpens: 0,
  emailClicks: 0,
  websiteVisits: 0,
  productPageVisits: 0,
  sales: 0,
  revenue: 0,
  cost: 0,
  ctr: null,
  conversionRate: null,
  roi: null,
  cpc: null,
  costPerConversion: null,
});

function divOrNull(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den)) return null;
  if (den === 0) return null;
  return num / den;
}

/** Totals for a single set of snapshots. */
export function totalsFor(snapshots: PerformanceSnapshot[]): CampaignTotals {
  const t = EMPTY_TOTALS();
  for (const s of snapshots) {
    t.impressions += s.impressions;
    t.clicks += s.clicks;
    t.saves += s.saves;
    t.shares += s.shares;
    t.comments += s.comments;
    t.emailOpens += s.emailOpens;
    t.emailClicks += s.emailClicks;
    t.websiteVisits += s.websiteVisits;
    t.productPageVisits += s.productPageVisits;
    t.sales += s.sales;
    t.revenue += s.revenue;
    t.cost += s.cost;
  }
  t.ctr = divOrNull(t.clicks, t.impressions);
  t.conversionRate = divOrNull(t.sales, t.clicks);
  t.roi = divOrNull(t.revenue - t.cost, t.cost);
  t.cpc = divOrNull(t.cost, t.clicks);
  t.costPerConversion = divOrNull(t.cost, t.sales);
  return t;
}

/** Totals for one campaign across all of its snapshots. */
export function campaignTotals(
  campaignId: string,
  snapshots: PerformanceSnapshot[]
): CampaignTotals {
  return totalsFor(snapshots.filter((s) => s.campaignId === campaignId));
}

/**
 * Returns a chronological array of { date, ...metric } points by summing
 * all snapshot values that fall on the same calendar date. Dates with zero
 * activity are NOT padded — the caller can decide whether to pad for charts.
 */
export function dailySeries(
  snapshots: PerformanceSnapshot[]
): Array<{
  date: string;
  impressions: number;
  clicks: number;
  sales: number;
  revenue: number;
  cost: number;
}> {
  const byDate = new Map<
    string,
    {
      impressions: number;
      clicks: number;
      sales: number;
      revenue: number;
      cost: number;
    }
  >();
  for (const s of snapshots) {
    const cur = byDate.get(s.date) ?? {
      impressions: 0,
      clicks: 0,
      sales: 0,
      revenue: 0,
      cost: 0,
    };
    cur.impressions += s.impressions;
    cur.clicks += s.clicks;
    cur.sales += s.sales;
    cur.revenue += s.revenue;
    cur.cost += s.cost;
    byDate.set(s.date, cur);
  }
  return [...byDate.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Pad a daily series to span a date range, inserting zero days. */
export function padSeries(
  series: ReturnType<typeof dailySeries>,
  from: string,
  to: string
): ReturnType<typeof dailySeries> {
  if (!from || !to) return series;
  const out: ReturnType<typeof dailySeries> = [];
  const map = new Map(series.map((p) => [p.date, p]));
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push(
      map.get(key) ?? {
        date: key,
        impressions: 0,
        clicks: 0,
        sales: 0,
        revenue: 0,
        cost: 0,
      }
    );
  }
  return out;
}

/** Group totals by campaign platform — for the platform comparison chart. */
export function byPlatform(
  campaigns: Campaign[],
  snapshots: PerformanceSnapshot[]
): Array<{ platform: string; revenue: number; clicks: number; sales: number; impressions: number; campaigns: number }> {
  const buckets = new Map<
    string,
    { platform: string; revenue: number; clicks: number; sales: number; impressions: number; campaigns: number }
  >();
  for (const c of campaigns) {
    const t = campaignTotals(c.id, snapshots);
    const cur =
      buckets.get(c.platform) ?? {
        platform: c.platform,
        revenue: 0,
        clicks: 0,
        sales: 0,
        impressions: 0,
        campaigns: 0,
      };
    cur.revenue += t.revenue;
    cur.clicks += t.clicks;
    cur.sales += t.sales;
    cur.impressions += t.impressions;
    cur.campaigns += 1;
    buckets.set(c.platform, cur);
  }
  return [...buckets.values()].sort((a, b) => b.revenue - a.revenue);
}

/** Group totals by product — for the product comparison chart. */
export function byProduct(
  campaigns: Campaign[],
  snapshots: PerformanceSnapshot[],
  products: Product[]
): Array<{ product: string; productId: string; revenue: number; clicks: number; sales: number; campaigns: number }> {
  const buckets = new Map<
    string,
    { product: string; productId: string; revenue: number; clicks: number; sales: number; campaigns: number }
  >();
  for (const c of campaigns) {
    if (c.productIds.length === 0) continue;
    const t = campaignTotals(c.id, snapshots);
    // Attribute equal share of the campaign totals to each linked product.
    // This is a simple, predictable rule — users can opt for a more precise
    // attribution model later via per-snapshot productId if needed.
    const share = 1 / c.productIds.length;
    for (const pid of c.productIds) {
      const cur =
        buckets.get(pid) ?? {
          product: products.find((p) => p.id === pid)?.title ?? "(deleted product)",
          productId: pid,
          revenue: 0,
          clicks: 0,
          sales: 0,
          campaigns: 0,
        };
      cur.revenue += t.revenue * share;
      cur.clicks += t.clicks * share;
      cur.sales += t.sales * share;
      cur.campaigns += share;
      buckets.set(pid, cur);
    }
  }
  return [...buckets.values()].sort((a, b) => b.revenue - a.revenue);
}

/** Top N campaigns by a metric. */
export function topCampaigns(
  campaigns: Campaign[],
  snapshots: PerformanceSnapshot[],
  metric: "revenue" | "sales" | "clicks" | "impressions" | "roi",
  n = 5
): Array<{ campaign: Campaign; totals: CampaignTotals; score: number }> {
  return campaigns
    .map((c) => {
      const totals = campaignTotals(c.id, snapshots);
      const score =
        metric === "roi"
          ? (totals.roi ?? -Infinity)
          : (totals[metric] as number);
      return { campaign: c, totals, score };
    })
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/** Underperformers — campaigns that are active or completed but generated no clicks. */
export function underperformers(
  campaigns: Campaign[],
  snapshots: PerformanceSnapshot[]
): Array<{ campaign: Campaign; totals: CampaignTotals }> {
  return campaigns
    .filter((c) => c.status === "active" || c.status === "completed")
    .map((c) => ({ campaign: c, totals: campaignTotals(c.id, snapshots) }))
    .filter(
      (x) =>
        x.totals.impressions > 0 &&
        (x.totals.clicks === 0 ||
          (x.totals.ctr !== null && x.totals.ctr < 0.005))
    );
}

/** Filter campaigns by a normalized filter set. */
export interface CampaignFilters {
  from?: string;
  to?: string;
  platform?: string; // "" = all
  productId?: string; // "" = all
  status?: string; // "" = all
  goal?: string; // "" = all
  tag?: string; // "" = all
}

export function applyFilters(
  campaigns: Campaign[],
  f: CampaignFilters
): Campaign[] {
  return campaigns.filter((c) => {
    if (f.platform && c.platform !== f.platform) return false;
    if (f.productId && !c.productIds.includes(f.productId)) return false;
    if (f.status && c.status !== f.status) return false;
    if (f.goal && c.goal !== f.goal) return false;
    if (f.tag && !c.tags.includes(f.tag)) return false;
    if (f.from && c.startDate && c.startDate < f.from) {
      // campaign starts before window — include only if it ran into the window
      if (c.endDate && c.endDate < f.from) return false;
    }
    if (f.to && c.startDate && c.startDate > f.to) return false;
    return true;
  });
}

export function snapshotsInRange(
  snapshots: PerformanceSnapshot[],
  from?: string,
  to?: string
): PerformanceSnapshot[] {
  return snapshots.filter((s) => {
    if (from && s.date < from) return false;
    if (to && s.date > to) return false;
    return true;
  });
}

/** Locale-friendly large-number formatter (1.2K, 3.4M). */
export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function fmtPct(n: number | null, digits = 1): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // Currency-agnostic — user-typed budgets may not be USD. Use plain
  // number formatting so we don't mislead.
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
