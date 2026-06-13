from dataclasses import dataclass, field
from typing import Optional

class Thresholds:
    EAR_DROWSY               = 0.20
    YAW_DISTRACTED           = 25.0
    YAW_AWAY                 = 45.0
    PITCH_DISTRACTED         = 20.0
    MAR_YAWNING              = 0.55
    TYPING_MIN_ENGAGED       = 5.0
    ROOM_LOW_ENGAGEMENT      = 45.0
    ROOM_ALERT_PARTICIPANT_PCT = 0.50
    SMOOTHING_ALPHA          = 0.3

@dataclass
class ScoringResult:
    raw_score:    float
    smooth_score: float
    flags:        list[str] = field(default_factory=list)

    @property
    def clamped(self) -> float:
        return max(0.0, min(100.0, self.smooth_score))

class ParticipantScoreState:
    def __init__(self):
        self.ema_score          = 75.0
        self.consecutive_drowsy = 0
        self.consecutive_away   = 0

    def update_ema(self, new_raw: float) -> float:
        a = Thresholds.SMOOTHING_ALPHA
        self.ema_score = a * new_raw + (1 - a) * self.ema_score
        return self.ema_score

def _score_browser(b) -> tuple[float, list[str]]:
    score, flags = 100.0, []
    if not b.is_tab_visible:      score -= 40; flags.append("tab_hidden")
    if not b.is_window_focused:   score -= 25; flags.append("window_blurred")
    if b.mouse_movement_score < 0.1: score -= 10; flags.append("no_mouse_activity")
    deficit = 1.0 - min(1.0, b.typing_events_per_min / Thresholds.TYPING_MIN_ENGAGED)
    score -= deficit * 10
    score += min(5.0, (b.typing_events_per_min / 60) * 5)
    return score, flags

def _score_facial(f, state: ParticipantScoreState, b=None) -> tuple[float, list[str]]:
    score, flags = 100.0, []
    if b:
        if not b.is_tab_visible:      score -= 40; flags.append("tab_hidden")
        elif not b.is_window_focused: score -= 25; flags.append("window_blurred")

    if f:
        if f.eye_aspect_ratio < Thresholds.EAR_DROWSY:
            state.consecutive_drowsy += 1
            score -= min(50, state.consecutive_drowsy * 10); flags.append("drowsy")
        else:
            state.consecutive_drowsy = max(0, state.consecutive_drowsy - 1)
        yaw = abs(f.head_yaw_deg)
        if yaw > Thresholds.YAW_AWAY:
            state.consecutive_away += 1
            score -= min(40, state.consecutive_away * 8); flags.append("looking_away")
        elif yaw > Thresholds.YAW_DISTRACTED:
            score -= ((yaw - Thresholds.YAW_DISTRACTED) / 20) * 20; flags.append("head_turned")
            state.consecutive_away = max(0, state.consecutive_away - 1)
        else:
            state.consecutive_away = max(0, state.consecutive_away - 1)
        if abs(f.head_pitch_deg) > Thresholds.PITCH_DISTRACTED:
            score -= min(15, (abs(f.head_pitch_deg) - 20) / 2); flags.append("head_tilted")
        if f.mouth_aspect_ratio > Thresholds.MAR_YAWNING:
            score -= 15; flags.append("yawning")
    else:
        # If webcam is on but face is not detected:
        # Only penalize if the tab is visible (if tab is hidden, MediaPipe is suspended by the browser).
        if not b or b.is_tab_visible:
            score = 0.0
            flags.append("no_face_detected")
    return score, flags

class EngagementScorer:
    def score(self, mode, state, browser=None, facial=None) -> ScoringResult:
        if mode == "video_off":
            raw, flags = _score_browser(browser)
        else:
            raw, flags = _score_facial(facial, state, browser)
        smooth = state.update_ema(raw)
        return ScoringResult(raw_score=raw, smooth_score=smooth, flags=flags)

class RoomEngagementManager:
    def __init__(self, meeting_id: str, alert_callback):
        self.meeting_id       = meeting_id
        self._scorer          = EngagementScorer()
        self._states:  dict   = {}
        self._scores:  dict   = {}
        self._alert_callback  = alert_callback

    def _state(self, uid: str) -> ParticipantScoreState:
        if uid not in self._states:
            self._states[uid] = ParticipantScoreState()
        return self._states[uid]

    async def process(self, user_id, mode, browser=None, facial=None) -> ScoringResult:
        result = self._scorer.score(mode, self._state(user_id), browser, facial)
        self._scores[user_id] = result.clamped
        await self._check_alert()
        return result

    async def _check_alert(self):
        scores = list(self._scores.values())
        if len(scores) < 2: return
        pct = sum(1 for s in scores if s < Thresholds.ROOM_LOW_ENGAGEMENT) / len(scores)
        if pct > Thresholds.ROOM_ALERT_PARTICIPANT_PCT:
            await self._alert_callback(self.meeting_id, {
                "alert_type":   "low_engagement",
                "affected_pct": round(pct, 2),
                "avg_score":    round(sum(scores) / len(scores), 1),
                "message":      f"{int(pct*100)}% of participants appear disengaged",
            })

    def remove_participant(self, uid: str):
        self._states.pop(uid, None)
        self._scores.pop(uid, None)