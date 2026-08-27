import { CASE_STATUS_LABEL, type CaseStatusId } from "@/lib/caseStatus";

// -----------------------------------------------------------------------------
// One consistent pill for a case's real CaseStatusMaster status, reused by
// the FIR Index, case detail, and district worklists - same 4 real values
// everywhere, same colors everywhere.
// -----------------------------------------------------------------------------
const STYLE: Record<CaseStatusId, string> = {
  1: "bg-dash-blue-bg text-dash-blue",
  4: "bg-warning-bg text-warning",
  2: "bg-dash-purple-bg text-dash-purple",
  3: "bg-success-bg text-success",
};

export default function CaseStatusPill({ statusId }: { statusId: CaseStatusId }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${STYLE[statusId]}`}>
      {CASE_STATUS_LABEL[statusId]}
    </span>
  );
}
