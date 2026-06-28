import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard } from "@/components/ui";
import { campaignTotals } from "@/lib/analytics";
import type { Campaign, PerformanceSnapshot } from "@/types";
import { ChartContainer, PIE_COLORS } from "./atoms";

type DailyPoint = {
  date: string;
  impressions: number;
  clicks: number;
  sales: number;
  revenue: number;
  cost: number;
};

interface Props {
  series: DailyPoint[];
  seriesWithConvRate: (DailyPoint & { cr: number })[];
  platforms: Array<{
    platform: string;
    revenue: number;
    clicks: number;
    sales: number;
    impressions: number;
    campaigns: number;
  }>;
  productBd: Array<{ product: string; revenue: number }>;
  campaigns: Campaign[];
  filteredSnaps: PerformanceSnapshot[];
}

export default function CampaignTrendCharts({
  series,
  seriesWithConvRate,
  platforms,
  productBd,
  campaigns,
  filteredSnaps,
}: Props) {
  return (
    <div className="mb-5 grid gap-5 lg:grid-cols-2">
      <SectionCard title="Traffic over time (impressions vs. clicks)">
        <ChartContainer>
          <LineChart data={series}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="impressions"
              stroke="#7c3aed"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="#ec4899"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title="Revenue over time">
        <ChartContainer>
          <LineChart data={series}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#22c55e"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#f59e0b"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title="Conversion rate trend">
        <ChartContainer>
          <LineChart data={seriesWithConvRate}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
            />
            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            <Line
              type="monotone"
              dataKey="cr"
              stroke="#06b6d4"
              dot={false}
              strokeWidth={2}
              name="Conversion rate"
            />
          </LineChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title="Traffic by source (platform share)">
        {platforms.length === 0 ? (
          <p className="text-xs text-slate-500">
            No platform activity in this window.
          </p>
        ) : (
          <ChartContainer>
            <PieChart>
              <Pie
                data={platforms}
                dataKey="clicks"
                nameKey="platform"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
              >
                {platforms.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartContainer>
        )}
      </SectionCard>

      <SectionCard title="Platform comparison (revenue)">
        {platforms.length === 0 ? (
          <p className="text-xs text-slate-500">No data yet.</p>
        ) : (
          <ChartContainer>
            <BarChart data={platforms}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </SectionCard>

      <SectionCard title="Campaign comparison (revenue)">
        {campaigns.length === 0 ? (
          <p className="text-xs text-slate-500">No data yet.</p>
        ) : (
          <ChartContainer>
            <BarChart
              layout="vertical"
              data={campaigns
                .map((c) => ({
                  name: c.name,
                  revenue: campaignTotals(c.id, filteredSnaps).revenue,
                }))
                .filter((d) => d.revenue > 0)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10)}
            >
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={140}
              />
              <Tooltip />
              <Bar dataKey="revenue" fill="#ec4899" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </SectionCard>

      <SectionCard title="Product comparison (attributed revenue)">
        {productBd.length === 0 ? (
          <p className="text-xs text-slate-500">No product attribution yet.</p>
        ) : (
          <ChartContainer>
            <BarChart
              layout="vertical"
              data={productBd.slice(0, 8).map((p) => ({
                name: p.product,
                revenue: Math.round(p.revenue * 100) / 100,
              }))}
            >
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={140}
              />
              <Tooltip />
              <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </SectionCard>
    </div>
  );
}
