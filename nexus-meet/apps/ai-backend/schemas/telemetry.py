from pydantic import BaseModel, Field, model_validator
from typing  import Optional
from enum    import Enum

class TelemetryMode(str, Enum):
    VIDEO_OFF = "video_off"
    VIDEO_ON  = "video_on"

class BrowserTelemetry(BaseModel):
    is_tab_visible:        bool
    is_window_focused:     bool
    typing_events_per_min: float = Field(ge=0, le=600)
    mouse_movement_score:  float = Field(ge=0, le=1)

class FacialMetrics(BaseModel):
    head_pitch_deg:     float = Field(ge=-90, le=90)
    head_yaw_deg:       float = Field(ge=-90, le=90)
    head_roll_deg:      float = Field(ge=-90, le=90)
    eye_aspect_ratio:   float = Field(ge=0,   le=0.5)
    mouth_aspect_ratio: float = Field(ge=0,   le=1)
    blink_rate_per_min: Optional[float] = None

class TelemetryPacket(BaseModel):
    meeting_id:    str
    user_id:       str
    session_token: str
    mode:          TelemetryMode
    timestamp_ms:  int
    browser:       Optional[BrowserTelemetry] = None
    facial:        Optional[FacialMetrics]    = None

class EngagementResponse(BaseModel):
    user_id:          str
    meeting_id:       str
    engagement_score: float
    flags:            list[str]
    room_alert:       bool = False
    timestamp_ms:     int

class AudioChunkMeta(BaseModel):
    meeting_id:    str
    user_id:       str
    session_token: str
    sample_rate:   int = 16000
    channels:      int = 1
    chunk_ms:      int = 3000