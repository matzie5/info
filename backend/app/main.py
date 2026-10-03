# backend/app/main.py
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

from app.platform.plugin_registry import platform_registry
from app.platform.passport_service import passport_service, DigitalHygienePassport
from app.platform.rag_engine import rag_engine
from app.platform.telemetry import telemetry_service

# Import all 5 Module Plugins to trigger self-registration in platform_registry
import app.modules.m1_disinfo.plugin  # noqa: F401
import app.modules.m2_scam_lab.plugin  # noqa: F401
import app.modules.m3_deepfake_lab.plugin  # noqa: F401
import app.modules.m4_osint_exposure.plugin  # noqa: F401
import app.modules.m5_algo_echo.plugin  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("infosphere")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting Infosphere Digital Hygiene Platform v3.0.0 (%d modules registered)...",
        len(platform_registry.list_modules()),
    )
    yield
    logger.info("Shutting down Infosphere Digital Hygiene Platform...")


app = FastAPI(
    title="Infosphere Digital Hygiene Platform API",
    version="3.0.0",
    description="5-Module Agentic Digital Hygiene & Information Defense Platform (Google ADK + Keyless Vertex AI + DeepSeek LiteLlm)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def security_headers_middleware(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-API-Version"] = "3.0.0"
    return response


@app.get("/healthz", tags=["health"])
@app.get("/api/v1/health", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "service": "infosphere-digital-hygiene-platform",
        "version": "3.0.0",
        "modules_registered": len(platform_registry.list_modules()),
        "vertex_ai_keyless_adc": settings.GOOGLE_GENAI_USE_VERTEXAI,
    }


@app.get("/readyz", tags=["health"])
def readiness_check():
    return {
        "status": "ready",
        "version": "3.0.0",
        "modules": [m.module_id for m in platform_registry.list_modules()],
        "rag_chunks_indexed": len(rag_engine.chunks),
        "telemetry": telemetry_service.get_latency_percentiles("adk_call"),
    }


@app.get("/api/v1/platform/modules", tags=["Platform Core"])
def list_platform_modules():
    return {
        "platform_version": "3.0.0",
        "vertex_ai_adc_enabled": settings.GOOGLE_GENAI_USE_VERTEXAI,
        "modules": [m.model_dump() for m in platform_registry.list_modules()],
    }


@app.get(
    "/api/v1/platform/passport/{subject_id}",
    response_model=DigitalHygienePassport,
    tags=["Platform Core"],
)
def get_digital_hygiene_passport(subject_id: str):
    return passport_service.get_passport(subject_id)


@app.get("/api/v1/platform/passport/{subject_id}/stix21", tags=["Platform Core"])
def export_passport_stix21(subject_id: str):
    return passport_service.export_stix21_bundle(subject_id)


# 1. Mount Legacy Module 1 Endpoints for 100% Backward Compatibility
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(invites_router, prefix="/api/v1")
app.include_router(actions_router, prefix="/api/v1")
app.include_router(simulation_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

# 2. Mount All 5 Modular Platform Routers under /api/v1/modules/{m1-disinfo..m5-echo}
platform_registry.mount_all_routers(app, base_prefix="/api/v1/modules")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
