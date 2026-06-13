import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from services.auth import decode_jwt
from services.db.queries import verify_participant_in_meeting, insert_engagement_log
from services.engagement.scorer import RoomEngagementManager
from services.moderation.actions import send_engagement_alert
from schemas.telemetry import TelemetryPacket, EngagementResponse

logger = logging.getLogger("nexusmeet.telemetry")
router = APIRouter()

# Global mapping of meeting_id -> RoomEngagementManager
active_rooms: dict[str, RoomEngagementManager] = {}


async def handle_room_alert(meeting_id: str, alert_data: dict):
    """Callback triggered by RoomEngagementManager when engagement is low."""
    logger.warning(f"Low engagement alert triggered for meeting={meeting_id}: {alert_data}")
    await send_engagement_alert(meeting_id, alert_data)


@router.websocket("/{meeting_id}")
async def websocket_telemetry(websocket: WebSocket, meeting_id: str):
    """
    WebSocket endpoint for real-time telemetry packets (browser & face metrics).
    Verifies authentication on every packet and calculates engagement score.
    """
    await websocket.accept()
    logger.info(f"Telemetry WebSocket connection accepted for meeting={meeting_id}")

    # Ensure engagement manager exists for this meeting
    if meeting_id not in active_rooms:
        active_rooms[meeting_id] = RoomEngagementManager(
            meeting_id=meeting_id,
            alert_callback=handle_room_alert
        )
    manager = active_rooms[meeting_id]
    user_id = None

    try:
        while True:
            # 1. Receive JSON packet from client
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                raise
            except Exception as e:
                logger.warning(f"Malformed JSON received: {e}")
                await websocket.close(code=4000, reason="Malformed JSON packet")
                break

            # Parse to TelemetryPacket
            try:
                packet = TelemetryPacket(**data)
            except Exception as e:
                logger.warning(f"Packet validation failed: {e}")
                await websocket.close(code=4005, reason="Invalid packet schema")
                break

            # 2. Authenticate session token
            try:
                claims = decode_jwt(packet.session_token)
            except ValueError as e:
                logger.warning(f"JWT verification failed: {e}")
                await websocket.close(code=4001, reason="Invalid token claims")
                break
            except Exception as e:
                logger.warning(f"JWT decode error: {e}")
                await websocket.close(code=4001, reason="Invalid session token")
                break

            # 3. Security checks: User ID and Meeting ID consistency
            if claims.get("sub") != packet.user_id:
                logger.warning(f"User ID mismatch: token={claims.get('sub')} packet={packet.user_id}")
                await websocket.close(code=4002, reason="User ID mismatch")
                break

            if packet.meeting_id != meeting_id:
                logger.warning(f"Meeting ID mismatch: path={meeting_id} packet={packet.meeting_id}")
                await websocket.close(code=4003, reason="Meeting ID mismatch")
                break

            # 4. Database participant guard (invited or connected)
            is_allowed = await verify_participant_in_meeting(meeting_id, packet.user_id)
            if not is_allowed:
                logger.warning(f"Participant {packet.user_id} not allowed in meeting {meeting_id}")
                await websocket.close(code=4004, reason="Not in participant list")
                break

            # Set user_id upon first successful verification for cleanup
            if not user_id:
                user_id = packet.user_id
                logger.info(f"Authenticated user={user_id} in meeting={meeting_id}")

            # 5. Process engagement scoring
            result = await manager.process(
                user_id=packet.user_id,
                mode=packet.mode.value,
                browser=packet.browser,
                facial=packet.facial
            )

            # 6. Insert log to Postgres database
            await insert_engagement_log(
                meeting_id=meeting_id,
                user_id=packet.user_id,
                packet=packet,
                score=result.clamped
            )

            # 7. Respond to client
            response = EngagementResponse(
                user_id=packet.user_id,
                meeting_id=meeting_id,
                engagement_score=result.clamped,
                flags=result.flags,
                room_alert=getattr(manager, "room_alert_active", False),
                timestamp_ms=packet.timestamp_ms
            )
            await websocket.send_json(response.model_dump())

    except WebSocketDisconnect:
        logger.info(f"Telemetry WebSocket disconnected: meeting={meeting_id}, user={user_id}")
    except Exception as e:
        logger.error(f"Error in telemetry WebSocket loop: {e}", exc_info=True)
    finally:
        # Clean up participant state on exit
        if user_id:
            manager.remove_participant(user_id)
        # Remove room manager if no active scores remain
        if meeting_id in active_rooms and not active_rooms[meeting_id]._scores:
            logger.info(f"Cleaning up empty room manager for meeting={meeting_id}")
            active_rooms.pop(meeting_id, None)
