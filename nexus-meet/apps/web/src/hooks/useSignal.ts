"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useMeetingStore } from "@/lib/store";
import { PeerManager } from "@/lib/webrtc/peer";

const SIGNAL_URL = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "http://localhost:3001";

export function useSignal(meetingId: string | null) {
    const socketRef = useRef<Socket | null>(null);
    const peerRef = useRef<PeerManager | null>(null);
    const router = useRouter();

    const {
        token, userId,
        localStream,
        addParticipant, removeParticipant,
        updateParticipant,
        setParticipantStream,
        setRoomAlert, setModerationAlert,
        myScore, myFlags,
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

        socket.on("room:participants", (existingParticipants: Array<{ userId: string; name: string; isHost: boolean }>) => {
            existingParticipants.forEach((p) => {
                addParticipant({
                    userId: p.userId,
                    name: p.name,
                    isHost: p.isHost,
                    engagementScore: 75,
                    flags: [],
                    isMuted: false,
                    videoOn: true,
                });
            });
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
                router.push("/?kicked=true&reason=" + encodeURIComponent(reason || "Kicked by moderator"));
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

        socket.on("room:score-update", ({ userId: uid, score, flags }) => {
            updateParticipant(uid, {
                engagementScore: score,
                flags,
            });
        });

        socket.on("room:meeting-ended", () => {
            localStream?.getTracks().forEach(t => t.stop());
            router.push(`/analytics/${meetingId}`);
        });

        // WebRTC signaling relay
        socket.on("signal:offer", ({ targetUserId, sdp }) =>
            peerRef.current?.handleOffer(targetUserId, sdp));
        socket.on("signal:answer", ({ targetUserId, sdp }) =>
            peerRef.current?.handleAnswer(targetUserId, sdp));
        socket.on("signal:ice", ({ targetUserId, candidate }) =>
            peerRef.current?.handleIce(targetUserId, candidate));

        return socket;
    }, [token, meetingId, localStream, userId, updateParticipant, router]);

    useEffect(() => {
        const socket = connect();
        return () => {
            socket?.disconnect();
            peerRef.current?.closeAll();
        };
    }, [connect]);

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.emit("meeting:score-update", {
                score: myScore,
                flags: myFlags,
            });
        }
    }, [myScore, myFlags]);

    const kickUser = useCallback((targetUserId: string) => {
        socketRef.current?.emit("mod:kick-user", { userId: targetUserId, meetingId });
    }, [meetingId]);

    const endMeeting = useCallback(async () => {
        if (!token || !meetingId) return false;
        try {
            const res = await fetch(`${SIGNAL_URL}/api/meetings/${meetingId}/end`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            return res.ok;
        } catch (err) {
            console.error("Failed to end meeting:", err);
            return false;
        }
    }, [token, meetingId]);

    return { kickUser, endMeeting };
}