import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard, EmptyState } from "@/components/ui";
import Modal from "@/components/Modal";
import PerformanceEntryForm from "@/components/PerformanceEntryForm";
import { toast } from "@/components/Toast";
import { dailySeries, fmtMoney, padSeries } from "@/lib/analytics";
import { useAppStore } from "@/store/useAppStore";
import type { Campaign, PerformanceSnapshot } from "@/types";
import { MiniChart } from "./atoms";

interface Props {
  campaign: Campaign;
  snapshots: PerformanceSnapshot[];
}

/**
 * Combined card: performance history table, add/edit modals, and the 2x2
 * mini-charts grid below. Owns its own modal state so the page orchestrator
 * doesn't have to.
 */
export default function PerformanceHistoryCard({ campaign, snapshots }: Props) {
  const addPerformance = useAppStore((s) => s.addPerformance);
  const updatePerformance = useAppStore((s) => s.updatePerformance);
  const deletePerformance = useAppStore((s) => s.deletePerformance);

  const [addOpen, setAddOpen] = useState(false);
  const [editPerf, setEditPerf] = useState<PerformanceSnapshot | null>(null);

  const sortedSnaps = useMemo(
    () => [...snapshots].sort((a, b) => b.date.localeCompare(a.date)),
    [snapshots]
  );

  const series = useMemo(() => {
    const raw = dailySeries(snapshots);
    if (campaign.startDate) {
      return padSeries(
        raw,
        campaign.startDate,
        campaign.endDate ?? new Date().toISOString().slice(0, 10)
      );
    }
    return raw;
  }, [snapshots, campaign.startDate, campaign.endDate]);

  return (
    <>
      <SectionCard
        title={`Performance history (${snapshots.length})`}
        action={
          <button
            className="btn-primary h-8"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add snapshot
          </button>
        }
      >
        {snapshots.length === 0 ? (
          <EmptyState
            title="No performance data yet"
            hint="Record what you see in your platform dashboard. Charts and AI insights light up once you add a snapshot."
            action={
              <button
                className="btn-primary mt-3"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" /> Add first snapshot
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2">Date</th>
                    <th className="text-right">Impr</th>
                    <th className="text-right">Clicks</th>
                    <th className="text-right">Sales</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">Cost</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSnaps.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="py-1.5 text-xs">{s.date}</td>
                      <td className="text-right tabular-nums">
                        {s.impressions.toLocaleString()}
                      </td>
                      <td className="text-right tabular-nums">
                        {s.clicks.toLocaleString()}
                      </td>
                      <td className="text-right tabular-nums">{s.sales}</td>
                      <td className="text-right tabular-nums">
                        {fmtMoney(s.revenue)}
                      </td>
                      <td className="text-right tabular-nums">
                        {fmtMoney(s.cost)}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditPerf(s)}
                            className="btn-ghost h-6 px-2 text-[11px]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this snapshot?")) return;
                              await deletePerformance(s.id);
                              toast.success("Snapshot deleted");
                            }}
                            className="btn-ghost h-6 w-6 p-0"
                            aria-label="Delete snapshot"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <MiniChart title="Impressions">
                <LineChart data={series}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </MiniChart>
              <MiniChart title="Clicks">
                <LineChart data={series}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </MiniChart>
              <MiniChart title="Sales">
                <LineChart data={series}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </MiniChart>
              <MiniChart title="Revenue vs cost">
                <LineChart data={series}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </MiniChart>
            </div>
          </>
        )}
      </SectionCard>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add performance snapshot"
        size="lg"
      >
        <PerformanceEntryForm
          campaignId={campaign.id}
          campaignPlatform={campaign.platform}
          onSubmit={async (vals) => {
            // Soft duplicate guard. Snapshots sum over time, so entering one
            // twice on the same date double-counts that day. We warn but
            // still allow the user to proceed in case they're tracking two
            // sources separately.
            const duplicate = snapshots.some((s) => s.date === vals.date);
            if (duplicate) {
              const proceed = window.confirm(
                "A snapshot already exists for this period.\n\n" +
                  "Snapshots are summed over time, so creating another may " +
                  "duplicate reporting for this date. Continue anyway?"
              );
              if (!proceed) return;
            }
            await addPerformance(vals);
            toast.success("Snapshot added");
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      <Modal
        open={!!editPerf}
        onClose={() => setEditPerf(null)}
        title="Edit snapshot"
        size="lg"
      >
        {editPerf && (
          <PerformanceEntryForm
            campaignId={campaign.id}
            campaignPlatform={campaign.platform}
            initial={editPerf}
            submitLabel="Save changes"
            onSubmit={async (vals) => {
              await updatePerformance(editPerf.id, vals);
              toast.success("Snapshot updated");
              setEditPerf(null);
            }}
            onCancel={() => setEditPerf(null)}
          />
        )}
      </Modal>
    </>
  );
}
