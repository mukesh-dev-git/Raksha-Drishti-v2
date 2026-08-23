// Throwaway probe: does zcatalyst-sdk-node's catalyst.initialize(req) work
// inside a Next.js Route Handler running on Catalyst Slate, the same way it
// works inside an Advanced I/O Function? Slate's build log shows it builds a
// real "server function" via OpenNext, so it's plausible the same
// Catalyst-injected request context carries through - but Catalyst's own
// docs don't confirm this either way for anything outside Advanced I/O, so
// testing directly rather than guessing. DELETE this route once confirmed
// either way - see catalyst/README.md for the outcome.
import { NextRequest, NextResponse } from "next/server";

// Without this, Next tries to statically prerender this route at build time
// (no real request context exists then) - OpenNext/Slate then seems to serve
// that failed prerender forever instead of falling back to live execution,
// producing a 404 with x-nextjs-prerender:1 even on a cache-busted request.
// Confirmed via header inspection, 2026-08-23 - this may be the same root
// cause as the earlier nested dynamic-page 404s.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // zcatalyst-sdk-node expects a Node-style IncomingMessage (reads
    // req.headers as a plain object) - NextRequest's headers are a Headers
    // instance, so adapt the shape it actually needs.
    const fakeReq = { headers: Object.fromEntries(req.headers.entries()) };
    const catalyst = require("zcatalyst-sdk-node");
    const capp = catalyst.initialize(fakeReq as any);
    const rows = await capp.zcql().executeZCQLQuery("SELECT StateID, StateName FROM State LIMIT 1");
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e), name: e?.name, raw: JSON.stringify(e) },
      { status: 500 }
    );
  }
}
