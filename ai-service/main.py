from fastapi import FastAPI
from app.api.price_prediction import router as price_router
from app.api.booking_patterns import router as patterns_router
from app.api.demand_prediction import router as demand_router
from app.api.pattern_analysis import router as analysis_router
from app.api.model_comparison import router as comparison_router

app = FastAPI(title="AI Recommendation Service")

# Include all routers
app.include_router(price_router)
app.include_router(patterns_router)
app.include_router(demand_router)
app.include_router(analysis_router)
app.include_router(comparison_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-recommendation-python"}
