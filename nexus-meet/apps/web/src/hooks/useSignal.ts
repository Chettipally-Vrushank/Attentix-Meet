"use client";
import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useMeetingStore } from "@/lib/store";
import { PeerManager } from "@/lib/webrtc/peer";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "http://localhost:3001";

export function useSignal(meetingId: string | null) {
    const socketRef = useRef<Socket | null>(null);
    const peerRef = useRef<PeerManager | null>(null);

    const {
        token, userId,
        localStream,
        addParticipant, removeParticipant,
        setParticipantStream,
        setRoomAlert, setModerationAlert,
    } = useMeetingStore();

    const connect = useCallback(() => {
        if (!token || !meetingId || !localStream || !userId) return;

        const socket = io(SIGNAL_URL, {
            auth: { token },
            query: { meetingId },
            transports: ["websocket"],
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        peerRef.current = new PeerManager(
            socket,
            localStream,
            (remoteUserId, stream) => setParticipantStream(remoteUserId, stream),
            meetingId,
            userId,
        );

        // ── Socket events ─────────────────────────────────────────

        socket.on("connect_error", (err) => {
            console.error("Signal connect error:", err.message);
            // err.message = "NOT_IN_PARTICIPANT_LIST" | "AUTH_INVALID" etc.
        });

        socket.on("room:user-joined", async ({ userId: uid, name, isHost }) => {
            addParticipant({
                userId: uid, name, isHost,
                engagementScore: 75, flags: [], isMuted: false, videoOn: true
            });
            // New user joined — we initiate the WebRTC offer to them
            await peerRef.current?.createOffer(uid);
        });

        socket.on("room:user-left", ({ userId: uid }) => {
            removeParticipant(uid);
            peerRef.current?.removePeer(uid);
        });

        socket.on("room:user-kicked", ({ userId: uid, reason }) => {
            if (uid === userId) {
                // We were kicked
                setModerationAlert({ message: `You were removed: ${reason}` });
                socket.disconnect();
            } else {
                removeParticipant(uid);
                peerRef.current?.removePeer(uid);
            }
        });

        socket.on("room:alert", ({ alertType, message, userId: uid }) => {
            if (alertType === "low_engagement") setRoomAlert(true);
            setModerationAlert({ message, userId: uid });
            setTimeout(() => { setRoomAlert(false); setModerationAlert(null); }, 6000);
        });

        // WebRTC signaling relay
        socket.on("signal:offer", ({ targetUserId, sdp }) =>
            peerRef.current?.handleOffer(targetUserId, sdp));
        socket.on("signal:answer", ({ targetUserId, sdp }) =>
            peerRef.current?.handleAnswer(targetUserId, sdp));
        socket.on("signal:ice", ({ targetUserId, candidate }) =>
            peerRef.current?.handleIce(targetUserId, candidate));

        return socket;
    }, [token, meetingId, localStream, userId]);

    useEffect(() => {
        const socket = connect();
        return () => {
            socket?.disconnect();
            peerRef.current?.closeAll();
        };
    }, [connect]);

    const kickUser = useCallback((targetUserId: string) => {
        socketRef.current?.emit("mod:kick-user", { userId: targetUserId, meetingId });
    }, [meetingId]);

    return { kickUser };
}