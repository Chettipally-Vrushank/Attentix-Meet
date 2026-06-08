import asyncio
import logging
from transformers import pipeline, Pipeline

logger = logging.getLogger("nexusmeet.toxicity")

# Maps HuggingFace toxic-bert label → our DB enum
LABEL_MAP = {
    "toxic":         "TOXIC",
    "severe_toxic":  "SEVERE_TOXIC",
    "obscene":       "OBSCENE",
    "threat":        "THREAT",
    "insult":        "INSULT",
    "identity_hate": "IDENTITY_HATE",
}

class ToxicityClassifier:
    """
    unitary/toxic-bert via HuggingFace Transformers.
    Multi-label classifier — returns highest-scoring label above threshold.
    """

    def __init__(self, model_name: str = "unitary/toxic-bert", threshold: float = 0.90):
        self.model_name = model_name
        self.threshold  = threshold
        self._pipe: Pipeline | None = None
        self.is_loaded  = False

    async def load(self):
        def _load():
            logger.info(f"Loading toxicity model: {self.model_name}")
            pipe = pipeline(
                "text-classification",
                model=self.model_name,
                top_k=None,           # return all labels + scores
                truncation=True,
                max_length=512,
            )
            logger.info("Toxicity classifier loaded")
            return pipe

        loop = asyncio.get_event_loop()
        self._pipe     = await loop.run_in_executor(None, _load)
        self.is_loaded = True

    async def classify(self, text: str) -> tuple[float, str | None]:
        """
        Returns (max_toxicity_score, category | None).
        category is None when all scores are below threshold.
        """
        if not self.is_loaded or not self._pipe:
            raise RuntimeError("Classifier not loaded")

        if not text.strip():
            return 0.0, None

        def _classify():
            results = self._pipe(text)
            # results shape: [[{label: str, score: float}, ...]]
            labels = results[0] if isinstance(results[0], list) else results
            best   = max(labels, key=lambda x: x["score"])
            return best["score"], LABEL_MAP.get(best["label"].lower())

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _classify)