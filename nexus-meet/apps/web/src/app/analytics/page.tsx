"use client";
import { useEffect, useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useMeetingStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { MeetingDetailExpansion } from "@/components/analytics/MeetingDetailExpansion";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Smile,
  BarChart2,
  Search,
  Filter,
  Video,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronRight
} from "lucide-react";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "http://localhost:3001";
const AI_URL = process.env.NEXT_PUBLIC_AI_URL_HTTP ?? "http://localhost:8000";

function fmtDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export default function AnalyticsOverviewPage() {
  const router = useRouter();
  const { token, userId } = useMeetingStore();

  // Analytics states
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ENDED" | "SCHEDULED">("ALL");
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    fetch(`${AI_URL}/api/analytics/user/summary`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) throw new Error("Failed to load analytics summary");
        return res.json();
      })
      .then(data => {
        setUserAnalytics(data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Filter history based on search and status
  const filteredHistory = useMemo(() => {
    if (!userAnalytics?.history) return [];

    return userAnalytics.history.filter((m: any) => {
      // 1. Search Query filter
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Status filter
      let matchesStatus = true;
      if (statusFilter === "ENDED") {
        matchesStatus = m.status === "ENDED";
      } else if (statusFilter === "SCHEDULED") {
        matchesStatus = m.status === "SCHEDULED" || m.status === "ACTIVE";
      }

      return matchesSearch && matchesStatus;
    });
  }, [userAnalytics, searchQuery, statusFilter]);

  if (!token || !userId) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans)",
      display: "flex",
      flexDirection: "column"
    }}>
      <Navbar />

      <main style={{
        flex: 1,
        maxWidth: 1000,
        width: "100%",
        margin: "40px auto",
        padding: "0 24px"
      }}>
        {/* Page Header */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px" }}>Analytics Overview</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
              Aggregate attention, speaking duration, and participation logs across all meetings.
            </p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent-soft)",
            border: "1px solid var(--border-bright)",
            borderRadius: 100,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 500
          }}>
            <Sparkles size={12} color="var(--accent)"/>
            <span>AI Powered Insights</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <div style={{
              width: 40, height: 40, border: "2px solid var(--accent)",
              borderTopColor: "transparent", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }}/>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Aggregating session metrics...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{
            background: "var(--danger-soft)",
            border: "1px solid var(--danger)",
            borderRadius: 16,
            padding: 24,
            color: "var(--danger)",
            textAlign: "center"
          }}>
            Failed to aggregate meeting analytics: {error}
          </div>
        ) : (
          <div>
            {/* Aggregate Stats Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
              marginBottom: 40
            }}>
              {[
                {
                  label: "Total Meetings",
                  value: userAnalytics?.total_meetings ?? 0,
                  icon: <Calendar size={18}/>,
                  color: "var(--accent)",
                  desc: "Completed calls with telemetry log"
                },
                {
                  label: "Average Attention Score",
                  value: `${Math.round(userAnalytics?.avg_engagement ?? 0)}%`,
                  icon: <Smile size={18}/>,
                  color: (userAnalytics?.avg_engagement ?? 0) >= 70 ? "var(--success)" : (userAnalytics?.avg_engagement ?? 0) >= 45 ? "var(--warn)" : "var(--danger)",
                  desc: "Attention score average"
                },
                {
                  label: "Total Speaking Time",
                  value: fmtDuration(userAnalytics?.total_speaking_ms ?? 0),
                  icon: <Clock size={18}/>,
                  color: "var(--success)",
                  desc: "VAD voice activity sum"
                }
              ].map((stat, i) => (
                <div key={i} style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "24px 28px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{stat.label}</span>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `${stat.color}12`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: stat.color
                    }}>
                      {stat.icon}
                    </div>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", color: stat.color }}>{stat.value}</h2>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>{stat.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Meeting List / History Table */}
            <div style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 32,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
            }}>
              {/* Search and Filter bar */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                gap: 16,
                flexWrap: "wrap"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 14px",
                  flex: 1,
                  minWidth: 260
                }}>
                  <Search size={16} color="var(--text-muted)" style={{ marginRight: 10 }} />
                  <input
                    type="text"
                    placeholder="Search by meeting title..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--text-primary)",
                      fontSize: 13,
                      width: "100%",
                      fontFamily: "var(--font-sans)"
                    }}
                  />
                </div>

                <div style={{
                  display: "flex",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 3,
                  gap: 4
                }}>
                  {[
                    { id: "ALL", label: "All Sessions" },
                    { id: "ENDED", label: "Ended" },
                    { id: "SCHEDULED", label: "Scheduled & Live" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id as any)}
                      style={{
                        padding: "6px 12px",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        background: statusFilter === tab.id ? "var(--bg-overlay)" : "transparent",
                        color: statusFilter === tab.id ? "#fff" : "var(--text-secondary)"
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
                  <Video size={36} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                  <p style={{ fontSize: 14 }}>No sessions matched your criteria.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                        <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Meeting Title</th>
                        <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Scheduled Date</th>
                        <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Role</th>
                        <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Status</th>
                        <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Avg Engagement</th>
                        <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Speaking Time</th>
                        <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((h: any) => {
                        const isMeetingHost = h.host_id === userId;
                        const scoreVal = h.final_engagement_score;
                        const scoreBadgeColor = scoreVal === null ? "var(--text-muted)" : scoreVal >= 70 ? "var(--success)" : scoreVal >= 45 ? "var(--warn)" : "var(--danger)";
                        const isExpanded = expandedMeetingId === h.id;

                        return (
                          <Fragment key={h.id}>
                            <tr
                              onClick={() => {
                                setExpandedMeetingId(isExpanded ? null : h.id);
                              }}
                              style={{
                                borderBottom: "1px solid var(--border)",
                                transition: "all 0.15s ease",
                                cursor: "pointer",
                                background: isExpanded ? "rgba(255, 255, 255, 0.02)" : "transparent"
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = isExpanded ? "rgba(255, 255, 255, 0.02)" : "transparent";
                              }}
                            >
                              <td style={{ padding: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500 }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", color: "var(--text-muted)", transition: "transform 0.2s" }}>
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </span>
                                  {h.title}
                                </div>
                              </td>
                              <td style={{ padding: "16px", fontSize: 13, color: "var(--text-secondary)" }}>
                                {new Date(h.scheduled_at).toLocaleDateString()}
                              </td>
                              <td style={{ padding: "16px", fontSize: 13 }}>
                                <span style={{
                                  fontSize: 10,
                                  padding: "2px 8px",
                                  borderRadius: 100,
                                  fontWeight: 600,
                                  background: isMeetingHost ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.05)",
                                  color: isMeetingHost ? "var(--accent)" : "var(--text-secondary)",
                                  border: `1px solid ${isMeetingHost ? "rgba(99,102,241,0.2)" : "var(--border)"}`
                                }}>
                                  {isMeetingHost ? "Host" : "Participant"}
                                </span>
                              </td>
                              <td style={{ padding: "16px", fontSize: 13 }}>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: h.status === "ACTIVE" ? "var(--success)" : h.status === "SCHEDULED" ? "var(--accent)" : "var(--text-secondary)"
                                }}>
                                  {h.status === "ACTIVE" ? "Live" : h.status.charAt(0) + h.status.slice(1).toLowerCase()}
                                </span>
                              </td>
                              <td style={{ padding: "16px", fontSize: 14, fontWeight: 600, color: scoreBadgeColor }}>
                                {scoreVal !== null ? `${Math.round(scoreVal)}%` : "—"}
                              </td>
                              <td style={{ padding: "16px", fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                                {fmtDuration(h.total_speaking_ms ?? 0)}
                              </td>
                              <td style={{ padding: "16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                                {h.status === "ENDED" ? (
                                  <Link
                                    href={`/analytics/${h.id}`}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      fontSize: 12,
                                      color: "var(--accent)",
                                      textDecoration: "none",
                                      fontWeight: 600
                                    }}
                                  >
                                    Report <BarChart2 size={13}/>
                                  </Link>
                                ) : (
                                  <button
                                    onClick={() => router.push(`/meeting/${h.id}`)}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      fontSize: 12,
                                      background: "transparent",
                                      border: "none",
                                      color: "var(--success)",
                                      fontWeight: 600,
                                      cursor: "pointer"
                                    }}
                                  >
                                    Join Room <ArrowRight size={13}/>
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${h.id}-expanded`} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td colSpan={7} style={{ padding: "12px 24px 24px", background: "rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
                                  <MeetingDetailExpansion meetingId={h.id} status={h.status} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
