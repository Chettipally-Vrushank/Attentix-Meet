"use client";
import { useState, useEffect } from "react";

const AI_URL = process.env.NEXT_PUBLIC_AI_URL_HTTP ?? "http://localhost:8000";

export interface TimelinePoint {
    bucket: string;
    user_id: string;
    avg_score: number;
}

export interface ParticipantStat {
    user_id: string;
    name: string;
    total_speaking_ms: number;
    final_engagement_score: number | null;
}

export interface ModerationRow {
    id: string;
    timestamp: string;
    offending_user_name: string;
    toxicity_score: number;
    toxicity_category: string;
    action: string;
    flagged_text: string;
}

export interface MeetingSummary {
    duration_ms: number;
    total_participants: number;
    avg_room_engagement: number;
    total_moderation_events: number;
    total_kicks: number;
    host_alert_count: number;
}

export function useAnalytics(meetingId: string) {
    const [summary, setSummary] = useState<MeetingSummary | null>(null);
    const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
    const [participants, setParticipants] = useState<ParticipantStat[]>([]);
    const [moderation, setModeration] = useState<ModerationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!meetingId) return;

        const base = `${AI_URL}/api/analytics/meeting/${meetingId}`;
        setLoading(true);

        Promise.all([
            fetch(`${base}/summary`).then(r => r.json()),
            fetch(`${base}/engagement-timeline`).then(r => r.json()),
            fetch(`${base}/speaking-time`).then(r => r.json()),
            fetch(`${base}/moderation-log`).then(r => r.json()),
        ])
            .then(([sum, time, parts, mod]) => {
                setSummary(sum);
                setTimeline(time);
                setParticipants(parts);
                setModeration(mod);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [meetingId]);

    return { summary, timeline, participants, moderation, loading, error };
}
