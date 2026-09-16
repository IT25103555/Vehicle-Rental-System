from fastapi import APIRouter
from db_connector import get_db
import pandas as pd

router = APIRouter(prefix="/api/patterns", tags=["Booking Patterns"])


@router.get("/booking-trends")
def booking_trends():
    db = get_db()
    bookings = list(db.bookings.find({}))
    if not bookings:
        return {"trends": []}

    df = pd.DataFrame(bookings)

    # booking only stores a `vehicle` ObjectId, not the category - join against vehicles to get it
    vehicles = list(db.vehicles.find({}, {"category": 1}))
    category_by_id = {v["_id"]: v.get("category", "Unknown") for v in vehicles}
    df["category"] = df["vehicle"].map(category_by_id)

    df["month"] = pd.to_datetime(df["startDate"]).dt.to_period("M").astype(str)
    trend = df.groupby(["month", "category"]).size().reset_index(name="bookingCount")
    return {"trends": trend.sort_values("month").to_dict(orient="records")}
