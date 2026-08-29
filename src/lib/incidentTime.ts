// -----------------------------------------------------------------------------
// incidentTime.ts — P4.2's data-honesty guard, ported (not re-invented) from
// catalyst/dataset-v2/geo_time.mjs's own isPeriodOffence(). That file is the
// generator; this is the read-side twin src/ needs so a time-of-day analysis
// never treats a multi-day offence's stored 00:00 as a real midnight
// incident. Logic kept byte-for-byte identical to the generator's own
// comment/threshold (>36h from->to) rather than re-derived, so the two can't
// silently drift apart.
// -----------------------------------------------------------------------------

/** A crime that unfolded over days or weeks (a running extortion racket, a
 *  ponzi scheme, a skimming operation) has no real time of day - the FIR
 *  records 00:00 with a from/to date range instead. Counting that 00:00 as
 *  "midnight" would manufacture a fake midnight spike that is purely an
 *  artefact of how an unknown time is stored, not a real pattern. */
export function isPeriodOffence(incidentFromDate: string | null, incidentToDate: string | null): boolean {
  if (!incidentFromDate || !incidentToDate) return false;
  const from = new Date(incidentFromDate.replace(" ", "T"));
  const to = new Date(incidentToDate.replace(" ", "T"));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
  return to.getTime() - from.getTime() > 36 * 60 * 60 * 1000; // > 36h, same threshold as geo_time.mjs
}

/** Hour of day (0-23) a discrete incident's stored datetime falls on. Only
 *  meaningful when isPeriodOffence() is false for the same case - callers
 *  are expected to filter first. */
export function incidentHourOfDay(incidentFromDate: string): number {
  return new Date(incidentFromDate.replace(" ", "T")).getHours();
}

/** Day of week (0=Sunday .. 6=Saturday) for the same stored datetime. */
export function incidentDayOfWeek(incidentFromDate: string): number {
  return new Date(incidentFromDate.replace(" ", "T")).getDay();
}
