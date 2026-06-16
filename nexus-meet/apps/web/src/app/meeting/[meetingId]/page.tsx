"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter }   from "next/navigation";
import { useMeetingStore }        from "@/lib/store";
import { useSignal }              from "@/hooks/useSignal";
import { useTelemetry }           from "@/hooks/useTelemetry";
import { useMediaPipe }           from "@/hooks/useMediaPipe";
import { useAudioStream }         from "@/hooks/useAudioStream";
import { VideoTile }              from "@/components/meeting/VideoTile";
import { ControlBar }             from "@/components/meeting/ControlBar";
import { ModerationAlert }        from "@/components/meeting/ModerationAlert";

export default function MeetingRoom() {
  const params   = useParams();
  const router   = useRouter();
  const meetingId = params.meetingId as string;

  const {
    userId, token, userName,
    participants, localStream, isHost,
    myScore, myFlags,
    setMeetingId, setLocalStream, setIsHost, addParticipant,
  } = useMeetingStore();

  const [muted,   setMuted]   = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Redirect to login if no auth
  useEffect(() => {
    if (!token || !userId) { router.push("/login"); return; }
    setMeetingId(meetingId);
  }, [token, userId]);

  // Get local media stream
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        // Add self to participant list
        if (userId && userName) {
          addParticipant({
            userId, name: userName, isHost,
            stream, engagementScore: 75, flags: [], isMuted: false, videoOn: true,
          });
        }
      })
      .catch(console.error);
  }, []);

  // Hooks — telemetry path switches based on video state
  const { kickUser } = useSignal(meetingId);
  useTelemetry(!videoOn);                         // browser telemetry when video OFF
  useMediaPipe(localVideoRef, videoOn);            // MediaPipe when video ON
  useAudioStream(localStream, true);               // always stream audio

  const handleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  }, [localStream]);

  const handleVideo = useCallback(() => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setVideoOn(v => !v);
  }, [localStream]);

  const handleLeave = () => {
    localStream?.getTracks().forEach(t => t.stop());
    router.push("/");
  };

  const allParticipants = Array.from(participants.values());

  // Compute grid columns
  const count = allParticipants.length;
  const cols  = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;

  return (
    <div style={{
      minHeight:  "100vh",
      background: "var(--bg-base)",
      display:    "flex", flexDirection: "column",
    }}>
      {/* Alert banner */}
      <ModerationAlert />

      {/* Header */}
      <div style={{
        padding:        "14px 24px",
        borderBottom:   "1px solid var(--border)",
        display:        "flex", alignItems: "center", justifyContent: "space-between",
        background:     "var(--bg-surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* Logo / Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--success)",
              boxShadow:  "0 0 8px var(--success)",
            }}/>
            <span style={{ fontWeight: 600, fontSize: 15 }}>NexusMeet</span>
            <span style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
              {meetingId ? meetingId.slice(0, 8) : ""}...
            </span>
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          {/* Navigation Links */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                if (confirm("Leave this meeting to go to Dashboard?")) {
                  handleLeave();
                  router.push("/meeting/create");
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 4,
                transition: "all 0.15s ease"
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                if (confirm("Leave this meeting to view Analytics?")) {
                  handleLeave();
                  router.push("/analytics");
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 4,
                transition: "all 0.15s ease"
              }}
            >
              Analytics
            </button>
            <button
              onClick={() => {
                if (confirm("Leave this meeting to view Profile?")) {
                  handleLeave();
                  router.push("/profile");
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 4,
                transition: "all 0.15s ease"
              }}
            >
              Profile
            </button>
          </div>
        </div>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {allParticipants.length} participant{allParticipants.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Video grid */}
      <div style={{
        flex:    1,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap:     12,
        padding: "16px 16px 100px",
        alignContent: "start",
      }}>
        {allParticipants.map(p => (
          <VideoTile
            key={p.userId}
            participant={p}
            isLocal={p.userId === userId}
            isHost={isHost}
            onKick={isHost ? kickUser : undefined}
          />
        ))}
      </div>

      {/* Hidden local video for MediaPipe */}
      <video
        ref={localVideoRef}
        autoPlay muted playsInline
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1 }}
      />

      {/* Control bar */}
      <ControlBar
        muted={muted} videoOn={videoOn}
        onMute={handleMute} onVideo={handleVideo}
        onLeave={handleLeave}
        myScore={myScore} myFlags={myFlags}
      />
    </div>
  );
}
