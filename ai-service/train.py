"""
Trains the two models this service serves (price_model.pkl, demand_model.pkl),
comparing at least two algorithms per task and keeping the best one - satisfying
the proposal's requirement: "Compare at least two machine learning algorithms to
identify the best-performing model."

Usage:
    python train.py

What it does:
  1. Tries to pull real bookings/vehicles from MongoDB (same MONGO_URI as the rest
     of the app, via db_connector.get_db()).
  2. If there isn't enough real data yet to train on (a brand-new project usually
     won't have enough bookings), it TOPS UP with clearly-labeled synthetic data so
     the pipeline is demonstrable end-to-end. Every row is tagged is_synthetic so
     you can always tell how much of the training set was real vs bootstrap data.
  3. Trains 2 algorithms per task, evaluates both on a held-out test split, and
     saves the winner to models/<name>.pkl - matching exactly the feature columns
     app/api/price_prediction.py and app/api/demand_prediction.py already expect.
  4. Writes models/comparison_results.json - the admin dashboard's "AI Insights"
     page reads this (via Java -> the new /api/predict/model-comparison route)
     to show real accuracy numbers instead of a placeholder.

IMPORTANT - read this before you present results in your report:
  If MongoDB has too few real bookings, most/all of the training rows here will be
  synthetic bootstrap data, NOT your real assigned dataset. The accuracy numbers
  in that case demonstrate the PIPELINE works, not real-world model performance.
  Re-run this script after your team has real booking data (or your assigned
  dataset) to get numbers you can defend in the viva.
"""

import os
import json
import pickle
import random
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)
random.seed(42)
np.random.seed(42)

CATEGORIES = ["Car", "Van", "SUV", "Bike", "Lorry", "Bus"]
CATEGORY_BASE_RATE = {"Car": 7000, "Van": 11000, "SUV": 22000, "Bike": 2500, "Lorry": 15000, "Bus": 26000}
CATEGORY_BASE_SEATS = {"Car": 4, "Van": 8, "SUV": 7, "Bike": 1, "Lorry": 3, "Bus": 27}


def try_load_real_data():
    """Best-effort pull from MongoDB. Returns (bookings_df, vehicles_df) or (None, None)."""
    try:
        from db_connector import get_db
        db = get_db()
        bookings = list(db.bookings.find({}))
        vehicles = list(db.vehicles.find({}))
        if not bookings or not vehicles:
            return None, None
        return pd.DataFrame(bookings), pd.DataFrame(vehicles)
    except Exception as e:
        print(f"[train.py] Could not load real data from MongoDB ({e}). Using synthetic data only.")
        return None, None


def make_synthetic_bookings(n=400):
    """Generates plausible booking rows so the training pipeline is always runnable,
    even on a fresh checkout with an empty database. Every row is tagged synthetic."""
    rows = []
    start_date = datetime(2025, 1, 1)
    for _ in range(n):
        category = random.choice(CATEGORIES)
        base_rate = CATEGORY_BASE_RATE[category] * random.uniform(0.85, 1.25)
        seats = CATEGORY_BASE_SEATS[category] + random.choice([-1, 0, 0, 1])
        rental_days = random.choice([1, 2, 3, 4, 5, 7, 10, 14])
        # Small realistic effects: longer rentals get a slight per-day discount;
        # bigger vehicles cost a bit more per day than the base rate suggests.
        seat_premium = max(0, seats - CATEGORY_BASE_SEATS[category]) * 150
        length_discount = 1 - min(rental_days, 14) * 0.01
        estimated_cost = (base_rate + seat_premium) * rental_days * length_discount
        estimated_cost *= random.uniform(0.95, 1.05)  # noise

        day_offset = random.randint(0, 364)
        booking_date = start_date + timedelta(days=day_offset)

        rows.append({
            "category": category,
            "rentalRatePerDay": round(base_rate, 2),
            "seats": max(seats, 1),
            "rentalDays": rental_days,
            "estimatedCost": round(estimated_cost, 2),
            "startDate": booking_date,
            "is_synthetic": True
        })
    return pd.DataFrame(rows)


def build_price_dataset():
    real_bookings, real_vehicles = try_load_real_data()
    frames = []

    if real_bookings is not None:
        try:
            merged = real_bookings.merge(
                real_vehicles[["_id", "rentalRatePerDay", "seats", "category"]],
                left_on="vehicle", right_on="_id", suffixes=("", "_veh")
            )
            merged["is_synthetic"] = False
            frames.append(merged[["category", "rentalRatePerDay", "seats", "rentalDays", "estimatedCost", "startDate", "is_synthetic"]])
            print(f"[train.py] Loaded {len(merged)} real booking rows from MongoDB.")
        except Exception as e:
            print(f"[train.py] Real data present but couldn't be shaped for training ({e}). Skipping it.")

    real_count = sum(len(f) for f in frames)
    MIN_ROWS = 150
    if real_count < MIN_ROWS:
        synthetic_needed = MIN_ROWS + 100 - real_count
        print(f"[train.py] Only {real_count} usable real rows - topping up with {synthetic_needed} synthetic rows.")
        frames.append(make_synthetic_bookings(synthetic_needed))

    return pd.concat(frames, ignore_index=True)


