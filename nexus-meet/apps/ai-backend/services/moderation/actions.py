import os
import logging
import httpx

logger = logging.getLogger("nexusmeet.moderation")

SIGNAL_URL      = os.getenv("SIGNAL_SERVER_URL", "http://localhost:3001")
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "change_me_use_env")


async def kick_user(meeting_id: str, user_id: str, reason: str = "Toxicity detected") -> bool:
    """
    Tell the Node.js signal server to immediately disconnect this user.
    The signal server handles the Socket.io disconnect + DB update.
    """
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(
                f"{SIGNAL_URL}/internal/kick",
                json={
                    "meeting_id": meeting_id,
                    "user_id":    user_id,
                    "reason":     reason,
                },
                headers={"x-internal-secret": INTERNAL_SECRET},
            )
            if resp.status_code == 200:
                logger.info(f"✅ Kick confirmed: user={user_id} meeting={meeting_id}")
                return True
            else:
                logger.warning(f"Kick rejected by signal server: {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to kick user {user_id}: {e}")
        return False


async def send_engagement_alert(meeting_id: str, alert_data: dict) -> bool:
    """
    Send a room-wide alert (e.g. low engagement) to the signal server.
    """
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(
                f"{SIGNAL_URL}/internal/alert",
                json={
                    "meeting_id":   meeting_id,
                    "alert_type":   alert_data.get("alert_type"),
                    "affected_pct": alert_data.get("affected_pct"),
                    "message":      alert_data.get("message"),
                },
                headers={"x-internal-secret": INTERNAL_SECRET},
            )
            if resp.status_code == 200:
                logger.info(f"✅ Engagement alert sent to signal server for meeting={meeting_id}")
                return True
            else:
                logger.warning(f"Engagement alert rejected by signal server: {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to send engagement alert: {e}")
        return False