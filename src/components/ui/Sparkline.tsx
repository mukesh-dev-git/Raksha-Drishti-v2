// -----------------------------------------------------------------------------
// Sparkline — a compact single-series line for change-over-time (e.g. yearly
// case counts). Single navy hue (via currentColor), 2px line with a rounded end
// cap, a faint baseline area, and an end dot marking the latest value. Trend
// direction is also conveyed in text alongside it (never colour alone).
// -----------------------------------------------------------------------------
export default function Sparkline({
  data,
  width = 100,
  height = 32,
  className = "text-navy",
  ariaLabel,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  ariaLabel: string;
}) {
  if (data.length < 2) return null;

  const pad = 3; // keep the 2px stroke and end dot from clipping
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const x = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${x(0)},${height - pad} ${line} ${x(data.length - 1)},${height - pad}`;
  const lastX = x(data.length - 1);
  const lastY = y(data[data.length - 1]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <polygon points={area} fill="currentColor" opacity={0.1} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill="currentColor" />
    </svg>
  );
}
