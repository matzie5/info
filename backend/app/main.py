import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1.sessions import router as sessions_router
from app.api.v1.invites import router as invites_router
from app.api.v1.actions import router as actions_router
from app.api.v1.simulation import router as simulation_router
from app.api.v1.admin import router as admin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("infosphere")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Infosphere Simulation Engine on Cloud Run...")
    logger.info("Project: %s | Region: %s", settings.PROJECT_ID, settings.REGION)
    yield
    logger.info("Shutting down Infosphere Simulation Engine...")


app = FastAPI(
    title="Infosphere Simulation Engine API",
    version="2.1.0",
    description="Agent-Based Simulation (ABM) Engine & Information Defense Platform",
    lifespan=lifespan
)

# CORS middleware for Angular 19 SPA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health checks for Cloud Run & Kubernetes probes
@app.get("/healthz", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "service": "infosphere-simulation-api",
        "version": "2.1.0",
        "scale_to_zero_ready": True
    }


@app.get("/api/v1/health", tags=["health"])
def api_v1_health():
    return {
        "status": "healthy",
        "project": settings.PROJECT_ID,
        "region": settings.REGION
    }


# Include Routers
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(invites_router, prefix="/api/v1")
app.include_router(actions_router, prefix="/api/v1")
app.include_router(simulation_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
