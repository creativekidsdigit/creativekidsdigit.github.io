import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import Modal from "@/components/Modal";
import ProductForm from "@/components/ProductForm";
import { toast } from "@/components/Toast";
import { formatDate } from "@/lib/util";
import type { ProductStatus } from "@/types";

const STATUS_TONE: Record<ProductStatus, "default" | "warn" | "info" | "success" | "danger"> = {
  idea: "default",
  drafting: "warn",
  "in-review": "info",
  ready: "info",
  launched: "success",
  paused: "warn",
  retired: "danger",
};

export default function ProductsPage() {
  const products = useAppStore((s) => s.products);
  const createProduct = useAppStore((s) => s.createProduct);
  const deleteProduct = useAppStore((s) => s.deleteProduct);
  const [openNew, setOpenNew] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesText = `${p.title} ${p.category} ${p.audience} ${p.keywords.join(" ")}`
        .toLowerCase()
        .includes(q.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [products, q, statusFilter]);

  return (
    <>
      <PageHeader
        title="Products"
        description="Your source of truth. Every generator pulls from here so your copy stays accurate."
      >
        <button className="btn-primary" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" /> New product
        </button>
      </PageHeader>

      <div className="card mb-5 flex flex-wrap items-center gap-3 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input max-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProductStatus | "all")}
        >
          <option value="all">All statuses</option>
          {(
            [
              "idea",
              "drafting",
              "in-review",
              "ready",
              "launched",
              "paused",
              "retired",
            ] as ProductStatus[]
          ).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            products.length === 0
              ? "No products yet"
              : "No products match your filters"
          }
          hint="Add a product first — every generator across the app uses it as input."
          action={
            <button className="btn-primary mt-3" onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4" /> Create your first product
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/products/${p.id}`}
                  className="font-semibold text-slate-900 hover:underline dark:text-white"
                >
                  {p.title}
                </Link>
                <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                {p.problemSolved || "No problem statement yet."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.category && <span className="chip">{p.category}</span>}
                <span className="chip">{p.platform}</span>
                {p.pricing && <span className="chip">{p.pricing}</span>}
              </div>
              <div className="mt-3 text-[11px] text-slate-400">
                Launch: {formatDate(p.launchDate) || "—"} · Updated {formatDate(p.updatedAt)}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <Link
                  to={`/products/${p.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${p.title}"?`)) return;
                    await deleteProduct(p.id);
                    toast.success("Product deleted");
                  }}
                  className="btn-ghost h-7 px-2 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title="New product"
        size="lg"
      >
        <ProductForm
          submitLabel="Create product"
          onSubmit={async (values) => {
            const p = await createProduct(values);
            toast.success(`Created "${p.title}"`);
            setOpenNew(false);
          }}
        />
      </Modal>
    </>
  );
}
