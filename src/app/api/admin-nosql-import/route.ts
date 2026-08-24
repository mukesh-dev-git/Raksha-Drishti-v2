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
// needed. insertItems() takes ONE { item: NoSQLItem } per call, not a bulk
// array - the array form failed on every table with the same generic
// "input value is not readable" error (confirmed against the official Node
// SDK docs, 2026-08-24). One request per record instead - all 6 collections
// are small (17-75 records each, ~194 total) so this is still fast.
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

export async function GET(req: NextRequest) {
  const capp = initCatalyst(req);
  const nosql = capp.nosql();
  const { NoSQLItem } = require("zcatalyst-sdk-node/lib/no-sql");

  const results: Record<string, unknown> = {};

  for (const [tableName, records] of Object.entries(COLLECTIONS)) {
    const table = nosql.table(tableName);
    let inserted = 0;
    const errors: unknown[] = [];
    for (const record of records) {
      try {
        // insertItems() takes a single { item: NoSQLItem } per call, not a
        // bulk array - confirmed against the official Node SDK docs
        // (2026-08-24) after the array form failed on every table with the
        // same generic "input value is not readable" error.
        await table.insertItems({ item: NoSQLItem.from(record) });
        inserted++;
      } catch (e) {
        errors.push({ id: (record as any).id, error: serializeError(e) });
      }
    }
    results[tableName] = { inserted, total: records.length, errors };
  }

  return NextResponse.json(results);
}
