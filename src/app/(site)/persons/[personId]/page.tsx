import { notFound } from "next/navigation";
import Link from "next/link";
import { FolderKanban, Layers, Clock, MapPinned, Fingerprint, CreditCard, Phone, Home } from "lucide-react";
import PageShell from "@/components/PageShell";
import OffenderAvatar from "@/components/OffenderAvatar";
import CrossSourceTimeline from "@/components/CrossSourceTimeline";
import CaseStatusPill from "@/components/CaseStatusPill";
import { getFusedPerson } from "@/lib/personFusion";
import { getWorklistCase, caseDetailLink } from "@/lib/caseWorklist";
import { getOffenderPhotoUrl } from "@/lib/offenderPhotos";
import { getPersonIdentity } from "@/lib/personIdentity";

// -----------------------------------------------------------------------------
// P2.1c - the real, single-person profile page. This is the Crime and
// Criminal Records Search equivalent: any person in the global register
// (47 today), not only the 6 repeat subjects /repeat-offenders lists.
// Reuses the same visual pieces that page's detail panel proved
// (OffenderAvatar, registered identity, CrossSourceTimeline) but as its
// own linkable/bookmarkable URL, reachable from search (once P2.1d wires
// it) or /persons, not only by clicking through a master-detail list.
// -----------------------------------------------------------------------------
export async function generateMetadata({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const p = getFusedPerson(personId);
  return { title: p ? p.name : "Person not found" };
}

export default async function PersonDetailPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const person = getFusedPerson(personId);
  if (!person) notFound();

  const cases = person.caseMasterIds.map((id) => getWorklistCase(id)).filter((c) => c !== null);
  const districtNames = [...new Set(cases.map((c) => c.districtName))];
  const crimeTypeNames = [...new Set(cases.map((c) => c.crimeTypeName))];
  const isRepeat = person.caseMasterIds.length > 1;
  const identity = getPersonIdentity(personId);
  const photoUrl = getOffenderPhotoUrl(personId);

  return (
    <PageShell
      title={person.name}
      description={`${person.personId} · ${cases.length} case${cases.length === 1 ? "" : "s"} · ${districtNames.length} district${districtNames.length === 1 ? "" : "s"}`}
      breadcrumbs={[
        { label: "Persons", href: "/persons" },
        { label: person.name, href: `/persons/${personId}` },
      ]}
    >
      <div className="space-y-5">
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex flex-wrap items-start gap-4 border-b border-line bg-surface-2/50 px-5 py-4">
            <OffenderAvatar personId={person.personId} name={person.name} photoUrl={photoUrl} size={112} />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold text-navy">{person.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted">{person.personId}</p>
              {person.aliases.length > 1 && (
                <p className="mt-1.5 text-[12px] text-muted">
                  Also recorded as: {person.aliases.filter((a) => a !== person.name).join(", ")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-muted">
                <span className="flex items-center gap-1.5">
                  <FolderKanban size={14} aria-hidden="true" /> {cases.length} case{cases.length === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers size={14} aria-hidden="true" /> {person.scenarioIds.length} investigation
                  {person.scenarioIds.length === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} aria-hidden="true" /> {person.timeline.length} linked records
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPinned size={14} aria-hidden="true" /> {districtNames.length} district{districtNames.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          {identity && (
            <div className="border-b border-line bg-surface-2/30 px-5 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Registered identity</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <span className="flex items-start gap-2 text-[13px] text-ink">
                  <CreditCard size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                  <span>
                    <span className="block text-[10.5px] uppercase tracking-wide text-muted">Aadhaar</span>
                    <span className="font-mono">{identity.aadhaarMasked}</span>
                  </span>
                </span>
                <span className="flex items-start gap-2 text-[13px] text-ink">
                  <Phone size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                  <span>
                    <span className="block text-[10.5px] uppercase tracking-wide text-muted">Phone</span>
                    <span className="font-mono">{identity.phone}</span>
                  </span>
                </span>
                {identity.address && (
                  <span className="flex items-start gap-2 text-[13px] text-ink">
                    <Home size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                    <span>
                      <span className="block text-[10.5px] uppercase tracking-wide text-muted">Address</span>
                      {identity.address}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[1fr_1.3fr]">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                <Fingerprint size={12} aria-hidden="true" /> {isRepeat ? "How this was flagged" : "Case involvement"}
              </p>
              <ul className="space-y-2 text-[13px] leading-relaxed text-ink">
                {isRepeat ? (
                  <>
                    <li>
                      Same resolved <span className="font-mono text-[12px]">{person.personId}</span> cited across{" "}
                      <strong>{cases.length}</strong> separate FIRs — a shared record id, not a name match.
                    </li>
                    <li>
                      Spans <strong>{districtNames.length}</strong> district{districtNames.length === 1 ? "" : "s"}: {districtNames.join(", ")}.
                    </li>
                  </>
                ) : (
                  <li>
                    Named in <strong>{cases.length}</strong> case{cases.length === 1 ? "" : "s"} in {districtNames[0] ?? "an unknown district"},
                    resolved to the global register under <span className="font-mono text-[12px]">{person.personId}</span>.
                  </li>
                )}
                <li>Case types involved: {crimeTypeNames.join(", ")}.</li>
                {person.aliases.length > 1 && (
                  <li>
                    Recorded under {person.aliases.length} name variant{person.aliases.length === 1 ? "" : "s"}, resolved to one identity.
                  </li>
                )}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Cases</p>
              <div className="space-y-1.5">
                {cases.map((c) => (
                  <Link
                    key={c.caseMasterId}
                    href={caseDetailLink(c.caseMasterId)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[13px] transition hover:border-navy"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{c.title}</span>
                      <span className="text-[11px] text-muted">{c.crimeTypeName} · {c.districtName}</span>
                    </span>
                    <CaseStatusPill statusId={c.statusId} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Cross-source timeline · {person.timeline.length} records
          </p>
          <p className="mb-3 text-[12px] text-muted">
            Every call, sighting, transaction and statement linked to this person, merged in chronological order across every case.
          </p>
          {person.timeline.length > 0 ? (
            <CrossSourceTimeline items={person.timeline} />
          ) : (
            <p className="text-[13px] text-muted">No evidence records linked to this person.</p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
