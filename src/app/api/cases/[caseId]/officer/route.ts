import { NextRequest, NextResponse } from "next/server";
import { zcql, pick, updateRow, fail } from "@/lib/zcql";
import { getWorklistCase } from "@/lib/caseWorklist";
import { getEmployee } from "@/lib/employees";

export const dynamic = "force-dynamic";

// PATCH /api/cases/[caseId]/officer  { employeeId: number }
// -> { ok: true, caseMasterId, employeeId }
//
// P9.2 - same real-write pattern P2.4's status endpoint already proved
// live: SELECT ROWID WHERE CaseMasterID = ?, then updateRow(). Updates
// CaseMaster.PolicePersonID (a real column - see DATA_STORE_SCHEMA.md's
// CaseMaster row) to a real Employee (employees.json, from the actually-
// imported Employee/Rank/Designation tables - not invented officers).
//
// Same honesty as P2.4: UNTESTED against a live Data Store locally, for the
// same reason (no Catalyst request context in local dev). Validated as
// much as possible without a live call: caseId checked against the real
// bundled worklist, employeeId checked against the real bundled roster,
// before any DB call is attempted.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await params;
    const caseMasterId = Number(caseId);

    const existing = getWorklistCase(caseMasterId);
    if (!existing) {
      return NextResponse.json({ error: `No case ${caseId} in the register` }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const employeeId = body?.employeeId;
    if (typeof employeeId !== "number" || !getEmployee(employeeId)) {
      return NextResponse.json({ error: "employeeId must be a real officer id" }, { status: 400 });
    }

    const rows = await zcql(req, `SELECT ROWID FROM CaseMaster WHERE CaseMasterID = ${caseMasterId}`);
    const rowId = pick(rows[0], "CaseMaster")?.ROWID;
    if (!rowId) {
      return NextResponse.json({ error: `CaseMasterID ${caseMasterId} not found in the live Data Store` }, { status: 404 });
    }

    await updateRow(req, "CaseMaster", rowId, { PolicePersonID: employeeId });

    return NextResponse.json({ ok: true, caseMasterId, employeeId });
  } catch (e) {
    return fail(e);
  }
}
