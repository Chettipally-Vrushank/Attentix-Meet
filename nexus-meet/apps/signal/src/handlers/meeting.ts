import {
    Server,
    Socket,
} from "socket.io";
import {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData,
} from "../types/socket-events";
import { roomManager } from "../rooms/RoomManager";
import { prisma } from "../db/client";
import {
    markParticipantConnected,
    markParticipantDisconnected,
} from "../middleware/participant-guard";

type AppServer = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;
type AppSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

export function registerMeetingHandlers(io: AppServer, socket: AppSocket) {
    const { userId, meetingId, isHost } = socket.data;

    // ── User joins the Socket.io room ─────────────────────────
    socket.join(meetingId);

    // Fetch user info for broadcast
    prisma.user
        .findUnique({ where: { id: userId }, select: { name: true } })
        .then(async (user) => {
            if (!user) return;

            // Fetch meeting to know host
            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
                select: { hostId: true },
            });
            if (!meeting) return;

            roomManager.ensureRoom(meetingId, meeting.hostId);
            roomManager.addParticipant(meetingId, {
                userId,
                name: user.name,
                socketId: socket.id,
                isHost,
                joinedAt: new Date(),
            });

            await markParticipantConnected(meetingId, userId);

            // Notify all OTHER participants in the room
            socket.to(meetingId).emit("room:user-joined", {
                userId,
                name: user.name,
                isHost,
            });

            console.log(`✅ ${user.name} (${userId}) joined meeting ${meetingId}`);
        });

    // ── WebRTC signaling (relay only — server never inspects SDP) ──

    socket.on("signal:offer", ({ targetUserId, sdp }) => {
        const target = roomManager.getParticipant(meetingId, targetUserId);
        if (target) {
            io.to(target.socketId).emit("signal:offer", {
                targetUserId: userId,
                sdp,
            });
        }
    });

    socket.on("signal:answer", ({ targetUserId, sdp }) => {
        const target = roomManager.getParticipant(meetingId, targetUserId);
        if (target) {
            io.to(target.socketId).emit("signal:answer", {
                targetUserId: userId,
                sdp,
            });
        }
    });

    socket.on("signal:ice", ({ targetUserId, candidate }) => {
        const target = roomManager.getParticipant(meetingId, targetUserId);
        if (target) {
            io.to(target.socketId).emit("signal:ice", {
                targetUserId: userId,
                candidate,
            });
        }
    });

    // ── Clean disconnect ──────────────────────────────────────

    socket.on("disconnect", async () => {
        roomManager.removeParticipant(meetingId, userId);
        await markParticipantDisconnected(meetingId, userId);

        socket.to(meetingId).emit("room:user-left", { userId });
        console.log(`👋 ${userId} left meeting ${meetingId}`);
    });
}