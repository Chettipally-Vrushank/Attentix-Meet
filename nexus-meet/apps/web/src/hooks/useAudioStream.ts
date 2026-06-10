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

        const ws = new WebSocket(
            `${AI_URL}/ws/audio/${meetingId}?token=${token}`
        );
        wsRef.current = ws;

        ws.onopen = () => {
            // Send metadata header first
            ws.send(JSON.stringify({
                meeting_id: meetingId,
                user_id: userId,
                session_token: token,
                sample_rate: SAMPLE_RATE,
                channels: 1,
                chunk_ms: CHUNK_MS,
            }));
        };

        ws.onopen = async () => {
            ws.send(JSON.stringify({
                meeting_id: meetingId, user_id: userId,
                session_token: token, sample_rate: SAMPLE_RATE,
                channels: 1, chunk_ms: CHUNK_MS,
            }));

            // AudioContext → downsample to 16kHz mono → send PCM
            const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
            ctxRef.current = ctx;
            const src = ctx.createMediaStreamSource(stream);
            // 4096 buffer = ~256ms at 16kHz
            const node = ctx.createScriptProcessor(4096, 1, 1);
            nodeRef.current = node;

            node.onaudioprocess = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const float32 = e.inputBuffer.getChannelData(0);
                // Convert float32 → int16 PCM
                const int16 = new Int16Array(float32.length);
                for (let i = 0; i < float32.length; i++) {
                    int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
                }
                ws.send(int16.buffer);
            };

            src.connect(node);
            node.connect(ctx.destination);
        };

        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.action === "user_kicked") {
                    // Signal server will handle the actual kick — this is just for logging
                    console.warn("Toxicity kick triggered for:", data);
                }
            } catch { }
        };

        return () => {
            nodeRef.current?.disconnect();
            ctxRef.current?.close();
            ws.close();
        };
    }, [active, stream, token, userId, meetingId]);
}