// Small radial "case relationship" diagram - real entity/record counts for
// the featured scenario, not the physics-simulated full board (that's
// EvidenceBoard.tsx, used inside the actual investigation workspace).
const NODES: { key: string; label: string; color: string }[] = [
  { key: "suspects", label: "Suspects", color: "var(--dash-pink)" },
  { key: "victims", label: "Victims", color: "var(--dash-orange)" },
  { key: "witnesses", label: "Witnesses", color: "var(--dash-purple)" },
  { key: "calls", label: "Calls", color: "var(--dash-blue)" },
  { key: "cctv", label: "CCTV", color: "var(--dash-teal)" },
];

export default function MiniRelationshipGraph({ counts }: { counts: Record<string, number> }) {
  const CX = 130;
  const CY = 110;
  const R = 78;
  const active = NODES.filter((n) => (counts[n.key] || 0) > 0);
  const n = active.length || 1;

  return (
    <svg viewBox="0 0 260 220" className="w-full">
      {active.map((node, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = CX + R * Math.cos(angle);
        const y = CY + R * Math.sin(angle);
        return <line key={node.key} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--line)" strokeWidth={1.5} />;
      })}

      <circle cx={CX} cy={CY} r={26} fill="var(--navy)" />
      <text x={CX} y={CY - 2} textAnchor="middle" fontSize={11} fill="#fff" fontWeight={600}>
        Case
      </text>
      <text x={CX} y={CY + 11} textAnchor="middle" fontSize={9} fill="#fff" opacity={0.8}>
        board
      </text>

      {active.map((node, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = CX + R * Math.cos(angle);
        const y = CY + R * Math.sin(angle);
        return (
          <g key={node.key}>
            <circle cx={x} cy={y} r={20} fill={node.color} fillOpacity={0.14} stroke={node.color} strokeWidth={1.5} />
            <text x={x} y={y - 2} textAnchor="middle" fontSize={12} fontWeight={700} fill={node.color}>
              {counts[node.key]}
            </text>
            <text x={x} y={y + 30} textAnchor="middle" fontSize={10} fill="var(--muted)">
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
