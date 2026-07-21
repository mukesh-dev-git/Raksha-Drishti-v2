import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

// -----------------------------------------------------------------------------
// StatusBadge — muted, functional status pill. Always pairs an icon + label so
// meaning is never carried by color alone (accessibility requirement).
// -----------------------------------------------------------------------------
type Status = "verified" | "pending" | "alert";

const MAP: Record<
  Status,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  verified: {
    label: "Verified",
    className: "bg-success-bg text-success",
    Icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    className: "bg-warning-bg text-warning",
    Icon: Clock,
  },
  alert: {
    label: "Alert",
    className: "bg-danger-bg text-danger",
    Icon: AlertTriangle,
  },
};

export default function StatusBadge({
  status,
  label,
}: {
  status: Status;
  label?: string;
}) {
  const { label: defaultLabel, className, Icon } = MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon size={12} aria-hidden="true" />
      {label ?? defaultLabel}
    </span>
  );
}
