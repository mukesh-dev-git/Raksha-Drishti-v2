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
  if (score >= 75) return { ring: "#fb7185", text: "text-rose-300", border: "border-rose-500/30", bg: "bg-rose-500/10" };
  if (score >= 50) return { ring: "#fbbf24", text: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/10" };
  return { ring: "#34d399", text: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-500/10" };
}

function RiskGauge({ score }: { score: number }) {
  const c = riskColor(score);
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg width={112} height={112} className="-rotate-90">
        <circle cx={56} cy={56} r={r} stroke="rgba(148,163,184,0.15)" strokeWidth={8} fill="none" />
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
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Risk</span>
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
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-300">
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
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-slate-300">Composite Risk Score</p>
          <p className="mt-1.5 max-w-2xl text-[16px] leading-relaxed text-slate-400">
            Weighted from suspect history, evidence strength, and pattern recurrence in this district. A
            higher score signals a coordinated or repeat-offender profile warranting priority action.
          </p>
        </div>
      </div>

      <Block icon={Target} title="Modus Operandi" accent="#38bdf8">
        <p className="text-[16px] leading-relaxed text-slate-300">{ai.modusOperandi}</p>
      </Block>

      <Block icon={TrendingUp} title="Pattern Analysis" accent="#34d399">
        <ul className="space-y-2.5">
          {ai.patternAnalysis.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-[16px] leading-relaxed text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              {p}
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={Users} title="Key Suspects" accent="#fb7185">
        <div className="flex flex-wrap gap-2">
          {keySuspects.map((s) => {
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(active ? null : s.id)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[15px] transition ${
                  active
                    ? "border-rose-400/60 bg-rose-500/15 text-rose-200"
                    : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-rose-400/40"
                }`}
              >
                <ShieldAlert size={15} />
                {s.name}
                <span className="text-slate-500">· {s.riskScore}</span>
              </button>
            );
          })}
        </div>
      </Block>

      <Block icon={Lightbulb} title="Investigation Insights" accent="#facc15">
        <ul className="space-y-2.5">
          {ai.insights.map((ins, i) => (
            <li key={i} className="flex gap-2.5 text-[16px] leading-relaxed text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-300" />
              {ins}
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={ListChecks} title="Recommended Next Actions" accent="#38bdf8">
        <ul className="space-y-2.5">
          {ai.recommendedActions.map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-sky-500/15 bg-sky-500/[0.05] p-3 text-[16px] leading-relaxed text-slate-300"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-400/40 text-[13px] font-semibold text-sky-300">
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
