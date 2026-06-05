import { Router } from "express";
import { Server } from "socket.io";
import {
    ServerToClientEvents, ClientToServerEvents,
    InterServerEvents, SocketData,
} from "../types/socket-events";
import { roomManager } from "../rooms/RoomManager";
import { kickUserFromRoom } from "./moderation";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/**
 * Internal-only HTTP routes called by the AI backend.
 * Protected by a shared secret header — never exposed to clients.
 */
export function createInternalRouter(io: AppServer): Router {
    const router = Router();

    // Middleware: verify internal secret
    router.use((req, res, next) => {
        const secret = req.headers["x-internal-secret"];
        if (secret !== process.env.INTERNAL_SECRET) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        next();
    });

    // POST /internal/alert — AI backend fires this for low engagement
    router.post("/alert", (req, res) => {
        const { meeting_id, alert_type, affected_pct, message, affected_user_id } = req.body;

        const hostSocketId = roomManager.getHostSocketId(meeting_id);
        if (!hostSocketId) {
            res.status(404).json({ error: "Host not connected" });
            return;
        }

        io.to(hostSocketId).emit("room:alert", {
            alertType: alert_type,
            affectedPct: affected_pct,
            message,
            userId: affected_user_id,
            timestampMs: Date.now(),
        });

        console.log(`📢 Alert sent to host of meeting ${meeting_id}: ${message}`);
        res.json({ ok: true });
    });

    // POST /internal/kick — AI backend fires this for toxicity
    router.post("/kick", async (req, res) => {
        const { meeting_id, user_id, reason } = req.body;

        const kicked = await kickUserFromRoom(io, meeting_id, user_id, reason ?? "Auto-moderation: toxicity detected");

        // Also alert the host
        const hostSocketId = roomManager.getHostSocketId(meeting_id);
        if (hostSocketId) {
            io.to(hostSocketId).emit("room:alert", {
                alertType: "toxicity_kick",
                message: `User was automatically removed for toxic language`,
                userId: user_id,
                timestampMs: Date.now(),
            });
        }

        res.json({ ok: true, kicked });
    });

    return router;
}