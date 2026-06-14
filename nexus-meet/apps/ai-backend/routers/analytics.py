"""
REST endpoints called by Next.js dashboard to fetch post-meeting analytics.
"""
from fastapi   import APIRouter, HTTPException
from sqlalchemy import text
from services.db.client import AsyncSessionLocal
import json

router = APIRouter()

@router.get("/meeting/{meeting_id}/summary")
async def get_meeting_summary(meeting_id: str):
    async with AsyncSessionLocal() as session:
        # 1. Verify meeting exists in DB
        meeting_res = await session.execute(
            text("SELECT id FROM meetings WHERE id = :mid"),
            {"mid": meeting_id}
        )
        if not meeting_res.fetchone():
            raise HTTPException(status_code=404, detail="Meeting not found")

        # 2. Query duration and avg engagement from engagement_logs
        log_metrics = await session.execute(
            text("""
                SELECT 
                    COALESCE(EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) * 1000, 0)::double precision AS duration_ms,
                    COALESCE(AVG(engagement_score), 0.0)::double precision AS avg_room_engagement
                FROM engagement_logs
                WHERE meeting_id = :mid
            """),
            {"mid": meeting_id}
        )
        log_row = log_metrics.mappings().fetchone()
        duration_ms = log_row["duration_ms"] if log_row else 0
        avg_room_engagement = log_row["avg_room_engagement"] if log_row else 0

        # 3. Query total participants
        part_metrics = await session.execute(
            text("SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = :mid"),
            {"mid": meeting_id}
        )
        total_participants = part_metrics.scalar() or 0

        # 4. Query total moderation events
        mod_metrics = await session.execute(
            text("SELECT COUNT(*) FROM moderation_events WHERE meeting_id = :mid"),
            {"mid": meeting_id}
        )
        total_moderation_events = mod_metrics.scalar() or 0

        # 5. Query total kicks
        kick_metrics = await session.execute(
            text("SELECT COUNT(*) FROM moderation_events WHERE meeting_id = :mid AND action = 'USER_KICKED'"),
            {"mid": meeting_id}
        )
        total_kicks = kick_metrics.scalar() or 0

        # 6. Query host alerts count (estimated by disengaged minute buckets)
        alert_metrics = await session.execute(
            text("""
                SELECT COUNT(*)::integer FROM (
                    SELECT date_trunc('minute', timestamp) AS bucket
                    FROM engagement_logs
                    WHERE meeting_id = :mid
                    GROUP BY bucket
                    HAVING AVG(engagement_score) < 45.0
                ) AS disengaged_buckets
            """),
            {"mid": meeting_id}
        )
        host_alert_count = alert_metrics.scalar() or 0

        # 7. Check if there is an explicit meeting_analytics row to merge
        analytics_res = await session.execute(
            text("SELECT * FROM meeting_analytics WHERE meeting_id = :mid"),
            {"mid": meeting_id}
        )
        analytics_row = analytics_res.mappings().fetchone()
        if analytics_row:
            if analytics_row["avg_engagement_score"] is not None:
                avg_room_engagement = analytics_row["avg_engagement_score"]
            if analytics_row["total_speaking_time_ms"] is not None:
                duration_ms = analytics_row["total_speaking_time_ms"]
            if analytics_row["toxic_phrases_count"] is not None:
                total_moderation_events = analytics_row["toxic_phrases_count"]
            if analytics_row["kicked_participants"] is not None:
                total_kicks = analytics_row["kicked_participants"]

        return {
            "duration_ms": int(duration_ms),
            "total_participants": int(total_participants),
            "avg_room_engagement": float(avg_room_engagement),
            "total_moderation_events": int(total_moderation_events),
            "total_kicks": int(total_kicks),
            "host_alert_count": int(host_alert_count)
        }

@router.get("/meeting/{meeting_id}/engagement-timeline")
async def get_engagement_timeline(meeting_id: str):
    """Per-second engagement scores for Recharts timeline chart."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT
                    date_trunc('minute', timestamp) AS bucket,
                    user_id,
                    AVG(engagement_score)::float    AS avg_score
                FROM engagement_logs
                WHERE meeting_id = :mid
                GROUP BY bucket, user_id
                ORDER BY bucket ASC
            """),
            {"mid": meeting_id}
        )
        rows = result.mappings().fetchall()
        return [dict(r) for r in rows]

@router.get("/meeting/{meeting_id}/moderation-log")
async def get_moderation_log(meeting_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT me.*, u.name AS offending_user_name
                FROM moderation_events me
                JOIN users u ON u.id = me.offending_user_id
                WHERE me.meeting_id = :mid
                ORDER BY me.timestamp ASC
            """),
            {"mid": meeting_id}
        )
        rows = result.mappings().fetchall()
        return [dict(r) for r in rows]

@router.get("/meeting/{meeting_id}/speaking-time")
async def get_speaking_time(meeting_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT mp.user_id, u.name,
                       mp.total_speaking_ms,
                       mp.final_engagement_score
                FROM meeting_participants mp
                JOIN users u ON u.id = mp.user_id
                WHERE mp.meeting_id = :mid
            """),
            {"mid": meeting_id}
        )
        rows = result.mappings().fetchall()
        return [dict(r) for r in rows]