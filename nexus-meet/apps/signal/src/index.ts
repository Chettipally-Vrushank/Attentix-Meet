import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
    ServerToClientEvents, ClientToServerEvents,
    InterServerEvents, SocketData,
} from "./types/socket-events";
import { verifyToken } from "./middleware/auth";
import { isParticipantAllowed } from "./middleware/participant-guard";
import { registerMeetingHandlers } from "./handlers/meeting";
import { registerModerationHandlers } from "./handlers/moderation";
import { createInternalRouter } from "./handlers/internal";
import { prisma } from "./db/client";

const PORT = process.env.SIGNAL_PORT ?? 3001;

const app = express();
const server = createServer(app);

app.use(express.json());

// ── Socket.io setup ───────────────────────────────────────────

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>(server, {
    cors: {
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"],
});

// ── Socket.io auth middleware (runs before every connection) ──

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
        return next(new Error("AUTH_MISSING"));
    }

    // 1. Verify JWT
    let claims;
    try {
        claims = verifyToken(token);
    } catch {
        return next(new Error("AUTH_INVALID"));
    }

    const userId = claims.sub;
    const meetingId = socket.handshake.query.meetingId as string;

    if (!meetingId) {
        return next(new Error("MEETING_ID_MISSING"));
    }

    // 2. Zero-Link participant guard — DB check
    const allowed = await isParticipantAllowed(meetingId, userId);
    if (!allowed) {
        console.warn(`🚫 Blocked ${userId} — not in participant_list for ${meetingId}`);
        return next(new Error("NOT_IN_PARTICIPANT_LIST"));
    }

    // 3. Check meeting is SCHEDULED or ACTIVE
    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        select: { status: true, hostId: true },
    });

    if (!meeting || meeting.status === "ENDED" || meeting.status === "CANCELLED") {
        return next(new Error("MEETING_NOT_ACTIVE"));
    }

    // Attach to socket for use in handlers
    socket.data.userId = userId;
    socket.data.meetingId = meetingId;
    socket.data.isHost = meeting.hostId === userId;

    next();
});

// ── Register event handlers per connection ────────────────────

io.on("connection", (socket) => {
    console.log(
        `🔌 Connected: user=${socket.data.userId} meeting=${socket.data.meetingId} host=${socket.data.isHost}`
    );

    registerMeetingHandlers(io, socket);
    registerModerationHandlers(io, socket);

    socket.on("error", (err) => {
        console.error(`Socket error for ${socket.data.userId}:`, err);
    });
});

// ── Internal REST API (called by AI backend) ─────────────────

app.use("/internal", createInternalRouter(io));

// ── REST: Auth endpoints ──────────────────────────────────────

// Login — returns JWT
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    // In production: hash comparison. This is a dev stub.
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.passwordHash !== password) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

    const { signToken } = await import("./middleware/auth");
    const token = signToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// Create meeting + invite participants (host only)
app.post("/api/meetings", async (req, res) => {
    const { title, scheduledAt, participantIds, token } = req.body;

    const { verifyToken } = await import("./middleware/auth");
    let claims;
    try { claims = verifyToken(token); }
    catch { res.status(401).json({ error: "Invalid token" }); return; }

    const meeting = await prisma.meeting.create({
        data: {
            title,
            hostId: claims.sub,
            scheduledAt: new Date(scheduledAt),
            participants: {
                create: [
                    // Host is always in the list
                    { userId: claims.sub },
                    // Invited participants
                    ...(participantIds as string[])
                        .filter((id) => id !== claims.sub)
                        .map((userId: string) => ({ userId })),
                ],
            },
        },
        include: { participants: true },
    });

    res.json({ meeting });
});

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

// ── Start ─────────────────────────────────────────────────────

server.listen(PORT, () => {
    console.log(`🚀 Signal server running on http://localhost:${PORT}`);
});