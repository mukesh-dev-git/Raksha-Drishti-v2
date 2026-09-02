import Link from "next/link";
import { PhoneCall, Landmark, Video, MessageSquareQuote, BadgeCheck } from "lucide-react";
import type { EvidenceFeedItem } from "@/lib/dashboardData";

const KIND: Record<EvidenceFeedItem["kind"], { icon: typeof PhoneCall; label: string }> = {
  call: { icon: PhoneCall, label: "Call Record" },
  transaction: { icon: Landmark, label: "Transaction" },
  cctv: { icon: Video, label: "CCTV Footage" },
  statement: { icon: MessageSquareQuote, label: "Witness Statement" },
};

export default function EvidenceFeedStrip({ items }: { items: EvidenceFeedItem[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-ink">Verified Evidence Feed</p>
        <span className="text-xs text-muted">Real seeded case records, most recent first</span>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
        {items.map((item) => {
          const k = KIND[item.kind];
          const Icon = k.icon;
          const card = (
            <div className="w-56 shrink-0 rounded-lg border border-line bg-surface-2 p-3.5 transition hover:border-dash-blue">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-dash-blue-bg text-dash-blue">
                  <Icon size={14} aria-hidden="true" />
                </span>
                <p className="text-xs font-semibold text-ink">{k.label}</p>
              </div>
              <p className="mt-2 truncate text-[13px] text-ink" title={item.label}>
                {item.label}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-medium text-success">
                <BadgeCheck size={11} aria-hidden="true" /> Verified
              </span>
            </div>
          );
          return item.link ? (
            <Link key={item.id} href={item.link}>
              {card}
            </Link>
          ) : (
            <div key={item.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
