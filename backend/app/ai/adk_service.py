from __future__ import annotations
import json
import logging
import os
from typing import List, Optional, TYPE_CHECKING
from app.ai.schemas import AgentCommentary, SpoofedArticle, CrisisInjectPayload
from app.ai.prompt_templates import get_prompt
from app.ai.seed_library import SeedLibrary

if TYPE_CHECKING:
    from app.engine.token_governor import TokenGovernor

logger = logging.getLogger(__name__)


class ADKAgentService:
    """
    Coordinates Agent Development Kit (ADK) and Gemini 3.5 Flash inference
    with strict JSON response validation and offline SeedLibrary circuit breaker fallback.
    """

    def __init__(self):
        self._gemini_client = None
        self._initialized = False
        self._init_client()

    def _init_client(self):
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if api_key:
            try:
                from google import genai
                self._gemini_client = genai.Client(api_key=api_key)
                self._initialized = True
                logger.info("Google GenAI client initialized successfully")
            except Exception as e:
                logger.warning("Could not initialize Google GenAI client: %s; using SeedLibrary fallback", e)
        else:
            logger.info("No GEMINI_API_KEY found; ADKAgentService will utilize offline SeedLibrary")

    def generate_spoofed_article(
        self,
        language: str = "en",
        prompt: Optional[str] = None,
        cluster: Optional[str] = None,
        token_governor: Optional[TokenGovernor] = None
    ) -> SpoofedArticle:
        # Check circuit breaker
        if token_governor and token_governor.is_circuit_breaker_tripped():
            logger.info("Token circuit breaker tripped; serving offline seed article")
            return SeedLibrary.get_article(language=language, cluster=cluster)

        if not self._gemini_client:
            return SeedLibrary.get_article(language=language, cluster=cluster)

        try:
            formatted_prompt = get_prompt(
                "deepfake_article",
                language=language,
                cluster=cluster or "Hyper-Partisan A",
                prompt=prompt or "Rolling blackout rumors"
            )
            response = self._gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=formatted_prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": SpoofedArticle,
                }
            )
            if token_governor and hasattr(response, "usage_metadata") and response.usage_metadata:
                token_governor.record_usage(
                    prompt_tokens=response.usage_metadata.prompt_token_count or 150,
                    completion_tokens=response.usage_metadata.candidates_token_count or 200
                )
            elif token_governor:
                token_governor.record_usage(150, 200)

            article_data = json.loads(response.text)
            return SpoofedArticle(**article_data)
        except Exception as e:
            logger.warning("Live GenAI call failed (%s); falling back to seed library", e)
            if token_governor:
                token_governor.record_usage(50, 50)
            return SeedLibrary.get_article(language=language, cluster=cluster)

    def generate_influencer_comment(
        self,
        headline: str,
        body: str,
        outrage_score: float,
        persona: str = "investigative_journalist",
        language: str = "en",
        token_governor: Optional[TokenGovernor] = None
    ) -> AgentCommentary:
        if token_governor and token_governor.is_circuit_breaker_tripped():
            return SeedLibrary.get_influencer_comment(language=language, persona_role=persona)

        if not self._gemini_client:
            return SeedLibrary.get_influencer_comment(language=language, persona_role=persona)

        try:
            formatted_prompt = get_prompt(
                "influencer_comment",
                language=language,
                persona=persona,
                headline=headline,
                body=body,
                outrage=outrage_score
            )
            response = self._gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=formatted_prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": AgentCommentary,
                }
            )
            if token_governor and hasattr(response, "usage_metadata") and response.usage_metadata:
                token_governor.record_usage(
                    prompt_tokens=response.usage_metadata.prompt_token_count or 100,
                    completion_tokens=response.usage_metadata.candidates_token_count or 120
                )
            elif token_governor:
                token_governor.record_usage(100, 120)

            comment_data = json.loads(response.text)
            return AgentCommentary(**comment_data)
        except Exception as e:
            logger.warning("Live influencer GenAI failed (%s); using seed library", e)
            return SeedLibrary.get_influencer_comment(language=language, persona_role=persona)

    def generate_bot_comments(
        self,
        headline: str,
        count: int = 3,
        language: str = "en",
        token_governor: Optional[TokenGovernor] = None
    ) -> List[str]:
        # Bot comment storms can directly use the rich seed library or live API
        return SeedLibrary.get_bot_comments(language=language, count=count)

    def generate_crisis_inject(
        self,
        language: str = "en",
        token_governor: Optional[TokenGovernor] = None
    ) -> CrisisInjectPayload:
        return SeedLibrary.get_crisis_inject(language=language)


adk_service = ADKAgentService()
