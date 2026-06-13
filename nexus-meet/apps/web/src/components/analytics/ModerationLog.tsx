"use client";
import { useState }          from "react";
import { format, parseISO } from "date-fns";
import { ShieldAlert }      from "lucide-react";
import type { ModerationRow } from "@/hooks/useAnalytics";

interface Props { data: ModerationRow[] }

const CATEGORY_COLOR: Record<string, string> = {
  TOXIC:         "#ef4444",
  SEVERE_TOXIC:  "#dc2626",
  OBSCENE:       "#f97316",
  THREAT:        "#ef4444",
  INSULT:        "#f59e0b",
  IDENTITY_HATE: "#ec4899",
};

export function ModerationLog({ data }: Props) {
  if (data.length === 0) {
    return (
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "32px 24px", textAlign: "center",
      }}>
        <ShieldAlert size={28} color="var(--success)" style={{ margin: "0 auto 10px" }}/>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          No moderation events — clean meeting.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <ShieldAlert size={16} color="var(--danger)" />
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600 }}>Moderation Log</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {data.length} event{data.length !== 1 ? "s" : ""} flagged by auto-moderation
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((row) => {
          const catColor = CATEGORY_COLOR[row.toxicity_category] ?? "var(--danger)";
          return (
            <div key={row.id} style={{
              background: "var(--bg-raised)",
              border:     `1px solid var(--border)`,
              borderLeft: `3px solid ${catColor}`,
              borderRadius: "0 8px 8px 0",
              padding:    "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {row.offending_user_name}
                  </span>
                  <span style={{
                    fontSize: 9, padding: "2px 6px",
                    background: `${catColor}20`,
                    color: catColor, borderRadius: 4,
                    fontFamily: "var(--font-mono)", textTransform: "uppercase",
                  }}>
                    {row.toxicity_category?.replace("_"," ")}
                  </span>
                  <span style={{
                    fontSize: 9, padding: "2px 6px",
                    background: "var(--danger-soft)",
                    color: "var(--danger)", borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                  }}>
                    {(row.toxicity_score * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)" }}>
                  {format(parseISO(row.timestamp), "HH:mm:ss")}
                </span>
              </div>

              {/* Flagged text — blurred by default, click to reveal */}
              <FlaggedText text={row.flagged_text} />

              <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                Action: <span style={{ color: "var(--danger)" }}>
                  {row.action.replace("_"," ")}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlaggedText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <p
      onClick={() => setRevealed((v: boolean) => !v)}
      style={{
        fontSize:   12,
        color:      "var(--text-secondary)",
        fontFamily: "var(--font-mono)",
        filter:     revealed ? "none" : "blur(4px)",
        cursor:     "pointer",
        userSelect: "none",
        transition: "filter 0.2s",
        background: "var(--bg-overlay)",
        padding:    "5px 8px",
        borderRadius: 4,
      }}
      title={revealed ? "Click to hide" : "Click to reveal"}
    >
      "{text}"
    </p>
  );
}
