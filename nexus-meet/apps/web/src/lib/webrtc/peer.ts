import { Socket } from "socket.io-client";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

type OnTrackCallback = (userId: string, stream: MediaStream) => void;

export class PeerManager {
    private peers = new Map<string, RTCPeerConnection>();
    private socket: ReturnType<typeof import("socket.io-client").io>;
    private localStream: MediaStream;
    private onTrack: OnTrackCallback;
    private meetingId: string;
    private userId: string;

    constructor(
        socket: any,
        localStream: MediaStream,
        onTrack: OnTrackCallback,
        meetingId: string,
        userId: string,
    ) {
        this.socket = socket;
        this.localStream = localStream;
        this.onTrack = onTrack;
        this.meetingId = meetingId;
        this.userId = userId;
    }

    /** Called when a new user joins — we initiate the offer */
    async createOffer(targetUserId: string) {
        try {
            const pc = this._createPeer(targetUserId);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            this.socket.emit("signal:offer", {
                targetUserId,
                sdp: pc.localDescription,
            });
        } catch (err) {
            console.error(`Error creating offer to ${targetUserId}:`, err);
        }
    }

    /** Called when we receive an offer from another peer */
    async handleOffer(fromUserId: string, sdp: RTCSessionDescriptionInit) {
        try {
            const pc = this._createPeer(fromUserId);

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            this.socket.emit("signal:answer", {
                targetUserId: fromUserId,
                sdp: pc.localDescription,
            });
        } catch (err) {
            console.error(`Error handling offer from ${fromUserId}:`, err);
        }
    }

    async handleAnswer(fromUserId: string, sdp: RTCSessionDescriptionInit) {
        try {
            const pc = this.peers.get(fromUserId);
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
            console.error(`Error handling answer from ${fromUserId}:`, err);
        }
    }

    async handleIce(fromUserId: string, candidate: RTCIceCandidateInit) {
        try {
            const pc = this.peers.get(fromUserId);
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error(`Error handling ICE candidate from ${fromUserId}:`, err);
        }
    }

    removePeer(userId: string) {
        const pc = this.peers.get(userId);
        if (pc) { pc.close(); this.peers.delete(userId); }
    }

    closeAll() {
        this.peers.forEach((pc) => pc.close());
        this.peers.clear();
    }

    private _createPeer(targetUserId: string): RTCPeerConnection {
        if (this.peers.has(targetUserId)) return this.peers.get(targetUserId)!;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        this.peers.set(targetUserId, pc);

        // Add all local tracks
        this.localStream.getTracks().forEach((track) =>
            pc.addTrack(track, this.localStream)
        );

        // ICE candidates → signal server
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                this.socket.emit("signal:ice", { targetUserId, candidate });
            }
        };

        // Remote stream arrives
        pc.ontrack = ({ streams }) => {
            if (streams[0]) this.onTrack(targetUserId, streams[0]);
        };

        pc.onconnectionstatechange = () => {
            if (
                pc.connectionState === "failed" ||
                pc.connectionState === "closed"
            ) {
                this.peers.delete(targetUserId);
            }
        };

        return pc;
    }
}