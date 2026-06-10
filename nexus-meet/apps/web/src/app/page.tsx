"use client";
import { useEffect, useState } from "react";
import { useRouter }           from "next/navigation";
import { useMeetingStore }     from "@/lib/store";
import { Video, BarChart2 }    from "lucide-react";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "http://localhost:3001";

export default function HomePage() {
  const router  = useRouter();
  const { token, userId, userName } = useMeetingStore();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [customMeetingId, setCustomMeetingId] = useState("");

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    
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
  }, [token]);

  const handleJoinCustom = () => {
    if (customMeetingId.trim()) {
      router.push(`/meeting/${customMeetingId.trim()}`);
    }
  };

  if (!token) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: 40 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600 }}>Good day, {userName}</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
              Your meetings are shown below. Access is invite-only.
            </p>
          </div>
        </div>

        {/* Join Custom Meeting section */}
        <div style={{
          background:   "var(--bg-surface)",
          border:       "1px solid var(--border)",
          borderRadius: 12, padding: "20px 24px",
          marginBottom: 24,
          display:      "flex", gap: 12, alignItems: "center",
        }}>
          <input
            type="text"
            placeholder="Enter Meeting ID (e.g., test-room-123)"
            value={customMeetingId}
            onChange={e => setCustomMeetingId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleJoinCustom()}
            style={{
              flex: 1, padding: "10px 14px",
              background: "var(--bg-raised)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text-primary)",
              fontSize: 14, outline: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
          <button
            onClick={handleJoinCustom}
            style={{
              padding: "10px 20px", borderRadius: 8,
              background: "var(--accent)", border: "none",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Join Room
          </button>
        </div>

        {meetings.length === 0 ? (
          <div style={{
            background:   "var(--bg-surface)",
            border:       "1px solid var(--border)",
            borderRadius: 12, padding: "48px 24px",
            textAlign:    "center",
          }}>
            <Video size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }}/>
            <p style={{ color: "var(--text-muted)" }}>
              No meetings scheduled yet. Ask your host to invite you.
            </p>
          </div>
        ) : (
          meetings.map((m) => (
            <div key={m.id} style={{
              background:   "var(--bg-surface)",
              border:       "1px solid var(--border)",
              borderRadius: 12, padding: "20px 24px",
              marginBottom: 12,
              display:      "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <p style={{ fontWeight: 500 }}>{m.title}</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>
                  {new Date(m.scheduledAt).toLocaleString()}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {m.status === "ENDED" && (
                  <button
                    onClick={() => router.push(`/analytics/${m.id}`)}
                    style={{
                      padding: "7px 14px", borderRadius: 8,
                      background: "var(--bg-raised)", border: "1px solid var(--border)",
                      color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                    <BarChart2 size={14}/> Analytics
                  </button>
                )}
                {(m.status === "SCHEDULED" || m.status === "ACTIVE") && (
                  <button
                    onClick={() => router.push(`/meeting/${m.id}`)}
                    style={{
                      padding: "7px 16px", borderRadius: 8,
                      background: "var(--accent)", border: "none",
                      color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>
                    Join →
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
