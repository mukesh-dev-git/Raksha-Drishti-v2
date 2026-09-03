// -----------------------------------------------------------------------------
// Server-side-only client for the P13.B QuickML regression endpoint
// ("District Crime Trend Forecast v2"). Import this ONLY from Route Handlers
// / Server Components - reads QUICKML_* secrets from process.env, same
// discipline as llm.ts.
//
// THIS IS A DIFFERENT SECRET FROM llm.ts's OAuth flow, used TOGETHER, not
// instead: a deployed QuickML endpoint needs BOTH a valid OAuth access token
// (via getAccessToken(), reused from llm.ts - same QUICKML_CLIENT_ID/SECRET/
// REFRESH_TOKEN) AND a per-endpoint QUICKML_ENDPOINT_KEY header. Confirmed
// live 2026-09-03 by pulling the real contract off the Catalyst Console's
// own "API Details" tab for this endpoint - four guessed URL patterns
// (model/{id}/predict, endpoint/{id}/predict, deployment/{id}/predict,
// predict/{id}) all 404'd first. The real, working shape:
//   POST https://api.catalyst.zoho.in/quickml/v1/project/{projectId}/endpoints/predict
//   Headers: X-QUICKML-ENDPOINT-KEY, Authorization: Zoho-oauthtoken <token>,
//            CATALYST-ORG, Environment
//   Body: { "data": { <one record, plain object, NOT an array> } }
//
// MODEL, TRAINED ON REAL DATA, HONESTLY SCOPED: linear regression, R²=0.998,
// MAE≈211, MAPE≈7.8%, trained on 152 real (unit, year) rows from KSP/SCRB's
// own 2022-2025 published district crime statistics (see
// catalyst/real-data/crime-trends/reconcile.mjs). The high R² is mostly the
// model learning each unit's baseline scale (a real ~65x spread between the
// smallest and largest units) - the harder, more valuable part, the real
// year-over-year trend, is the secondary signal inside that. State this
// plainly in the UI, not just here - see CrimeForecastPanel.tsx.
//
// Predicts ipcCases ONLY - sllCases/total were deliberately excluded from
// training (they're not published per-district for 2024, and total is
// arithmetically derived from ipcCases elsewhere in the reconciled data,
// which would have been leakage, not signal - caught and fixed before this
// model was trained, see the deleted first pipeline in PLAN.md P13.B).
// -----------------------------------------------------------------------------
import { getAccessToken } from "./llm";
import unitsData from "./real-data/districtCrimeTrends.json";

const PREDICT_URL = "https://api.catalyst.zoho.in/quickml/v1/project/56806000000070001/endpoints/predict";

export type ForecastUnit = { unit: string; range: string };

/** Every real KSP unit this model was trained on, deduped, for a picker UI -
 *  not the app's 31-district roster (see PLAN.md P13.B: kept KSP's native
 *  Commissionerate/Range taxonomy rather than force-aggregating). */
export function getForecastUnits(): ForecastUnit[] {
  const seen = new Map<string, ForecastUnit>();
  for (const row of unitsData as { unit: string; range: string }[]) {
    if (!seen.has(row.unit)) seen.set(row.unit, { unit: row.unit, range: row.range });
  }
  return [...seen.values()].sort((a, b) => a.unit.localeCompare(b.unit));
}

/** The real, historical (unit, year) -> ipcCases rows this model trained on -
 *  for showing "here's the real history" alongside a prediction, not just
 *  the number in isolation. */
export function getForecastHistory(unit: string): { year: number; ipcCases: number }[] {
  return (unitsData as { unit: string; year: number; ipcCases: number }[])
    .filter((r) => r.unit === unit)
    .map((r) => ({ year: r.year, ipcCases: r.ipcCases }))
    .sort((a, b) => a.year - b.year);
}

export type ForecastResult =
  | { ok: true; predictedIpcCases: number }
  | { ok: false; error: string };

/** Calls the real, deployed QuickML endpoint. Never throws for an API-level
 *  failure - returns { ok: false } so callers degrade honestly (same
 *  pattern as llm.ts's callGlm()), never a fabricated number. */
export async function predictCrimeCount(unit: string, range: string, year: number): Promise<ForecastResult> {
  const endpointKey = process.env.QUICKML_ENDPOINT_KEY;
  const orgId = process.env.QUICKML_ORG_ID;
  if (!endpointKey || !orgId) {
    return { ok: false, error: "QUICKML_ENDPOINT_KEY or QUICKML_ORG_ID not configured" };
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    return { ok: false, error: `token mint failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  try {
    const res = await fetch(PREDICT_URL, {
      method: "POST",
      headers: {
        "X-QUICKML-ENDPOINT-KEY": endpointKey,
        "Authorization": `Zoho-oauthtoken ${token}`,
        "CATALYST-ORG": orgId,
        "Environment": "Development",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { unit, range, year } }),
    });
    const text = await res.text();
    let parsed: { result?: number[]; status?: string } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: `non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}` };
    }
    if (!res.ok || !parsed.result || typeof parsed.result[0] !== "number") {
      return { ok: false, error: `predict failed (HTTP ${res.status}): ${text.slice(0, 200)}` };
    }
    return { ok: true, predictedIpcCases: Math.round(parsed.result[0]) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
