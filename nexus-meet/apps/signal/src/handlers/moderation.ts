import { Server, Socket } from "socket.io";
import {
    ServerToClientEvents, ClientToServerEvents,
    InterServerEvents, SocketData,
} from "../types/socket-events";
import { roomManager } from "../rooms/RoomManager";
import { markParticipantKicked } from "../middleware/participant-guard";
import { prisma } from "../db/client";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerModerationHandlers(io: AppServer, socket: AppSocket) {
    const { userId, meetingId, isHost } = socket.data;

    // ── Host manually kicks a user ────────────────────────────
    socket.on("mod:kick-user", async ({ userId: targetId, reason }) => {
        if (!isHost) {
            socket.emit("error", { code: "FORBIDDEN", message: "Only the host can kick users" });
            return;
        }

        await kickUserFromRoom(io, meetingId, targetId, reason ?? "Removed by host");
    });
}

/**
 * Shared kick logic — called by host action OR auto-moderation (AI backend).
 */
export async function kickUserFromRoom(
    io: AppServer,
    meetingId: string,
    userId: string,
    reason: string
): Promise<boolean> {
    const target = roomManager.getParticipant(meetingId, userId);
    if (!target) return false;

    // 1. Notify the kicked user's client to disconnect
    io.to(target.socketId).emit("room:user-kicked", { userId, reason });

    // 2. Notify all others in the room
    io.to(meetingId).emit("room:user-left", { userId });

    // 3. Force-disconnect the socket
    const targetSocket = io.sockets.sockets.get(target.socketId);
    targetSocket?.disconnect(true);

    // 4. Update DB
    await markParticipantKicked(meetingId, userId, reason);
    roomManager.removeParticipant(meetingId, userId);

    console.log(`🚫 Kicked ${userId} from meeting ${meetingId} — reason: ${reason}`);
    return true;
}