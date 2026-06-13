"use client";
import { ScoreRing } from "@/components/ui/ScoreRing";
import type { ParticipantStat } from "@/hooks/useAnalytics";

interface Props { data: ParticipantStat[] }

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export function ParticipantTable({ data }: Props) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "24px",
    }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          Participant Breakdown
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Final engagement score and speaking contribution per person
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 80px 100px 80px",
          padding: "0 12px 8px",
          borderBottom: "1px solid var(--border)",
        }}>
          {["Participant","Score","Speaking","Share"].map(h => (
            <span key={h} style={{ fontSize: 10, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.08em",
              fontFamily: "var(--font-mono)" }}>
              {h}
            </span>
          ))}
        </div>

        {data.map((p, i) => {
          const totalMs   = data.reduce((a,b) => a + b.total_speaking_ms, 0);
          const share     = totalMs > 0 ? (p.total_speaking_ms / totalMs * 100) : 0;
          const score     = p.final_engagement_score ?? 0;

          return (
            <div key={p.user_id} style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 100px 80px",
              padding: "12px",
              borderRadius: 8,
              background: i % 2 === 0 ? "transparent" : "var(--bg-raised)",
              alignItems: "center",
            }}>
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--accent-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "var(--accent)", fontWeight: 600,
                }}>
                  {p.name[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
              </div>

              {/* Score ring */}
              <ScoreRing score={score} size={36} />

              {/* Speaking time */}
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)" }}>
                {fmtMs(p.total_speaking_ms)}
              </span>

              {/* Share bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: "var(--bg-overlay)", overflow: "hidden",
                }}>
                  <div style={{
                    width: `${share}%`, height: "100%",
                    background: "var(--accent)",
                    transition: "width 0.6s ease",
                  }}/>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)", minWidth: 28 }}>
                  {Math.round(share)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
