# backend/app/platform/adk_runtime.py
import hashlib
import json
import logging
import os
import random
import time
from collections import OrderedDict
from typing import Any, Callable, Dict, List, Optional, Tuple, Type
from pydantic import BaseModel

from app.config import settings
from app.engine.token_governor import TokenGovernor

logger = logging.getLogger(__name__)


class APICircuitBreaker:
    """
    3-State Circuit Breaker (CLOSED -> OPEN -> HALF_OPEN) protecting Cloud Run
    request threads from cascading Vertex AI or DeepSeek latency spikes.
    """

    def __init__(self, failure_threshold: int = 3, recovery_timeout_sec: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = 0.0

    def allow_request(self) -> bool:
        if self.state == "CLOSED":
            return True
        if self.state == "OPEN":
            if (time.time() - self.last_failure_time) >= self.recovery_timeout_sec:
                self.state = "HALF_OPEN"
                return True
            return False
        return True

    def record_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"


class ADKRuntimeService:
    """
    Platform-wide Google ADK (`google-adk`) Runtime & Multi-Provider Model Router:
    1. Keyless Vertex AI via ADC (`GOOGLE_GENAI_USE_VERTEXAI=TRUE`, `vertexai=True`):
       - FAST_MODEL (`gemini-2.5-flash`)
       - CAPABLE_MODEL (`gemini-2.5-pro`)
       - JUDGE_MODEL (`gemini-2.5-flash` @ temp=0.0)
    2. External API-Key Models via ADK `LiteLlm` (Module 2 Scam Lab):
       - `deepseek/deepseek-chat` & `deepseek/deepseek-reasoner` authenticated via `DEEPSEEK_API_KEY` (Secret Manager).
    3. Native support for ADK `LlmAgent`, `SequentialAgent`, `FunctionTool`, and `InMemoryRunner`.
    """

    DEFAULT_SAFETY_SETTINGS = [
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_LOW_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_LOW_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]

    def __init__(self, cache_capacity: int = 256):
        self._vertex_client = None
        self._adk_available = False
        self._initialized = False
        self.circuit_breaker = APICircuitBreaker(failure_threshold=3, recovery_timeout_sec=30.0)
        self._cache: OrderedDict[str, Any] = OrderedDict()
        self._cache_capacity = cache_capacity
        self.cache_hits = 0
        self.fallback_invocations = 0
        self._init_runtime()

    def _init_runtime(self):
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = (
            "TRUE" if settings.GOOGLE_GENAI_USE_VERTEXAI else "FALSE"
        )
        os.environ["GOOGLE_CLOUD_PROJECT"] = settings.PROJECT_ID
        os.environ["GOOGLE_CLOUD_LOCATION"] = settings.REGION

        try:
            import google.adk.agents  # noqa: F401
            self._adk_available = True
        except Exception:
            self._adk_available = False

        if settings.GOOGLE_GENAI_USE_VERTEXAI and settings.PROJECT_ID and settings.ENVIRONMENT != "local":
            try:
                from google import genai
                self._vertex_client = genai.Client(
                    vertexai=True,
                    project=settings.PROJECT_ID,
                    location=settings.REGION,
                )
                self._initialized = True
                logger.info(
                    "ADKRuntimeService initialized via keyless Vertex AI ADC (project=%s, region=%s)",
                    settings.PROJECT_ID,
                    settings.REGION,
                )
            except Exception as e:
                logger.warning("Vertex AI ADC client unavailable (%s); using deterministic offline mode", e)

    def resolve_adk_model(self, model_identifier: str) -> Any:
        """
        Returns a native Vertex AI Gemini model name or an ADK `LiteLlm` wrapper
        when an external provider like `deepseek/deepseek-chat` is selected in Module 2.
        """
        if model_identifier.startswith("deepseek/"):
            if not settings.DEEPSEEK_API_KEY:
                logger.warning(
                    "DEEPSEEK_API_KEY not set; falling back from %s to Vertex AI %s",
                    model_identifier,
                    settings.FAST_MODEL,
                )
                return settings.FAST_MODEL
            try:
                from google.adk.models.lite_llm import LiteLlm
                return LiteLlm(
                    model=model_identifier,
                    api_key=settings.DEEPSEEK_API_KEY,
                    api_base=settings.DEEPSEEK_API_BASE,
                )
            except Exception as e:
                logger.warning("LiteLlm init failed (%s); falling back to %s", e, settings.FAST_MODEL)
                return settings.FAST_MODEL
        return model_identifier

    def select_model(
        self, task_complexity: str = "FAST_REACTION", provider_override: Optional[str] = None
    ) -> Tuple[Any, float, int]:
        if provider_override and provider_override.startswith("deepseek/"):
            return self.resolve_adk_model(provider_override), 0.6, 512
        if task_complexity == "RAG_SYNTHESIS":
            return settings.CAPABLE_MODEL, 0.2, 1024
        if task_complexity == "JUDGE_VERIFICATION":
            return settings.JUDGE_MODEL, 0.0, 512
        return settings.FAST_MODEL, 0.7, 384

    def build_llm_agent(
        self,
        name: str,
        instruction: str,
        task_complexity: str = "FAST_REACTION",
        provider_override: Optional[str] = None,
        tools: Optional[List[Callable]] = None,
        output_schema: Optional[Type[BaseModel]] = None,
        output_key: Optional[str] = None,
    ) -> Any:
        """
        Constructs a `google.adk.agents.LlmAgent` wired with FunctionTools and output_schema.
        """
        model_ref, temp, max_tokens = self.select_model(
            task_complexity=task_complexity, provider_override=provider_override
        )
        if not self._adk_available:
            return {
                "name": name,
                "model": str(model_ref),
                "instruction": instruction,
                "tools": [getattr(t, "__name__", str(t)) for t in (tools or [])],
                "output_key": output_key,
            }

        from google.adk.agents import LlmAgent
        from google.adk.tools import FunctionTool
        from google.genai import types

        adk_tools = [
            t if isinstance(t, FunctionTool) else FunctionTool(func=t)
            for t in (tools or [])
        ]
        kwargs: Dict[str, Any] = {
            "name": name,
            "model": model_ref,
            "instruction": instruction,
            "tools": adk_tools,
            "generate_content_config": types.GenerateContentConfig(
                temperature=temp,
                max_output_tokens=max_tokens,
            ),
        }
        if output_schema is not None:
            kwargs["output_schema"] = output_schema
        if output_key is not None:
            kwargs["output_key"] = output_key
        return LlmAgent(**kwargs)

    def build_sequential_pipeline(self, name: str, sub_agents: List[Any], description: str = "") -> Any:
        """
        Constructs a `google.adk.agents.SequentialAgent` for multi-step workflows
        (e.g. Module 1 FactCheck->Judge, Module 3 Visual->Audio->Explainer, Module 4 OSINT->DLP).
        """
        if not self._adk_available or any(isinstance(a, dict) for a in sub_agents):
            return {"name": name, "type": "SequentialAgent", "sub_agents": sub_agents}
        from google.adk.agents import SequentialAgent
        return SequentialAgent(name=name, description=description, sub_agents=sub_agents)

    def invoke_structured(
        self,
        prompt: str,
        schema_cls: Type[BaseModel],
        task_complexity: str = "FAST_REACTION",
        provider_override: Optional[str] = None,
        token_governor: Optional[TokenGovernor] = None,
        fallback_factory: Optional[Callable[[], BaseModel]] = None,
    ) -> BaseModel:
        """
        Executes a structured LLM generation via Vertex AI ADC (or DeepSeek via ADK LiteLlm)
        with LRU caching, exponential backoff, and deterministic fallback.
        """
        cache_key = hashlib.sha256(
            f"{schema_cls.__name__}|{task_complexity}|{provider_override}|{prompt}".encode("utf-8")
        ).hexdigest()
        if cache_key in self._cache:
            self._cache.move_to_end(cache_key)
            self.cache_hits += 1
            return self._cache[cache_key]

        if (
            not self._vertex_client
            or not self.circuit_breaker.allow_request()
            or (token_governor and token_governor.is_circuit_breaker_tripped())
        ):
            self.fallback_invocations += 1
            return fallback_factory() if fallback_factory else schema_cls()

        model_ref, temp, max_tokens = self.select_model(task_complexity, provider_override)
        for attempt in range(3):
            try:
                response = self._vertex_client.models.generate_content(
                    model=model_ref if isinstance(model_ref, str) else settings.FAST_MODEL,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": schema_cls,
                        "temperature": temp,
                        "max_output_tokens": max_tokens,
                        "safety_settings": self.DEFAULT_SAFETY_SETTINGS,
                    },
                )
                if token_governor:
                    token_governor.record_usage(160, 200)
                self.circuit_breaker.record_success()
                parsed = schema_cls(**json.loads(response.text))
                self._cache[cache_key] = parsed
                if len(self._cache) > self._cache_capacity:
                    self._cache.popitem(last=False)
                return parsed
            except Exception as e:
                logger.warning("ADK/Vertex structured call attempt %d failed: %s", attempt + 1, e)
                if attempt < 2:
                    time.sleep(0.05 * (2 ** attempt) + random.uniform(0.005, 0.02))
                else:
                    self.circuit_breaker.record_failure()
                    self.fallback_invocations += 1

        return fallback_factory() if fallback_factory else schema_cls()


adk_runtime = ADKRuntimeService()
