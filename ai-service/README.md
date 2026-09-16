# AI Service (Python / FastAPI)

Holds the actual trained models (`models/price_model.pkl`, `models/demand_model.pkl`) and serves
predictions/analytics straight off the shared MongoDB database (`vehicle_rental_system`), the same
one the Node backend uses.

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```

## Drop your trained models here

Put your pickled models at:
- `models/price_model.pkl`
- `models/demand_model.pkl`

Their expected input columns are documented as comments in `app/api/price_prediction.py` and
`app/api/demand_prediction.py` - **update those comments/columns to match what your notebook
actually trained on**, or predictions will silently be wrong.

## Called by

The Java `AI_Recommendation` service (port 8081) calls this service for price and demand
predictions. Nothing else should call this service directly.
