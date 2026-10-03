# backend/app/modules/m5_algo_echo/plugin.py
import math
from collections import Counter
from typing import List
from fastapi import APIRouter
from pydantic import BaseModel, Field
import numpy as np

from app.platform.adk_runtime import adk_runtime
from app.platform.passport_service import passport_service
from app.platform.plugin_registry import (
    DigitalHygieneModulePlugin,
    GoldenEvalCase,
    ModuleMetadata,
    platform_registry,
)
from app.platform.rag_engine import rag_engine


class CandidateFeedPost(BaseModel):
    post_id: str
    headline: str
    cluster_stance: str  # ALARMIST | POLARIZING | BRIDGING_CIVIC | EMPIRICAL_TECHNICAL
    outrage_intensity: float = Field(..., ge=0.0, le=1.0)
    bridging_novelty: float = Field(..., ge=0.0, le=1.0)
    computed_rank_score: float = 0.0


ECHO_CANDIDATE_POOL: List[CandidateFeedPost] = [
    CandidateFeedPost(
        post_id="p-alarm-1",
        headline="THEY ARE HIDING THE TRUTH: Secret Grid Rationing List Leaked!",
        cluster_stance="ALARMIST",
        outrage_intensity=0.96,
        bridging_novelty=0.10,
    ),
    CandidateFeedPost(
        post_id="p-alarm-2",
        headline="Outrage grows as insiders claim transformers were sabotaged!",
        cluster_stance="ALARMIST",
        outrage_intensity=0.91,
        bridging_novelty=0.15,
    ),
    CandidateFeedPost(
        post_id="p-polar-1",
        headline="Why District B Always Gets Priority Power While Our Neighborhoods Pay!",
        cluster_stance="POLARIZING",
        outrage_intensity=0.88,
        bridging_novelty=0.20,
    ),
    CandidateFeedPost(
        post_id="p-bridge-1",
        headline="Cross-Party Municipal Audit Explains How Grid Load-Balancing Protects Hospitals",
        cluster_stance="BRIDGING_CIVIC",
        outrage_intensity=0.18,
        bridging_novelty=0.92,
    ),
    CandidateFeedPost(
        post_id="p-tech-1",
        headline="PSE Open Telemetry Dashboard: Live 50.00 Hz Frequency & HVDC Reserve Data",
        cluster_stance="EMPIRICAL_TECHNICAL",
        outrage_intensity=0.08,
        bridging_novelty=0.95,
    ),
    CandidateFeedPost(
        post_id="p-bridge-2",
        headline="Community Workshop: How Neighboring Districts Coordinate Emergency Microgrids",
        cluster_stance="BRIDGING_CIVIC",
        outrage_intensity=0.14,
        bridging_novelty=0.89,
    ),
]


class RecommenderTuningRequest(BaseModel):
    user_id: str = "demo_user"
    user_interest_query: str = "grid blackout outrage sabotage"
    w_outrage: float = Field(default=0.85, ge=0.0, le=1.0)
    w_affinity: float = Field(default=0.75, ge=0.0, le=1.0)
    w_bridging_diversity: float = Field(default=0.10, ge=0.0, le=1.0)
    top_k: int = Field(default=4, ge=2, le=6)


class RecommenderSimulationResult(BaseModel):
    ranked_feed: List[CandidateFeedPost]
    shannon_viewpoint_entropy: float
    echo_chamber_radius: float
    polarization_drift_alert: bool
    autonomy_resilience_score: float
    adk_coach_explanation: str
    dsa_compliance_citations: List[str]


