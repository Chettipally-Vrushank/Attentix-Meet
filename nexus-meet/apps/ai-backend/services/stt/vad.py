import asyncio
import numpy as np
import torch
import logging

logger = logging.getLogger("nexusmeet.vad")

class VoiceActivityDetector:
    """
    Silero VAD — lightweight, fast, runs on CPU.
    Detects whether an audio chunk contains actual speech.
    """

    def __init__(self, threshold: float = 0.5, sample_rate: int = 16000):
        self.threshold   = threshold
        self.sample_rate = sample_rate
        self._model      = None
        self._utils      = None

    def _load(self):
        """Lazy-load Silero VAD model (first call only)."""
        if self._model is None:
            logger.info("Loading Silero VAD model...")
            model, utils = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                force_reload=False,
                onnx=False,
            )
            self._model = model
            self._utils = utils
            logger.info("Silero VAD loaded")

    async def detect(self, audio_np: np.ndarray, sample_rate: int = 16000) -> bool:
        """
        Returns True if speech detected in the audio chunk.
        Runs inference in a thread pool to avoid blocking the event loop.
        """
        self._load()

        def _infer():
            tensor = torch.from_numpy(audio_np).float()
            # Silero VAD expects chunks of specific sizes
            # 512 samples @ 16kHz = 32ms windows
            window   = 512
            scores   = []
            for i in range(0, len(tensor) - window, window):
                chunk = tensor[i : i + window]
                if len(chunk) == window:
                    score = self._model(chunk, sample_rate).item()
                    scores.append(score)
            if not scores:
                return False
            avg_score = sum(scores) / len(scores)
            return avg_score >= self.threshold

        loop   = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _infer)
        return result