def train_price_model(df):
    X = df[["rentalRatePerDay", "rentalDays", "seats"]]
    y = df["estimatedCost"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    candidates = {
        "LinearRegression": LinearRegression(),
        "RandomForestRegressor": RandomForestRegressor(n_estimators=150, max_depth=8, random_state=42)
    }

    results = {}
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        results[name] = {
            "model": model,
            "r2": round(float(r2_score(y_test, preds)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, preds))), 2)
        }
        print(f"[train.py] Price model - {name}: R2={results[name]['r2']}  RMSE={results[name]['rmse']}")

    best_name = max(results, key=lambda n: results[n]["r2"])
    best_model = results[best_name]["model"]

    with open(os.path.join(MODELS_DIR, "price_model.pkl"), "wb") as f:
        pickle.dump(best_model, f)
    print(f"[train.py] Saved best price model -> models/price_model.pkl ({best_name})")

    return {
        "task": "Price Prediction",
        "featureColumns": ["rentalRatePerDay", "rentalDays", "seats"],
        "trainingRows": len(df),
        "syntheticRows": int(df["is_synthetic"].sum()),
        "realRows": int((~df["is_synthetic"]).sum()),
        "models": [
            {"name": name, "accuracy": r["r2"], "rmse": r["rmse"],
             "status": "selected" if name == best_name else "compared"}
            for name, r in results.items()
        ],
        "bestModel": best_name
    }


def build_demand_dataset(price_df):
    """Aggregates bookings into (month, category) -> count rows, matching the single
    `bookingCount` feature that app/api/demand_prediction.py currently sends at
    inference time. NOTE: this makes the model predict a count FROM a count for the
    same period, which is a weak/circular feature in the existing serving code -
    left as-is here to stay compatible, but worth revisiting (e.g. use prior-month
    count + category + season to predict the CURRENT month instead)."""
    df = price_df.copy()
    df["month"] = pd.to_datetime(df["startDate"]).dt.to_period("M").astype(str)
    monthly = df.groupby(["month", "category"]).size().reset_index(name="bookingCount")
    # Target: this period's count plus small realistic noise, standing in for
    # "next period's demand" until the serving code passes richer features.
    monthly["targetDemand"] = (monthly["bookingCount"] * np.random.uniform(0.9, 1.15, len(monthly))).round().astype(int)
    return monthly


def train_demand_model(monthly_df):
    X = monthly_df[["bookingCount"]]
    y = monthly_df["targetDemand"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    candidates = {
        "LinearRegression": LinearRegression(),
        "RandomForestRegressor": RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    }

    results = {}
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        results[name] = {
            "model": model,
            "r2": round(float(r2_score(y_test, preds)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, preds))), 2)
        }
        print(f"[train.py] Demand model - {name}: R2={results[name]['r2']}  RMSE={results[name]['rmse']}")

    best_name = max(results, key=lambda n: results[n]["r2"])
    best_model = results[best_name]["model"]

    with open(os.path.join(MODELS_DIR, "demand_model.pkl"), "wb") as f:
        pickle.dump(best_model, f)
    print(f"[train.py] Saved best demand model -> models/demand_model.pkl ({best_name})")

    return {
        "task": "Demand Prediction",
        "featureColumns": ["bookingCount"],
        "trainingRows": len(monthly_df),
        "models": [
            {"name": name, "accuracy": r["r2"], "rmse": r["rmse"],
             "status": "selected" if name == best_name else "compared"}
            for name, r in results.items()
        ],
        "bestModel": best_name,
        "warning": "Feature is the same-period booking count - see the docstring/comment in build_demand_dataset() before citing this in your report."
    }


def main():
    print("=" * 70)
    print("Training AI/ML models for the Vehicle Rental System")
    print("=" * 70)

    price_df = build_price_dataset()
    price_result = train_price_model(price_df)

    monthly_df = build_demand_dataset(price_df)
    demand_result = train_demand_model(monthly_df)

    comparison = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "tasks": [price_result, demand_result]
    }
    with open(os.path.join(MODELS_DIR, "comparison_results.json"), "w") as f:
        json.dump(comparison, f, indent=2)

    print("\nSaved models/comparison_results.json")
    print("=" * 70)
    print("DONE. Restart the ai-service (uvicorn) to pick up the new model files.")
    print("=" * 70)


if __name__ == "__main__":
    main()
