from typing import NoReturn

from fastapi import UploadFile


class InferenceUnavailable(Exception):
    """No model is available to make a prediction."""


class PredictionService:
    def predict(self, image: UploadFile) -> NoReturn:
        """Contract placeholder: do not read, decode, or retain the upload."""
        raise InferenceUnavailable


def get_prediction_service() -> PredictionService:
    return PredictionService()
