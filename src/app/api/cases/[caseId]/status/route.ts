import { NextRequest, NextResponse } from "next/server";
import { zcql, pick, updateRow, fail } from "@/lib/zcql";
import { getWorklistCase } from "@/lib/caseWorklist";
import { isCaseStatusId } from "@/lib/caseStatus";

export const dynamic = "force-dynamic";

// PATCH /api/cases/[caseId]/status  { statusId: 1|2|3|4 }
// -> { ok: true, caseMasterId, statusId }
//
// P2.4 - the first real write endpoint in this app. Updates
// CaseMaster.CaseStatusID for one real FIR (a column that already exists
// in the live Data Store - no new table/infra needed, unlike case-diary
// entries, which would need a table nobody has created yet: Catalyst's
// Data Store has no CSV-import UI or DDL via any SDK, every table is
// hand-created in the console - see catalyst/README.md §2b).
//
// UNTESTED against a live Data Store - see zcql.ts's updateRow() comment
// for why (no Catalyst request context in local dev, confirmed repeatedly
// this session). Validated as much as possible without a live call: the
// caseId is checked against the real bundled worklist before any DB call
// is attempted, and statusId against the real 4-value CaseStatusMaster
// enum - so a bad request never reaches the database at all, live or not.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await params;
    const caseMasterId = Number(caseId);

    // Fail fast against real, bundled data before touching the DB at all -
    // catches a bad/unknown case id without needing a live call to find out.
    const existing = getWorklistCase(caseMasterId);
    if (!existing) {
      return NextResponse.json({ error: `No case ${caseId} in the register` }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const statusId = body?.statusId;
    if (typeof statusId !== "number" || !isCaseStatusId(statusId)) {
      return NextResponse.json(
        { error: "statusId must be one of 1 (Open), 2 (Charge Sheeted), 3 (Closed), 4 (Under Investigation)" },
        { status: 400 }
      );
    }

    const rows = await zcql(req, `SELECT ROWID FROM CaseMaster WHERE CaseMasterID = ${caseMasterId}`);
    const rowId = pick(rows[0], "CaseMaster")?.ROWID;
    if (!rowId) {
      return NextResponse.json({ error: `CaseMasterID ${caseMasterId} not found in the live Data Store` }, { status: 404 });
    }

    await updateRow(req, "CaseMaster", rowId, { CaseStatusID: statusId });

    return NextResponse.json({ ok: true, caseMasterId, statusId });
  } catch (e) {
    return fail(e);
  }
}
