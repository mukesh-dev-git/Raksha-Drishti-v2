"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, PhoneCall, Landmark, Video, MessageSquareQuote } from "lucide-react";
import PinnedCard from "./PinnedCard";
import SectionHeading from "./SectionHeading";

const ACCENT = "#0b2e59";

interface CallRecord {
  id: string;
  from: string;
  to: string;
  timestamp: string;
  durationSec: number;
  note?: string;
}
interface Transaction {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  timestamp: string;
  note?: string;
}
interface CCTVSighting {
  id: string;
  cameraLocation: string;
  personOrVehicle: string;
  timestamp: string;
  note?: string;
}
interface WitnessStatement {
  id: string;
  witnessName: string;
  statementDate: string;
  statementText: string;
  relatedPerson?: string;
}
interface Contradiction {
  description: string;
  conflictingRecords: string[];
  suggestedNextQuestion: string;
}

interface InvestigationApiResponse {
  scenario: string | null;
  calls?: CallRecord[];
  transactions?: Transaction[];
  cctv?: CCTVSighting[];
  witnessStatements?: WitnessStatement[];
  contradiction?: Contradiction | null;
}

// -----------------------------------------------------------------------------
// Live, database-backed evidence for this case type + district, read from the
// 6 seeded NoSQL collections via /api/investigation (see catalyst/README.md
// §2b/§3). Only 15 of the 4 x 8 caseType x district combinations have a
// seeded scenario behind them - this panel renders nothing when the route
// returns { scenario: null }, leaving the existing mock-generated board
// (EvidenceBoard/TimelinePanel/EvidencePanel) as the only content, same
// graceful-fallback pattern as api.ts elsewhere in the app.
// -----------------------------------------------------------------------------
export default function RealEvidenceFeed({
  caseTypeSlug,
  districtSlug,
}: {
  caseTypeSlug: string;
  districtSlug: string;
}) {
  const [data, setData] = useState<InvestigationApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/investigation?caseType=${caseTypeSlug}&district=${districtSlug}`)
      .then((r) => (r.ok ? r.json() : { scenario: null }))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ scenario: null });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseTypeSlug, districtSlug]);

  if (loading || !data?.scenario) return null;

  const fmt = (ts: string) =>
    new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <section>
      <SectionHeading
        icon={BadgeCheck}
        title="Verified Evidence Feed"
        subtitle={`Live records from the case database — scenario ${data.scenario} — every row is a direct citation, not a summary`}
        accent={ACCENT}
        right={
          <span className="flex items-center gap-2 rounded-sm border border-line bg-surface-2 px-3.5 py-2 text-[13px] font-medium text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" /> Catalyst Data Store + NoSQL
          </span>
        }
      />

      {data.contradiction && (
        <PinnedCard pin="#b91c1c" className="mb-6">
          <div className="flex gap-4 p-6">
            <AlertTriangle size={26} className="mt-1 shrink-0 text-red-700" />
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-red-700">
                Contradiction detected
              </p>
              <p className="mt-2 text-[16px] leading-relaxed text-ink">{data.contradiction.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.contradiction.conflictingRecords.map((id) => (
                  <span
                    key={id}
                    className="rounded-sm border border-red-200 bg-red-50 px-2 py-1 font-mono text-[12px] text-red-800"
                  >
                    {id}
                  </span>
                ))}
              </div>
              <p className="mt-3 border-l-2 border-red-400/50 pl-4 text-[15px] italic text-muted">
                Suggested next question: {data.contradiction.suggestedNextQuestion}
              </p>
            </div>
          </div>
        </PinnedCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <EvidenceTable
          icon={PhoneCall}
          title="Call Records"
          rows={data.calls || []}
          columns={["id", "from", "to", "timestamp", "durationSec", "note"]}
          headers={["ID", "From", "To", "Time", "Dur (s)", "Note"]}
          fmt={fmt}
        />
        <EvidenceTable
          icon={Landmark}
          title="Transactions"
          rows={data.transactions || []}
          columns={["id", "fromAccount", "toAccount", "amount", "timestamp", "note"]}
          headers={["ID", "From account", "To account", "Amount", "Time", "Note"]}
          fmt={fmt}
        />
        <EvidenceTable
          icon={Video}
          title="CCTV Sightings"
          rows={data.cctv || []}
          columns={["id", "cameraLocation", "personOrVehicle", "timestamp", "note"]}
          headers={["ID", "Camera", "Subject", "Time", "Note"]}
          fmt={fmt}
        />
        <EvidenceTable
          icon={MessageSquareQuote}
          title="Witness Statements"
          rows={data.witnessStatements || []}
          columns={["id", "witnessName", "statementDate", "statementText"]}
          headers={["ID", "Witness", "Date", "Statement"]}
          fmt={fmt}
        />
      </div>
    </section>
  );
}

function EvidenceTable<T extends { id: string }>({
  icon: Icon,
  title,
  rows,
  columns,
  headers,
  fmt,
}: {
  icon: React.ElementType;
  title: string;
  rows: T[];
  columns: (keyof T)[];
  headers: string[];
  fmt: (ts: string) => string;
}) {
  if (!rows.length) return null;
  return (
    <PinnedCard pin={ACCENT}>
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon size={18} className="text-navy" />
          <p className="text-[15px] font-bold text-navy">{title}</p>
          <span className="ml-auto rounded-sm bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-muted">
            {rows.length}
          </span>
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-muted">
                {headers.map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-1.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line/60 last:border-0">
                  {columns.map((c) => {
                    const raw = row[c];
                    const isTs = c === "timestamp" || c === "statementDate";
                    const isAmount = c === "amount";
                    const isId = c === "id";
                    let display: React.ReactNode = String(raw ?? "");
                    if (isTs && raw) display = fmt(String(raw));
                    if (isAmount && raw) display = `₹${Number(raw).toLocaleString("en-IN")}`;
                    return (
                      <td
                        key={String(c)}
                        className={
                          "px-2 py-1.5 align-top " +
                          (isId
                            ? "whitespace-nowrap font-mono text-[12px] text-navy"
                            : "max-w-[220px] text-ink")
                        }
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PinnedCard>
  );
}
