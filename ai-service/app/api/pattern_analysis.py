from fastapi import APIRouter, HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from db_connector import get_db
import pandas as pd

router = APIRouter(prefix="/api/patterns", tags=["Customer Patterns"])


@router.get("/customer/{customer_id}")
def analyze_customer_patterns(customer_id: str):
    db = get_db()

    try:
        customer_oid = ObjectId(customer_id)
    except InvalidId:
        raise HTTPException(400, "customer_id is not a valid Mongo ObjectId")

    bookings = list(db.bookings.find({"customer": customer_oid}))
    if not bookings:
        return {"customerId": customer_id, "pattern": {}}

    df = pd.DataFrame(bookings)
    vehicles = list(db.vehicles.find({"_id": {"$in": df["vehicle"].tolist()}}, {"category": 1}))
    category_by_id = {v["_id"]: v.get("category", "Unknown") for v in vehicles}
    df["category"] = df["vehicle"].map(category_by_id)

    return {"customerId": customer_id, "pattern": df["category"].value_counts().to_dict()}
