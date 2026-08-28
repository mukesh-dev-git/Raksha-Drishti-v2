"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import CaseStatusPill from "@/components/CaseStatusPill";
import { CASE_STATUS_LABEL, type CaseStatusId } from "@/lib/caseStatus";

// -----------------------------------------------------------------------------
// P2.4 - the first real write control in this app. Calls the real
// PATCH /api/cases/[caseId]/status endpoint (src/lib/zcql.ts's updateRow()).
//
// That endpoint is UNTESTED against a live Data Store as of this writing -
// local dev has no Catalyst request context, so every call from here will
// fail locally with a clear, real error (not a fabricated success) until
// this is deployed. Failure is shown, not swallowed - that's deliberate:
// this control exists partly to make the very first live test visible and
// legible ("here's exactly what Catalyst said"), not just to look finished.
// -----------------------------------------------------------------------------
export default function CaseStatusEditor({ caseMasterId, statusId }: { caseMasterId: number; statusId: CaseStatusId }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<CaseStatusId>(statusId);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = draft !== statusId;

  async function save() {
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/cases/${caseMasterId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId: draft }),
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
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={draft}
          onChange={(e) => {
            setDraft(Number(e.target.value) as CaseStatusId);
            setSaved(false);
            setError(null);
          }}
          className="rounded-sm border border-line bg-surface px-2 py-1 text-[12.5px] text-ink"
          aria-label="Change case status"
        >
          {([1, 2, 3, 4] as CaseStatusId[]).map((id) => (
            <option key={id} value={id}>{CASE_STATUS_LABEL[id]}</option>
          ))}
        </select>
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-sm bg-navy px-3 py-1 text-[12.5px] font-medium text-white hover:bg-navy-hover disabled:opacity-60"
          >
            {pending && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
            Save
          </button>
        )}
        {!dirty && <CaseStatusPill statusId={statusId} />}
      </div>
      {saved && <p className="text-[11.5px] text-success">Saved.</p>}
      {error && <p className="max-w-[260px] text-right text-[11.5px] text-danger">{error}</p>}
    </div>
  );
}
