import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { ArrowLeft, Trash2, Zap } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, SectionCard, Badge, EmptyState } from "@/components/ui";
import ProductForm from "@/components/ProductForm";
import { toast } from "@/components/Toast";
import { formatRelative } from "@/lib/util";

export default function ProductDetailPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const product = useAppStore((s) => s.products.find((p) => p.id === id));
  const updateProduct = useAppStore((s) => s.updateProduct);
  const deleteProduct = useAppStore((s) => s.deleteProduct);
  const allContent = useAppStore((s) => s.content);
  const autosave = useAppStore((s) => s.settings.autosave);

  const productContent = useMemo(
    () => allContent.filter((c) => c.productId === id),
    [allContent, id]
  );

  if (!product) {
    return (
      <EmptyState
        title="Product not found"
        hint="It may have been deleted."
        action={
          <Link to="/products" className="btn-secondary mt-3">
            <ArrowLeft className="h-4 w-4" /> Back to products
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader title={product.title} description={product.category}>
        <Link to="/products" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> All products
        </Link>
        <button
          className="btn-primary"
          onClick={() => nav(`/copy?product=${product.id}`)}
        >
          <Zap className="h-4 w-4" /> Generate copy
        </button>
        <button
          className="btn-danger"
          onClick={async () => {
            if (!confirm(`Delete "${product.title}"?`)) return;
            await deleteProduct(product.id);
            toast.success("Product deleted");
            nav("/products");
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <SectionCard title="Product details">
            <ProductForm
              initial={product}
              submitLabel={autosave ? "Save (autosaved)" : "Save"}
              autosave={
                autosave
                  ? (vals) => updateProduct(product.id, vals)
                  : undefined
              }
              onSubmit={async (vals) => {
                await updateProduct(product.id, vals);
                toast.success("Saved");
              }}
            />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="At a glance">
            <div className="space-y-2 text-sm">
              <Row label="Status">
                <Badge>{product.status}</Badge>
              </Row>
              <Row label="Platform">
                <Badge tone="info">{product.platform}</Badge>
              </Row>
              <Row label="Pricing">{product.pricing || "—"}</Row>
              <Row label="Launch">{product.launchDate || "—"}</Row>
              <Row label="Keywords">
                <span className="text-xs text-slate-500">
                  {product.keywords.length} terms
                </span>
              </Row>
              <Row label="Benefits">
                <span className="text-xs text-slate-500">
                  {product.benefits.length} items
                </span>
              </Row>
              <Row label="Updated">{formatRelative(product.updatedAt)}</Row>
            </div>
          </SectionCard>

          <SectionCard title="Content generated for this product">
            {productContent.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nothing saved yet. Use the generators in the sidebar — they'll
                save here automatically.
              </p>
            ) : (
              <ul className="space-y-2">
                {productContent.slice(0, 12).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-xs dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{c.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {c.kind} · {formatRelative(c.updatedAt)}
                      </div>
                    </div>
                    <Link
                      to={`/library?focus=${c.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0 dark:border-slate-800">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-right text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}
