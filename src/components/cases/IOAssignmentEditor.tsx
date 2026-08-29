"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCog } from "lucide-react";
import type { Employee } from "@/lib/employees";

// -----------------------------------------------------------------------------
// P9.2 - real IO assignment. Same real-write pattern CaseStatusEditor.tsx
// already proved live (PATCH -> updateRow() -> Catalyst Data Store).
// UNTESTED against a live Data Store as of this writing, for the same
// reason as that endpoint - failure is shown, not swallowed.
// -----------------------------------------------------------------------------
export default function IOAssignmentEditor({
  caseMasterId,
  currentEmployeeId,
  officers,
}: {
  caseMasterId: number;
  currentEmployeeId: number | null;
  officers: Employee[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<number | "">(currentEmployeeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = draft !== "" && draft !== currentEmployeeId;

  async function save() {
    if (draft === "") return;
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/cases/${caseMasterId}/officer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: draft }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message || body?.error || `Request failed (${res.status})`);
      }
      setSaved(true);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        <UserCog size={12} aria-hidden="true" /> Investigating officer
      </p>
      <div className="flex items-center gap-2">
        <select
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value ? Number(e.target.value) : "");
            setSaved(false);
            setError(null);
          }}
          className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-2 py-1.5 text-[12.5px] text-ink"
          aria-label="Assign investigating officer"
        >
          <option value="">Unassigned</option>
          {officers.map((o) => (
            <option key={o.employeeId} value={o.employeeId}>
              {o.rankName} {o.name} — {o.districtName}
            </option>
          ))}
        </select>
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex shrink-0 items-center gap-1.5 rounded-sm bg-navy px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-navy-hover disabled:opacity-60"
          >
            {pending && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
            Save
          </button>
        )}
      </div>
      {saved && <p className="mt-1.5 text-[11.5px] text-success">Saved.</p>}
      {error && <p className="mt-1.5 text-[11.5px] text-danger">{error}</p>}
    </div>
  );
}
