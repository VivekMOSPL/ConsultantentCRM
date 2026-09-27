"use client";

import type { DataBundle } from "@/lib/api";
import { formatDate, todayISO } from "@/lib/format";
import { Card, EmptyState, StageBadge } from "./ui";

export default function FollowUpTab({
  data,
  onOpenRequirement,
}: {
  data: DataBundle;
  onOpenRequirement?: (id: string) => void;
}) {
  const today = todayISO();
  const rows = data.followUp;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Follow-up today</h2>
        <p className="text-sm text-slate-500">
          Open requirements whose submission deadline or follow-up date is {formatDate(today)} or
          earlier. Won and Lost requirements are excluded.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState>Nothing is due today or overdue.</EmptyState>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const customer = data.customers.find((c) => c.id === r.customer_id);
            const overdue =
              r.submission_deadline < today ||
              (r.follow_up_date !== null && r.follow_up_date < today);
            const reason =
              r.follow_up_date !== null && r.follow_up_date <= today
                ? `Follow-up ${formatDate(r.follow_up_date)}`
                : `Deadline ${formatDate(r.submission_deadline)}`;
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-slate-600">{customer?.name ?? "—"}</p>
                    <p className={`mt-1 text-sm ${overdue ? "font-semibold text-red-700" : "text-slate-600"}`}>
                      {reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StageBadge stage={r.stage} />
                    {overdue && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {r.submission_deadline < today ? "Overdue" : "Due today"}
                      </span>
                    )}
                    {onOpenRequirement && (
                      <button
                        type="button"
                        onClick={() => onOpenRequirement(r.id)}
                        className="text-sm text-blue-700 underline"
                      >
                        Open
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
