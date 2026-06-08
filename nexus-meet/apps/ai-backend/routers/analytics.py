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
        result = await session.execute(
            text("SELECT * FROM meeting_analytics WHERE meeting_id = :mid"),
            {"mid": meeting_id}
        )
        row = result.mappings().fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Analytics not found")
        return dict(row)

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