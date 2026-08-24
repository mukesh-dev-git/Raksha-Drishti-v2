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
