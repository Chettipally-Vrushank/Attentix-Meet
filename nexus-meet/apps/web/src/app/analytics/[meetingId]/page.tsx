"use client";
import { useParams, useRouter } from "next/navigation";
import { Users, Clock, TrendingUp, ShieldAlert, ArrowLeft, Bell } from "lucide-react";
import { useAnalytics }         from "@/hooks/useAnalytics";
import { StatCard }             from "@/components/analytics/StatCard";
import { EngagementTimeline }   from "@/components/analytics/EngagementTimeline";
import { SpeakingTimeChart }    from "@/components/analytics/SpeakingTimeChart";
import { ParticipantTable }     from "@/components/analytics/ParticipantTable";
import { ModerationLog }        from "@/components/analytics/ModerationLog";

function fmtDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export default function AnalyticsDashboard() {
  const params    = useParams();
  const router    = useRouter();
  const meetingId = params.meetingId as string;

  const { summary, timeline, participants, moderation, loading, error } =
    useAnalytics(meetingId);

  if (loading) return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, border: "2px solid var(--accent)",
          borderTopColor: "transparent", borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
        }}/>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading analytics...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <p style={{ color: "var(--danger)" }}>Failed to load analytics: {error}</p>
    </div>
  );

  const scoreColor =
    (summary?.avg_room_engagement ?? 0) >= 70 ? "var(--success)" :
    (summary?.avg_room_engagement ?? 0) >= 45 ? "var(--warn)"    : "var(--danger)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        borderBottom: "1px solid var(--border)",
        background:   "var(--bg-surface)",
        padding:      "16px 32px",
        display:      "flex", alignItems: "center", justifyContent: "space-between",
        position:     "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "var(--bg-raised)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "6px 10px", cursor: "pointer",
              color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5,
              fontSize: 13,
            }}>
            <ArrowLeft size={14}/> Back
          </button>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 600 }}>Meeting Report</h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {meetingId}
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Stat cards ───────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12, marginBottom: 24,
        }}>
          <StatCard
            label="Duration"
            value={fmtDuration(summary?.duration_ms ?? 0)}
            sub="Total meeting time"
            accent="var(--accent)"
            icon={<Clock size={18}/>}
          />
          <StatCard
            label="Participants"
            value={summary?.total_participants ?? 0}
            sub="Unique attendees"
            accent="var(--success)"
            icon={<Users size={18}/>}
          />
          <StatCard
            label="Avg Engagement"
            value={`${Math.round(summary?.avg_room_engagement ?? 0)}`}
            sub="Room-wide score (0–100)"
            accent={scoreColor}
            icon={<TrendingUp size={18}/>}
          />
          <StatCard
            label="Alerts Fired"
            value={summary?.host_alert_count ?? 0}
            sub="Low-engagement alerts to host"
            accent="var(--warn)"
            icon={<Bell size={18}/>}
          />
          <StatCard
            label="Mod Events"
            value={summary?.total_moderation_events ?? 0}
            sub={`${summary?.total_kicks ?? 0} auto-kick${summary?.total_kicks !== 1 ? "s" : ""}`}
            accent="var(--danger)"
            icon={<ShieldAlert size={18}/>}
          />
        </div>

        {/* ── Engagement timeline ──────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <EngagementTimeline data={timeline} participants={participants} />
        </div>

        {/* ── Speaking time + participant table ────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16, marginBottom: 16,
        }}>
          <SpeakingTimeChart  data={participants} />
          <ParticipantTable   data={participants} />
        </div>

        {/* ── Moderation log ───────────────────────────────── */}
        <ModerationLog data={moderation} />
      </div>
    </div>
  );
}
