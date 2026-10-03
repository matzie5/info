# backend/app/modules/m1_disinfo/plugin.py
from typing import List
from fastapi import APIRouter

from app.api.v1.sessions import router as sessions_router
from app.api.v1.actions import router as actions_router
from app.api.v1.simulation import router as simulation_router
from app.platform.plugin_registry import (
    DigitalHygieneModulePlugin,
    GoldenEvalCase,
    ModuleMetadata,
    platform_registry,
)
from app.platform.rag_engine import rag_engine


class Module1DisinfoPlugin(DigitalHygieneModulePlugin):
    def get_metadata(self) -> ModuleMetadata:
        return ModuleMetadata(
            module_id="m1_disinfo",
            number=1,
            title="Macro Disinformation & Network Contagion Defense Lab",
            short_title="Macro Disinfo Lab",
            description="500-node Barabási-Albert Agent-Based Model (ABM) simulating viral disinformation cascades, bot amplification, and RAG-grounded counter-messaging.",
            route_prefix="m1-disinfo",
            frontend_route="/modules/disinfo",
            resilience_dimension="Macro Narrative & CIB Defense",
            adk_pattern="SequentialAgent (FactCheckerAgent -> GroundingJudgeAgent -> PublisherAgent)",
            supported_models=["gemini-2.5-flash", "gemini-2.5-pro"],
            rag_corpus_domain="m1_disinfo",
        )

    def get_router(self) -> APIRouter:
        router = APIRouter()
        router.include_router(sessions_router)
        router.include_router(actions_router)
        router.include_router(simulation_router)

        @router.get("/overview")
        def get_m1_overview():
            return {
                "module": self.get_metadata().model_dump(),
                "rag_chunks": [
                    c.chunk_id for c in rag_engine.chunks if c.module_domain == "m1_disinfo"
                ],
            }

        return router

    def get_golden_eval_cases(self) -> List[GoldenEvalCase]:
        return [
            GoldenEvalCase(
                case_id="m1-eval-grid-rag-grounding",
                module_id="m1_disinfo",
                description="Verify official crisis inject retrieves PSE-GRID-2026-001 and passes citation verification.",
                input_payload={"query": "HVDC grid blackout rumors"},
                validator_fn=lambda chunks: any(c.source_id == "PSE-GRID-2026-001" for c in chunks),
            )
        ]


m1_plugin = Module1DisinfoPlugin()
platform_registry.register(m1_plugin)
