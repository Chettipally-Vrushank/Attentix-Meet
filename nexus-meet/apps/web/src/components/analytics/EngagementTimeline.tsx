"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { TimelinePoint } from "@/hooks/useAnalytics";

interface Props {
  data:         TimelinePoint[];
  participants: { user_id: string; name: string }[];
}

// Distinct colors per participant
const COLORS = [
  "#6366f1","#22c55e","#f59e0b","#ec4899",
  "#14b8a6","#f97316","#8b5cf6","#06b6d4",
];

interface PivotRow {
  bucket: string;
  [userId: string]: string | number;
}

// Pivot flat rows → [{bucket, [userId]: score, ...}]
function pivot(data: TimelinePoint[]) {
  const map = new Map<string, PivotRow>();
  for (const row of data) {
    const key = row.bucket;
    if (!map.has(key)) map.set(key, { bucket: key });
    map.get(key)![row.user_id] = Math.round(row.avg_score);
  }
  return Array.from(map.values()).sort(
    (a,b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime()
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-overlay)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
    }}>
      <p style={{ color: "var(--text-muted)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
        {label ? format(parseISO(label), "HH:mm:ss") : ""}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }}/>
          <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
          <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function EngagementTimeline({ data, participants }: Props) {
  const chartData = pivot(data);

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "24px",
    }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          Engagement Timeline
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Per-participant focus score over the meeting duration
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="bucket"
            tickFormatter={v => { try { return format(parseISO(v), "HH:mm"); } catch { return ""; } }}
            tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            axisLine={false} tickLine={false}
          />
          {/* Threshold line — 45 is the disengagement threshold */}
          <ReferenceLine
            y={45} stroke="var(--danger)" strokeDasharray="4 4"
            label={{ value: "Alert threshold", position: "insideTopRight",
              fontSize: 10, fill: "var(--danger)" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(v) => participants.find(p => p.user_id === v)?.name ?? v}
          />
          {participants.map((p, i) => (
            <Line
              key={p.user_id}
              type="monotone"
              dataKey={p.user_id}
              name={p.user_id}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
