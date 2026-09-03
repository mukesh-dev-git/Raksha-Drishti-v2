import { NextRequest, NextResponse } from "next/server";
import { predictCrimeCount, getForecastUnits, getForecastHistory } from "@/lib/crimeForecast";

export const dynamic = "force-dynamic";

// GET /api/crime-forecast -> { units: ForecastUnit[] }
// GET /api/crime-forecast?unit=<name>&range=<name>&year=<n> -> a real prediction + real history
//
// P13 Phase B (2026-09-03) - the real, QuickML-trained answer to the
// mentor's feedback ("AI/ML expected, synthetic data doesn't give real
// insight"). See src/lib/crimeForecast.ts's own header for the full model
// provenance (152 real KSP/SCRB rows, R²=0.998, MAE≈211, MAPE≈7.8%) and the
// real contract this route calls (found live, not guessed - four guessed
// URL patterns 404'd before the real one was pulled off the Catalyst
// Console's API Details tab).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const unit = searchParams.get("unit");
  const range = searchParams.get("range");
  const yearParam = searchParams.get("year");

  if (!unit || !range || !yearParam) {
    // No query - just list the real units this model knows about, for a
    // picker UI to populate itself.
    return NextResponse.json({ units: getForecastUnits() });
  }

  const year = Number(yearParam);
  if (!Number.isFinite(year)) {
    return NextResponse.json({ error: "year must be a number" }, { status: 400 });
  }

  const units = getForecastUnits();
  if (!units.some((u) => u.unit === unit && u.range === range)) {
    return NextResponse.json({ error: `unknown unit/range combination: "${unit}" / "${range}"` }, { status: 400 });
  }

  const history = getForecastHistory(unit);
  const result = await predictCrimeCount(unit, range, year);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, history }, { status: 502 });
  }
  return NextResponse.json({ ok: true, unit, range, year, predictedIpcCases: result.predictedIpcCases, history });
}
