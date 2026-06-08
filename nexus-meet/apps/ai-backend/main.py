"""
NexusMeet — FastAPI AI Backend  (main.py)
=========================================
Entry point for all AI services:
  WS  /ws/telemetry/{meeting_id}   — real-time engagement scoring
  WS  /ws/audio/{meeting_id}       — VAD → Whisper STT → toxicity kick
  GET /api/analytics/...           — post-meeting dashboard data
  GET /health                      — readiness probe

Startup sequence (lifespan):
  1. Verify PostgreSQL connection
  2. Load Whisper model  (thread pool — never blocks event loop)
  3. Load toxic-bert     (thread pool)
  4. Attach everything to app.state for router access
  5. Yield → serve traffic
  6. Teardown on shutdown
"""

import logging
import os
from contextlib import asynccontextmanager
from typing     import AsyncGenerator

from dotenv import load_dotenv
load_dotenv()                          # reads apps/ai-backend/.env

from fastapi                 import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses       import JSONResponse

# ── Internal services ─────────────────────────────────────────
from services.db.client            import db_client
from services.stt.whisper_client   import WhisperClient
from services.moderation.toxicity  import ToxicityClassifier

# ── Routers ───────────────────────────────────────────────────
from routers import telemetry, audio, analytics

# ─────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level  = logging.INFO,
    format = "%(asctime)s  [%(levelname)-8s]  %(name)s: %(message)s",
    datefmt= "%H:%M:%S",
)
logger = logging.getLogger("nexusmeet.main")


# ─────────────────────────────────────────────────────────────
# Lifespan — load all models ONCE, attach to app.state
# ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Runs at startup (before first request) and teardown (after last).
    All heavyweight model loading happens here so routers can access
    fully-loaded objects via request.app.state.
    """

    # ── 1. Database ───────────────────────────────────────────
    logger.info("Connecting to PostgreSQL...")
    await db_client.connect()
    logger.info("✅ PostgreSQL connected")

    # ── 2. Whisper STT ────────────────────────────────────────
    model_size = os.getenv("WHISPER_MODEL", "tiny")   # tiny | base | small
    logger.info(f"Loading Whisper [{model_size}] — first run downloads weights...")
    whisper = WhisperClient(model_size=model_size)
    await whisper.load()
    logger.info(f"✅ Whisper [{model_size}] ready")

    # ── 3. Toxicity classifier ────────────────────────────────
    tox_model     = os.getenv("TOXICITY_MODEL",     "unitary/toxic-bert")
    tox_threshold = float(os.getenv("TOXICITY_THRESHOLD", "0.90"))
    logger.info(f"Loading toxicity model [{tox_model}] — may download ~400 MB...")
    toxicity = ToxicityClassifier(model_name=tox_model, threshold=tox_threshold)
    await toxicity.load()
    logger.info(f"✅ Toxicity classifier ready  (threshold={tox_threshold})")

    # ── 4. Attach to app.state (routers read from here) ───────
    app.state.whisper  = whisper
    app.state.toxicity = toxicity
    app.state.db       = db_client

    logger.info("🚀 NexusMeet AI Backend is ready — serving traffic")

    # ── Yield: application runs ───────────────────────────────
    yield

    # ── 5. Graceful shutdown ──────────────────────────────────
    logger.info("🛑 Shutting down — releasing resources...")
    await db_client.disconnect()
    logger.info("✅ PostgreSQL disconnected. Bye.")


# ─────────────────────────────────────────────────────────────
# Application factory
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "NexusMeet AI Backend",
    version     = "1.0.0",
    description = (
        "Real-time engagement scoring (telemetry + MediaPipe), "
        "audio moderation (VAD → Whisper → toxic-bert), "
        "and post-meeting analytics."
    ),
    lifespan    = lifespan,       # ← single source of truth for startup/shutdown
    docs_url    = "/docs",        # Swagger UI
    redoc_url   = "/redoc",
)


# ─────────────────────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ─────────────────────────────────────────────────────────────
# Global exception handler — returns clean JSON instead of 500 HTML
# ─────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code = 500,
        content     = {"error": "internal_server_error", "detail": str(exc)},
    )


# ─────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────

app.include_router(
    telemetry.router,
    prefix = "/ws/telemetry",
    tags   = ["Telemetry WS"],
)

app.include_router(
    audio.router,
    prefix = "/ws/audio",
    tags   = ["Audio WS"],
)

app.include_router(
    analytics.router,
    prefix = "/api/analytics",
    tags   = ["Analytics REST"],
)


# ─────────────────────────────────────────────────────────────
# Health / readiness endpoints
# ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Ops"])
async def health_check(request: Request):
    """
    Readiness probe — returns 200 only when all models are loaded.
    Used by Docker HEALTHCHECK and the Next.js dashboard status badge.
    """
    state = request.app.state

    whisper_ok  = getattr(getattr(state, "whisper",  None), "is_loaded", False)
    toxicity_ok = getattr(getattr(state, "toxicity", None), "is_loaded", False)
    db_ok       = True  # if we got here, lifespan already verified the connection

    all_ok = whisper_ok and toxicity_ok and db_ok

    return JSONResponse(
        status_code = 200 if all_ok else 503,
        content     = {
            "status":          "ok" if all_ok else "degraded",
            "whisper_loaded":  whisper_ok,
            "toxicity_loaded": toxicity_ok,
            "db_connected":    db_ok,
            "whisper_model":   os.getenv("WHISPER_MODEL", "tiny"),
            "toxicity_model":  os.getenv("TOXICITY_MODEL", "unitary/toxic-bert"),
            "toxicity_threshold": float(os.getenv("TOXICITY_THRESHOLD", "0.90")),
        }
    )


@app.get("/", tags=["Ops"])
async def root():
    return {"service": "NexusMeet AI Backend", "version": "1.0.0", "docs": "/docs"}
