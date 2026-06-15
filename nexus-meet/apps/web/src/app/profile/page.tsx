"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMeetingStore } from "@/lib/store";
import Link from "next/link";
import { ArrowLeft, User, BarChart2, Key, Calendar, Clock, Smile, LogOut } from "lucide-react";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "http://localhost:3001";
const AI_URL = process.env.NEXT_PUBLIC_AI_URL_HTTP ?? "http://localhost:8000";

function fmtDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { token, userId, userName, setAuth } = useMeetingStore();

  const [activeTab, setActiveTab] = useState<"account" | "analytics">("account");

  // Profile fields
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Analytics states
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token || !userId) {
      router.push("/login");
      return;
    }
    setProfileName(userName || "");
    // Fetch user profile from DB to populate email
    fetch(`${SIGNAL_URL}/api/users`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const current = data.users?.find((u: any) => u.id === userId);
        if (current) {
          setProfileEmail(current.email);
        }
      })
      .catch(console.error);
  }, [token, userId]);

  // Fetch User-level Analytics
  useEffect(() => {
    if (!token) return;
    setAnalyticsLoading(true);
    fetch(`${AI_URL}/api/analytics/user/summary`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) throw new Error("Failed to load user analytics");
        return res.json();
      })
      .then(data => {
        setUserAnalytics(data);
        setAnalyticsError(null);
      })
      .catch(err => setAnalyticsError(err.message))
      .finally(() => setAnalyticsLoading(false));
  }, [token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(""); setProfileError("");
    try {
      const res = await fetch(`${SIGNAL_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: profileName, email: profileEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update profile");
      setAuth(token || "", data.user.id, data.user.name);
      setProfileSuccess("Profile updated successfully!");
    } catch (err: any) {
      setProfileError(err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(""); setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    try {
      const res = await fetch(`${SIGNAL_URL}/api/users/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to change password");
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message);
    }
  };

  const handleLogout = () => {
    setAuth("", "", "");
    router.push("/");
  };

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
      {/* Header */}
      <header style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 32px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "var(--bg-raised)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "8px 14px", cursor: "pointer",
              color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 500, transition: "background 0.15s"
            }}
          >
            <ArrowLeft size={14}/> Back to Dashboard
          </button>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Profile & Analytics</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent", border: "none", color: "var(--text-secondary)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              transition: "color 0.15s"
            }}
          >
            <LogOut size={14}/> Logout
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main style={{
        flex: 1, maxWidth: 1000, width: "100%", margin: "40px auto", padding: "0 24px"
      }}>
        {/* Navigation Tabs */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 32, borderBottom: "1px solid var(--border)",
          paddingBottom: 12
        }}>
          {[
            { id: "account", label: "Account Settings", icon: <User size={16}/> },
            { id: "analytics", label: "Attention & Engagement", icon: <BarChart2 size={16}/> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: activeTab === tab.id ? "var(--bg-overlay)" : "transparent",
                border: activeTab === tab.id ? "1px solid var(--border-bright)" : "1px solid transparent",
                borderRadius: 8, padding: "10px 18px", color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
                fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.15s"
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Account Settings */}
        {activeTab === "account" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Left Card: Update Profile */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: "var(--accent-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <User size={18} color="var(--accent)"/>
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600 }}>Personal Details</h2>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Manage your account contact info</p>
                </div>
              </div>

              {profileSuccess && (
                <div style={{
                  background: "var(--success-soft)", border: "1px solid var(--success)",
                  borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--success)",
                  marginBottom: 16, textAlign: "center"
                }}>{profileSuccess}</div>
              )}
              {profileError && (
                <div style={{
                  background: "var(--danger-soft)", border: "1px solid var(--danger)",
                  borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--danger)",
                  marginBottom: 16, textAlign: "center"
                }}>{profileError}</div>
              )}

              <form onSubmit={handleUpdateProfile}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 6, fontWeight: 500 }}>Full Name</label>
                  <input
                    type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px",
                      background: "var(--bg-raised)", border: "1px solid var(--border)",
                      borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none"
                    }}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 6, fontWeight: 500 }}>Email Address</label>
                  <input
                    type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px",
                      background: "var(--bg-raised)", border: "1px solid var(--border)",
                      borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none"
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    width: "100%", padding: "12px", background: "var(--accent)",
                    border: "none", borderRadius: 8, color: "#fff", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px var(--accent-glow)"
                  }}
                >
                  Save Changes
                </button>
              </form>
            </div>

            {/* Right Card: Change Password */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: "var(--danger-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Key size={18} color="var(--danger)"/>
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600 }}>Security Settings</h2>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Update your profile password</p>
                </div>
              </div>

              {passwordSuccess && (
                <div style={{
                  background: "var(--success-soft)", border: "1px solid var(--success)",
                  borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--success)",
                  marginBottom: 16, textAlign: "center"
                }}>{passwordSuccess}</div>
              )}
              {passwordError && (
                <div style={{
                  background: "var(--danger-soft)", border: "1px solid var(--danger)",
                  borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--danger)",
                  marginBottom: 16, textAlign: "center"
                }}>{passwordError}</div>
              )}

              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 6, fontWeight: 500 }}>Current Password</label>
                  <input
                    type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%", padding: "11px 14px",
                      background: "var(--bg-raised)", border: "1px solid var(--border)",
                      borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none"
                    }}
                  />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 6, fontWeight: 500 }}>New Password</label>
                  <input
                    type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%", padding: "11px 14px",
                      background: "var(--bg-raised)", border: "1px solid var(--border)",
                      borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none"
                    }}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 6, fontWeight: 500 }}>Confirm New Password</label>
                  <input
                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%", padding: "11px 14px",
                      background: "var(--bg-raised)", border: "1px solid var(--border)",
                      borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none"
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    width: "100%", padding: "12px", background: "var(--accent)",
                    border: "none", borderRadius: 8, color: "#fff", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px var(--accent-glow)"
                  }}
                >
                  Change Password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: User Analytics */}
        {activeTab === "analytics" && (
          <div>
            {analyticsLoading ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{
                  width: 32, height: 32, border: "2px solid var(--accent)",
                  borderTopColor: "transparent", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite", margin: "0 auto 16px"
                }}/>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Aggregating meeting metrics...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : analyticsError ? (
              <div style={{
                background: "var(--danger-soft)", border: "1px solid var(--danger)",
                borderRadius: 16, padding: "24px", color: "var(--danger)", textAlign: "center"
              }}>
                Failed to aggregate metrics: {analyticsError}
              </div>
            ) : (
              <div>
                {/* Stats Cards */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32
                }}>
                  {[
                    {
                      label: "Total Meetings Attended",
                      value: userAnalytics?.total_meetings ?? 0,
                      icon: <Calendar size={18}/>,
                      color: "var(--accent)",
                      desc: "Completed calls with telemetry"
                    },
                    {
                      label: "Average Attention Score",
                      value: `${Math.round(userAnalytics?.avg_engagement ?? 0)}%`,
                      icon: <Smile size={18}/>,
                      color: (userAnalytics?.avg_engagement ?? 0) >= 70 ? "var(--success)" : (userAnalytics?.avg_engagement ?? 0) >= 45 ? "var(--warn)" : "var(--danger)",
                      desc: "Room score average"
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
                      background: "var(--bg-surface)", border: "1px solid var(--border)",
                      borderRadius: 16, padding: "24px 28px", display: "flex", flexDirection: "column",
                      justifyContent: "space-between", gap: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{stat.label}</span>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, background: `${stat.color}12`,
                          display: "flex", alignItems: "center", justifyContent: "center", color: stat.color
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

                {/* Meeting History List */}
                <div style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: 16, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Meeting History & Logs</h3>

                  {(!userAnalytics?.history || userAnalytics.history.length === 0) ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
                      No meeting participation logs found.
                    </p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                            <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Meeting Title</th>
                            <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Date</th>
                            <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Role</th>
                            <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Engagement</th>
                            <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Speaking Time</th>
                            <th style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userAnalytics.history.map((h: any) => {
                            const isMeetingHost = h.host_id === userId;
                            const scoreVal = h.final_engagement_score;
                            const scoreBadgeColor = scoreVal === null ? "var(--text-muted)" : scoreVal >= 70 ? "var(--success)" : scoreVal >= 45 ? "var(--warn)" : "var(--danger)";

                            return (
                              <tr key={h.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}>
                                <td style={{ padding: "16px", fontSize: 14, fontWeight: 500 }}>{h.title}</td>
                                <td style={{ padding: "16px", fontSize: 13, color: "var(--text-secondary)" }}>
                                  {new Date(h.scheduled_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: "16px", fontSize: 13 }}>
                                  <span style={{
                                    fontSize: 10, padding: "2px 8px", borderRadius: 100, fontWeight: 600,
                                    background: isMeetingHost ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.05)",
                                    color: isMeetingHost ? "var(--accent)" : "var(--text-secondary)",
                                    border: `1px solid ${isMeetingHost ? "rgba(99,102,241,0.2)" : "var(--border)"}`
                                  }}>
                                    {isMeetingHost ? "Host" : "Participant"}
                                  </span>
                                </td>
                                <td style={{ padding: "16px", fontSize: 14, fontWeight: 600, color: scoreBadgeColor }}>
                                  {scoreVal !== null ? `${Math.round(scoreVal)}%` : "—"}
                                </td>
                                <td style={{ padding: "16px", fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                                  {fmtDuration(h.total_speaking_ms ?? 0)}
                                </td>
                                <td style={{ padding: "16px" }}>
                                  {h.status === "ENDED" ? (
                                    <Link
                                      href={`/analytics/${h.id}`}
                                      style={{
                                        display: "inline-flex", alignItems: "center", gap: 5,
                                        fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600
                                      }}
                                    >
                                      Report <BarChart2 size={13}/>
                                    </Link>
                                  ) : (
                                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                                      {h.status.charAt(0) + h.status.slice(1).toLowerCase()}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
