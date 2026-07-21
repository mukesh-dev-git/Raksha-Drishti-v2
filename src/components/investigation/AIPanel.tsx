"use client";

import { motion } from "framer-motion";
import {
  Target,
  TrendingUp,
  Users,
  Lightbulb,
  ListChecks,
  ShieldAlert,
} from "lucide-react";
import type { AIInsight, Suspect } from "@/lib/investigationData";

function riskColor(score: number) {
  if (score >= 75) return { ring: "#be123c", text: "text-danger", border: "border-danger/40", bg: "bg-danger-bg" };
  if (score >= 50) return { ring: "#b45309", text: "text-warning", border: "border-warning/40", bg: "bg-warning-bg" };
  return { ring: "#047857", text: "text-success", border: "border-success/40", bg: "bg-success-bg" };
}

function RiskGauge({ score }: { score: number }) {
  const c = riskColor(score);
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg width={112} height={112} className="-rotate-90">
        <circle cx={56} cy={56} r={r} stroke="rgba(11,46,89,0.12)" strokeWidth={8} fill="none" />
        <motion.circle
          cx={56}
          cy={56}
          r={r}
          stroke={c.ring}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${c.text}`}>{score}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted">Risk</span>
      </div>
    </div>
  );
}

function Block({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: typeof Target;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-line bg-surface p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-navy">
        <Icon size={16} style={{ color: accent }} /> {title}
      </h3>
      {children}
    </section>
  );
}

export default function AIPanel({
  ai,
  suspects,
  activeId,
  onSelect,
}: {
  ai: AIInsight;
  suspects: Suspect[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const c = riskColor(ai.riskScore);
  const keySuspects = suspects.filter((s) => ai.keySuspectIds.includes(s.id));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* risk + MO */}
      <div className={`flex items-center gap-5 rounded-2xl border ${c.border} ${c.bg} p-5 lg:col-span-2`}>
        <RiskGauge score={ai.riskScore} />
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-navy">Composite Risk Score</p>
          <p className="mt-1.5 max-w-2xl text-[16px] leading-relaxed text-muted">
            Weighted from suspect history, evidence strength, and pattern recurrence in this district. A
            higher score signals a coordinated or repeat-offender profile warranting priority action.
          </p>
        </div>
      </div>

      <Block icon={Target} title="Modus Operandi" accent="#0b2e59">
        <p className="text-[16px] leading-relaxed text-ink">{ai.modusOperandi}</p>
      </Block>

      <Block icon={TrendingUp} title="Pattern Analysis" accent="#0b2e59">
        <ul className="space-y-2.5">
          {ai.patternAnalysis.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-[16px] leading-relaxed text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
              {p}
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={Users} title="Key Suspects" accent="#0b2e59">
        <div className="flex flex-wrap gap-2">
          {keySuspects.map((s) => {
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(active ? null : s.id)}
                className={`flex items-center gap-2 rounded-sm border px-3.5 py-2 text-[15px] transition ${
                  active
                    ? "border-danger bg-danger-bg text-danger"
                    : "border-line bg-surface text-ink hover:border-navy"
                }`}
              >
                <ShieldAlert size={15} />
                {s.name}
                <span className="text-muted">· {s.riskScore}</span>
              </button>
            );
          })}
        </div>
      </Block>

      <Block icon={Lightbulb} title="Investigation Insights" accent="#0b2e59">
        <ul className="space-y-2.5">
          {ai.insights.map((ins, i) => (
            <li key={i} className="flex gap-2.5 text-[16px] leading-relaxed text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
              {ins}
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={ListChecks} title="Recommended Next Actions" accent="#0b2e59">
        <ul className="space-y-2.5">
          {ai.recommendedActions.map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded border border-line bg-surface-2 p-3 text-[16px] leading-relaxed text-ink"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-navy text-[13px] font-semibold text-navy">
                {i + 1}
              </span>
              {a}
            </li>
          ))}
        </ul>
      </Block>
    </div>
  );
}
