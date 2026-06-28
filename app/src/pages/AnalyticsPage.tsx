import { useMemo } from "react";
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, Badge } from "@/components/ui";
import { formatDate, wordCount } from "@/lib/util";

const PIE_COLORS = [
  "#7c3aed",
  "#ec4899",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
];

export default function AnalyticsPage() {
  const products = useAppStore((s) => s.products);
  const content = useAppStore((s) => s.content);
  const launches = useAppStore((s) => s.launches);
  const prompts = useAppStore((s) => s.prompts);

  const stats = useMemo(() => {
    const totalWords = content.reduce((sum, c) => sum + wordCount(c.body), 0);
    return {
      products: products.length,
      content: content.length,
      pinned: content.filter((c) => c.pinned).length,
      words: totalWords,
      launches: launches.length,
      prompts: prompts.length,
      favPrompts: prompts.filter((p) => p.favorite).length,
    };
  }, [products, content, launches, prompts]);

  // Output per day, last 30 days
  const byDay = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    content.forEach((c) => {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: date.slice(5),
      count,
    }));
  }, [content]);

  const byKind = useMemo(() => {
    const m: Record<string, number> = {};
    content.forEach((c) => {
      m[c.kind] = (m[c.kind] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [content]);

  const topProducts = useMemo(() => {
    const m: Record<string, number> = {};
    content.forEach((c) => {
      if (c.productId) m[c.productId] = (m[c.productId] || 0) + 1;
    });
    return Object.entries(m)
      .map(([id, value]) => ({
        product: products.find((p) => p.id === id)?.title ?? "—",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [content, products]);

  const topPrompts = useMemo(() => {
    const m: Record<string, number> = {};
    content.forEach((c) => {
      m[c.templateId] = (m[c.templateId] || 0) + 1;
    });
    return Object.entries(m)
      .map(([id, value]) => ({
        name: prompts.find((p) => p.id === id)?.name ?? "—",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [content, prompts]);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="A live view of what you've produced and where you're focused."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={stats.products} />
        <Stat label="Content pieces" value={stats.content} />
        <Stat label="Words written" value={stats.words.toLocaleString()} />
        <Stat label="Pinned" value={stats.pinned} />
        <Stat label="Launches tracked" value={stats.launches} />
        <Stat label="Prompts" value={stats.prompts} />
        <Stat label="Favorite prompts" value={stats.favPrompts} />
        <Stat
          label="Avg per product"
          value={
            stats.products === 0 ? 0 : (stats.content / stats.products).toFixed(1)
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Output — last 30 days">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={byDay}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="By content kind">
          {byKind.length === 0 ? (
            <p className="text-xs text-slate-500">No content yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byKind}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {byKind.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top products by output">
          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-500">
              Save some generated content to start seeing rankings.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="product"
                    tick={{ fontSize: 11 }}
                    width={140}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Most-used prompts">
          {topPrompts.length === 0 ? (
            <p className="text-xs text-slate-500">
              Generate something to start tracking prompt usage.
            </p>
          ) : (
            <ul className="space-y-2">
              {topPrompts.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between rounded border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <span>{p.name}</span>
                  <Badge tone="info">{p.value}</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {launches.length > 0 && (
        <SectionCard title="Launch history" className="mt-5">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {launches.map((l) => {
              const prod = products.find((p) => p.id === l.productId);
              return (
                <li
                  key={l.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{prod?.title ?? "—"}</div>
                    <div className="text-xs text-slate-500">
                      {l.channel} · {formatDate(l.date)}
                    </div>
                  </div>
                  <Badge
                    tone={
                      l.status === "complete"
                        ? "success"
                        : l.status === "live"
                          ? "info"
                          : "warn"
                    }
                  >
                    {l.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
