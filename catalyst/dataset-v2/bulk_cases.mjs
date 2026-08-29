// -----------------------------------------------------------------------------
// bulk_cases.mjs — P1.2, the "broad" half of the seed. The 15 scenarios in
// cases.json are deep (full evidence, hand-authored contradictions) but
// narrow (19 FIRs can't show a hotspot, a trend, or a time-of-day
// distribution - see PLAN.md P1.2). This generates real relational rows
// (CaseMaster/ComplainantDetails/Victim/Accused/ActSectionAssociation) at
// statistical volume, using the SAME lookups.json, the SAME geo_time.mjs
// placement/timing logic P1.3/P1.4 built, and the SAME global-person-ID
// register P1.1 established - not a separate, incompatible generator.
//
// What this deliberately does NOT do: no calls/transactions/CCTV/witness-
// statements/timeline, no contradiction, no scenario narrative. Those are
// evidence-collection features (P3.1 entity fusion, P4.6 MO-clustering,
// P4.7 repeat-offenders, the Investigation Workspace) already calibrated
// and verified against the 15 authored scenarios specifically - flooding
// them with statistically-generated, evidence-free bulk cases would produce
// fake "patterns" (two cases sharing a common IPC section by chance, out of
// a pool of ~20 sections spread across hundreds of cases, is coincidence,
// not a real MO match) and fake "repeat offenders" (a reused name is not a
// cross-referenced person). caseWorklist.ts / moPatterns.ts / personFusion.ts
// each draw an explicit line: real case FACTS (district, crime type,
// sections, dates, status) flow from every case, bulk included; person-level
// CROSS-CASE claims stay scoped to evidence-backed cases only. See PLAN.md
// P1.2 for the full reasoning.
//
// Deterministic in a fixed seed string (not Math.random) - same discipline
// geo_time.mjs and personIdentity's generator (build_seed.mjs §7) already
// follow, so re-running this never renumbers or relocates a case.
// -----------------------------------------------------------------------------
import { placeIncident, incidentHour, isPeriodOffence } from "./geo_time.mjs";

// mulberry32 on a hashed seed - identical approach to geo_time.mjs's private
// rng(), just needed here too for case-level decisions (district, crime
// type, names, status, dates) that aren't geo_time's job.
function rng(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return function next() {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickWeighted(r, items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x < 0) return v;
  }
  return items[items.length - 1][0];
}
function pick(r, arr) {
  return arr[Math.floor(r() * arr.length)];
}
function pad(n, len) {
  return String(n).padStart(len, "0");
}

// Real district-weight shape (roughly population/urbanisation-proportional -
// Bengaluru Urban carries the most caseload, the two rural-leaning districts
// the least), NOT copied from data.ts's fake placeholder counts - those were
// invented for a UI mock before any real data existed and are exactly the
// numbers this generator makes obsolete.
const DISTRICT_WEIGHTS = [
  [4401, 26], [4402, 14], [4403, 12], [4404, 10],
  [4405, 10], [4406, 10], [4407, 9], [4408, 9],
];

const CRIME_WEIGHTS = [[1, 40], [2, 23], [3, 21], [4, 16]]; // Theft/Assault/Fraud/Burglary

const SECTION_POOL = {
  1: { primary: [["379", 75], ["380", 20], ["411", 5]], secondary: [["34", 0.2], ["411", 0.1]] },
  2: { primary: [["323", 60], ["324", 20], ["354", 20]], secondary: [["506", 0.25], ["34", 0.15]] },
  3: { primary: [["420", 50], ["406", 15], ["467", 10], ["384", 15], ["66D", 10]], secondary: [["468", 0.2], ["471", 0.15], ["120B", 0.15], ["66C", 0.1]] },
  4: { primary: [["454", 55], ["457", 35], ["380", 10]], secondary: [["411", 0.15]] },
};
const ACT_FOR_SECTION = { "66D": "ITACT", "66C": "ITACT" };

const BRIEF_TEMPLATES = {
  1: ["Theft reported near {loc}, {dist}.", "Complainant reports valuables stolen from {loc}, {dist}."],
  2: ["Assault reported near {loc}, {dist} following an altercation.", "Complainant sustained injuries in an assault near {loc}, {dist}."],
  3: ["Complainant reports being defrauded in a transaction linked to {loc}, {dist}.", "Financial fraud reported by complainant, traced to {loc}, {dist}."],
  4: ["Burglary reported at a residence near {loc}, {dist}.", "Break-in reported at a shop near {loc}, {dist}."],
};
const STATUS_SUFFIX = {
  1: " Case registered; investigation to begin.",
  2: " Investigation concluded; charge sheet filed.",
  3: " Case closed after investigation.",
  4: " Investigation ongoing.",
};

