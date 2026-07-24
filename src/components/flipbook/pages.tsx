import {
  ShieldAlert,
  UserRound,
  Eye,
  MapPin,
  FileWarning,
  Sparkles,
  Layers,
  ClipboardCheck,
  Stamp as StampIcon,
  BadgeCheck,
  CheckCircle2,
  Video,
  FlaskConical,
  PhoneCall,
  Fingerprint,
  FileText,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import type { CaseFileContent, EvidenceType } from "@/lib/investigationData";
import CaseBoardPage from "./CaseBoardPage";

// -----------------------------------------------------------------------------
// Case-file "paper" page bodies. Each renders inside the cream page shell
// provided by CaseFileFlipbook.
// -----------------------------------------------------------------------------

export const PAGE_DEFS = [
  { key: "cover", label: "Cover" },
  { key: "incident", label: "Incident" },
  { key: "scene", label: "Crime Scene" },
  { key: "victim", label: "Victim" },
  { key: "suspects", label: "Suspects" },
  { key: "witnesses", label: "Witnesses" },
  { key: "evidence", label: "Evidence" },
  { key: "notes", label: "Notes" },
  { key: "ai", label: "AI Analysis" },
  { key: "similar", label: "Similar Cases" },
  { key: "report", label: "Final Report" },
  { key: "board", label: "Case Board" },
] as const;

export type PageKey = (typeof PAGE_DEFS)[number]["key"];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.15em] text-stone-500">
      {children}
    </h3>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[9.5px] uppercase tracking-wide text-stone-400">{label}</p>
      <p className="text-sm font-medium text-stone-800">{value}</p>
    </div>
  );
}

function Letterhead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5 flex items-start justify-between border-b-2 border-stone-800/80 pb-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
          Raksha Drishti · Confidential Case File
        </p>
        <h2 className="mt-1 font-serif text-xl font-bold text-stone-900">{title}</h2>
      </div>
      <p className="mt-1 whitespace-nowrap text-[10px] text-stone-500">{sub}</p>
    </div>
  );
}

const EVIDENCE_ICONS: Record<EvidenceType, LucideIcon> = {
  "CCTV Footage": Video,
  "Forensic Report": FlaskConical,
  "Call Detail Record": PhoneCall,
  "Fingerprint Analysis": Fingerprint,
  "Seized Document": FileText,
  Photograph: ImageIcon,
};

