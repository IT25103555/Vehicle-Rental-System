from fastapi import APIRouter, HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from db_connector import get_db
import pandas as pd
import pickle
import os

router = APIRouter(prefix="/api/predict", tags=["Price Prediction"])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "models", "price_model.pkl")
_model = None


def _load_model():
    global _model
    if _model is None:
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
    return _model


@router.get("/price")
def predict_price(vehicle_id: str, days: int):
    db = get_db()

    try:
        vehicle = db.vehicles.find_one({"_id": ObjectId(vehicle_id)})
    except InvalidId:
        raise HTTPException(400, "vehicle_id is not a valid Mongo ObjectId")

    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    # NOTE: these column names/order must match exactly what price_model.pkl was trained on.
    # Adjust this to match your actual notebook's feature set.
    features = pd.DataFrame([{
        "rentalRatePerDay": vehicle.get("rentalRatePerDay", 0),
        "rentalDays": days,
        "seats": vehicle.get("seats", 4),
    }])

    try:
        model = _load_model()
    except FileNotFoundError:
        raise HTTPException(503, "price_model.pkl not found - train and save it to models/price_model.pkl first")

    prediction = model.predict(features)[0]
    return {
        "vehicleId": vehicle_id,
        "days": days,
        "predictedPrice": round(float(prediction), 2)
    }
