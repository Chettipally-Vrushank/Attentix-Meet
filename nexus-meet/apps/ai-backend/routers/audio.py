import logging
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from services.auth import decode_jwt
from services.db.queries import verify_participant_in_meeting, upsert_transcript_chunk, log_moderation_event
from services.moderation.actions import kick_user
from services.stt.vad import VoiceActivityDetector

logger = logging.getLogger("nexusmeet.audio")
router = APIRouter()

# Instantiate VoiceActivityDetector at module level
vad_detector = VoiceActivityDetector()

# 16kHz, mono, 16-bit PCM = 2 bytes per sample.
# For 3 seconds: 3 * 16000 * 2 = 96000 bytes.
CHUNKS_MS = 3000
SAMPLE_RATE = 16000
BYTES_PER_SAMPLE = 2
TARGET_BYTES = (CHUNKS_MS // 1000) * SAMPLE_RATE * BYTES_PER_SAMPLE  # 96,000 bytes


@router.websocket("/{meeting_id}")
async def websocket_audio(
    websocket: WebSocket,
    meeting_id: str,
    token: str = Query(...)
):
    """
    WebSocket endpoint for real-time audio moderation.
    Streams 16kHz, mono, 16-bit PCM binary frames.
    Buffers, runs VAD, transcribes via Whisper, checks toxicity via Toxic-BERT,
    inserts transcript chunks, logs moderation events, and auto-kicks on violation.
    """
    # Accept connection first to comply with ASGI protocol for subsequent close() calls
    await websocket.accept()

    # 1. Credentials check
    try:
        claims = decode_jwt(token)
    except ValueError as e:
        logger.warning(f"JWT verification failed: {e}")
        await websocket.close(code=4001, reason="Invalid token claims")
        return
    except Exception as e:
        logger.warning(f"JWT decode error: {e}")
        await websocket.close(code=4001, reason="Invalid session token")
        return

    user_id = claims.get("sub")
    if not user_id:
        logger.warning("JWT claims missing 'sub' field")
        await websocket.close(code=4002, reason="Invalid token claims")
        return

    # Check participant guard
    is_allowed = await verify_participant_in_meeting(meeting_id, user_id)
    if not is_allowed:
        logger.warning(f"User {user_id} not authorized in meeting {meeting_id}")
        await websocket.close(code=4004, reason="Not authorized in meeting")
        return

    logger.info(f"Audio WebSocket accepted for user={user_id} meeting={meeting_id}")

    whisper = websocket.app.state.whisper
    toxicity = websocket.app.state.toxicity

    # Buffer to accumulate incoming binary bytes
    audio_buffer = bytearray()
    import json

    try:
        # 1. Read first message (which could be the JSON metadata packet)
        msg = await websocket.receive()
        if "text" in msg:
            try:
                meta = json.loads(msg["text"])
                logger.info(f"Received audio session metadata: {meta}")
            except Exception as e:
                logger.warning(f"Failed to parse audio metadata frame: {e}")
        elif "bytes" in msg:
            audio_buffer.extend(msg["bytes"])
        elif msg.get("type") == "websocket.disconnect":
            logger.info("Audio WebSocket disconnected during handshake")
            return

        while True:
            # 2. Receive chunk from client
            msg = await websocket.receive()
            if msg.get("type") == "websocket.disconnect":
                break
            
            if "bytes" in msg:
                audio_buffer.extend(msg["bytes"])
            else:
                continue

            # 3. Process accumulated bytes when threshold is reached
            while len(audio_buffer) >= TARGET_BYTES:
                chunk_bytes = audio_buffer[:TARGET_BYTES]
                del audio_buffer[:TARGET_BYTES]  # Remove processed bytes

                # Convert binary raw PCM to float32 NumPy array (scaled to -1.0 to 1.0)
                audio_np = np.frombuffer(chunk_bytes, dtype=np.int16).astype(np.float32) / 32768.0

                # 4. Voice Activity Detection (VAD)
                speech_detected = await vad_detector.detect(audio_np, sample_rate=SAMPLE_RATE)
                if not speech_detected:
                    logger.debug("VAD: Silence detected. Skipping Whisper STT.")
                    continue

                # 5. Speech-to-Text via Whisper
                logger.info("VAD: Speech detected. Running Whisper transcription...")
                transcript, lang = await whisper.transcribe(audio_np, sample_rate=SAMPLE_RATE)
                if not transcript.strip():
                    logger.info("Whisper: Transcription was empty.")
                    continue

                logger.info(f"Speech [Lang={lang}]: {transcript}")

                # 6. Toxicity Classification (toxic-bert)
                toxicity_score, category = await toxicity.classify(transcript)

                # 7. Database Write: Insert transcript chunk
                chunk_id = await upsert_transcript_chunk(
                    meeting_id=meeting_id,
                    user_id=user_id,
                    transcript=transcript,
                    toxicity_score=toxicity_score,
                    category=category,
                    duration_ms=CHUNKS_MS
                )

                # 8. Send caption event back to the client
                await websocket.send_json({
                    "event": "transcription",
                    "transcript": transcript,
                    "language": lang,
                    "toxicity_score": float(toxicity_score),
                    "category": category
                })

                # 9. Moderation Action if toxic content detected
                if category is not None:
                    logger.warning(
                        f"🚨 Toxicity violation from user={user_id} (category={category}, score={toxicity_score:.4f})"
                    )

                    # Log the moderation event
                    await log_moderation_event(
                        meeting_id=meeting_id,
                        offending_user_id=user_id,
                        toxicity_score=toxicity_score,
                        category=category,
                        flagged_text=transcript,
                        transcript_chunk_id=chunk_id
                    )

                    # Trigger signal server kick
                    kicked = await kick_user(meeting_id, user_id, reason=f"Auto-kick: toxic language ({category})")
                    if kicked:
                        logger.info(f"Successfully kicked user={user_id} for toxicity")
                    else:
                        logger.error(f"Failed to trigger kick on signal server for user={user_id}")

                    # Close WebSocket connection immediately
                    await websocket.close(code=4008, reason="Kicked for toxic behavior")
                    return

    except WebSocketDisconnect:
        logger.info(f"Audio WebSocket disconnected: meeting={meeting_id}, user={user_id}")
    except Exception as e:
        logger.error(f"Error in audio WebSocket loop: {e}", exc_info=True)
