// -----------------------------------------------------------------------------
// Shared ZCQL helpers for the Route Handlers under src/app/api/*, ported from
// functions/rd_api/index.js (the retired standalone Catalyst Function - see
// catalyst/README.md for why this moved). Same gotchas apply here as there:
//
//   - ZCQL caps any SELECT without its own LIMIT at 300 rows. zcqlAll()
//     paginates past it via LIMIT {offset},300.
//   - `COUNT(...) AS alias` silently returns 0 on this Data Store rather than
//     erroring - use a plain SELECT + JS .length/aggregation instead.
//
// catalyst.initialize(req) needs a Node-style { headers: <plain object> }
// shape, not a Fetch API Request/NextRequest (whose .headers is a Headers
// instance) - confirmed working this way in a deployed Slate Route Handler,
// 2026-08-23 (see git history for the sdk-test probe that confirmed this).
// -----------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server";

const ZCQL_PAGE_SIZE = 300;

export function initCatalyst(req: NextRequest) {
  const catalyst = require("zcatalyst-sdk-node");
  const fakeReq = { headers: Object.fromEntries(req.headers.entries()) };
  return catalyst.initialize(fakeReq as never);
}

export async function zcql(req: NextRequest, query: string) {
  const capp = initCatalyst(req);
  return capp.zcql().executeZCQLQuery(query);
}

export async function zcqlAll(req: NextRequest, baseQuery: string) {
  let offset = 0;
  let all: any[] = [];
  for (;;) {
    const page = await zcql(req, `${baseQuery} LIMIT ${offset},${ZCQL_PAGE_SIZE}`);
    all = all.concat(page);
    if (page.length < ZCQL_PAGE_SIZE) break;
    offset += ZCQL_PAGE_SIZE;
  }
  return all;
}

// ZCQL rows come back as [{ TableName: {col: val}, ... }] - flatten a table out.
export const pick = (row: any, table: string) => row[table] || {};

// String(e) on a plain (non-Error) object just gives "[object Object]" - the
// zcatalyst SDK throws plain error objects, not Error instances.
export function serializeError(e: unknown) {
  if (e instanceof Error) return { message: e.message, name: e.name };
  try {
    const plain: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(Object(e))) {
      plain[key] = (e as any)[key];
    }
    return Object.keys(plain).length ? plain : { raw: String(e) };
  } catch {
    return { raw: String(e) };
  }
}

export function fail(e: unknown) {
  console.error("api route error:", e);
  return NextResponse.json({ error: serializeError(e) }, { status: 500 });
}

// -----------------------------------------------------------------------------
// NoSQL (investigation-intelligence collections, see catalyst/README.md §2b).
// The app instance's method is `capp.nosql()` (lowercase, confirmed against
// the SDK - `noSql()` doesn't exist), `.table(name)` gets a table handle.
//
// queryTable() prefix scan does NOT work on these tables: every one has
// partition key "id" (String) and NO sort key, and a live 400 confirmed
// (2026-08-24) that Catalyst rejects any non-EQUALS operator in a
// key_condition on a partition-key-only table - "PartitionKey operator must
// be equal". BEGINS_WITH (used below to fetch by scenarioId prefix, e.g.
// "C1-") is a real, documented NoSQLOperator, but it needs a sort key to do
// a prefix/range scan, which these tables don't have. Confirmed exact-key
// EQUALS lookups do work fine (per the SDK's own docs); a real prefix scan
// would need either an index or the tables recreated with a sort key.
//
// src/app/api/investigation/route.ts therefore reads this data from the
// bundled seed JSON (src/lib/nosql-seed/*.json, filtered by each record's
// own embedded scenarioId field) instead of a live query - the content is
// identical to what's seeded in NoSQL, and NoSQL remains the system of
// record for exact-key operations (a future edit/delete endpoint would use
// EQUALS-based fetchItem/updateItems/deleteItems here, which do work).
//
// queryTable() returns a NoSQLResponse whose `.get` is Array<{ item:
// NoSQLItem }> - NOT plain objects - so each hit needs `.item.to()` to get a
// near-native JS object back. The condition `value` must go through
// NoSQLMarshall.makeString() (a raw JS string is rejected), per the SDK's
// own table.d.ts queryTable() example. Left unused for now - kept as a
// reference for whichever future call actually uses an EQUALS key_condition.
// -----------------------------------------------------------------------------
// Data Store row-level writes (P2.4 - the first write endpoint anywhere in
// this app; every prior route is read-only). ZCQL itself is SELECT-only -
// Catalyst's Data Store DML (insert/update/delete) is a *separate* API,
// `capp.datastore().table(name)`, confirmed against the SDK's own
// table.d.ts (node_modules/zcatalyst-sdk-node/lib/datastore/table.d.ts) -
// not guessed, since there was no existing write call anywhere in this
// codebase to copy from.
//
// updateRow() needs the table's internal ROWID, not the business key
// (CaseMasterID) - ROWID is Catalyst's implicit system primary key on
// every Data Store row (alongside CREATEDTIME/MODIFIEDTIME/CREATORID),
// queryable via ZCQL like any other column. So a status update is two
// calls, not one: SELECT ROWID WHERE CaseMasterID = ?, then
// updateRow({ ROWID, CaseStatusID }).
//
// UNTESTED against a live Data Store as of this writing - local dev has no
// Catalyst request context (every zcql() call here fails immediately with
// "Failed to parse object", confirmed repeatedly this session), so this
// can only be verified after a Slate deploy. Written as carefully as the
// SDK's own types allow; flag any live failure here first if case-status
// updates don't work post-deploy.
export async function updateRow(
  req: NextRequest,
  tableName: string,
  rowId: string | number,
  columns: Record<string, unknown>
) {
  const capp = initCatalyst(req);
  return capp.datastore().table(tableName).updateRow({ ROWID: rowId, ...columns });
}

export async function nosqlGetByExactId(req: NextRequest, tableName: string, id: string) {
  const capp = initCatalyst(req);
  const { NoSQLEnum, NoSQLMarshall } = require("zcatalyst-sdk-node/lib/no-sql");
  const table = capp.nosql().table(tableName);
  const resp = await table.queryTable({
    key_condition: {
      attribute: "id",
      operator: NoSQLEnum.NoSQLOperator.EQUALS,
      value: NoSQLMarshall.makeString(id),
    },
    limit: 1,
  });
  return (resp.get || []).map((d: any) => d.item?.to())[0] || null;
}
