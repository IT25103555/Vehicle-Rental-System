from fastapi import APIRouter, HTTPException
import json
import os

router = APIRouter(prefix="/api/predict", tags=["Model Comparison"])

RESULTS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "models", "comparison_results.json")


@router.get("/model-comparison")
def get_model_comparison():
    """Returns the real algorithm-comparison results produced by train.py.
    Run `python train.py` at least once to generate models/comparison_results.json."""
    if not os.path.exists(RESULTS_PATH):
        raise HTTPException(
            503,
            "comparison_results.json not found - run `python train.py` in ai-service/ first."
        )
    with open(RESULTS_PATH) as f:
        return json.load(f)
