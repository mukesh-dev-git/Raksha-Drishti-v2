import { NextRequest, NextResponse } from "next/server";
import { initCatalyst, serializeError } from "@/lib/zcql";

import CallRecords from "@/lib/nosql-seed/CallRecords.json";
import Transactions from "@/lib/nosql-seed/Transactions.json";
import CCTVSightings from "@/lib/nosql-seed/CCTVSightings.json";
import WitnessStatements from "@/lib/nosql-seed/WitnessStatements.json";
import TimelineEvents from "@/lib/nosql-seed/TimelineEvents.json";
import Contradictions from "@/lib/nosql-seed/Contradictions.json";

export const dynamic = "force-dynamic";

// One-off admin route: bulk-loads the 6 generated NoSQL collections
// (catalyst/dataset-v2/out/nosql/*.json, copied into src/lib/nosql-seed/ so
// they bundle) into the 6 Catalyst NoSQL tables created 2026-08-24 (console-
// only, same as Data Store - see catalyst/DATA_STORE_SCHEMA.md). Each table
// has partition key "id" (String), matching every record's own "id" field.
//
// NoSQLItem.from(obj) takes a plain object directly - no per-field typing
// needed. Batched in chunks of 25 per insertItems() call since the exact
// max batch size isn't documented; all 6 collections are small (17-75
// records each, ~194 total) so this runs in a handful of calls either way.
//
// DELETE this route once run successfully once - see catalyst/README.md.
const COLLECTIONS: Record<string, unknown[]> = {
  CallRecords,
  Transactions,
  CCTVSightings,
  WitnessStatements,
  TimelineEvents,
  Contradictions,
};

const BATCH_SIZE = 25;

export async function GET(req: NextRequest) {
  const capp = initCatalyst(req);
  const nosql = capp.nosql();
  const { NoSQLItem } = require("zcatalyst-sdk-node/lib/no-sql");

  const results: Record<string, unknown> = {};

  for (const [tableName, records] of Object.entries(COLLECTIONS)) {
    try {
      const table = nosql.table(tableName);
      let inserted = 0;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records
          .slice(i, i + BATCH_SIZE)
          .map((r) => NoSQLItem.from(r));
        await table.insertItems(batch);
        inserted += batch.length;
      }
      results[tableName] = { ok: true, inserted, total: records.length };
    } catch (e) {
      results[tableName] = { ok: false, error: serializeError(e) };
    }
  }

  return NextResponse.json(results);
}
