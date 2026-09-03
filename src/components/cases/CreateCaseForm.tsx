"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import { districts } from "@/lib/data";
import { getEmployees } from "@/lib/employees";
import KannadaDictationButton from "./KannadaDictationButton";
import TranslateButton from "@/components/ui/TranslateButton";
import KannadaIntakePipelineButton from "./KannadaIntakePipelineButton";

// -----------------------------------------------------------------------------
// P10 Phase 3 (2026-09-02) - the create half of real CRUD. Calls the real
// POST /api/cases (src/lib/caseCreate.ts's createCase()) - every field here
// maps to a real, mandatory Data Store column, confirmed live via
// CatalystbyZoho_List_All_Columns before this form was written, not assumed
// from the schema doc's intent (see caseCreate.ts's header note).
//
// Victim/Accused are genuinely optional in the form AND in the insert - a
// real FIR can be filed against unknown persons, or have no separately-
// named victim distinct from the complainant. Complainant is not optional:
// no real FIR is complainant-less.
// -----------------------------------------------------------------------------

const CRIME_TYPES = [
  { dbId: 1, name: "Theft" },
  { dbId: 2, name: "Assault" },
  { dbId: 3, name: "Fraud" },
  { dbId: 4, name: "Burglary" },
];

const OCCUPATIONS = [
  { id: 0, name: "Not specified" },
  { id: 1, name: "Business / Shop Owner" }, { id: 2, name: "Farmer" }, { id: 3, name: "Government Employee" },
  { id: 4, name: "Private Employee" }, { id: 5, name: "Driver" }, { id: 6, name: "Homemaker" }, { id: 7, name: "Student" },
  { id: 8, name: "Daily Wage Worker" }, { id: 9, name: "Self-employed / Professional" }, { id: 10, name: "Retired" },
];
const RELIGIONS = [
  { id: 0, name: "Not specified" },
  { id: 1, name: "Hindu" }, { id: 2, name: "Muslim" }, { id: 3, name: "Christian" }, { id: 4, name: "Jain" },
  { id: 5, name: "Sikh" }, { id: 6, name: "Buddhist" }, { id: 7, name: "Other" },
];

type Unit = { unitId: number; unitName: string; districtId: number };

