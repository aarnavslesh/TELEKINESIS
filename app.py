"""
FastAPI service for local Cisco IOS command classification.

Start the server with:
    uvicorn app:app --host 127.0.0.1 --port 8000

Then send a POST request to /predict with JSON like:
    {"command": "logg trap informational"}
"""

from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from setfit import SetFitModel


MODEL_DIR = Path("cisco-classifier-model")


class PredictionRequest(BaseModel):
    """Request body accepted by the /predict endpoint."""

    command: str = Field(
        ...,
        min_length=1,
        description="Raw Cisco IOS command text to classify.",
    )


class PredictionResponse(BaseModel):
    """Response body returned by the /predict endpoint."""

    category: str
    confidence: float


def load_model() -> SetFitModel:
    """Load the saved SetFit model from disk.

    The API should not train anything at startup. It only loads the artifacts
    created by train.py.
    """
    if not MODEL_DIR.exists():
        raise RuntimeError(
            "Model directory ./cisco-classifier-model was not found. "
            "Run `python train.py` before starting the API."
        )

    return SetFitModel.from_pretrained(str(MODEL_DIR))


app = FastAPI(
    title="Cisco IOS Security Command Classifier",
    description="Local SetFit classifier for air-gapped compliance auditing.",
    version="1.0.0",
)

# Loading once at startup keeps each prediction fast. If the model files are
# missing, FastAPI startup fails with a clear error instead of returning random
# or incomplete predictions.
model = load_model()


def as_numpy(value: Any) -> np.ndarray:
    """Convert model outputs into a NumPy array.

    Depending on installed library versions, SetFit may return a list, NumPy
    array, pandas-like object, or PyTorch tensor. This helper normalizes those
    shapes so the prediction code stays simple.
    """
    if hasattr(value, "detach"):
        value = value.detach().cpu().numpy()
    elif hasattr(value, "numpy"):
        value = value.numpy()

    return np.asarray(value)


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest) -> PredictionResponse:
    """Classify one raw Cisco IOS command string."""
    command = payload.command.strip()
    if not command:
        raise HTTPException(status_code=422, detail="command must not be blank")

    # predict_proba returns one probability per known label. We take the largest
    # probability as the confidence score for the final predicted category.
    predicted_label = as_numpy(model.predict([command]))[0]
    probabilities = as_numpy(model.predict_proba([command]))[0]
    best_index = int(np.argmax(probabilities))
    confidence = float(probabilities[best_index])

    category = str(predicted_label)
    return PredictionResponse(category=category, confidence=confidence)
