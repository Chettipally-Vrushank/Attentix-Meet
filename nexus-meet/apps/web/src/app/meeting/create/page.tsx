"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMeetingStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import {
  Video,
  Plus,
  Calendar,
  Edit,
  Trash2,
  Users,
  Clock,
  Sparkles
} from "lucide-react";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "http://localhost:3001";

export default function CreateMeetingPage() {
  const router = useRouter();
  const { token, userId, userName } = useMeetingStore();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [customMeetingId, setCustomMeetingId] = useState("");

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
          // Filter to show only active or scheduled meetings on the creation page
          setMeetings(data.meetings.filter((m: any) => m.status === "SCHEDULED" || m.status === "ACTIVE"));
        }
      })
      .catch(console.error);
  };

  // Fetch meetings if authenticated
  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
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

  const startEdit = (m: any) => {
    setEditingMeetingId(m.id);
    setEditTitle(m.title);
    
    // Format date for datetime-local input (YYYY-MM-DDTHH:MM)
    const d = new Date(m.scheduledAt);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setEditDate(localISOTime);
    
    // Extract participant IDs (excluding host)
    const invited = m.participants ? m.participants.map((p: any) => p.userId).filter((id: string) => id !== userId) : [];
    setEditParticipants(invited);
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
      <Navbar />

      <main style={{
        flex: 1,
        maxWidth: 1000,
        width: "100%",
        margin: "40px auto",
        padding: "0 24px"
      }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px" }}>Create or Join a Meeting</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
              Schedule a secure video call or enter a room code to join instantly.
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
            <span>Invite-Only System</span>
          </div>
        </div>

        {/* Action Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Quick Join Card */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Quick Join Room</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.4 }}>
              Enter an existing meeting ID/room code to connect directly.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
              <input
                type="text"
                placeholder="Enter Meeting ID (e.g. test-room-123)"
                value={customMeetingId}
                onChange={e => setCustomMeetingId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleJoinCustom()}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  transition: "border-color 0.15s"
                }}
              />
              <button
                onClick={handleJoinCustom}
                style={{
                  padding: "12px 24px",
                  borderRadius: 10,
                  background: "var(--accent)",
                  border: "none",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px var(--accent-glow)"
                }}
              >
                Join Room
              </button>
            </div>
          </div>

          {/* Schedule Meeting Card */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Schedule New Meeting</h2>
              <button
                onClick={() => setShowCreate(!showCreate)}
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  cursor: "pointer"
                }}
              >
                {showCreate ? "Hide" : "Show Form"}
              </button>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.4 }}>
              Set up a future meeting slot and invite registered participants.
            </p>

            {showCreate && (
              <form onSubmit={handleCreateMeeting} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                <input
                  type="text"
                  placeholder="Meeting Title (e.g. Project Alignment)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  style={{
                    padding: "11px 14px",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "var(--font-sans)"
                  }}
                />
                <input
                  type="datetime-local"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  required
                  style={{
                    padding: "11px 14px",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "var(--font-sans)"
                  }}
                />

                {users.length > 0 && (
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6, fontWeight: 500 }}>
                      Invite Participants:
                    </label>
                    <div style={{
                      maxHeight: 120,
                      overflowY: "auto",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      background: "var(--bg-raised)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
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
                    padding: "11px",
                    borderRadius: 8,
                    background: "var(--success)",
                    border: "none",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <Plus size={14}/> Schedule Meeting
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Scheduled Meetings List */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Scheduled & Active Rooms</h2>
          {meetings.length === 0 ? (
            <div style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "48px 24px",
              textAlign: "center"
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
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    transition: "border-color 0.15s"
                  }}>
                    {isEditingThisMeeting ? (
                      /* Edit Mode Form */
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", gap: 12 }}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "10px 14px",
                              background: "var(--bg-raised)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              color: "var(--text-primary)",
                              fontSize: 13,
                              outline: "none"
                            }}
                          />
                          <input
                            type="datetime-local"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            style={{
                              padding: "10px 14px",
                              background: "var(--bg-raised)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              color: "var(--text-primary)",
                              fontSize: 13,
                              outline: "none"
                            }}
                          />
                        </div>

                        {users.length > 0 && (
                          <div>
                            <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                              Manage Invited Users:
                            </label>
                            <div style={{
                              maxHeight: 100,
                              overflowY: "auto",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "8px 12px",
                              background: "var(--bg-raised)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 6
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

                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                          <button
                            onClick={() => setEditingMeetingId(null)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 8,
                              background: "transparent",
                              border: "1px solid var(--border)",
                              color: "var(--text-secondary)",
                              fontSize: 13,
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEditMeeting(m.id)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 8,
                              background: "var(--success)",
                              border: "none",
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Read Mode Row */
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: "var(--bg-raised)",
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: m.status === "ACTIVE" ? "var(--success)" : "var(--accent)"
                          }}>
                            <Calendar size={18} />
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 15 }}>{m.title}</span>
                              {m.status === "ACTIVE" && (
                                <span style={{
                                  background: "var(--success-soft)",
                                  border: "1px solid var(--success)",
                                  color: "var(--success)",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "2px 8px",
                                  borderRadius: 100
                                }}>
                                  Live Now
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, color: "var(--text-secondary)", fontSize: 12 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Clock size={12} />
                                {new Date(m.scheduledAt).toLocaleString()}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Users size={12} />
                                {m.participants ? m.participants.length : 0} invited
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          {isHostOfMeeting && (
                            <>
                              <button
                                onClick={() => startEdit(m)}
                                style={{
                                  padding: "8px",
                                  borderRadius: 8,
                                  background: "var(--bg-raised)",
                                  border: "1px solid var(--border)",
                                  color: "var(--text-secondary)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center"
                                }}
                                title="Edit meeting details"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleCancelMeeting(m.id)}
                                style={{
                                  padding: "8px",
                                  borderRadius: 8,
                                  background: "var(--danger-soft)",
                                  border: "1px solid var(--danger)",
                                  color: "var(--danger)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center"
                                }}
                                title="Cancel meeting"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => router.push(`/meeting/${m.id}`)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 8,
                              background: m.status === "ACTIVE" ? "var(--success)" : "var(--accent)",
                              border: "none",
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                              boxShadow: m.status === "ACTIVE" ? "0 4px 10px rgba(34, 197, 94, 0.2)" : "0 4px 10px var(--accent-glow)"
                            }}
                          >
                            Join Room →
                          </button>
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
