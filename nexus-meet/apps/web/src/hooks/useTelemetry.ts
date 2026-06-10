"use client";
import { useEffect, useRef } from "react";
import { useMeetingStore } from "@/lib/store";

const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? "ws://localhost:8000";
const INTERVAL_MS = 2500;

export function useTelemetry(active: boolean) {
    const { token, userId, meetingId, setMyScore } = useMeetingStore();
    const wsRef = useRef<WebSocket | null>(null);
    const typingRef = useRef(0);
    const mouseDeltaRef = useRef(0);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    useEffect(() => {
        if (!active || !token || !userId || !meetingId) return;

        // Track typing events
        const onKey = () => { typingRef.current++; };
        const onMove = (e: MouseEvent) => {
            const dx = e.clientX - lastMouseRef.current.x;
            const dy = e.clientY - lastMouseRef.current.y;
            mouseDeltaRef.current += Math.sqrt(dx * dx + dy * dy);
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("mousemove", onMove);

        console.log("🔌 [useTelemetry] Connecting to AI Telemetry WS...");
        // Open WebSocket to AI backend
        const ws = new WebSocket(
            `${AI_URL}/ws/telemetry/${meetingId}?token=${token}`
        );
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("🔌 [useTelemetry] Telemetry WS connected");
            // Send telemetry packet every INTERVAL_MS
            intervalRef.current = setInterval(() => {
                if (ws.readyState !== WebSocket.OPEN) return;

                const typingRate = (typingRef.current / (INTERVAL_MS / 1000)) * 60;
                const mouseScore = Math.min(1, mouseDeltaRef.current / 500);
                typingRef.current = 0;
                mouseDeltaRef.current = 0;

                const packet = {
                    meeting_id: meetingId,
                    user_id: userId,
                    session_token: token,
                    mode: "video_off",
                    timestamp_ms: Date.now(),
                    browser: {
                        is_tab_visible: !document.hidden,
                        is_window_focused: document.hasFocus(),
                        typing_events_per_min: typingRate,
                        mouse_movement_score: mouseScore,
                    },
                };
                ws.send(JSON.stringify(packet));
            }, INTERVAL_MS);
        };

        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.engagement_score !== undefined) {
                    setMyScore(data.engagement_score, data.flags ?? []);
                }
            } catch { }
        };

        ws.onerror = (e) => console.error("❌ [useTelemetry] Telemetry WS error:", e);

        ws.onclose = (event) => {
            console.log(`🔌 [useTelemetry] Telemetry WS closed. Code: ${event.code}, Reason: ${event.reason}`);
        };

        return () => {
            clearInterval(intervalRef.current);
            ws.close();
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("mousemove", onMove);
        };
    }, [active, token, userId, meetingId]);
}