const MALE_FIRST = ["Ramesh", "Suresh", "Manjunath", "Prakash", "Naveen", "Vinod", "Anil", "Ravi", "Kiran", "Ganesh", "Mahesh", "Rajesh", "Vijay", "Ashok", "Srinivas", "Girish", "Chandru", "Yogesh", "Arjun", "Iqbal", "Farhan", "Imran", "Salim", "Joseph", "Anthony", "Dinesh", "Harish", "Nagaraj", "Basavaraj", "Manoj"];
const FEMALE_FIRST = ["Anita", "Kavya", "Lakshmi", "Sunita", "Divya", "Sneha", "Pooja", "Shilpa", "Roopa", "Ananya", "Meena", "Radha", "Nandini", "Zoya", "Fathima", "Mary", "Sowmya", "Deepa", "Shalini", "Geeta", "Rekha", "Priya", "Swathi", "Vidya", "Kusuma"];
const SURNAMES = ["Naik", "Gowda", "Rao", "Reddy", "Kumar", "Patil", "Shetty", "Hegde", "Bhat", "Kulkarni", "Hiremath", "Desai", "Sait", "Merchant", "Khan", "Pinto", "D'Souza", "Achar", "Poojary", "Nayak"];

function randomName(r, genderId) {
  const first = genderId === 1 ? pick(r, MALE_FIRST) : pick(r, FEMALE_FIRST);
  return `${first} ${pick(r, SURNAMES)}`;
}

// Days between two ISO dates.
function daysBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmt(dateIso, h, m) {
  return `${dateIso} ${pad(h, 2)}:${pad(m, 2)}:00`;
}

/**
 * @param {object} lookups - the same lookups.json build_seed.mjs already reads
 * @param {object} opts
 * @param {number} opts.count - how many bulk CaseMaster rows to generate
 * @param {number} opts.startCaseMasterId
 * @param {number} opts.startAccusedMasterId
 * @param {number} opts.startVictimMasterId
 * @param {number} opts.startComplainantId
 * @param {number} opts.startPersonNumber - continues P1.1's global KA-Pxxxx register
 * @param {string} opts.today - ISO date, the generation "now" (registered dates never exceed this)
 */
