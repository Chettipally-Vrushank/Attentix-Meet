"use client";
import { useEffect, useRef } from "react";
import { useMeetingStore } from "@/lib/store";

const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? "ws://localhost:8000";
const INTERVAL_MS = 2000;

// MediaPipe FaceMesh landmark indices
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const MOUTH = [61, 291, 13, 14];
const NOSE_TIP = 1;
const CHIN = 152;
const L_EAR_PT = 234;
const R_EAR_PT = 454;

function dist(a: any, b: any) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function ear(pts: any[], idxs: number[]) {
    const [p1, p2, p3, p4, p5, p6] = idxs.map(i => pts[i]);
    return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
}

function headAngles(pts: any[]) {
    const nose = pts[NOSE_TIP];
    const chin = pts[CHIN];
    const lEar = pts[L_EAR_PT];
    const rEar = pts[R_EAR_PT];

    const lDist = dist(nose, lEar);
    const rDist = dist(nose, rEar);
    const yaw = ((lDist - rDist) / (lDist + rDist)) * 90;
    const pitch = (nose.y - 0.4) * -90;
    const roll = Math.atan2(rEar.y - lEar.y, rEar.x - lEar.x) * (180 / Math.PI);

    return { yaw, pitch, roll };
}

function mar(pts: any[]) {
    const [p1, p2, p3, p4] = MOUTH.map(i => pts[i]);
    return dist(p3, p4) / dist(p1, p2);
}

// Global FaceMesh cache to prevent Emscripten Module re-initialization crashes (Module.arguments errors)
let globalFaceMesh: any = null;
let globalFaceMeshLoading: Promise<any> | null = null;

async function getFaceMeshInstance(FaceMeshClass: any) {
    if (globalFaceMesh) return globalFaceMesh;
    if (globalFaceMeshLoading) return globalFaceMeshLoading;

    globalFaceMeshLoading = (async () => {
        const instance = new FaceMeshClass({
            locateFile: (f: string) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
        });
        instance.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
        globalFaceMesh = instance;
        return instance;
    })();

    return globalFaceMeshLoading;
}

