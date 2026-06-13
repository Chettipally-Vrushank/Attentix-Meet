"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import type { ParticipantStat } from "@/hooks/useAnalytics";

interface Props { data: ParticipantStat[] }

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg-overlay)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</p>
      <p style={{ color: "var(--text-secondary)" }}>
        Speaking: <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
          {fmtMs(d.total_speaking_ms)}
        </span>
      </p>
      <p style={{ color: "var(--text-secondary)", marginTop: 2 }}>
        Engagement: <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
          {d.final_engagement_score != null ? `${Math.round(d.final_engagement_score)}` : "—"}
        </span>
      </p>
    </div>
  );
};

export function SpeakingTimeChart({ data }: Props) {
  const sorted = [...data].sort((a,b) => b.total_speaking_ms - a.total_speaking_ms);

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "24px",
    }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Speaking Time</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Total time each participant held the floor
        </p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => fmtMs(v)}
            tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            type="category" dataKey="name" width={90}
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-overlay)" }} />
          <Bar dataKey="total_speaking_ms" radius={[0,4,4,0]} maxBarSize={28}>
            {sorted.map((entry, i) => {
              const score = entry.final_engagement_score ?? 50;
              const color = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
              return <Cell key={i} fill={color} fillOpacity={0.85}/>;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
        {[["#22c55e","Engaged (70+)"],["#f59e0b","Moderate (45–70)"],["#ef4444","Disengaged (<45)"]].map(([c,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }}/>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
