"use client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Shield } from "lucide-react";

interface Props {
  muted:      boolean;
  videoOn:    boolean;
  onMute:     () => void;
  onVideo:    () => void;
  onLeave:    () => void;
  myScore:    number;
  myFlags:    string[];
}

export function ControlBar({ muted, videoOn, onMute, onVideo, onLeave, myScore, myFlags }: Props) {
  const scoreColor =
    myScore >= 70 ? "var(--success)" :
    myScore >= 45 ? "var(--warn)"    : "var(--danger)";

  return (
    <div style={{
      position:      "fixed", bottom: 28, left: "50%",
      transform:     "translateX(-50%)",
      display:       "flex", alignItems: "center", gap: 10,
      background:    "var(--bg-surface)",
      border:        "1px solid var(--border-bright)",
      borderRadius:  999,
      padding:       "10px 18px",
      backdropFilter:"blur(20px)",
      boxShadow:     "0 8px 32px rgba(0,0,0,0.4)",
      zIndex:        50,
    }}>
      {/* Engagement score pill */}
      <div style={{
        display:      "flex", alignItems: "center", gap: 6,
        background:   "var(--bg-raised)",
        borderRadius: 999, padding: "5px 12px",
        border:       `1px solid ${scoreColor}33`,
      }}>
        <Shield size={13} color={scoreColor} />
        <span style={{
          fontSize: 13, fontFamily: "var(--font-mono)",
          color: scoreColor, fontWeight: 600,
        }}>
          {Math.round(myScore)}
        </span>
        {myFlags.length > 0 && (
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            · {myFlags[0]}
          </span>
        )}
      </div>

      <div style={{ width: 1, height: 24, background: "var(--border)" }}/>

      {/* Mic toggle */}
      <Btn onClick={onMute} danger={muted} title={muted ? "Unmute" : "Mute"}>
        {muted ? <MicOff size={18}/> : <Mic size={18}/>}
      </Btn>

      {/* Video toggle */}
      <Btn onClick={onVideo} danger={!videoOn} title={videoOn ? "Stop video" : "Start video"}>
        {videoOn ? <Video size={18}/> : <VideoOff size={18}/>}
      </Btn>

      {/* Leave */}
      <Btn onClick={onLeave} danger title="Leave meeting" forceRed>
        <PhoneOff size={18}/>
      </Btn>
    </div>
  );
}

function Btn({ children, onClick, danger, title, forceRed }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width:        44, height: 44,
        borderRadius: "50%",
        border:       "none",
        background:   forceRed ? "var(--danger)" :
                      danger   ? "var(--danger-soft)" : "var(--bg-raised)",
        color:        danger || forceRed ? "var(--danger)" : "var(--text-primary)",
        cursor:       "pointer",
        display:      "flex", alignItems: "center", justifyContent: "center",
        transition:   "background 0.15s",
      }}
    >
      {children}
    </button>
  );
}
