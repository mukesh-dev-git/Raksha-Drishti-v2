import {
  MapPin,
  FlaskConical,
  ClipboardCheck,
  Layers,
  Video,
} from "lucide-react";
import type { MoreTabData } from "@/lib/investigation/adaptToMore";
import PinnedCard from "./PinnedCard";
import SectionHeading from "./SectionHeading";

const ACCENT = "#0b2e59";

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <PinnedCard pin={ACCENT}>
      <p className="p-6 text-[15px] text-muted">{children}</p>
    </PinnedCard>
  );
}

// -----------------------------------------------------------------------------
// CaseMorePanel — the More tab: Crime Scene, Forensics, Search & Seizure,
// Related Cases. Four sub-sections inside one tab (no new top-level nav),
// each with an honest empty state where the synthetic dataset has no
// supporting record, matching the same visual language as every other tab.
// -----------------------------------------------------------------------------
export default function CaseMorePanel({ data }: { data: MoreTabData }) {
  return (
    <div className="space-y-10">
      {/* Crime Scene */}
      <section>
        <SectionHeading icon={MapPin} title="Crime Scene" accent={ACCENT} />
        {data.crimeScenes.length === 0 ? (
          <Empty>No crime scene record is available for this case in the synthetic dataset.</Empty>
        ) : (
          <div className="space-y-4">
            {data.crimeScenes.map((s) => (
              <PinnedCard key={s.firCaseMasterId} pin={ACCENT}>
                <div className="p-5">
                  <p className="text-[12px] uppercase tracking-wide text-muted">FIR {s.crimeNo}</p>
                  <p className="mt-1 text-[16px] font-semibold text-ink">{s.location}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.briefFacts}</p>
                  <p className="mt-3 text-[13px] text-muted">
                    Coordinates: {s.hasCoordinates ? `${s.latitude}, ${s.longitude}` : "Not available in current records"}
                  </p>
                  <p className="mt-1 text-[13px] text-muted">Scene photographs / sketch: Not available in current records</p>
                  <p className="mt-1 text-[13px] text-muted">People present at scene: Not available in current records</p>
                </div>
              </PinnedCard>
            ))}

            <div>
              <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-navy">
                <Video size={14} /> CCTV Footage in this Investigation
              </p>
              {data.sceneEvidence.length === 0 ? (
                <p className="text-[14px] text-muted">No CCTV footage is on record for this case.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {data.sceneEvidence.map((e) => (
                    <div key={e.id} className="rounded-sm border border-line bg-surface-2 p-3 text-[13px]">
                      <p className="font-medium text-ink">{e.title}</p>
                      <p className="mt-1 text-muted">{e.description}</p>
                      <p className="mt-1 text-[11px] text-muted">{e.date} · Exhibit {e.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Forensics */}
      <section>
        <SectionHeading icon={FlaskConical} title="Forensics" accent={ACCENT} />
        {data.forensicsAvailable ? (
          <p className="text-[14px] text-ink">Forensic examination records are available for this case.</p>
        ) : (
          <Empty>No forensic examination is recorded for this case in the synthetic dataset.</Empty>
        )}
      </section>

      {/* Search & Seizure */}
      <section>
        <SectionHeading icon={ClipboardCheck} title="Search & Seizure" accent={ACCENT} />
        {data.searchSeizureAvailable ? (
          <p className="text-[14px] text-ink">Search & seizure records are available for this case.</p>
        ) : (
          <Empty>No search or seizure operation is recorded for this case in the synthetic dataset.</Empty>
        )}
      </section>

      {/* Related Cases */}
      <section>
        <SectionHeading
          icon={Layers}
          title="Related Cases"
          subtitle="Cases sharing a real investigating officer or police station with this case"
          accent={ACCENT}
        />
        {data.relatedCases.length === 0 ? (
          <Empty>No related cases are identified for this case in the synthetic dataset.</Empty>
        ) : (
          <div className="overflow-hidden rounded border border-line">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">FIR</th>
                  <th className="px-3 py-2 font-medium">Case Title</th>
                  <th className="px-3 py-2 font-medium">Crime Type</th>
                  <th className="px-3 py-2 font-medium">District</th>
                  <th className="px-3 py-2 font-medium">Relationship</th>
                </tr>
              </thead>
              <tbody>
                {data.relatedCases.map((r) => (
                  <tr key={`${r.scenarioId}-${r.caseMasterId}`} className="border-b border-line last:border-0 hover:bg-surface-2">
                    <td className="px-3 py-2 font-medium text-navy">{r.caseMasterId}</td>
                    <td className="px-3 py-2 text-ink">{r.title}</td>
                    <td className="px-3 py-2 text-muted">{r.crimeType}</td>
                    <td className="px-3 py-2 text-muted">{r.district}</td>
                    <td className="px-3 py-2 text-muted">{r.reasons.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
