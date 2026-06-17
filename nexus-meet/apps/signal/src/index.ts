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

// CORS Middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
    } else {
        next();
    }
});

// ── Socket.io setup ───────────────────────────────────────────

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>(server, {
    cors: {
        origin: (requestOrigin, callback) => {
            callback(null, requestOrigin || true);
        },
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

// Register — creates a new user and returns JWT
app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        res.status(400).json({ error: "Name, email, and password are required" });
        return;
    }
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(400).json({ error: "Email is already registered" });
            return;
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: password, // dev stub raw password
                role: "USER"
            }
        });

        const { signToken } = await import("./middleware/auth");
        const token = signToken({
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error("Registration failed:", err);
        res.status(500).json({ error: "Internal server error" });
    }
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

// Get meetings for the authenticated user
app.get("/api/meetings", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    let claims;
    try {
        const { verifyToken } = await import("./middleware/auth");
        claims = verifyToken(token);
    } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    const userId = claims.sub;
    const userMeetings = await prisma.meeting.findMany({
        where: {
            participants: {
                some: { userId },
            },
        },
        include: {
            participants: true,
        },
        orderBy: { scheduledAt: "desc" },
    });

    res.json({ meetings: userMeetings });
});

// Get details for a specific meeting
app.get("/api/meetings/:meetingId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    let claims;
    try {
        const { verifyToken } = await import("./middleware/auth");
        claims = verifyToken(token);
    } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    const { meetingId } = req.params;

    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                participants: true,
            },
        });

        if (!meeting) {
            res.status(404).json({ error: "Meeting not found" });
            return;
        }

        res.json({ meeting });
    } catch (err) {
        console.error("Failed to fetch meeting details:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get all users
app.get("/api/users", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    let claims;
    try {
        const { verifyToken } = await import("./middleware/auth");
        claims = verifyToken(token);
    } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true }
        });
        res.json({ users });
    } catch (err) {
        console.error("Failed to fetch users:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update user profile
app.put("/api/users/profile", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    let claims;
    try {
        const { verifyToken } = await import("./middleware/auth");
        claims = verifyToken(token);
    } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    const { name, email } = req.body;
    if (!name || !email) {
        res.status(400).json({ error: "Name and email are required" });
        return;
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: claims.sub },
            data: { name, email },
        });
        res.json({ user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email } });
    } catch (err) {
        console.error("Failed to update profile:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update user password
app.put("/api/users/password", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    let claims;
    try {
        const { verifyToken } = await import("./middleware/auth");
        claims = verifyToken(token);
    } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current and new passwords are required" });
        return;
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: claims.sub } });
        if (!user || user.passwordHash !== currentPassword) {
            res.status(401).json({ error: "Invalid current password" });
            return;
        }

        await prisma.user.update({
            where: { id: claims.sub },
            data: { passwordHash: newPassword },
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Failed to update password:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update meeting
app.put("/api/meetings/:meetingId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    let claims;
    try {
        const { verifyToken } = await import("./middleware/auth");
        claims = verifyToken(token);
    } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    const { meetingId } = req.params;
    const { title, scheduledAt } = req.body;

    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
        });

        if (!meeting) {
            res.status(404).json({ error: "Meeting not found" });
            return;
        }

        if (meeting.hostId !== claims.sub) {
            res.status(403).json({ error: "Forbidden: Only host can edit meeting" });
            return;
        }

        const updatedMeeting = await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                title: title ?? undefined,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            },
        });

        res.json({ meeting: updatedMeeting });
    } catch (err) {
        console.error("Failed to reschedule meeting:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Cancel meeting
app.delete("/api/meetings/:meetingId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    let claims;
    try {
        const { verifyToken } = await import("./middleware/auth");
        claims = verifyToken(token);
    } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    const { meetingId } = req.params;

    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
        });

        if (!meeting) {
            res.status(404).json({ error: "Meeting not found" });
            return;
        }

        if (meeting.hostId !== claims.sub) {
            res.status(403).json({ error: "Forbidden: Only host can cancel meeting" });
            return;
        }

        await prisma.meeting.update({
            where: { id: meetingId },
            data: { status: "CANCELLED" },
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Failed to cancel meeting:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update meeting participants
app.put("/api/meetings/:meetingId/participants", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    let claims;
    try {
        const { verifyToken } = await import("./middleware/auth");
        claims = verifyToken(token);
    } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    const { meetingId } = req.params;
    const { participantIds } = req.body;

    if (!Array.isArray(participantIds)) {
        res.status(400).json({ error: "participantIds must be an array" });
        return;
    }

    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
        });

        if (!meeting) {
            res.status(404).json({ error: "Meeting not found" });
            return;
        }

        if (meeting.hostId !== claims.sub) {
            res.status(403).json({ error: "Forbidden: Only host can manage participants" });
            return;
        }

        // Delete existing participant relationships (except host)
        await prisma.meetingParticipant.deleteMany({
            where: {
                meetingId,
                userId: { not: claims.sub }
            }
        });

        // Insert new participant relationships
        await prisma.meetingParticipant.createMany({
            data: participantIds
                .filter(id => id !== claims.sub)
                .map(userId => ({
                    meetingId,
                    userId,
                    status: "INVITED"
                })),
            skipDuplicates: true
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Failed to manage participants:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// End meeting (host only)
app.post("/api/meetings/:meetingId/end", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = authHeader.split(" ")[1];
    let claims;
    try {
        const { verifyToken } = await import("./middleware/auth");
        claims = verifyToken(token);
    } catch {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    const { meetingId } = req.params;
    const userId = claims.sub;

    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { participants: true }
        });

        if (!meeting) {
            res.status(404).json({ error: "Meeting not found" });
            return;
        }

        if (meeting.hostId !== userId) {
            res.status(403).json({ error: "Forbidden: Only host can end meeting" });
            return;
        }

        // Calculate analytics before updating status to ENDED
        // 1. Get engagement logs for this meeting
        const engagementLogs = await prisma.engagementLog.findMany({
            where: { meetingId }
        });

        // Calculate avg engagement score per participant
        const userLogsMap = new Map<string, number[]>();
        engagementLogs.forEach(log => {
            if (!userLogsMap.has(log.userId)) {
                userLogsMap.set(log.userId, []);
            }
            userLogsMap.get(log.userId)!.push(log.engagementScore);
        });

        // 2. Update status of participants (final engagement score & leftAt)
        const participants = meeting.participants;
        for (const p of participants) {
            const logs = userLogsMap.get(p.userId) || [];
            const avgScore = logs.length > 0 
                ? logs.reduce((sum, val) => sum + val, 0) / logs.length 
                : 75.0; // Default score if no logs

            await prisma.meetingParticipant.update({
                where: {
                    meetingId_userId: {
                        meetingId,
                        userId: p.userId
                    }
                },
                data: {
                    status: p.status === "CONNECTED" ? "DISCONNECTED" : p.status,
                    leftAt: p.leftAt || new Date(),
                    finalEngagementScore: avgScore
                }
            });
        }

        // 3. Compute meeting analytics stats
        const totalLogs = engagementLogs.length;
        const avgRoomEngagement = totalLogs > 0
            ? engagementLogs.reduce((sum, log) => sum + log.engagementScore, 0) / totalLogs
            : 75.0;

        const durationMs = Math.max(0, Date.now() - meeting.createdAt.getTime());

        // Count moderation events
        const toxicEventsCount = await prisma.moderationEvent.count({
            where: { meetingId }
        });

        // Count kicked participants
        const kickedCount = await prisma.meetingParticipant.count({
            where: { meetingId, status: "KICKED" }
        });

        // Create or update MeetingAnalytics
        await prisma.meetingAnalytics.upsert({
            where: { meetingId },
            create: {
                meetingId,
                avgEngagementScore: avgRoomEngagement,
                totalSpeakingTimeMs: durationMs,
                toxicPhrasesCount: toxicEventsCount,
                kickedParticipants: kickedCount,
                summaryText: `Meeting ended. Duration: ${Math.round(durationMs / 60000)}m. Average engagement: ${Math.round(avgRoomEngagement)}%.`
            },
            update: {
                avgEngagementScore: avgRoomEngagement,
                totalSpeakingTimeMs: durationMs,
                toxicPhrasesCount: toxicEventsCount,
                kickedParticipants: kickedCount,
                summaryText: `Meeting ended. Duration: ${Math.round(durationMs / 60000)}m. Average engagement: ${Math.round(avgRoomEngagement)}%.`
            }
        });

        // 4. Finally, update meeting status to ENDED
        await prisma.meeting.update({
            where: { id: meetingId },
            data: { status: "ENDED" }
        });

        // 5. Notify all sockets in this meeting room that the meeting has ended
        io.to(meetingId).emit("room:meeting-ended");

        res.json({ success: true });
    } catch (err) {
        console.error("Failed to end meeting:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

// ── Start ─────────────────────────────────────────────────────

server.listen(PORT, () => {
    console.log(`🚀 Signal server running on http://localhost:${PORT}`);
});