export function useMediaPipe(videoRef: React.RefObject<HTMLVideoElement | null>, active: boolean) {
    const { token, userId, meetingId, setMyScore } = useMeetingStore();
    const wsRef = useRef<WebSocket | null>(null);
    const rafRef = useRef<number | undefined>(undefined);
    const lastSendRef = useRef(0);
    const cameraRef = useRef<any>(null);
    const typingRef = useRef(0);
    const mouseDeltaRef = useRef(0);
    const lastMouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!active || !token || !userId || !meetingId || !videoRef.current) return;

        let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
        let ws: WebSocket | null = null;
        let isUnmounted = false;

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

        const loadMediaPipe = async () => {
            const { FaceMesh } = await import("@mediapipe/face_mesh");
            const { Camera } = await import("@mediapipe/camera_utils");

            const faceMesh = await getFaceMeshInstance(FaceMesh);
            if (isUnmounted) return;

            const connect = () => {
                if (isUnmounted || wsRef.current) return;

                console.log("🔌 [useMediaPipe] Connecting to AI Telemetry WS...");
                ws = new WebSocket(
                    `${AI_URL}/ws/telemetry/${meetingId}?token=${token}`
                );
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log("🔌 [useMediaPipe] Telemetry WS connected");
                    // Send initial packet to establish connection states
                    sendTelemetryPacket(null);
                };

                ws.onerror = (err) => {
                    console.error("❌ [useMediaPipe] Telemetry WS error:", err);
                };

                ws.onclose = (event) => {
                    console.log(`🔌 [useMediaPipe] Telemetry WS closed. Code: ${event.code}, Reason: ${event.reason}`);
                    wsRef.current = null;
                    ws = null;
                    if (!isUnmounted) {
                        console.log("🔌 [useMediaPipe] Retrying connection in 3s...");
                        reconnectTimeout = setTimeout(connect, 3000);
                    }
                };

                ws.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        if (data.engagement_score !== undefined) {
                            setMyScore(data.engagement_score, data.flags ?? []);
                        }
                    } catch { }
                };
            };

            const sendTelemetryPacket = (facialMetrics: any) => {
                if (!ws || ws.readyState !== WebSocket.OPEN) return;

                const typingRate = (typingRef.current / (INTERVAL_MS / 1000)) * 60;
                const mouseScore = Math.min(1, mouseDeltaRef.current / 500);
                typingRef.current = 0;
                mouseDeltaRef.current = 0;

                const packet = {
                    meeting_id: meetingId,
                    user_id: userId,
                    session_token: token,
                    mode: "video_on",
                    timestamp_ms: Date.now(),
                    browser: {
                        is_tab_visible: !document.hidden,
                        is_window_focused: document.hasFocus(),
                        typing_events_per_min: typingRate,
                        mouse_movement_score: mouseScore,
                    },
                    facial: facialMetrics,
                };
                ws.send(JSON.stringify(packet));
            };

            connect();

            faceMesh.onResults((results: any) => {
                if (isUnmounted) return;
                if (!results.multiFaceLandmarks?.[0]) {
                    // Send packet indicating no face detected
                    const now = Date.now();
                    if (now - lastSendRef.current >= INTERVAL_MS) {
                        lastSendRef.current = now;
                        sendTelemetryPacket(null);
                    }
                    return;
                }

                const pts = results.multiFaceLandmarks[0];
                const now = Date.now();
                if (now - lastSendRef.current < INTERVAL_MS) return;
                lastSendRef.current = now;

                const earL = ear(pts, LEFT_EYE);
                const earR = ear(pts, RIGHT_EYE);
                const { yaw, pitch, roll } = headAngles(pts);
                const mouthAR = mar(pts);

                const rawEar = (earL + earR) / 2;
                const clampedEar = Math.max(0.0, Math.min(0.49, rawEar));
                const clampedMouth = Math.max(0.0, Math.min(0.99, mouthAR));

                sendTelemetryPacket({
                    head_pitch_deg: Math.max(-89.9, Math.min(89.9, pitch)),
                    head_yaw_deg: Math.max(-89.9, Math.min(89.9, yaw)),
                    head_roll_deg: Math.max(-89.9, Math.min(89.9, roll)),
                    eye_aspect_ratio: clampedEar,
                    mouth_aspect_ratio: clampedMouth,
                    blink_rate_per_min: null,
                });
            });

            // Immediately send browser updates on visibility change
            const handleVisibilityChange = () => {
                sendTelemetryPacket(null);
            };
            document.addEventListener("visibilitychange", handleVisibilityChange);
            document.addEventListener("focus", handleVisibilityChange);
            document.addEventListener("blur", handleVisibilityChange);

            // Start camera loop
            if (videoRef.current) {
                const camera = new Camera(videoRef.current, {
                    onFrame: async () => {
                        if (videoRef.current && globalFaceMesh && !isUnmounted) {
                            try {
                                await globalFaceMesh.send({ image: videoRef.current });
                            } catch (err) {
                                console.error("FaceMesh send frame error:", err);
                            }
                        }
                    },
                    width: 640, height: 480,
                });
                cameraRef.current = camera;
                camera.start();
            }

            return () => {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
                document.removeEventListener("focus", handleVisibilityChange);
                document.removeEventListener("blur", handleVisibilityChange);
            };
        };

        let activeCleanup: (() => void) | undefined;
        loadMediaPipe().then(cleanup => {
            activeCleanup = cleanup;
        });

        return () => {
            isUnmounted = true;
            clearTimeout(reconnectTimeout);
            activeCleanup?.();
            
            // Close active WebSocket
            wsRef.current?.close();
            wsRef.current = null;
            ws = null;
            
            // Stop camera
            if (cameraRef.current) {
                try {
                    cameraRef.current.stop();
                } catch {}
                    cameraRef.current = null;
            }
            
            // Clean up global FaceMesh callback
            if (globalFaceMesh) {
                try {
                    globalFaceMesh.onResults(() => {});
                } catch {}
            }
            
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }

            window.removeEventListener("keydown", onKey);
            window.removeEventListener("mousemove", onMove);
        };
    }, [active, token, userId, meetingId]);
}