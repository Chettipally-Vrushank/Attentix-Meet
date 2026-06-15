"use client";
import { useEffect, useState } from "react";
import { useRouter }           from "next/navigation";
import { useMeetingStore }     from "@/lib/store";
import Link                    from "next/link";
import { 
  Video, 
  BarChart2, 
  Shield, 
  Activity, 
  Sparkles, 
  LogOut, 
  ArrowRight, 
  Check, 
  Zap, 
  Cpu, 
  Smile, 
  Layers,
  Plus,
  Calendar,
  Edit,
  Trash2,
  Settings
} from "lucide-react";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "http://localhost:3001";

export default function HomePage() {
  const router = useRouter();
  const { token, userId, userName, setAuth } = useMeetingStore();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [customMeetingId, setCustomMeetingId] = useState("");
  const [activeTab, setActiveTab] = useState("features");

  // Kick message state from URL
  const [kicked, setKicked] = useState(false);
  const [kickReason, setKickReason] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("kicked") === "true") {
        setKicked(true);
        setKickReason(params.get("reason") || "");
        // Clean URL parameter
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  // Users list (all users registered)
  const [users, setUsers] = useState<any[]>([]);

  // Create Meeting states
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Edit Meeting states
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editParticipants, setEditParticipants] = useState<string[]>([]);

  const fetchMeetings = () => {
    if (!token) return;
    fetch(`${SIGNAL_URL}/api/meetings`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.meetings) {
          setMeetings(data.meetings);
        }
      })
      .catch(console.error);
  };

  // Fetch meetings if authenticated
  useEffect(() => {
    fetchMeetings();
  }, [token]);

  // Fetch users list to invite
  useEffect(() => {
    if (!token) return;

    fetch(`${SIGNAL_URL}/api/users`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.users) {
          // Exclude ourselves from options
          setUsers(data.users.filter((u: any) => u.id !== userId));
        }
      })
      .catch(console.error);
  }, [token, userId]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    try {
      const res = await fetch(`${SIGNAL_URL}/api/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          scheduledAt: newDate,
          participantIds: selectedParticipants,
          token
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewDate("");
        setSelectedParticipants([]);
        setShowCreate(false);
        fetchMeetings();
      }
    } catch (err) {
      console.error("Failed to create meeting:", err);
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    if (!confirm("Are you sure you want to cancel this meeting?")) return;
    try {
      const res = await fetch(`${SIGNAL_URL}/api/meetings/${meetingId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchMeetings();
      }
    } catch (err) {
      console.error("Failed to cancel meeting:", err);
    }
  };

  const handleSaveEditMeeting = async (meetingId: string) => {
    try {
      const res1 = await fetch(`${SIGNAL_URL}/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          scheduledAt: editDate
        })
      });

      const res2 = await fetch(`${SIGNAL_URL}/api/meetings/${meetingId}/participants`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          participantIds: editParticipants
        })
      });

      if (res1.ok && res2.ok) {
        setEditingMeetingId(null);
        fetchMeetings();
      }
    } catch (err) {
      console.error("Failed to edit meeting:", err);
    }
  };

  const handleJoinCustom = () => {
    if (customMeetingId.trim()) {
      router.push(`/meeting/${customMeetingId.trim()}`);
    }
  };

  const handleLogout = () => {
    setAuth("", "", "");
    router.push("/");
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: SaaS Landing Page (Guest Mode)
  // ─────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "var(--bg-base)", 
        color: "var(--text-primary)", 
        fontFamily: "var(--font-sans)",
        overflowX: "hidden",
        position: "relative"
      }}>
        {/* Ambient background glows */}
        <div style={{
          position: "absolute", top: -200, left: "20%", width: 600, height: 600,
          background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
          opacity: 0.4, pointerEvents: "none", zIndex: 0
        }}/>
        <div style={{
          position: "absolute", top: 800, right: "-10%", width: 500, height: 500,
          background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
          opacity: 0.3, pointerEvents: "none", zIndex: 0
        }}/>

        {/* Header / Navbar */}
        <header style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "24px 8%", position: "sticky", top: 0, 
          backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)",
          background: "rgba(10, 10, 15, 0.8)", zIndex: 100
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--accent), #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold"
            }}>
              ⬡
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>NexusMeet</span>
          </div>

          <nav style={{ display: "flex", gap: 32, fontSize: 14, fontWeight: 500 }}>
            <a href="#features" style={{ color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.15s" }}>Features</a>
            <a href="#pricing" style={{ color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.15s" }}>Pricing</a>
            <a href="#about" style={{ color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.15s" }}>Product</a>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button 
              onClick={() => router.push("/login")}
              style={{
                background: "transparent", border: "none", color: "var(--text-primary)",
                fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "8px 16px"
              }}
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push("/register")}
              style={{
                background: "var(--accent)", border: "none", color: "#fff",
                borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, 
                cursor: "pointer", boxShadow: "0 4px 14px var(--accent-glow)", transition: "transform 0.15s"
              }}
            >
              Get Started →
            </button>
          </div>
        </header>

        {kicked && (
          <div style={{
            maxWidth: 1000,
            margin: "24px auto 0",
            background: "var(--danger-soft)",
            border: "1px solid var(--danger)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "var(--danger)",
            position: "relative",
            zIndex: 10
          }}>
            <Shield size={20} />
            <div style={{ fontSize: 14 }}>
              <strong style={{ fontWeight: 600 }}>Moderation Alert:</strong> You were removed from the meeting. Reason: {kickReason || "consistently low engagement / toxic behavior"}
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section style={{ 
          padding: "100px 8% 80px", textAlign: "center", position: "relative", zIndex: 1 
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--accent-soft)", border: "1px solid var(--border-bright)",
            borderRadius: 100, padding: "6px 14px", marginBottom: 24, fontSize: 12, fontWeight: 500
          }}>
            <Sparkles size={12} color="var(--accent)"/>
            <span style={{ color: "var(--text-primary)" }}>Introducing Real-Time Attention Analytics</span>
          </div>

          <h1 style={{
            fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 800, lineHeight: 1.1,
            letterSpacing: "-1.5px", maxWidth: 900, margin: "0 auto 20px",
            background: "linear-gradient(to right, #fff 40%, rgba(255,255,255,0.6))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            The AI-Powered Meeting Platform for High-Performance Teams
          </h1>

          <p style={{
            fontSize: "clamp(16px, 2vw, 18px)", color: "var(--text-secondary)",
            maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.5
          }}>
            Analyze real-time attendee engagement metrics using face pose mapping, automate speech-to-text transcript logs, and moderate toxicity instantly.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <button 
              onClick={() => router.push("/register")}
              style={{
                padding: "14px 28px", borderRadius: 10,
                background: "var(--accent)", border: "none", color: "#fff",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 6px 20px var(--accent-glow)"
              }}
            >
              Start Free Trial
            </button>
            <button 
              onClick={() => router.push("/login")}
              style={{
                padding: "14px 28px", borderRadius: 10,
                background: "var(--bg-surface)", border: "1px solid var(--border)", 
                color: "var(--text-primary)", fontSize: 15, fontWeight: 600, cursor: "pointer"
              }}
            >
              Join Meeting Demo
            </button>
          </div>

          {/* SaaS Mockup Dashboard Image */}
          <div style={{
            maxWidth: 1000, margin: "80px auto 0", padding: "12px",
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid var(--border)", borderRadius: 24, boxShadow: "0 30px 60px rgba(0,0,0,0.6)"
          }}>
            <div style={{
              background: "var(--bg-base)", borderRadius: 16, overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.05)", height: 480, position: "relative",
              display: "flex", flexDirection: "column"
            }}>
              {/* Fake UI Header */}
              <div style={{ height: 40, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 16px", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }}/>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }}/>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }}/>
                <div style={{ marginLeft: 20, width: 200, height: 16, background: "var(--bg-raised)", borderRadius: 4 }}/>
              </div>

              {/* Fake UI Body */}
              <div style={{ flex: 1, display: "flex", padding: 20, gap: 20 }}>
                {/* Fake Webcams */}
                <div style={{ flex: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Alice Host</span>
                    <div style={{ position: "absolute", bottom: 10, left: 10, background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: 6, padding: "2px 6px", fontSize: 10, color: "var(--accent)" }}>
                      92% Engaged
                    </div>
                  </div>
                  <div style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Bob Participant</span>
                    <div style={{ position: "absolute", bottom: 10, left: 10, background: "var(--danger-soft)", border: "1px solid var(--danger)", borderRadius: 6, padding: "2px 6px", fontSize: 10, color: "var(--danger)" }}>
                      34% - Looking Away
                    </div>
                  </div>
                </div>

                {/* Fake Real-Time Score Sidebar */}
                <div style={{ flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>ROOM ENGAGEMENT</span>
                    <h2 style={{ fontSize: 32, fontWeight: 700, margin: "6px 0", color: "var(--warn)" }}>63%</h2>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Moderation alert threshold is 50%</p>
                  </div>
                  <div style={{ height: 120, display: "flex", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ flex: 1, height: "80%", background: "var(--accent)", borderRadius: 2 }}/>
                    <div style={{ flex: 1, height: "70%", background: "var(--accent)", borderRadius: 2 }}/>
                    <div style={{ flex: 1, height: "65%", background: "var(--accent)", borderRadius: 2 }}/>
                    <div style={{ flex: 1, height: "45%", background: "var(--danger)", borderRadius: 2 }}/>
                    <div style={{ flex: 1, height: "55%", background: "var(--warn)", borderRadius: 2 }}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{ padding: "80px 8%", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Uncompromising Safety & Tracking</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>
              Three deep AI engines running asynchronously in a dedicated worker pool.
            </p>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24
          }}>
            {[
              {
                icon: <Activity size={24} color="var(--accent)"/>,
                title: "Computer Vision Telemetry",
                desc: "Real-time MediaPipe face landmarks extraction mapping yaw, pitch, roll head angles, and eye blinks to detect drowsiness or complete distraction."
              },
              {
                icon: <Cpu size={24} color="#a855f7"/>,
                title: "VAD-Sliced STT Engines",
                desc: "VAD audio slicing buffers PCM streams into 3-second intervals, transcribing speaker dialogue on-the-fly using highly precise Whisper deep learning models."
              },
              {
                icon: <Shield size={24} color="var(--danger)"/>,
                title: "Toxic-BERT Auto-Moderator",
                desc: "Classifies live transcripts for harassment, abuse, or toxicity, triggering an automatic server-side kick to protect meeting hosts and workspaces."
              }
            ].map((f, i) => (
              <div key={i} style={{
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: 16, padding: 32, transition: "transform 0.15s, border-color 0.15s"
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: "var(--bg-raised)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{f.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" style={{ padding: "80px 8%", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Simple, Transparent SaaS Pricing</h2>
            <p style={{ color: "var(--text-secondary)" }}>Choose the plan that fits your organizational needs.</p>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, maxWidth: 1000, margin: "0 auto"
          }}>
            {[
              {
                tier: "Free",
                price: "$0",
                features: ["40 Minute Meeting Limit", "Up to 5 Participants", "Basic Post-Meeting Analytics", "Standard Telemetry"],
                cta: "Get Started",
                accent: "var(--text-secondary)",
                action: () => router.push("/register")
              },
              {
                tier: "Pro",
                price: "$15",
                features: ["Unlimited Duration", "Up to 100 Participants", "Whisper STT Transcriptions", "Toxic-BERT Auto-Moderation", "Full Dynamic Analytics Summary"],
                cta: "Start Pro Trial",
                accent: "var(--accent)",
                popular: true,
                action: () => router.push("/register")
              },
              {
                tier: "Enterprise",
                price: "Custom",
                features: ["Dedicated Worker Server Pool", "Custom Toxicity Thresholds", "SAML SSO & Advanced RBAC", "API Log Webhook Integrations", "24/7 SLA Support Support"],
                cta: "Contact Sales",
                accent: "#a855f7",
                action: () => router.push("/register")
              }
            ].map((p, i) => (
              <div key={i} style={{
                background: "var(--bg-surface)", border: p.popular ? "2px solid var(--accent)" : "1px solid var(--border)",
                borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between",
                position: "relative"
              }}>
                {p.popular && (
                  <div style={{
                    position: "absolute", top: -12, right: 24, background: "var(--accent)", color: "#fff",
                    borderRadius: 100, padding: "2px 12px", fontSize: 11, fontWeight: 600
                  }}>
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: 16, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 8 }}>{p.tier}</h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                    <span style={{ fontSize: 40, fontWeight: 700 }}>{p.price}</span>
                    {p.price !== "Custom" && <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>/mo</span>}
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                    {p.features.map((f, j) => (
                      <li key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-primary)" }}>
                        <Check size={14} color={p.accent === "var(--text-secondary)" ? "var(--success)" : p.accent}/>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={p.action}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 8,
                    background: p.popular ? "var(--accent)" : "var(--bg-raised)",
                    border: p.popular ? "none" : "1px solid var(--border)",
                    color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    transition: "background 0.15s"
                  }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          padding: "48px 8%", borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 13, color: "var(--text-secondary)"
        }}>
          <div>© 2026 NexusMeet Inc. All rights reserved.</div>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Privacy</a>
            <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Terms</a>
            <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Status</a>
          </div>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SaaS User Dashboard (Authenticated Mode)
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "var(--bg-base)", 
      color: "var(--text-primary)", 
      fontFamily: "var(--font-sans)",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Dashboard Navbar */}
      <header style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 32px", borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold"
          }}>
            ⬡
          </div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>NexusMeet Dashboard</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button
            onClick={() => router.push("/profile")}
            style={{
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--text-secondary)", borderRadius: 8, padding: "8px 14px",
              fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s"
            }}
          >
            Profile & Analytics
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "var(--bg-raised)",
              border: "1px solid var(--border)", display: "flex", alignItems: "center", 
              justifyContent: "center", fontSize: 14, fontWeight: "bold", color: "var(--accent)"
            }}>
              {userName?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{userName}</span>
          </div>
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

      {/* Main content grid */}
      <main style={{
        flex: 1, maxWidth: 1000, width: "100%", margin: "40px auto", padding: "0 24px"
      }}>
        {/* Kicked Alert Banner */}
        {kicked && (
          <div style={{
            background: "var(--danger-soft)",
            border: "1px solid var(--danger)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "var(--danger)"
          }}>
            <Shield size={20} />
            <div style={{ fontSize: 14 }}>
              <strong style={{ fontWeight: 600 }}>Moderation Alert:</strong> You were removed from the meeting. Reason: {kickReason || "consistently low engagement / toxic behavior"}
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px" }}>Good day, {userName}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Schedule or join active rooms from your invite-only dashboard.
          </p>
        </div>

        {/* Action Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Join Custom Meeting Section */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 32,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column", gap: 16
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Quick Join Room</h2>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                type="text"
                placeholder="Enter Meeting ID (e.g. test-room-123)"
                value={customMeetingId}
                onChange={e => setCustomMeetingId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleJoinCustom()}
                style={{
                  flex: 1, padding: "12px 16px",
                  background: "var(--bg-raised)", border: "1px solid var(--border)",
                  borderRadius: 10, color: "var(--text-primary)",
                  fontSize: 14, outline: "none", fontFamily: "var(--font-sans)",
                  transition: "border-color 0.15s"
                }}
              />
              <button
                onClick={handleJoinCustom}
                style={{
                  padding: "12px 24px", borderRadius: 10,
                  background: "var(--accent)", border: "none",
                  color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 12px var(--accent-glow)"
                }}
              >
                Join Room
              </button>
            </div>
          </div>

          {/* Schedule Meeting Section */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 32,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column", gap: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Schedule New Meeting</h2>
              <button
                onClick={() => setShowCreate(!showCreate)}
                style={{
                  background: "var(--bg-raised)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600,
                  color: "var(--text-primary)", cursor: "pointer"
                }}
              >
                {showCreate ? "Hide" : "Show Form"}
              </button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreateMeeting} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="text" placeholder="Meeting Title (e.g. Weekly Sync)"
                  value={newTitle} onChange={e => setNewTitle(e.target.value)} required
                  style={{
                    padding: "11px 14px", background: "var(--bg-raised)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none",
                    fontFamily: "var(--font-sans)"
                  }}
                />
                <input
                  type="datetime-local"
                  value={newDate} onChange={e => setNewDate(e.target.value)} required
                  style={{
                    padding: "11px 14px", background: "var(--bg-raised)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none",
                    fontFamily: "var(--font-sans)"
                  }}
                />
                
                {/* Invite participants */}
                {users.length > 0 && (
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6, fontWeight: 500 }}>
                      Invite Participants:
                    </label>
                    <div style={{
                      maxHeight: 100, overflowY: "auto", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "8px 12px", background: "var(--bg-raised)",
                      display: "flex", flexDirection: "column", gap: 6
                    }}>
                      {users.map(u => (
                        <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={selectedParticipants.includes(u.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedParticipants([...selectedParticipants, u.id]);
                              } else {
                                setSelectedParticipants(selectedParticipants.filter(id => id !== u.id));
                              }
                            }}
                          />
                          <span>{u.name} ({u.email})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    padding: "11px", borderRadius: 8, background: "var(--success)",
                    border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  <Plus size={14}/> Schedule Meeting
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Scheduled Meetings list */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Scheduled Meetings</h2>
          {meetings.length === 0 ? (
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "48px 24px", textAlign: "center"
            }}>
              <Video size={36} color="var(--text-muted)" style={{ margin: "0 auto 16px" }}/>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                No active or scheduled meetings. Ask your host for an invite.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {meetings.map((m) => {
                const isHostOfMeeting = m.hostId === userId;
                const isEditingThisMeeting = editingMeetingId === m.id;

                return (
                  <div key={m.id} style={{
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderRadius: 16, padding: "20px 24px",
                    display: "flex", flexDirection: "column", gap: 16,
                    transition: "border-color 0.15s"
                  }}>
                    {isEditingThisMeeting ? (
                      /* Edit Mode Form */
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", gap: 12 }}>
                          <input
                            type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                            style={{
                              flex: 1, padding: "10px 14px", background: "var(--bg-raised)", border: "1px solid var(--border)",
                              borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none"
                            }}
                          />
                          <input
                            type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)}
                            style={{
                              padding: "10px 14px", background: "var(--bg-raised)", border: "1px solid var(--border)",
                              borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: "none"
                            }}
                          />
                        </div>

                        {users.length > 0 && (
                          <div>
                            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                              Edit Invited Participants:
                            </label>
                            <div style={{
                              maxHeight: 90, overflowY: "auto", border: "1px solid var(--border)",
                              borderRadius: 8, padding: "8px 12px", background: "var(--bg-raised)",
                              display: "flex", flexDirection: "column", gap: 6
                            }}>
                              {users.map(u => (
                                <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={editParticipants.includes(u.id)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setEditParticipants([...editParticipants, u.id]);
                                      } else {
                                        setEditParticipants(editParticipants.filter(id => id !== u.id));
                                      }
                                    }}
                                  />
                                  <span>{u.name} ({u.email})</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => setEditingMeetingId(null)}
                            style={{
                              padding: "6px 12px", borderRadius: 8, background: "var(--bg-raised)",
                              border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEditMeeting(m.id)}
                            style={{
                              padding: "6px 14px", borderRadius: 8, background: "var(--success)",
                              border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer"
                            }}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <p style={{ fontWeight: 600, fontSize: 15 }}>{m.title}</p>
                            {m.status === "ACTIVE" && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                background: "var(--success-soft)", border: "1px solid var(--success)",
                                color: "var(--success)", fontSize: 10, padding: "2px 8px", borderRadius: 100,
                                fontWeight: 600
                              }}>
                                ● Active
                              </span>
                            )}
                            {m.status === "CANCELLED" && (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                background: "var(--danger-soft)", border: "1px solid var(--danger)",
                                color: "var(--danger)", fontSize: 10, padding: "2px 8px", borderRadius: 100,
                                fontWeight: 600
                              }}>
                                Cancelled
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                            {new Date(m.scheduledAt).toLocaleString()}
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {/* Host Controls */}
                          {isHostOfMeeting && m.status !== "ENDED" && m.status !== "CANCELLED" && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMeetingId(m.id);
                                  setEditTitle(m.title);
                                  setEditDate(new Date(m.scheduledAt).toISOString().slice(0, 16));
                                  setEditParticipants(m.participants?.map((p: any) => p.userId) || []);
                                }}
                                style={{
                                  padding: "8px 12px", borderRadius: 8,
                                  background: "var(--bg-raised)", border: "1px solid var(--border)",
                                  color: "var(--text-primary)", fontSize: 13, cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: 5
                                }}
                              >
                                <Edit size={13}/> Reschedule
                              </button>
                              <button
                                onClick={() => handleCancelMeeting(m.id)}
                                style={{
                                  padding: "8px 12px", borderRadius: 8,
                                  background: "var(--danger-soft)", border: "1px solid var(--danger)",
                                  color: "var(--danger)", fontSize: 13, cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: 5
                                }}
                              >
                                <Trash2 size={13}/> Cancel
                              </button>
                            </>
                          )}

                          {m.status === "ENDED" && (
                            <button
                              onClick={() => router.push(`/analytics/${m.id}`)}
                              style={{
                                padding: "8px 16px", borderRadius: 8,
                                background: "var(--bg-raised)", border: "1px solid var(--border)",
                                color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 6
                              }}
                            >
                              <BarChart2 size={14}/> Analytics
                            </button>
                          )}

                          {(m.status === "SCHEDULED" || m.status === "ACTIVE") && (
                            <button
                              onClick={() => router.push(`/meeting/${m.id}`)}
                              style={{
                                padding: "8px 18px", borderRadius: 8,
                                background: "var(--accent)", border: "none",
                                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                                boxShadow: "0 2px 8px var(--accent-glow)"
                              }}
                            >
                              Join Room
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
