import asyncio
import numpy as np
import whisper
import logging

logger = logging.getLogger("nexusmeet.whisper")

class WhisperClient:
    """
    OpenAI Whisper wrapper — async-safe, runs in thread pool.
    Use model_size='tiny' for speed, 'base' for better accuracy.
    """

    def __init__(self, model_size: str = "tiny"):
        self.model_size = model_size
        self._model     = None
        self.is_loaded  = False

    async def load(self):
        """Load model in thread pool — heavy I/O, not blocking event loop."""
        def _load():
            logger.info(f"Loading Whisper {self.model_size} model...")
            model = whisper.load_model(self.model_size)
            logger.info(f"Whisper {self.model_size} loaded")
            return model

        loop = asyncio.get_event_loop()
        self._model   = await loop.run_in_executor(None, _load)
        self.is_loaded = True

    async def transcribe(
        self,
        audio_np:    np.ndarray,
        sample_rate: int = 16000,
        language:    str | None = None,
    ) -> tuple[str, str]:
        """
        Transcribe float32 audio array.
        Returns (transcript_text, detected_language).
        """
        if not self.is_loaded:
            raise RuntimeError("Whisper model not loaded — call load() first")

        def _transcribe():
            # Whisper expects float32 mono @ 16kHz
            result = self._model.transcribe(
                audio_np,
                fp16=False,           # CPU-safe
                language=language,    # None = auto-detect
                task="transcribe",
                verbose=False,
            )
            return result["text"].strip(), result.get("language", "en")

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _transcribe)