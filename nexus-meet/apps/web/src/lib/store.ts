import { create } from "zustand";

export interface Participant {
  userId:          string;
  name:            string;
  isHost:          boolean;
  stream?:         MediaStream;
  engagementScore: number;
  flags:           string[];
  isMuted:         boolean;
  videoOn:         boolean;
}

interface MeetingStore {
  // Auth
  token:    string | null;
  userId:   string | null;
  userName: string | null;
  setAuth:  (token: string, userId: string, name: string) => void;

  // Meeting
  meetingId:    string | null;
  participants: Map<string, Participant>;
  localStream:  MediaStream | null;
  isHost:       boolean;

  setMeetingId:       (id: string)                        => void;
  setLocalStream:     (s: MediaStream)                    => void;
  addParticipant:     (p: Participant)                    => void;
  removeParticipant:  (userId: string)                   => void;
  updateParticipant:  (userId: string, patch: Partial<Participant>) => void;
  setParticipantStream:(userId: string, stream: MediaStream) => void;
  setIsHost:          (v: boolean)                        => void;

  // Engagement
  myScore:   number;
  myFlags:   string[];
  roomAlert: boolean;
  setMyScore:(score: number, flags: string[]) => void;
  setRoomAlert:(v: boolean) => void;

  // Moderation
  moderationAlert: { message: string; userId?: string } | null;
  setModerationAlert: (a: { message: string; userId?: string } | null) => void;
}

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  token:    null,
  userId:   null,
  userName: null,
  setAuth: (token, userId, userName) => set({ token, userId, userName }),

  meetingId:    null,
  participants: new Map(),
  localStream:  null,
  isHost:       false,

  setMeetingId:   (meetingId)    => set({ meetingId }),
  setLocalStream: (localStream)  => set({ localStream }),
  setIsHost:      (isHost)       => set({ isHost }),

  addParticipant: (p) =>
    set((s) => {
      const m = new Map(s.participants);
      m.set(p.userId, p);
      return { participants: m };
    }),

  removeParticipant: (userId) =>
    set((s) => {
      const m = new Map(s.participants);
      m.delete(userId);
      return { participants: m };
    }),

  updateParticipant: (userId, patch) =>
    set((s) => {
      const m = new Map(s.participants);
      const existing = m.get(userId);
      if (existing) m.set(userId, { ...existing, ...patch });
      return { participants: m };
    }),

  setParticipantStream: (userId, stream) =>
    set((s) => {
      const m = new Map(s.participants);
      const existing = m.get(userId);
      if (existing) m.set(userId, { ...existing, stream });
      return { participants: m };
    }),

  myScore:   75,
  myFlags:   [],
  roomAlert: false,
  setMyScore:    (myScore, myFlags) => set((s) => {
    const nextState: any = { myScore, myFlags };
    if (s.userId) {
      const m = new Map(s.participants);
      const existing = m.get(s.userId);
      if (existing) {
        m.set(s.userId, { ...existing, engagementScore: myScore, flags: myFlags });
        nextState.participants = m;
      }
    }
    return nextState;
  }),
  setRoomAlert:  (roomAlert)        => set({ roomAlert }),

  moderationAlert: null,
  setModerationAlert: (moderationAlert) => set({ moderationAlert }),
}));
