import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Pin,
  Zap,
  Check,
  Trash2,
  Package,
  TrendingUp,
  Wand2,
  Calendar,
  Lightbulb,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components/ui";
import Modal from "@/components/Modal";
import ProductForm from "@/components/ProductForm";
import { toast } from "@/components/Toast";
import { formatDate, formatRelative, wordCount } from "@/lib/util";

export default function DashboardPage() {
  const nav = useNavigate();
  const products = useAppStore((s) => s.products);
  const content = useAppStore((s) => s.content);
  const tasks = useAppStore((s) => s.tasks);
  const ideas = useAppStore((s) => s.ideas);
  const launches = useAppStore((s) => s.launches);
  const settings = useAppStore((s) => s.settings);
  const createProduct = useAppStore((s) => s.createProduct);
  const addTask = useAppStore((s) => s.addTask);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const addIdea = useAppStore((s) => s.addIdea);
  const togglePinIdea = useAppStore((s) => s.togglePinIdea);
  const deleteIdea = useAppStore((s) => s.deleteIdea);
  const addLaunch = useAppStore((s) => s.addLaunch);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newIdea, setNewIdea] = useState("");
  const [openNewProduct, setOpenNewProduct] = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);

  const todaysTasks = useMemo(() => {
    return [...tasks]
      .sort(
        (a, b) =>
          Number(a.done) - Number(b.done) || (a.due ?? "").localeCompare(b.due ?? "")
      )
      .slice(0, 8);
  }, [tasks]);

  const upcomingLaunches = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return launches
      .filter((l) => l.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [launches]);

  const calendar = useMemo(() => {
    return [...products]
      .filter((p) => p.launchDate)
      .sort((a, b) => (a.launchDate ?? "").localeCompare(b.launchDate ?? ""))
      .slice(0, 6);
  }, [products]);

  const recentContent = useMemo(
    () => content.slice(0, 6),
    [content]
  );

  const pinnedIdeas = useMemo(
    () => [...ideas].sort((a, b) => Number(b.pinned) - Number(a.pinned)).slice(0, 8),
    [ideas]
  );

  const last14 = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    content.forEach((c) => {
      const k = new Date(c.createdAt).toISOString().slice(0, 10);
      if (k in days) days[k]++;
    });
    return Object.entries(days).map(([d, count]) => ({ d: d.slice(5), count }));
  }, [content]);

  const totalWords = content.reduce((s, c) => s + wordCount(c.body), 0);

  // SEO "score" — a simple readiness score based on metadata richness, not a real SEO crawl.
  const seoScore = useMemo(() => {
    if (products.length === 0) return 0;
    let score = 0;
    products.forEach((p) => {
      let s = 0;
      if (p.keywords.length >= 5) s += 25;
      if (p.benefits.length >= 5) s += 20;
      if (p.problemSolved.length > 40) s += 20;
      if (p.audience.length > 10) s += 15;
      if (p.pricing) s += 10;
      if (p.notes.length > 20) s += 10;
      score += Math.min(s, 100);
    });
    return Math.round(score / products.length);
  }, [products]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${settings.activeProvider} · ${settings.providers[settings.activeProvider].model}`}
      >
        <button className="btn-secondary" onClick={() => setOpenNewProduct(true)}>
          <Plus className="h-4 w-4" /> New product
        </button>
        <button className="btn-primary" onClick={() => nav("/copy")}>
          <Zap className="h-4 w-4" aria-hidden="true" /> Quick Generate
        </button>
      </PageHeader>

      {/* Top stat row */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Products"
          value={products.length}
          icon={<Package className="h-4 w-4" />}
          to="/products"
        />
        <StatTile
          label="Content pieces"
          value={content.length}
          icon={<Wand2 className="h-4 w-4" />}
          to="/library"
        />
        <StatTile
          label="Words written"
          value={totalWords.toLocaleString()}
          icon={<TrendingUp className="h-4 w-4" />}
          to="/analytics"
        />
        <StatTile
          label="SEO readiness"
          value={`${seoScore}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          to="/seo"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* TASKS */}
        <SectionCard title="Today's tasks">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTaskTitle.trim()) return;
              addTask({ title: newTaskTitle.trim() });
              setNewTaskTitle("");
            }}
            className="mb-3 flex gap-2"
          >
            <input
              className="input"
              placeholder="Add a task…"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <button className="btn-primary" type="submit">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          {todaysTasks.length === 0 ? (
            <p className="text-xs text-slate-500">No tasks yet. Add your first.</p>
          ) : (
            <ul className="space-y-1.5">
              {todaysTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <button
                    onClick={() => toggleTask(t.id)}
                    className={`grid h-5 w-5 place-items-center rounded border ${
                      t.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                    aria-label="Toggle"
                  >
                    {t.done && <Check className="h-3 w-3" aria-hidden="true" />}
                  </button>
                  <span
                    className={`flex-1 ${
                      t.done ? "text-slate-400 line-through" : ""
                    }`}
                  >
                    {t.title}
                  </span>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="btn-ghost h-6 w-6 p-0 opacity-40 hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* RECENT CONTENT */}
        <SectionCard title="Recent content">
          {recentContent.length === 0 ? (
            <p className="text-xs text-slate-500">
              Nothing generated yet — head to the Copy Generator.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentContent.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/library?focus=${c.id}`}
                    className="block rounded-lg border border-slate-100 p-2 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:bg-brand-900/20"
                  >
                    <div className="line-clamp-1 text-sm font-medium">
                      {c.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Badge tone="info">{c.kind}</Badge>
                      <span>{formatRelative(c.updatedAt)}</span>
                      <span className="ml-auto">{wordCount(c.body)}w</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* PINNED IDEAS */}
        <SectionCard title="Pinned ideas">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newIdea.trim()) return;
              addIdea(newIdea.trim());
              setNewIdea("");
            }}
            className="mb-3 flex gap-2"
          >
            <input
              className="input"
              placeholder="Jot down an idea…"
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
            />
            <button className="btn-primary" type="submit">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          {pinnedIdeas.length === 0 ? (
            <p className="text-xs text-slate-500">No ideas yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {pinnedIdeas.map((i) => (
                <li
                  key={i.id}
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <button
                    onClick={() => togglePinIdea(i.id)}
                    className={`mt-0.5 h-4 w-4 ${
                      i.pinned ? "text-amber-500" : "text-slate-400"
                    }`}
                    aria-label="Pin"
                  >
                    <Pin className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="flex-1">{i.text}</span>
                  <button
                    onClick={() => deleteIdea(i.id)}
                    className="btn-ghost h-6 w-6 p-0 opacity-40 hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* PRODUCTS PANEL */}
        <SectionCard
          title="Products"
          action={
            <Link className="text-xs text-brand-600 hover:underline" to="/products">
              View all
            </Link>
          }
        >
          {products.length === 0 ? (
            <EmptyState
              title="No products yet"
              hint="Add one — it powers every generator."
              action={
                <button
                  className="btn-primary mt-3"
                  onClick={() => setOpenNewProduct(true)}
                >
                  <Plus className="h-4 w-4" /> New product
                </button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {products.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/products/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-2 hover:border-brand-300 dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-medium">
                        {p.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {p.category || "—"} · {p.platform}
                      </div>
                    </div>
                    <Badge>{p.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* CONTENT CALENDAR */}
        <SectionCard
          title="Content calendar"
          action={
            <button
              className="text-xs text-brand-600 hover:underline"
              onClick={() => setOpenSchedule(true)}
            >
              + Schedule launch
            </button>
          }
        >
          {calendar.length === 0 && upcomingLaunches.length === 0 ? (
            <p className="text-xs text-slate-500">
              Add launch dates to your products or schedule a launch to populate
              this calendar.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcomingLaunches.map((l) => {
                const prod = products.find((p) => p.id === l.productId);
                return (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 dark:border-slate-800"
                  >
                    <Calendar className="h-4 w-4 text-brand-500" />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 font-medium">
                        {prod?.title ?? "—"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {l.channel} · {formatDate(l.date)}
                      </div>
                    </div>
                    <Badge tone="info">{l.status}</Badge>
                  </li>
                );
              })}
              {calendar.map((p) => (
                <li
                  key={`p-${p.id}`}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-2 dark:border-slate-700"
                >
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 font-medium">{p.title}</div>
                    <div className="text-[11px] text-slate-500">
                      planned launch · {formatDate(p.launchDate)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* PERFORMANCE WIDGET */}
        <SectionCard title="Output trend (14d)">
          <div className="h-40">
            <ResponsiveContainer>
              <LineChart data={last14}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
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
      </div>

      <Modal
        open={openNewProduct}
        onClose={() => setOpenNewProduct(false)}
        title="New product"
        size="lg"
      >
        <ProductForm
          submitLabel="Create product"
          onSubmit={async (vals) => {
            const p = await createProduct(vals);
            toast.success(`Created "${p.title}"`);
            setOpenNewProduct(false);
          }}
        />
      </Modal>

      <Modal
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        title="Schedule launch"
      >
        <ScheduleLaunchForm
          onSubmit={async (v) => {
            await addLaunch(v);
            toast.success("Launch scheduled");
            setOpenSchedule(false);
          }}
        />
      </Modal>
    </>
  );
}

function StatTile({
  label,
  value,
  icon,
  to,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="card flex items-center gap-3 p-4 transition hover:border-brand-300"
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        {icon}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="text-xl font-bold text-slate-900 dark:text-white">
          {value}
        </div>
      </div>
    </Link>
  );
}

function ScheduleLaunchForm({
  onSubmit,
}: {
  onSubmit: (v: {
    productId: string;
    date: string;
    channel: "payhip" | "shopify" | "etsy" | "gumroad" | "kdp" | "pinterest" | "own-site" | "other";
    notes: string;
  }) => void;
}) {
  const products = useAppStore((s) => s.products);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [channel, setChannel] = useState<
    "payhip" | "shopify" | "etsy" | "gumroad" | "kdp" | "pinterest" | "own-site" | "other"
  >("payhip");
  const [notes, setNotes] = useState("");

  if (products.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Create a product first — launches are tied to products.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ productId, date, channel, notes });
      }}
    >
      <div>
        <label className="label">Product</label>
        <select
          className="input"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Channel</label>
          <select
            className="input"
            value={channel}
            onChange={(e) =>
              setChannel(e.target.value as typeof channel)
            }
          >
            {(
              [
                "payhip",
                "shopify",
                "etsy",
                "gumroad",
                "kdp",
                "pinterest",
                "own-site",
                "other",
              ] as const
            ).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea
          className="input min-h-[80px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <button className="btn-primary">Schedule</button>
      </div>
    </form>
  );
}
