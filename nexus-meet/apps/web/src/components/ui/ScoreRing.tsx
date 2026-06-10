"use client";

interface Props {
  score: number;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, size = 56, label }: Props) {
  const r     = (size / 2) - 5;
  const circ  = 2 * Math.PI * r;
  const fill  = circ * (score / 100);

  const color =
    score >= 70 ? "var(--success)" :
    score >= 45 ? "var(--warn)"    : "var(--danger)";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="var(--bg-overlay)" strokeWidth="4"/>
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}/>
        <text
          x="50%" y="50%"
          textAnchor="middle" dominantBaseline="central"
          style={{
            transform: "rotate(90deg)",
            transformOrigin: "center",
            fontSize: size * 0.22,
            fill: color,
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
          }}>
          {Math.round(score)}
        </text>
      </svg>
      {label && (
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</span>
      )}
    </div>
  );
}
