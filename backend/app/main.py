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
from app.api.v1.auth import router as auth_router
from app.api.v1.cohorts import router as cohorts_router
from app.api.v1.progress import router as progress_router
from app.api.v1.studio import router as studio_router, WROCLAW_SENIORS_SCENARIOS, WROCLAW_KIDS_SCENARIOS
from app.models.session import Session, SessionStatus, StudioParticipant
from app.services.firestore_service import FirestoreService

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


def seed_wroclaw_sessions():
    fs = FirestoreService.get_instance()
    if not fs.get_session("WROC-SENIOR-2026"):
        sen_session = Session(
            id="WROC-SENIOR-2026",
            scenario_id="wroclaw-senior-defense-2026",
            title="Wrocław Senior Cyber-Obrona 2026",
            language="pl",
            audience_mode="seniors",
            location_name="Wrocław",
            status=SessionStatus.ACTIVE,
            trainer_token="trn-wroc-senior",
            scenarios=WROCLAW_SENIORS_SCENARIOS,
            roster={
                "senior_marta": StudioParticipant(
                    username="senior_marta",
                    display_name="Marta Kowalska (Wrocław Krzyki)",
                    ui_language_override="pl",
                    score=0,
                    connected=True
                ),
                "senior_tadeusz": StudioParticipant(
                    username="senior_tadeusz",
                    display_name="Tadeusz Wiśniewski (Wrocław Ołbin)",
                    ui_language_override="pl",
                    score=0,
                    connected=True
                )
            }
        )
        fs.save_session(sen_session)

    if not fs.get_session("WROC-KIDS-2026"):
        kids_session = Session(
            id="WROC-KIDS-2026",
            scenario_id="wroclaw-kids-explorers-2026",
            title="Wrocław Młodzi Detektywi Sieci 2026",
            language="pl",
            audience_mode="kids",
            location_name="Wrocław",
            status=SessionStatus.ACTIVE,
            trainer_token="trn-wroc-kids",
            scenarios=WROCLAW_KIDS_SCENARIOS,
            roster={
                "kid_kacper": StudioParticipant(
                    username="kid_kacper",
                    display_name="Kacper (Klasa 7A SP3)",
                    ui_language_override="pl",
                    score=0,
                    connected=True
                ),
                "kid_zuzia": StudioParticipant(
                    username="kid_zuzia",
                    display_name="Zuzia (Gamer Girl)",
                    ui_language_override="pl",
                    score=0,
                    connected=True
                )
            }
        )
        fs.save_session(kids_session)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting Infosphere Digital Hygiene Platform v3.0.0 (%d modules registered)...",
        len(platform_registry.list_modules()),
    )
    seed_wroclaw_sessions()
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

# 2. Mount Authentication, Cohorts, and Progress Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(cohorts_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")
app.include_router(studio_router, prefix="/api/v1")

# 3. Mount All 5 Modular Platform Routers under /api/v1/modules/{m1-disinfo..m5-echo}
platform_registry.mount_all_routers(app, base_prefix="/api/v1/modules")

# 4. Mount Static Assets for Direct Media Serving
import os
from fastapi.staticfiles import StaticFiles
assets_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/public/assets"))
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
