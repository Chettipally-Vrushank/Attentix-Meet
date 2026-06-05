import { Socket } from "socket.io";

interface ParticipantInfo {
    userId: string;
    name: string;
    socketId: string;
    isHost: boolean;
    joinedAt: Date;
}

interface Room {
    meetingId: string;
    hostUserId: string;
    participants: Map<string, ParticipantInfo>; // userId → info
}

class RoomManager {
    private rooms: Map<string, Room> = new Map(); // meetingId → Room

    // ── Room lifecycle ────────────────────────────────────────

    ensureRoom(meetingId: string, hostUserId: string): Room {
        if (!this.rooms.has(meetingId)) {
            this.rooms.set(meetingId, {
                meetingId,
                hostUserId,
                participants: new Map(),
            });
        }
        return this.rooms.get(meetingId)!;
    }

    addParticipant(
        meetingId: string,
        info: ParticipantInfo
    ): void {
        const room = this.rooms.get(meetingId);
        if (room) room.participants.set(info.userId, info);
    }

    removeParticipant(meetingId: string, userId: string): void {
        const room = this.rooms.get(meetingId);
        if (!room) return;
        room.participants.delete(userId);
        if (room.participants.size === 0) {
            this.rooms.delete(meetingId); // GC empty rooms
        }
    }

    // ── Lookups ───────────────────────────────────────────────

    getRoom(meetingId: string): Room | undefined {
        return this.rooms.get(meetingId);
    }

    getParticipant(meetingId: string, userId: string): ParticipantInfo | undefined {
        return this.rooms.get(meetingId)?.participants.get(userId);
    }

    getHostSocketId(meetingId: string): string | undefined {
        const room = this.rooms.get(meetingId);
        if (!room) return undefined;
        return room.participants.get(room.hostUserId)?.socketId;
    }

    getParticipantList(meetingId: string): ParticipantInfo[] {
        return Array.from(
            this.rooms.get(meetingId)?.participants.values() ?? []
        );
    }

    findMeetingBySocketId(socketId: string): { meetingId: string; userId: string } | null {
        for (const [meetingId, room] of this.rooms) {
            for (const [userId, p] of room.participants) {
                if (p.socketId === socketId) return { meetingId, userId };
            }
        }
        return null;
    }

    isHost(meetingId: string, userId: string): boolean {
        return this.rooms.get(meetingId)?.hostUserId === userId;
    }
}

// Singleton
export const roomManager = new RoomManager();