import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Pin } from "lucide-react";
import { SectionCard } from "@/components/ui";
import Modal from "@/components/Modal";
import { toast } from "@/components/Toast";
import { formatRelative } from "@/lib/util";
import { useAppStore } from "@/store/useAppStore";
import type { ContentItem, Product } from "@/types";

interface LinkedProductsProps {
  products: Product[];
}

export function LinkedProductsCard({ products }: LinkedProductsProps) {
  return (
    <SectionCard title="Linked products">
      {products.length === 0 ? (
        <p className="text-xs text-slate-500">
          No products linked. Edit the Overview form above to attribute
          performance.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                to={`/products/${p.id}`}
                className="flex items-center justify-between rounded border border-slate-100 p-2 hover:border-brand-300 dark:border-slate-800"
              >
                <span className="line-clamp-1 font-medium">{p.title}</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

interface GeneratedAssetsProps {
  campaignId: string;
  assets: ContentItem[];
}

export function GeneratedAssetsCard({
  campaignId,
  assets,
}: GeneratedAssetsProps) {
  const updateContent = useAppStore((s) => s.updateContent);
  const [attachOpen, setAttachOpen] = useState(false);

  return (
    <>
      <SectionCard
        title={`Generated assets (${assets.length})`}
        action={
          assets.length === 0 ? null : (
            <button
              className="text-xs text-brand-600 hover:underline"
              onClick={() => setAttachOpen(true)}
            >
              Attach more
            </button>
          )
        }
      >
        {assets.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              No copy linked to this campaign yet. Attach existing content from
              the Content Library, or set the campaign on new generations.
            </p>
            <button
              className="btn-secondary text-xs"
              onClick={() => setAttachOpen(true)}
            >
              <Pin className="h-3.5 w-3.5" /> Attach content
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {assets.slice(0, 10).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded border border-slate-100 p-2 text-xs dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/library?focus=${c.id}`}
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    {c.title}
                  </Link>
                  <div className="text-[10px] text-slate-500">
                    {c.kind} · {formatRelative(c.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await updateContent(c.id, { campaignId: undefined });
                    toast.success("Detached from campaign");
                  }}
                  className="btn-ghost h-6 px-2 text-[11px]"
                  aria-label="Detach asset"
                >
                  Detach
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Modal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        title="Attach content to this campaign"
        size="lg"
      >
        <AttachContentPicker
          campaignId={campaignId}
          onClose={() => setAttachOpen(false)}
        />
      </Modal>
    </>
  );
}

function AttachContentPicker({
  campaignId,
  onClose,
}: {
  campaignId: string;
  onClose: () => void;
}) {
  const content = useAppStore((s) => s.content);
  const updateContent = useAppStore((s) => s.updateContent);
  const [q, setQ] = useState("");

  const available = useMemo(
    () =>
      content
        .filter((c) => c.campaignId !== campaignId)
        .filter((c) => {
          if (!q.trim()) return true;
          return `${c.title} ${c.kind} ${c.tags.join(" ")}`
            .toLowerCase()
            .includes(q.toLowerCase());
        })
        .slice(0, 50),
    [content, campaignId, q]
  );

  return (
    <div className="space-y-3">
      <input
        autoFocus
        className="input"
        placeholder="Search content…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {available.length === 0 ? (
        <p className="text-xs text-slate-500">
          No content available to attach. Generate some from any module first.
        </p>
      ) : (
        <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {available.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-slate-100 px-2 py-1.5 text-sm dark:border-slate-800"
            >
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1">{c.title}</div>
                <div className="text-[10px] text-slate-500">
                  {c.kind} · {formatRelative(c.updatedAt)}
                </div>
              </div>
              <button
                className="btn-secondary h-7 text-xs"
                onClick={async () => {
                  await updateContent(c.id, { campaignId });
                  toast.success("Attached");
                }}
              >
                Attach
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button className="btn-secondary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
