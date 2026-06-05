import { prisma } from "../db/client";

/**
 * Zero-Link Security Check
 *
 * Queries the meeting_participants table to verify the userId is
 * explicitly listed as INVITED or CONNECTED for this meetingId.
 *
 * If this returns false, the WebSocket connection is REJECTED immediately —
 * no URL trick, no token sharing, no bypass is possible.
 */
export async function isParticipantAllowed(
    meetingId: string,
    userId: string
): Promise<boolean> {
    const record = await prisma.meetingParticipant.findUnique({
        where: {
            meetingId_userId: { meetingId, userId },
        },
        select: { status: true },
    });

    if (!record) return false;

    // Only INVITED or CONNECTED users may join
    // KICKED users are permanently blocked for this meeting
    return record.status === "INVITED" || record.status === "CONNECTED";
}

/**
 * Mark a participant as CONNECTED when they successfully join.
 */
export async function markParticipantConnected(
    meetingId: string,
    userId: string
): Promise<void> {
    await prisma.meetingParticipant.update({
        where: { meetingId_userId: { meetingId, userId } },
        data: { status: "CONNECTED", joinedAt: new Date() },
    });
}

/**
 * Mark a participant as KICKED — blocks future reconnection attempts.
 */
export async function markParticipantKicked(
    meetingId: string,
    userId: string,
    reason?: string
): Promise<void> {
    await prisma.meetingParticipant.update({
        where: { meetingId_userId: { meetingId, userId } },
        data: {
            status: "KICKED",
            kickedAt: new Date(),
            kickReason: reason ?? "Auto-moderation",
        },
    });
}

/**
 * Mark a participant as DISCONNECTED on clean leave.
 */
export async function markParticipantDisconnected(
    meetingId: string,
    userId: string
): Promise<void> {
    await prisma.meetingParticipant.update({
        where: { meetingId_userId: { meetingId, userId } },
        data: { status: "DISCONNECTED", leftAt: new Date() },
    });
}