const inputCls = "w-full rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink";
const labelCls = "mb-1 block text-[11.5px] font-medium text-muted";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export default function CreateCaseForm() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const officers = useMemo(() => getEmployees(), []);

  const [districtId, setDistrictId] = useState<number>(districts[0].dbId);
  const [policeStationId, setPoliceStationId] = useState<number | "">("");
  const [crimeMinorHeadId, setCrimeMinorHeadId] = useState(1);
  const [gravityOffenceId, setGravityOffenceId] = useState<1 | 2>(2);
  const [incidentFrom, setIncidentFrom] = useState("");
  const [incidentTo, setIncidentTo] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [briefFacts, setBriefFacts] = useState("");
  const [policePersonId, setPolicePersonId] = useState<number | "">("");

  const [complainantName, setComplainantName] = useState("");
  const [complainantAge, setComplainantAge] = useState("");
  const [complainantGender, setComplainantGender] = useState<1 | 2>(1);
  const [occupationId, setOccupationId] = useState(0);
  const [religionId, setReligionId] = useState(0);

  const [includeVictim, setIncludeVictim] = useState(false);
  const [victimName, setVictimName] = useState("");
  const [victimAge, setVictimAge] = useState("");
  const [victimGender, setVictimGender] = useState<1 | 2>(1);

  const [includeAccused, setIncludeAccused] = useState(false);
  const [accusedName, setAccusedName] = useState("");
  const [accusedAge, setAccusedAge] = useState("");
  const [accusedGender, setAccusedGender] = useState<1 | 2>(1);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/units")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Unit[]) => setUnits(data))
      .catch((e) => setUnitsError(e instanceof Error ? e.message : String(e)));
  }, []);

  const stationsForDistrict = (units ?? []).filter((u) => u.districtId === districtId);
  const officersForDistrict = officers.filter((o) => o.districtId === districtId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (policeStationId === "" || policePersonId === "") {
      setError("Choose a police station and an investigating officer.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          districtId,
          policeStationId,
          crimeMinorHeadId,
          gravityOffenceId,
          incidentFrom,
          incidentTo,
          latitude: Number(latitude),
          longitude: Number(longitude),
          briefFacts,
          policePersonId,
          complainant: { name: complainantName, age: Number(complainantAge), genderId: complainantGender, occupationId, religionId },
          victim: includeVictim ? { name: victimName, age: Number(victimAge), genderId: victimGender } : null,
          accused: includeAccused ? { name: accusedName, age: Number(accusedAge), genderId: accusedGender } : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
      router.push(`/cases/${body.caseMasterId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-ink">Where and what</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="District">
            <select
              className={inputCls}
              value={districtId}
              onChange={(e) => {
                setDistrictId(Number(e.target.value));
                setPoliceStationId("");
                setPolicePersonId("");
              }}
            >
              {districts.map((d) => (
                <option key={d.dbId} value={d.dbId}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Police station">
            <select
              className={inputCls}
              value={policeStationId}
              onChange={(e) => setPoliceStationId(e.target.value ? Number(e.target.value) : "")}
              disabled={!units}
              required
            >
              <option value="">{units ? "Select a station" : "Loading stations…"}</option>
              {stationsForDistrict.map((u) => (
                <option key={u.unitId} value={u.unitId}>{u.unitName}</option>
              ))}
            </select>
            {unitsError && <p className="mt-1 text-[11px] text-danger">Couldn&apos;t load stations: {unitsError}</p>}
          </Field>
          <Field label="Crime type">
            <select className={inputCls} value={crimeMinorHeadId} onChange={(e) => setCrimeMinorHeadId(Number(e.target.value))}>
              {CRIME_TYPES.map((c) => (
                <option key={c.dbId} value={c.dbId}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Gravity">
            <select className={inputCls} value={gravityOffenceId} onChange={(e) => setGravityOffenceId(Number(e.target.value) as 1 | 2)}>
              <option value={2}>Non-Heinous</option>
              <option value={1}>Heinous</option>
            </select>
          </Field>
          <Field label="Incident from">
            <input type="datetime-local" className={inputCls} value={incidentFrom} onChange={(e) => setIncidentFrom(e.target.value)} required />
          </Field>
          <Field label="Incident to">
            <input type="datetime-local" className={inputCls} value={incidentTo} onChange={(e) => setIncidentTo(e.target.value)} required />
          </Field>
          <Field label="Latitude">
            <input type="number" step="any" className={inputCls} value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 12.9716" required />
          </Field>
          <Field label="Longitude">
            <input type="number" step="any" className={inputCls} value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 77.5946" required />
          </Field>
        </div>
        <Field label="Brief facts">
          <textarea
            className={inputCls}
            rows={4}
            value={briefFacts}
            onChange={(e) => setBriefFacts(e.target.value)}
            placeholder="What was reported, in the complainant's own words."
            required
          />
          {/* P7.2 -> P7.3: dictate in Kannada, then translate the same
              real field to English before submitting. See
              KannadaDictationButton.tsx / translateClient.ts's module
              comments - translation's exact field-name contract was NOT
              confirmed live despite extensive probing, so "Translate to
              English" is expected to surface a real, honest error until
              the Catalyst console resolves the real field names. */}
          <KannadaDictationButton
            onTranscribed={(text) => setBriefFacts((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))}
          />
          <div className="mt-1.5">
            <TranslateButton
              text={briefFacts}
              sourceLanguage="kn"
              targetLanguage="en"
              label="Translate to English"
              onTranslated={(translated) => setBriefFacts(translated)}
            />
          </div>
          {/* P7.4 - the same two real API calls above, run as one pipeline
              plus a GLM summarization step, with every stage's real result
              shown transparently. See KannadaIntakePipelineButton.tsx's
              module comment. */}
          <div className="mt-2">
            <KannadaIntakePipelineButton onSummaryAccepted={(summary) => setBriefFacts(summary)} />
          </div>
        </Field>
        <Field label="Investigating officer">
          <select className={inputCls} value={policePersonId} onChange={(e) => setPolicePersonId(e.target.value ? Number(e.target.value) : "")} required>
            <option value="">Select an officer</option>
            {officersForDistrict.map((o) => (
              <option key={o.employeeId} value={o.employeeId}>{o.rankName} {o.name}</option>
            ))}
          </select>
        </Field>
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-[13px] font-semibold text-ink">Complainant</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input className={inputCls} value={complainantName} onChange={(e) => setComplainantName(e.target.value)} required />
          </Field>
          <Field label="Age">
            <input type="number" min={1} max={120} className={inputCls} value={complainantAge} onChange={(e) => setComplainantAge(e.target.value)} required />
          </Field>
          <Field label="Gender">
            <select className={inputCls} value={complainantGender} onChange={(e) => setComplainantGender(Number(e.target.value) as 1 | 2)}>
              <option value={1}>Male</option>
              <option value={2}>Female</option>
            </select>
          </Field>
          <Field label="Occupation">
            <select className={inputCls} value={occupationId} onChange={(e) => setOccupationId(Number(e.target.value))}>
              {OCCUPATIONS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Religion">
            <select className={inputCls} value={religionId} onChange={(e) => setReligionId(Number(e.target.value))}>
              {RELIGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
        <label className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <input type="checkbox" checked={includeVictim} onChange={(e) => setIncludeVictim(e.target.checked)} />
          Victim (if different from complainant)
        </label>
        {includeVictim && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input className={inputCls} value={victimName} onChange={(e) => setVictimName(e.target.value)} required={includeVictim} />
            </Field>
            <Field label="Age">
              <input type="number" min={0} max={120} className={inputCls} value={victimAge} onChange={(e) => setVictimAge(e.target.value)} required={includeVictim} />
            </Field>
            <Field label="Gender">
              <select className={inputCls} value={victimGender} onChange={(e) => setVictimGender(Number(e.target.value) as 1 | 2)}>
                <option value={1}>Male</option>
                <option value={2}>Female</option>
              </select>
            </Field>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
        <label className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <input type="checkbox" checked={includeAccused} onChange={(e) => setIncludeAccused(e.target.checked)} />
          Accused (if known)
        </label>
        {includeAccused && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input className={inputCls} value={accusedName} onChange={(e) => setAccusedName(e.target.value)} required={includeAccused} />
            </Field>
            <Field label="Age">
              <input type="number" min={0} max={120} className={inputCls} value={accusedAge} onChange={(e) => setAccusedAge(e.target.value)} required={includeAccused} />
            </Field>
            <Field label="Gender">
              <select className={inputCls} value={accusedGender} onChange={(e) => setAccusedGender(Number(e.target.value) as 1 | 2)}>
                <option value={1}>Male</option>
                <option value={2}>Female</option>
              </select>
            </Field>
          </div>
        )}
      </section>

      {error && <p className="rounded-sm border border-danger bg-danger-bg px-3 py-2 text-[12.5px] text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 rounded-sm bg-navy px-4 py-2 text-[13px] font-medium text-white hover:bg-navy-hover disabled:opacity-60"
      >
        {pending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <FileText size={14} aria-hidden="true" />}
        Register FIR
      </button>
    </form>
  );
}