class Module5AlgoEchoPlugin(DigitalHygieneModulePlugin):
    def get_metadata(self) -> ModuleMetadata:
        return ModuleMetadata(
            module_id="m5_algo_echo",
            number=5,
            title="Algorithmic Manipulation & Echo Chambers Lab",
            short_title="Echo Chamber Lab",
            description="Interactive recommender sandbox showing how outrage-weighted ranking collapses ideological Shannon entropy and creates echo chambers, grounded in EU DSA Articles 27 & 38.",
            route_prefix="m5-echo",
            frontend_route="/modules/echo-chamber",
            resilience_dimension="Algorithmic & Echo-Chamber Autonomy",
            adk_pattern="AlgorithmicCuratorAgent + DepolarizationCoachAgent + Vertex text-embedding-004 Vector Scorer",
            supported_models=["gemini-2.5-flash", "text-embedding-004"],
            rag_corpus_domain="m5_echo",
        )

    def simulate_feed(self, req: RecommenderTuningRequest) -> RecommenderSimulationResult:
        user_vec = rag_engine.compute_embedding(req.user_interest_query)
        scored_posts: List[CandidateFeedPost] = []

        for post in ECHO_CANDIDATE_POOL:
            post_vec = rag_engine.compute_embedding(post.headline)
            affinity_sim = max(0.0, float(np.dot(user_vec, post_vec)))
            rank_score = (
                req.w_outrage * post.outrage_intensity
                + req.w_affinity * affinity_sim
                + req.w_bridging_diversity * post.bridging_novelty
            )
            cloned = post.model_copy(
                update={"computed_rank_score": round(rank_score, 4)}
            )
            scored_posts.append(cloned)

        scored_posts.sort(key=lambda p: p.computed_rank_score, reverse=True)
        top_feed = scored_posts[: req.top_k]

        counts = Counter(p.cluster_stance for p in top_feed)
        total = max(1, len(top_feed))
        entropy = -sum((c / total) * math.log2(c / total) for c in counts.values() if c > 0)

        avg_outrage = sum(p.outrage_intensity for p in top_feed) / total
        echo_radius = round(max(0.05, 1.0 - (entropy / 2.0)), 3)
        drift_alert = avg_outrage > 0.65 or entropy < 1.1

        autonomy_score = round(
            min(100.0, max(15.0, (entropy / 1.58) * 60.0 + (1.0 - avg_outrage) * 40.0)), 1
        )

        rag_chunks = rag_engine.retrieve(
            query="EU DSA recommender transparency outrage profiling",
            module_domain="m5_echo",
            top_k=1,
        )
        citations = [c.source_id for c in rag_chunks]

        coach_agent = adk_runtime.build_llm_agent(
            name="depolarization_coach_agent",
            instruction="Explain how recommender weights affected Shannon viewpoint entropy and EU DSA Art. 27/38 rights.",
            task_complexity="FAST_REACTION",
        )
        explanation = (
            f"[{getattr(coach_agent, 'name', 'depolarization_coach_agent')}] Grounded in [{citations[0]}]: "
            f"With w_outrage={req.w_outrage:.2f} and w_bridging={req.w_bridging_diversity:.2f}, "
            f"feed Shannon entropy is {entropy:.2f} bits (Echo-Chamber Radius={echo_radius:.2f}). "
            f"{'HIGH POLARIZATION DRIFT: Increase bridging diversity weight to restore viewpoint balance.' if drift_alert else 'HEALTHY INFORMATION DIET: Bridging & empirical posts are counter-balancing outrage bait.'}"
        )

        passport_service.record_module_score(
            req.user_id, "m5_algo_echo", autonomy_score, explanation
        )

        return RecommenderSimulationResult(
            ranked_feed=top_feed,
            shannon_viewpoint_entropy=round(entropy, 3),
            echo_chamber_radius=echo_radius,
            polarization_drift_alert=drift_alert,
            autonomy_resilience_score=autonomy_score,
            adk_coach_explanation=explanation,
            dsa_compliance_citations=citations,
        )

    def get_router(self) -> APIRouter:
        router = APIRouter()

        @router.post("/simulate-feed", response_model=RecommenderSimulationResult)
        def simulate_recommender_feed(req: RecommenderTuningRequest):
            return self.simulate_feed(req)

        return router

    def get_golden_eval_cases(self) -> List[GoldenEvalCase]:
        return [
            GoldenEvalCase(
                case_id="m5-eval-outrage-vs-bridging-entropy",
                module_id="m5_algo_echo",
                description="Verify shifting weights from w_outrage=0.95 to w_bridging_diversity=0.95 increases Shannon entropy and clears polarization drift alert.",
                input_payload={},
                validator_fn=lambda pair: (
                    pair["bridging"].shannon_viewpoint_entropy >= pair["outrage"].shannon_viewpoint_entropy
                    and pair["bridging"].polarization_drift_alert is False
                    and pair["outrage"].polarization_drift_alert is True
                ),
            )
        ]


m5_plugin = Module5AlgoEchoPlugin()
platform_registry.register(m5_plugin)
