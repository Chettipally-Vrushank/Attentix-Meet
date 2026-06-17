import uuid
from datetime import datetime
from sqlalchemy import text
from services.db.client import AsyncSessionLocal


async def verify_participant_in_meeting(meeting_id: str, user_id: str) -> bool:
    """
    Mirror of the Node.js participant guard.
    Returns True only if user is INVITED or CONNECTED in participant_list.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT status FROM meeting_participants
                WHERE meeting_id = :mid AND user_id = :uid
                LIMIT 1
            """),
            {"mid": meeting_id, "uid": user_id}
        )
        row = result.fetchone()
        if not row:
            return False
        return row[0] != "KICKED"


async def insert_engagement_log(
    meeting_id: str,
    user_id:    str,
    packet,           # TelemetryPacket
    score:      float,
) -> None:
    """Write one telemetry snapshot to engagement_logs."""
    b = packet.browser
    f = packet.facial

    async with AsyncSessionLocal() as session:
        await session.execute(
            text("""
                INSERT INTO engagement_logs
                  (id, meeting_id, user_id, timestamp,
                   is_tab_visible, is_window_focused,
                   typing_events_per_min, mouse_movement_score,
                   head_pitch_deg, head_yaw_deg, head_roll_deg,
                   eye_aspect_ratio, mouth_aspect_ratio, blink_rate_per_min,
                   engagement_score, video_was_on)
                VALUES
                  (:id, :mid, :uid, :ts,
                   :tab, :focus,
                   :typing, :mouse,
                   :pitch, :yaw, :roll,
                   :ear, :mar, :blink,
                   :score, :video_on)
            """),
            {
                "id":       str(uuid.uuid4()),
                "mid":      meeting_id,
                "uid":      user_id,
                "ts":       datetime.utcnow(),
                "tab":      b.is_tab_visible        if b else None,
                "focus":    b.is_window_focused      if b else None,
                "typing":   b.typing_events_per_min  if b else None,
                "mouse":    b.mouse_movement_score    if b else None,
                "pitch":    f.head_pitch_deg          if f else None,
                "yaw":      f.head_yaw_deg            if f else None,
                "roll":     f.head_roll_deg           if f else None,
                "ear":      f.eye_aspect_ratio         if f else None,
                "mar":      f.mouth_aspect_ratio       if f else None,
                "blink":    f.blink_rate_per_min       if f else None,
                "score":    score,
                "video_on": packet.mode == "video_on",
            }
        )
        await session.commit()


async def upsert_transcript_chunk(
    meeting_id:      str,
    user_id:         str,
    transcript:      str,
    toxicity_score:  float,
    category:        str | None,
    duration_ms:     int,
) -> str:
    """Insert a transcript chunk and return its id."""
    chunk_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("""
                INSERT INTO transcript_chunks
                  (id, meeting_id, speaker_id, timestamp, duration_ms,
                   transcript, was_analyzed, toxicity_score,
                   toxicity_category, flagged_for_review)
                VALUES
                  (:id, :mid, :uid, :ts, :dur,
                   :tx, TRUE, :score, :cat, TRUE)
            """),
            {
                "id":    chunk_id,
                "mid":   meeting_id,
                "uid":   user_id,
                "ts":    datetime.utcnow(),
                "dur":   duration_ms,
                "tx":    transcript,
                "score": toxicity_score,
                "cat":   category,
            }
        )
        await session.commit()
    return chunk_id


async def log_moderation_event(
    meeting_id:          str,
    offending_user_id:   str,
    toxicity_score:      float,
    category:            str | None,
    flagged_text:        str,
    transcript_chunk_id: str,
) -> str:
    """Write a moderation event row and return its id."""
    event_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("""
                INSERT INTO moderation_events
                  (id, meeting_id, timestamp, offending_user_id,
                   action, toxicity_score, toxicity_category,
                   transcript_chunk_id, flagged_text, kick_confirmed)
                VALUES
                  (:id, :mid, :ts, :uid,
                   'USER_KICKED', :score, :cat,
                   :chunk_id, :text, FALSE)
            """),
            {
                "id":       event_id,
                "mid":      meeting_id,
                "ts":       datetime.utcnow(),
                "uid":      offending_user_id,
                "score":    toxicity_score,
                "cat":      category,
                "chunk_id": transcript_chunk_id,
                "text":     flagged_text,
            }
        )
        await session.commit()
    return event_id


async def increment_speaking_time(meeting_id: str, user_id: str, duration_ms: int) -> None:
    """Increment the participant's total speaking time by duration_ms."""
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("""
                UPDATE meeting_participants
                SET total_speaking_ms = total_speaking_ms + :dur
                WHERE meeting_id = :mid AND user_id = :uid
            """),
            {"mid": meeting_id, "uid": user_id, "dur": duration_ms}
        )
        await session.commit()