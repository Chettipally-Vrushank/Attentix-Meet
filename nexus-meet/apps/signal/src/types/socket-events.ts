// All typed Socket.io events — shared contract between client and server

export interface ServerToClientEvents {
    // WebRTC signaling
    "signal:offer": (payload: SignalPayload) => void;
    "signal:answer": (payload: SignalPayload) => void;
    "signal:ice": (payload: IcePayload) => void;

    // Room lifecycle
    "room:user-joined": (payload: UserJoinedPayload) => void;
    "room:user-left": (payload: UserLeftPayload) => void;
    "room:user-kicked": (payload: UserKickedPayload) => void;
    "room:participants": (participants: UserJoinedPayload[]) => void;

    // Host alerts (only sent to host socket)
    "room:alert": (payload: RoomAlertPayload) => void;

    // Errors
    "error": (payload: ErrorPayload) => void;

    // Engagement/score updates
    "room:score-update": (payload: { userId: string; score: number; flags: string[] }) => void;
}

export interface ClientToServerEvents {
    // WebRTC signaling
    "signal:offer": (payload: SignalPayload) => void;
    "signal:answer": (payload: SignalPayload) => void;
    "signal:ice": (payload: IcePayload) => void;

    // Meeting actions
    "meeting:join": (payload: JoinPayload) => void;
    "meeting:leave": () => void;

    // Host-only moderation
    "mod:kick-user": (payload: KickPayload) => void;

    // Engagement/score updates
    "meeting:score-update": (payload: { score: number; flags: string[] }) => void;
}

export interface InterServerEvents { }

export interface SocketData {
    userId: string;
    meetingId: string;
    isHost: boolean;
}

// ── Payload shapes ────────────────────────────────────────────

export interface SignalPayload {
    targetUserId: string;
    sdp: RTCSessionDescriptionInit;
}

export interface IcePayload {
    targetUserId: string;
    candidate: RTCIceCandidateInit;
}

export interface JoinPayload {
    meetingId: string;
    token: string;  // JWT
}

export interface KickPayload {
    userId: string;
    meetingId: string;
    reason?: string;
}

export interface UserJoinedPayload {
    userId: string;
    name: string;
    isHost: boolean;
}

export interface UserLeftPayload {
    userId: string;
}

export interface UserKickedPayload {
    userId: string;
    reason?: string;
}

export interface RoomAlertPayload {
    alertType: "low_engagement" | "toxicity_kick";
    affectedPct?: number;
    message: string;
    userId?: string;
    timestampMs: number;
}

export interface ErrorPayload {
    code: string;
    message: string;
}