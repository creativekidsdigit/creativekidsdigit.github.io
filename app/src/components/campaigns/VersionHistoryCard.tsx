import { History } from "lucide-react";
import { SectionCard } from "@/components/ui";
import type { Campaign } from "@/types";

interface Props {
  versions: Campaign["versions"];
}

/**
 * Editorial version history accordion. Rendered only when there's at least
 * one stored version. Each version shows the prior values of notes,
 * lessonsLearned, and optimizationIdeas.
 */
export default function VersionHistoryCard({ versions }: Props) {
  if (versions.length === 0) return null;
  return (
    <SectionCard
      title={`Version history (${versions.length})`}
      action={
        <span className="text-[11px] text-slate-500">
          Snapshots of notes / lessons / ideas
        </span>
      }
    >
      <ul className="space-y-1 text-xs">
        {[...versions].reverse().map((ver, i) => (
          <li
            key={i}
            className="rounded border border-slate-100 p-2 dark:border-slate-800"
          >
            <details>
              <summary className="cursor-pointer text-slate-700 dark:text-slate-300">
                <History className="mr-1 inline h-3 w-3" />
                {new Date(ver.ts).toLocaleString()}
              </summary>
              <div className="mt-2 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                {ver.notes && (
                  <div>
                    <strong>Notes:</strong>
                    <pre className="mt-1 whitespace-pre-wrap font-sans">
                      {ver.notes}
                    </pre>
                  </div>
                )}
                {ver.lessonsLearned && (
                  <div>
                    <strong>Lessons:</strong>
                    <pre className="mt-1 whitespace-pre-wrap font-sans">
                      {ver.lessonsLearned}
                    </pre>
                  </div>
                )}
                {ver.optimizationIdeas && (
                  <div>
                    <strong>Ideas:</strong>
                    <pre className="mt-1 whitespace-pre-wrap font-sans">
                      {ver.optimizationIdeas}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
