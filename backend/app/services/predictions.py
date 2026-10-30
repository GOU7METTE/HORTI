from typing import NoReturn


class InferenceUnavailable(Exception):
    """No model is available to make a prediction."""


class PredictionService:
    def predict(self, image: bytes) -> NoReturn:
        """Validated image bytes are request-local; no model or retention exists."""
        raise InferenceUnavailable


def get_prediction_service() -> PredictionService:
    return PredictionService()
