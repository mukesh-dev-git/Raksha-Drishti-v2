import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Alert } from "@/lib/dashboardData";

export default function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="h-full rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-ink">Alerts &amp; Leads</p>
        <Link href="/cases" className="text-xs font-medium text-dash-blue hover:underline">
          View All
        </Link>
      </div>
      <ul className="mt-3 space-y-3">
        {alerts.map((a) => {
          const Item = (
            <div className="flex gap-3 rounded-lg border border-line bg-surface-2/60 p-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
                <AlertTriangle size={14} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ink">
                  {a.title}
                  {a.handlingLevel === "State CID" && (
                    <span className="rounded-full bg-dash-purple-bg px-1.5 py-0.5 text-[10px] font-semibold text-dash-purple">
                      State CID
                    </span>
                  )}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{a.detail}</p>
              </div>
            </div>
          );
          return (
            <li key={a.id}>
              {a.link ? (
                <Link href={a.link} className="block transition hover:border-danger/50">
                  {Item}
                </Link>
              ) : (
                Item
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
