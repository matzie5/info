from __future__ import annotations
import logging
from typing import List, Optional, TYPE_CHECKING

from app.config import settings
from app.ai.schemas import AgentCommentary, SpoofedArticle, CrisisInjectPayload
from app.ai.prompt_templates import get_prompt
from app.ai.seed_library import SeedLibrary

if TYPE_CHECKING:
    from app.engine.token_governor import TokenGovernor

logger = logging.getLogger(__name__)


class ADKAgentService:
    """
    Coordinates Google ADK (google-adk) runtime inference, DLP guardrails,
    and multi-corpus RAG grounding via keyless Vertex AI ADC with offline SeedLibrary fallback.
    """

    def __init__(self):
        from app.platform.adk_runtime import adk_runtime
        from app.platform.dlp_guardrail import dlp_guardrail
        from app.platform.rag_engine import rag_engine

        self.runtime = adk_runtime
        self.dlp = dlp_guardrail
        self.rag = rag_engine

    def generate_spoofed_article(
        self,
        language: str = "en",
        prompt: Optional[str] = None,
        cluster: Optional[str] = None,
        token_governor: Optional[TokenGovernor] = None,
    ) -> SpoofedArticle:
        # Check circuit breaker (>=100% budget)
        if token_governor and token_governor.is_circuit_breaker_tripped():
            logger.info("Token circuit breaker tripped; serving offline seed article")
            return SeedLibrary.get_article(language=language, cluster=cluster)

        # Check throttled tier (75%–99% budget)
        if token_governor and token_governor.is_throttled():
            logger.warning("Token budget throttled (75%%-99%% tier); serving offline seed article")
            return SeedLibrary.get_article(language=language, cluster=cluster)

        # Sanitize custom prompt with DLP guardrail
        clean_prompt = prompt
        if prompt:
            inspection = self.dlp.inspect_and_sanitize(prompt)
            if not inspection.is_allowed:
                logger.warning(
                    "Prompt blocked by DLP safety guardrail (%s); falling back to seed article",
                    inspection.triggered_rule,
                )
                return SeedLibrary.get_article(language=language, cluster=cluster)
            clean_prompt = inspection.sanitized_text

        formatted_prompt = get_prompt(
            "deepfake_article",
            language=language,
            cluster=cluster or "Hyper-Partisan A",
            prompt=clean_prompt or "Rolling blackout rumors",
        )

        return self.runtime.invoke_structured(
            prompt=formatted_prompt,
            schema_cls=SpoofedArticle,
            task_complexity="FAST_REACTION",
            token_governor=token_governor,
            fallback_factory=lambda: SeedLibrary.get_article(language=language, cluster=cluster),
        )

    def generate_influencer_comment(
        self,
        headline: str,
        body: str,
        outrage_score: float,
        persona: str = "investigative_journalist",
        language: str = "en",
        token_governor: Optional[TokenGovernor] = None,
    ) -> AgentCommentary:
        # Check circuit breaker (>=100% budget)
        if token_governor and token_governor.is_circuit_breaker_tripped():
            logger.info("Token circuit breaker tripped; serving offline seed commentary")
            return SeedLibrary.get_influencer_comment(language=language, persona_role=persona)

        # Check throttled tier (75%–99% budget)
        if token_governor and token_governor.is_throttled():
            logger.warning("Token budget throttled (75%%-99%% tier); serving offline seed commentary")
            return SeedLibrary.get_influencer_comment(language=language, persona_role=persona)

        clean_headline = self.dlp.inspect_and_sanitize(headline).sanitized_text
        clean_body = self.dlp.inspect_and_sanitize(body).sanitized_text

        formatted_prompt = get_prompt(
            "influencer_comment",
            language=language,
            persona=persona,
            headline=clean_headline,
            body=clean_body,
            outrage=outrage_score,
        )

        return self.runtime.invoke_structured(
            prompt=formatted_prompt,
            schema_cls=AgentCommentary,
            task_complexity="FAST_REACTION",
            token_governor=token_governor,
            fallback_factory=lambda: SeedLibrary.get_influencer_comment(
                language=language, persona_role=persona
            ),
        )

    def generate_bot_comments(
        self,
        headline: str,
        count: int = 3,
        language: str = "en",
        token_governor: Optional[TokenGovernor] = None,
    ) -> List[str]:
        if token_governor and token_governor.is_throttled():
            count = max(1, count - 1)
        return SeedLibrary.get_bot_comments(language=language, count=count)

    def generate_crisis_inject(
        self,
        language: str = "en",
        token_governor: Optional[TokenGovernor] = None,
        scenario_id: Optional[str] = None,
    ) -> CrisisInjectPayload:
        base_inject = SeedLibrary.get_crisis_inject(scenario_id=scenario_id, language=language)

        if settings.ENABLE_RAG_GROUNDING:
            chunks = self.rag.retrieve(
                "HVDC grid frequency reserve",
                module_domain="m1_disinfo",
                top_k=1,
            )
            citation = f"[{chunks[0].source_id}]" if chunks else "[PSE-GRID-2026-001]"
            statement = base_inject.official_statement
            if citation not in statement:
                statement = f"{statement} Verified authority citation: {citation}."
            return CrisisInjectPayload(
                title=base_inject.title,
                official_statement=statement,
                institution=base_inject.institution,
                severity=base_inject.severity,
                trust_impact=base_inject.trust_impact,
            )
        return base_inject


adk_service = ADKAgentService()
