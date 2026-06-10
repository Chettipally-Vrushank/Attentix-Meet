"use client";
import { useEffect, useRef }    from "react";
import { Mic, MicOff, Crown }   from "lucide-react";
import { ScoreRing }            from "@/components/ui/ScoreRing";
import type { Participant }     from "@/lib/store";

interface Props {
  participant: Participant;
  isLocal?:   boolean;
  onKick?:    (userId: string) => void;
  isHost?:    boolean;
}

export function VideoTile({ participant, isLocal, onKick, isHost }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const scoreColor =
    participant.engagementScore >= 70 ? "#22c55e" :
    participant.engagementScore >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{
      position:     "relative",
      background:   "var(--bg-raised)",
      borderRadius: 12,
      overflow:     "hidden",
      aspectRatio:  "16/9",
      border:       `1px solid var(--border)`,
      boxShadow:    isLocal ? `0 0 0 2px var(--accent)` : "none",
    }}>
      {/* Video element */}
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay muted={isLocal} playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", background: "var(--bg-overlay)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--accent-soft)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, color: "var(--accent)",
            fontWeight: 600, fontFamily: "var(--font-sans)",
          }}>
            {participant.name[0]?.toUpperCase()}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position:   "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
        padding:    "20px 10px 8px",
        display:    "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {participant.isHost && <Crown size={12} color="var(--warn)" />}
          <span style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>
            {participant.name}{isLocal ? " (you)" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {participant.isMuted
            ? <MicOff size={12} color="var(--danger)" />
            : <Mic size={12}    color="var(--success)" />}
        </div>
      </div>

      {/* Engagement score ring */}
      <div style={{ position: "absolute", top: 8, right: 8 }}>
        <ScoreRing score={participant.engagementScore} size={40} />
      </div>

      {/* Flags badges */}
      {participant.flags.length > 0 && (
        <div style={{
          position: "absolute", top: 8, left: 8,
          display: "flex", flexDirection: "column", gap: 3,
        }}>
          {participant.flags.slice(0,2).map(f => (
            <span key={f} style={{
              fontSize: 9, padding: "2px 6px",
              background: "rgba(239,68,68,0.75)",
              borderRadius: 4, color: "#fff",
              fontFamily: "var(--font-mono)",
            }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Host kick button */}
      {isHost && !isLocal && onKick && (
        <button
          onClick={() => onKick(participant.userId)}
          style={{
            position: "absolute", top: 8, left: 8,
            background: "var(--danger)", border: "none",
            borderRadius: 6, padding: "3px 8px",
            fontSize: 11, color: "#fff", cursor: "pointer",
            display: "none",
          }}
          className="kick-btn"
        >
          Kick
        </button>
      )}
    </div>
  );
}
