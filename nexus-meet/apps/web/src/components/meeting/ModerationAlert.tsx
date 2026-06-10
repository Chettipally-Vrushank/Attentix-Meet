"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, X }   from "lucide-react";
import { useMeetingStore }     from "@/lib/store";

export function ModerationAlert() {
  const { moderationAlert, roomAlert, setModerationAlert } = useMeetingStore();

  if (!moderationAlert && !roomAlert) return null;

  const isRoomAlert = roomAlert && !moderationAlert;

  return (
    <div style={{
      position:      "fixed", top: 24, left: "50%",
      transform:     "translateX(-50%)",
      background:    isRoomAlert ? "var(--warn)" : "var(--danger)",
      color:         "#000",
      borderRadius:  10,
      padding:       "12px 20px",
      display:       "flex", alignItems: "center", gap: 10,
      boxShadow:     "0 4px 24px rgba(0,0,0,0.4)",
      zIndex:        100,
      maxWidth:      480,
      fontWeight:    600, fontSize: 14,
      animation:     "slideDown 0.25s ease",
    }}>
      <AlertTriangle size={16} />
      <span style={{ flex: 1 }}>
        {moderationAlert?.message ?? "Room engagement is low — consider a break!"}
      </span>
      <button
        onClick={() => setModerationAlert(null)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#000" }}
      >
        <X size={14}/>
      </button>
    </div>
  );
}
