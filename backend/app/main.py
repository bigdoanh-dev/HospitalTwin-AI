from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.seed import seed_database
from app.api.v1.endpoints import (
    auth, spatial, monitoring, operations, simulation, ai, interventions, cameras, demo, scenarios, admin
)

# Initialize and seed database if empty
seed_database()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="HospitalTwin-AI: Bản sao số bệnh viện tích hợp trí tuệ nhân tạo phục vụ tối ưu hóa vận hành ngoại trú"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication & RBAC"])
app.include_router(spatial.router, prefix="/api/v1/spatial", tags=["Spatial & Digital Twin"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["Real-time Monitoring"])
app.include_router(operations.router, prefix="/api/v1/operations", tags=["Outpatient Operations"])
app.include_router(simulation.router, prefix="/api/v1/simulations", tags=["SimPy Discrete Simulation"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["Hospital AI Assistant"])
app.include_router(interventions.router, prefix="/api/v1/interventions", tags=["Intervention Management"])
app.include_router(cameras.router, prefix="/api/v1/cameras", tags=["Camera Integration"])
app.include_router(demo.router, prefix="/api/v1/demo", tags=["Demo Controls"])
app.include_router(scenarios.router, prefix="/api/v1/scenarios", tags=["Scenario Versions"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Administration"])

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "data_mode": "deterministic_simulation"
    }

@app.get("/api/v1/system/status")
def system_status():
    return {"status": "ready", "backend": "FastAPI", "database": "SQLite",
        "data_mode": "synthetic", "demo_mode": settings.DEMO_MODE,
        "integrations": {"HIS": "synthetic_adapter", "LIS": "synthetic_adapter", "camera": "synthetic_visualization", "LLM": "rule_based_fallback"}}

@app.get("/api/v1/system/features")
def features():
    return {"monitoring": "synthetic_events", "simulation": "executable_discrete_event_model",
        "AI": "rule_based_grounded_analysis", "camera_CV": "not_implemented", "real_HIS_LIS": "not_connected",
        "clinical_decisions": "out_of_scope", "approval": "human_approval_in_demo", "research_status": "prototype_not_validated_deployment"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
