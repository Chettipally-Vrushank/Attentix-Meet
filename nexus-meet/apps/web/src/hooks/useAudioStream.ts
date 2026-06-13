"use client";
import { useEffect, useRef } from "react";
import { useMeetingStore } from "@/lib/store";

const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? "ws://localhost:8000";
const SAMPLE_RATE = 16000;
const CHUNK_MS = 3000;

export function useAudioStream(stream: MediaStream | null, active: boolean) {
    const { token, userId, meetingId } = useMeetingStore();
    const wsRef = useRef<WebSocket | null>(null);
    const ctxRef = useRef<AudioContext | null>(null);
    const nodeRef = useRef<ScriptProcessorNode | null>(null);

    useEffect(() => {
        if (!active || !stream || !token || !userId || !meetingId) return;

        let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
        let ws: WebSocket | null = null;
        let isUnmounted = false;

        const connect = () => {
            if (isUnmounted || wsRef.current) return;

            console.log("🔌 [useAudioStream] Connecting to AI Audio WS...");
            ws = new WebSocket(
                `${AI_URL}/ws/audio/${meetingId}?token=${token}&user_id=${userId}`
            );
            wsRef.current = ws;

            ws.onopen = async () => {
                console.log("🔌 [useAudioStream] Audio WS connected");
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        meeting_id: meetingId,
                        user_id: userId,
                        session_token: token,
                        sample_rate: SAMPLE_RATE,
                        channels: 1,
                        chunk_ms: CHUNK_MS,
                    }));
                }
            };

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.action === "user_kicked") {
                        console.warn("Toxicity kick triggered for:", data);
                    }
                } catch { }
            };

            ws.onerror = (err) => {
                console.error("❌ [useAudioStream] Audio WS error:", err);
            };

            ws.onclose = (event) => {
                console.log(`🔌 [useAudioStream] Audio WS closed. Code: ${event.code}, Reason: ${event.reason}`);
                wsRef.current = null;
                ws = null;
                if (!isUnmounted) {
                    console.log("🔌 [useAudioStream] Retrying connection in 3s...");
                    reconnectTimeout = setTimeout(connect, 3000);
                }
            };
        };

        connect();

        // AudioContext → downsample to 16kHz mono → send PCM
        const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        // 4096 buffer = ~256ms at 16kHz
        const node = ctx.createScriptProcessor(4096, 1, 1);
        nodeRef.current = node;

        node.onaudioprocess = (e) => {
            const currentWs = wsRef.current;
            if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;
            const float32 = e.inputBuffer.getChannelData(0);
            // Convert float32 → int16 PCM
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
                int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
            }
            currentWs.send(int16.buffer);
        };

        src.connect(node);
        node.connect(ctx.destination);

        return () => {
            isUnmounted = true;
            clearTimeout(reconnectTimeout);
            nodeRef.current?.disconnect();
            ctxRef.current?.close();
            if (ws) {
                ws.close();
            }
            wsRef.current = null;
            ws = null;
        };
    }, [active, stream, token, userId, meetingId]);
}