"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAnalytics } from "@/hooks/useAnalytics";
import { StatCard } from "./StatCard";
import { SpeakingTimeChart } from "./SpeakingTimeChart";
import { ParticipantTable } from "./ParticipantTable";
import { EngagementTimeline } from "./EngagementTimeline";
import { ModerationLog } from "./ModerationLog";
import { Clock, Users, TrendingUp, Bell, ShieldAlert, ExternalLink } from "lucide-react";

interface Props {
  meetingId: string;
  status: "ENDED" | "SCHEDULED" | "ACTIVE";
}

function fmtDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export function MeetingDetailExpansion({ meetingId, status }: Props) {
  const router = useRouter();
  const { summary, timeline, participants, moderation, loading, error } = useAnalytics(
    status === "ENDED" ? meetingId : ""
  );
  const [activeTab, setActiveTab] = useState<"speakers" | "timeline" | "moderation">("speakers");

  if (status !== "ENDED") {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "rgba(255, 255, 255, 0.01)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        gap: 16,
        textAlign: "center"
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--accent-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent)"
        }}>
          <Clock size={22} />
        </div>
        <div>
          <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            Session Telemetry Pending
          </h4>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, maxWidth: 420, lineHeight: 1.5 }}>
            {status === "ACTIVE" 
              ? "This session is currently active. Telemetry data, attention analysis, and moderation logs are being tracked live and will generate a report once the meeting ends."
              : "This session is scheduled. Detailed aggregate reports, engagement graphs, and participant statistics will be available once the meeting concludes."}
          </p>
        </div>
        {status === "ACTIVE" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/meeting/${meetingId}`);
            }}
            style={{
              background: "var(--success)",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
          >
            Join Live Room
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
        <div style={{
          width: 30, height: 30, border: "2px solid var(--accent)",
          borderTopColor: "transparent", borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }}/>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading session telemetry...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: "var(--danger-soft)", border: "1px solid var(--danger)",
        borderRadius: 8, padding: 16, color: "var(--danger)", fontSize: 13, textAlign: "center"
      }}>
        Failed to fetch detailed analytics: {error}
      </div>
    );
  }

  const scoreColor =
    (summary?.avg_room_engagement ?? 0) >= 70 ? "var(--success)" :
    (summary?.avg_room_engagement ?? 0) >= 45 ? "var(--warn)"    : "var(--danger)";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 24,
      background: "rgba(255, 255, 255, 0.01)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 24,
      marginTop: 8,
      marginBottom: 8,
      boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.2)"
    }}>
      {/* Sub Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Session Insights</h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            Meeting ID: <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{meetingId}</span>
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/analytics/${meetingId}`);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--accent-soft)",
            border: "1px solid var(--border-bright)",
            borderRadius: 8,
            padding: "8px 14px",
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "var(--accent)"}
          onMouseOut={(e) => e.currentTarget.style.background = "var(--accent-soft)"}
        >
          Open Full Report <ExternalLink size={13}/>
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12
      }}>
        <StatCard
          label="Duration"
          value={fmtDuration(summary?.duration_ms ?? 0)}
          accent="var(--accent)"
          icon={<Clock size={16}/>}
        />
        <StatCard
          label="Participants"
          value={summary?.total_participants ?? 0}
          accent="var(--success)"
          icon={<Users size={16}/>}
        />
        <StatCard
          label="Avg Engagement"
          value={`${Math.round(summary?.avg_room_engagement ?? 0)}%`}
          accent={scoreColor}
          icon={<TrendingUp size={16}/>}
        />
        <StatCard
          label="Alerts Fired"
          value={summary?.host_alert_count ?? 0}
          accent="var(--warn)"
          icon={<Bell size={16}/>}
        />
        <StatCard
          label="Mod Events"
          value={summary?.total_moderation_events ?? 0}
          accent="var(--danger)"
          icon={<ShieldAlert size={16}/>}
        />
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid var(--border)",
        gap: 20,
        paddingBottom: 0,
        marginTop: 8
      }}>
        {[
          { id: "speakers", label: "Speakers & Breakdown", count: null },
          { id: "timeline", label: "Engagement Timeline", count: null },
          { id: "moderation", label: "Moderation Log", count: summary?.total_moderation_events ?? 0 }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(tab.id as any);
              }}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                padding: "8px 4px 12px",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span style={{
                  fontSize: 10,
                  background: tab.id === "moderation" ? "var(--danger-soft)" : "var(--accent-soft)",
                  color: tab.id === "moderation" ? "var(--danger)" : "var(--accent)",
                  padding: "1px 6px",
                  borderRadius: 100,
                  fontWeight: 600,
                  border: `1px solid ${tab.id === "moderation" ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.2)"}`
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div style={{ minHeight: 180 }}>
        {activeTab === "speakers" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16
          }}>
            <SpeakingTimeChart data={participants} />
            <ParticipantTable data={participants} />
          </div>
        )}
        {activeTab === "timeline" && (
          <div>
            <EngagementTimeline data={timeline} participants={participants} />
          </div>
        )}
        {activeTab === "moderation" && (
          <div>
            <ModerationLog data={moderation} />
          </div>
        )}
      </div>
    </div>
  );
}
