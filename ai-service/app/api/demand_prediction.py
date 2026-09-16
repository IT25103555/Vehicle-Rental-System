from fastapi import APIRouter
from db_connector import get_db
import pandas as pd
import pickle
import os

router = APIRouter(prefix="/api/predict", tags=["Demand Prediction"])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "models", "demand_model.pkl")
_model = None


def _load_model():
    global _model
    if _model is None:
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
    return _model


@router.get("/demand")
def predict_demand(month: int):
    db = get_db()

    # Booking dates are real Date objects (startDate), not a stored "month" integer -
    # match against the month component with an aggregation expression.
    bookings = list(db.bookings.find({
        "$expr": {"$eq": [{"$month": "$startDate"}, month]}
    }))

    if not bookings:
        return {"month": month, "predictedDemand": 0}

    try:
        model = _load_model()
    except FileNotFoundError:
        # Graceful fallback so the endpoint still returns something useful pre-training
        return {"month": month, "predictedDemand": len(bookings), "note": "demand_model.pkl not found - returning raw historical count"}

    # NOTE: adjust this feature set to match exactly what demand_model.pkl was trained on.
    features = pd.DataFrame([{"bookingCount": len(bookings)}])
    prediction = model.predict(features)[0]
    return {"month": month, "predictedDemand": int(prediction)}
