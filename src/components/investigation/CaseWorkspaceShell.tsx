"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Clock,
  ClipboardList,
  Users,
  Fingerprint,
  BookOpen,
  MoreHorizontal,
} from "lucide-react";
import type { OverviewData } from "@/lib/investigation/adaptToOverview";
import type { TimelineDetailEvent } from "@/lib/investigation/adaptToTimeline";
import type { InvestigationTabData } from "@/lib/investigation/adaptToInvestigation";
import type { CaseFileRecordData } from "@/lib/investigation/adaptToCaseFileRecord";
import type { PeopleByRole } from "@/lib/investigation/adaptToPeople";
import type { EvidenceTabData } from "@/lib/investigation/adaptToEvidence";
import type { MoreTabData } from "@/lib/investigation/adaptToMore";
import CaseOverviewPanel from "./CaseOverviewPanel";
import CaseTimelinePanel from "./CaseTimelinePanel";
import CaseInvestigationPanel from "./CaseInvestigationPanel";
import CaseFileRecordPanel from "./CaseFileRecordPanel";
import CasePeoplePanel from "./CasePeoplePanel";
import CaseEvidencePanel from "./CaseEvidencePanel";
import CaseMorePanel from "./CaseMorePanel";

// -----------------------------------------------------------------------------
// CaseWorkspaceShell — the case-level tab shell (Overview | Timeline |
// Investigation | People | Evidence | Case Files | More). Client-side tab
// switching only (useState), no routing change, no new pages — matches the
// existing app's pattern of client components managing local view state
// (e.g. InvestigationWorkspaceClient's activeId).
//
// Case Files renders the structured record (CaseFileRecordPanel) instead of
// the old flipbook — that component is untouched and still exists under
// src/components/flipbook/, just no longer used here. All 7 tabs now render
// real content; no stub tabs remain.
// -----------------------------------------------------------------------------

const TABS = [
  { key: "overview", label: "Overview", Icon: LayoutDashboard },
  { key: "timeline", label: "Timeline", Icon: Clock },
  { key: "investigation", label: "Investigation", Icon: ClipboardList },
  { key: "people", label: "People", Icon: Users },
  { key: "evidence", label: "Evidence", Icon: Fingerprint },
  { key: "case-files", label: "Case Files", Icon: BookOpen },
  { key: "more", label: "More", Icon: MoreHorizontal },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function CaseWorkspaceShell({
  overview,
  timeline,
  investigation,
  caseFileRecord,
  people,
  evidence,
  more,
}: {
  overview: OverviewData;
  timeline: TimelineDetailEvent[];
  investigation: InvestigationTabData;
  caseFileRecord: CaseFileRecordData;
  people: PeopleByRole;
  evidence: EvidenceTabData;
  more: MoreTabData;
}) {
  const [active, setActive] = useState<TabKey>("overview");

  return (
    <div>
      <nav aria-label="Case sections" className="mb-8 border-b border-line">
        <ul className="flex flex-wrap gap-1">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = key === active;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setActive(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 border-b-[3px] px-4 py-3 text-[14px] font-medium transition ${
                    isActive
                      ? "border-navy text-navy"
                      : "border-transparent text-muted hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {active === "overview" && <CaseOverviewPanel data={overview} />}
      {active === "timeline" && <CaseTimelinePanel events={timeline} />}
      {active === "investigation" && <CaseInvestigationPanel data={investigation} />}
      {active === "people" && <CasePeoplePanel people={people} />}
      {active === "evidence" && <CaseEvidencePanel data={evidence} />}
      {active === "case-files" && (
        <CaseFileRecordPanel data={caseFileRecord} onNavigateTab={(tab) => setActive(tab)} />
      )}
      {active === "more" && <CaseMorePanel data={more} />}
    </div>
  );
}