export function generateBulkCases(lookups, opts) {
  const {
    count, startCaseMasterId, startAccusedMasterId, startVictimMasterId,
    startComplainantId, startPersonNumber, today,
  } = opts;

  const unitByDistrict = new Map();
  for (const u of lookups.Unit) {
    const list = unitByDistrict.get(u.DistrictID) ?? [];
    list.push(u);
    unitByDistrict.set(u.DistrictID, list);
  }
  const courtByDistrict = new Map(lookups.Court.map((c) => [c.DistrictID, c.CourtID]));
  const districtName = new Map(lookups.District.map((d) => [d.DistrictID, d.DistrictName]));
  const employeesByDistrict = new Map();
  for (const e of lookups.Employee) {
    const list = employeesByDistrict.get(e.DistrictID) ?? [];
    list.push(e);
    employeesByDistrict.set(e.DistrictID, list);
  }

  const startIso = "2022-01-01";
  const totalDays = daysBetween(startIso, today);

  const caseMasterRows = [];
  const complainantRows = [];
  const victimRows = [];
  const accusedRows = [];
  const actSectionRows = [];

  let accusedMasterId = startAccusedMasterId;
  let victimMasterId = startVictimMasterId;
  let complainantId = startComplainantId;
  let personNumber = startPersonNumber;
  const bulkPersonPool = []; // { personId, name } - for the occasional repeat subject
  const stationSeq = new Map(); // `${stationId}:${year}` -> running sequence, mirrors real CCTNS numbering (resets per PS per year)

  for (let i = 0; i < count; i++) {
    const caseMasterId = startCaseMasterId + i;
    const r = rng(`bulk:${caseMasterId}`);

    const districtId = pickWeighted(r, DISTRICT_WEIGHTS);
    const stations = unitByDistrict.get(districtId) ?? [];
    // Prefer an urban station 3:1 over a rural one where a district has both
    // (Tumakuru, Shivamogga) - most caseload really is urban, mirroring the
    // same urban/rural split geo_time.mjs's STATION_LOCALITIES spreadKm
    // already encodes.
    const stationWeights = stations.map((u) => [u.UnitID, u.UnitName.includes("Rural") ? 1 : 3]);
    const policeStationId = pickWeighted(r, stationWeights);

    const crimeMinorHeadId = pickWeighted(r, CRIME_WEIGHTS);

    const dayOffset = Math.floor(r() * totalDays);
    const crimeRegisteredDate = addDays(startIso, dayOffset);
    const ageDays = totalDays - dayOffset;

    // Status is age-weighted: a case registered years ago is far more likely
    // resolved (charge-sheeted or closed) than one from last week, same
    // reasoning P2.1a used to hand-vary the 19 real FIRs' statuses.
    let statusWeights;
    if (ageDays > 540) statusWeights = [[2, 30], [3, 35], [4, 30], [1, 5]];
    else if (ageDays > 180) statusWeights = [[2, 22], [3, 13], [4, 55], [1, 10]];
    else statusWeights = [[2, 4], [3, 2], [4, 64], [1, 30]];
    const caseStatusId = pickWeighted(r, statusWeights);

    const place = placeIncident(policeStationId, caseMasterId);

    // Fraud is the only crime type here that's sometimes a running scheme
    // rather than a single moment - same isPeriodOffence() convention as the
    // authored scenarios (see geo_time.mjs), never invented for the other
    // three types.
    const isPeriod = crimeMinorHeadId === 3 && r() < 0.25;
    let incidentFromDate, incidentToDate;
    if (isPeriod) {
      const spanDays = 20 + Math.floor(r() * 70);
      const endBuffer = 1 + Math.floor(r() * 5);
      incidentFromDate = fmt(addDays(crimeRegisteredDate, -(spanDays + endBuffer)), 0, 0);
      incidentToDate = fmt(addDays(crimeRegisteredDate, -endBuffer), 0, 0);
    } else {
      const hour = incidentHour(crimeMinorHeadId, caseMasterId, policeStationId);
      const minute = Math.floor(r() * 60);
      const incidentDate = addDays(crimeRegisteredDate, r() < 0.85 ? 0 : -1);
      incidentFromDate = fmt(incidentDate, hour, minute);
      incidentToDate = fmt(incidentDate, hour, Math.min(minute + 15, 59));
    }
    const infoReceivedPSDate = fmt(crimeRegisteredDate, Math.min(23, new Date(incidentFromDate.replace(" ", "T")).getHours() + 1), 30);

    const yr = crimeRegisteredDate.slice(0, 4);
    const seqKey = `${policeStationId}:${yr}`;
    const seq = (stationSeq.get(seqKey) ?? 0) + 1;
    stationSeq.set(seqKey, seq);
    const crimeNo = `${policeStationId}${yr}${pad(seq, 5)}`;
    const caseNo = `${yr}${pad(seq, 5)}`;

    const districtEmployees = employeesByDistrict.get(districtId) ?? lookups.Employee;
    const policePersonId = pick(r, districtEmployees).EmployeeID;
    const courtId = courtByDistrict.get(districtId) ?? lookups.Court[0].CourtID;

    // Heinous is the exception, not the rule - mostly Assault, rarely the
    // other three (a large-value fraud or an armed burglary can qualify).
    const heinousChance = crimeMinorHeadId === 2 ? 0.12 : 0.02;
    const gravityOffenceId = r() < heinousChance ? 1 : 2;

    const briefTemplate = pick(r, BRIEF_TEMPLATES[crimeMinorHeadId]);
    const briefFacts = briefTemplate.replace("{loc}", place.locality).replace("{dist}", districtName.get(districtId)) + STATUS_SUFFIX[caseStatusId];

    caseMasterRows.push({
      CaseMasterID: caseMasterId,
      CrimeNo: crimeNo,
      CaseNo: caseNo,
      CrimeRegisteredDate: crimeRegisteredDate,
      PolicePersonID: policePersonId,
      PoliceStationID: policeStationId,
      CaseCategoryID: 1, // FIR
      GravityOffenceID: gravityOffenceId,
      CrimeMajorHeadID: 1,
      CrimeMinorHeadID: crimeMinorHeadId,
      CaseStatusID: caseStatusId,
      CourtID: courtId,
      IncidentFromDate: incidentFromDate,
      IncidentToDate: incidentToDate,
      InfoReceivedPSDate: infoReceivedPSDate,
      latitude: place.latitude,
      longitude: place.longitude,
      BriefFacts: briefFacts,
    });

    // Sections - one primary always, an occasional second for realism (a
    // theft charged alongside common-intention IPC-34, a fraud alongside a
    // forgery section), same shape as the 19 authored FIRs.
    const pool = SECTION_POOL[crimeMinorHeadId];
    const primary = pickWeighted(r, pool.primary);
    const sections = [primary];
    for (const [code, chance] of pool.secondary) {
      if (r() < chance && !sections.includes(code)) sections.push(code);
    }
    sections.forEach((code, idx) => {
      actSectionRows.push({
        CaseMasterID: caseMasterId,
        ActID: ACT_FOR_SECTION[code] ?? "IPC",
        SectionID: code,
        ActOrderID: 1,
        SectionOrderID: idx + 1,
      });
    });

    // Victim + complainant - a real FIR almost always has both; often the
    // same person (the victim reporting their own case), sometimes not (a
    // shopkeeper reporting on behalf of an absent owner, a family member).
    const victimGender = pickWeighted(r, [[1, 55], [2, 45]]);
    const victimName = randomName(r, victimGender);
    const victimAge = 18 + Math.floor(r() * 55);
    victimRows.push({
      VictimMasterID: victimMasterId,
      CaseMasterID: caseMasterId,
      VictimName: victimName,
      AgeYear: victimAge,
      GenderID: victimGender,
      VictimPolice: 0,
    });
    victimMasterId++;

    const sameAsVictim = r() < 0.7;
    const complainantGender = sameAsVictim ? victimGender : pickWeighted(r, [[1, 55], [2, 45]]);
    complainantRows.push({
      ComplainantID: complainantId,
      CaseMasterID: caseMasterId,
      ComplainantName: sameAsVictim ? victimName : randomName(r, complainantGender),
      AgeYear: sameAsVictim ? victimAge : 20 + Math.floor(r() * 50),
      // OccupationID/ReligionID/CasteID: P1.5 hasn't landed (framing not yet
      // agreed - see PLAN.md), so these stay unpopulated, same as every
      // authored-scenario complainant's ReligionID/CasteID today.
      OccupationID: 0,
      ReligionID: 0,
      CasteID: 0,
      GenderID: complainantGender,
    });
    complainantId++;

    // Accused - ONLY for Charge Sheeted / Closed cases. A chargesheet is
    // procedurally filed against a NAMED person; an Under Investigation or
    // Open bulk case correctly has none yet - that's the realistic, not the
    // degenerate, case for property crime especially. These DO get real,
    // continuing global PersonIDs (P1.1's KA-Pxxxx register) since that ID
    // is what makes a person a person dataset-wide, whether or not they also
    // have an evidence-backed profile - but they're deliberately NOT fused
    // into personFusion.ts's evidence-driven register (see this file's own
    // top comment), so caseWorklist.ts surfaces them un-linked.
    if (caseStatusId === 2 || caseStatusId === 3) {
      const numAccused = r() < 0.15 ? 2 : 1;
      for (let k = 0; k < numAccused; k++) {
        // 12% chance of reusing an existing bulk person - a modest, honest
        // repeat-subject signal (this IS the same real global ID appearing
        // in 2+ real cases), never crossing into the 1-47 scenario range.
        let personId, name;
        if (bulkPersonPool.length > 5 && r() < 0.12) {
          ({ personId, name } = pick(r, bulkPersonPool));
        } else {
          const gender = pickWeighted(r, [[1, 70], [2, 30]]); // accused skew matches the authored scenarios
          name = randomName(r, gender);
          personId = `KA-P${pad(personNumber, 4)}`;
          personNumber++;
          bulkPersonPool.push({ personId, name });
        }
        accusedRows.push({
          AccusedMasterID: accusedMasterId,
          CaseMasterID: caseMasterId,
          AccusedName: name,
          AgeYear: 18 + Math.floor(r() * 45),
          GenderID: r() < 0.85 ? 1 : 2,
          PersonID: personId,
        });
        accusedMasterId++;
      }
    }
  }

  return {
    caseMasterRows, complainantRows, victimRows, accusedRows, actSectionRows,
    nextIds: { caseMasterId: startCaseMasterId + count, accusedMasterId, victimMasterId, complainantId, personNumber },
  };
}