export function renderCaseFilePage(key: PageKey, c: CaseFileContent): React.ReactNode {
  switch (key) {
    case "cover":
      return (
        <div className="flex h-full flex-col">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">
            Raksha Drishti Police Department
          </p>
          <div className="mt-1 h-1 w-16 bg-stone-800" />

          <div className="relative mt-10 flex-1">
            <span className="absolute -right-2 top-0 rotate-6 rounded-sm border-4 border-rose-700/70 px-3 py-1 text-xs font-black uppercase tracking-widest text-rose-700/80">
              <StampIcon size={12} className="mr-1 inline" />
              {c.status}
            </span>

            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">
              First Information Report
            </p>
            <h1 className="mt-2 font-serif text-4xl font-black leading-tight text-stone-900">
              {c.cover.firNumber}
            </h1>
            <p className="mt-3 max-w-sm text-lg text-stone-700">{c.cover.title}</p>

            <div className="mt-10 grid grid-cols-2 gap-y-5 border-t border-stone-300 pt-6">
              <Field label="Date Filed" value={c.cover.dateFiled} />
              <Field label="Case Type" value={c.caseType} />
              <Field label="Officer in Charge" value={c.cover.officerInCharge} />
              <Field label="Police Station" value={c.cover.policeStation} />
            </div>

            <div className="mt-6">
              <p className="text-[9.5px] uppercase tracking-wide text-stone-400">Sections Invoked</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {c.cover.sections.map((s) => (
                  <span key={s} className="rounded border border-stone-300 bg-stone-100 px-2 py-1 text-[10.5px] text-stone-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-stone-300 pt-3 text-[9.5px] text-stone-400">
            <span>District: {c.district}</span>
            <span>Ref. {c.cover.firNumber}-A</span>
          </div>
        </div>
      );

    case "incident":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Incident Summary" sub={`${c.incidentSummary.date} · ${c.incidentSummary.time}`} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location" value={c.incidentSummary.location} />
            <Field label="Complainant" value={c.incidentSummary.complainant} />
          </div>
          <Label>
            <FileWarning size={12} /> Narrative
          </Label>
          <p className="rounded border border-stone-200 bg-stone-50 p-4 font-mono text-[12.5px] leading-relaxed text-stone-700">
            {c.incidentSummary.narrative}
          </p>
          <div className="mt-auto flex justify-end pt-4">
            <p className="rotate-[-3deg] rounded border border-stone-400 px-3 py-1 font-mono text-[10px] text-stone-500">
              recorded &amp; verified
            </p>
          </div>
        </div>
      );

    case "scene":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Crime Scene Report" sub={c.crimeScene.location} />
          <Label>
            <MapPin size={12} /> Scene Description
          </Label>
          <p className="text-sm leading-relaxed text-stone-700">{c.crimeScene.description}</p>

          <Label>
            <ClipboardCheck size={12} /> Items Recovered
          </Label>
          <ul className="space-y-1.5">
            {c.crimeScene.itemsRecovered.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-stone-700">
                <CheckCircle2 size={13} className="text-stone-400" /> {item}
              </li>
            ))}
          </ul>

          <div className="mt-auto rounded border border-stone-200 bg-stone-50 p-3 text-xs italic text-stone-500">
            Scene Notes — {c.crimeScene.sceneNotes}
          </div>
        </div>
      );

    case "victim":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Victim Details" sub={c.victim.id} />
          <div className="grid grid-cols-2 gap-y-4">
            <Field label="Name" value={c.victim.name} />
            <Field label="Age / Gender" value={`${c.victim.age} / ${c.victim.gender}`} />
            <Field label="Occupation" value={c.victim.occupation} />
            <Field label="Address" value={c.victim.address} />
          </div>
          <Label>
            <UserRound size={12} /> Statement
          </Label>
          <blockquote className="border-l-4 border-stone-300 pl-4 text-sm italic leading-relaxed text-stone-600">
            &ldquo;{c.victim.statement}&rdquo;
          </blockquote>
          <Label>Injuries</Label>
          <p className="text-sm text-stone-700">{c.victim.injuries}</p>
        </div>
      );

    case "suspects":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Suspect Profiles" sub={`${c.suspects.length} identified`} />
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
            {c.suspects.map((s) => (
              <div key={s.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                    <ShieldAlert size={14} className="text-rose-700" /> {s.name}
                  </span>
                  <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-bold text-stone-50">
                    {s.riskScore}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  alias &ldquo;{s.alias}&rdquo; · {s.age} yrs · {s.gender}
                </p>
                <p className="mt-1.5 inline-block rounded border border-stone-300 px-1.5 py-0.5 text-[10px] text-stone-600">
                  {s.status}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "witnesses":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Witness Statements" sub={`${c.witnesses.length} recorded`} />
          <div className="flex-1 space-y-3 overflow-y-auto">
            {c.witnesses.map((w) => (
              <div key={w.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                    <Eye size={13} className="text-stone-500" /> {w.name}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase ${
                      w.reliability === "High"
                        ? "text-emerald-700"
                        : w.reliability === "Medium"
                        ? "text-amber-700"
                        : "text-stone-400"
                    }`}
                  >
                    {w.reliability} reliability
                  </span>
                </div>
                <p className="mt-1.5 text-xs italic leading-relaxed text-stone-600">&ldquo;{w.statement}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "evidence":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Evidence & Forensics" sub={`${c.evidence.length} items logged`} />
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
            {c.evidence.map((e) => {
              const Icon = EVIDENCE_ICONS[e.type];
              return (
                <div key={e.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-stone-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{e.type}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-stone-800">{e.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">{e.description}</p>
                  <p className="mt-1.5 text-[10px] text-stone-400">Logged {e.date}</p>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "notes":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Investigation Notes" sub="Case Diary" />
          <div className="flex-1 space-y-4 overflow-y-auto">
            {c.investigationNotes.map((n, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex w-20 shrink-0 flex-col items-start pt-0.5">
                  <span className="text-[10px] font-semibold text-stone-500">{n.date}</span>
                </div>
                <div className="flex-1 border-l-2 border-stone-200 pb-1 pl-3">
                  <p className="text-sm leading-relaxed text-stone-700">{n.note}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-stone-400">— {n.officer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "ai":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="AI Analysis Addendum" sub="Auto-generated insert" />
          <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-200 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-300">
                <Sparkles size={13} /> AI Investigation Summary
              </span>
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300">
                Risk {c.aiAnalysis.riskScore}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Modus Operandi</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{c.aiAnalysis.modusOperandi}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pattern Analysis</p>
              <ul className="mt-1 space-y-1">
                {c.aiAnalysis.patternAnalysis.map((p, i) => (
                  <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-slate-300">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" /> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Key Insights</p>
              <ul className="mt-1 space-y-1">
                {c.aiAnalysis.insights.map((ins, i) => (
                  <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-slate-300">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-yellow-300" /> {ins}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Recommended Actions</p>
              <ul className="mt-1 space-y-1">
                {c.aiAnalysis.recommendedActions.map((a, i) => (
                  <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-slate-300">
                    <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-sky-400/50 text-[8px] text-sky-300">
                      {i + 1}
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );

    case "similar":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Similar Cases" sub={`${c.similarCases.length} matches found`} />
          <div className="flex-1 space-y-3 overflow-y-auto">
            {c.similarCases.map((sc) => (
              <div key={sc.id} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <Layers size={16} className="shrink-0 text-stone-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-800">{sc.id}</span>
                    <span className="text-xs font-medium text-amber-700">{sc.similarity}% match</span>
                  </div>
                  <p className="text-xs text-stone-500">{sc.title}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${sc.similarity}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "report":
      return (
        <div className="flex h-full flex-col">
          <Letterhead title="Final Investigation Report" sub={c.finalReport.date} />
          <Label>Summary</Label>
          <p className="text-sm leading-relaxed text-stone-700">{c.finalReport.summary}</p>
          <Label>Conclusion</Label>
          <p className="text-sm leading-relaxed text-stone-700">{c.finalReport.conclusion}</p>
          <Label>Recommendation</Label>
          <p className="text-sm leading-relaxed text-stone-700">{c.finalReport.recommendation}</p>

          <div className="mt-auto flex items-end justify-between border-t border-dashed border-stone-300 pt-4">
            <div>
              <p className="text-[9.5px] uppercase tracking-wide text-stone-400">Status</p>
              <p className="flex items-center gap-1 text-sm font-semibold text-stone-800">
                <BadgeCheck size={14} className="text-emerald-600" /> {c.finalReport.status}
              </p>
            </div>
            <div className="text-right">
              <p className="font-serif italic text-stone-700">{c.finalReport.officer}</p>
              <p className="text-[9.5px] text-stone-400">Investigating Officer</p>
            </div>
          </div>
        </div>
      );

    case "board":
      return <CaseBoardPage content={c} />;

    default:
      return null;
  }
}
