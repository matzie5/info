# backend/app/config.py
import os
import secrets
from typing import List, Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: Literal["local", "dev", "staging", "prod"] = Field(
        default="local", alias="ENVIRONMENT"
    )
    PROJECT_ID: str = Field(default="infosphere-511", alias="PROJECT_ID")
    REGION: str = Field(default="europe-west1", alias="REGION")
    DATA_RESIDENCY_REGION: str = Field(default="europe-west1", alias="DATA_RESIDENCY_REGION")

    # Keyless Vertex AI via Application Default Credentials (eliminates GEMINI_API_KEY)
    GOOGLE_GENAI_USE_VERTEXAI: bool = Field(default=True, alias="GOOGLE_GENAI_USE_VERTEXAI")

    ASSETS_BUCKET: str = Field(
        default="infosphere-511-infosphere-assets", alias="ASSETS_BUCKET"
    )
    GOOGLE_API_KEY: str = Field(default="", alias="GOOGLE_API_KEY")
    GEMINI_API_KEY: str = Field(default="", alias="GEMINI_API_KEY")
    IMAGEN_MODEL: str = Field(default="imagen-3.0-generate-002", alias="IMAGEN_MODEL")
    TTS_DEFAULT_VOICE_PL: str = Field(default="pl-PL-Wavenet-B", alias="TTS_DEFAULT_VOICE_PL")
    TTS_DEFAULT_VOICE_EN: str = Field(default="en-US-Journey-F", alias="TTS_DEFAULT_VOICE_EN")
    CLOUD_TASKS_QUEUE: str = Field(
        default="projects/infosphere-511/locations/europe-west1/queues/simulation-ticks-queue",
        alias="CLOUD_TASKS_QUEUE",
    )
    PUBSUB_TOPIC: str = Field(
        default="projects/infosphere-511/topics/session-ai-tasks",
        alias="PUBSUB_TOPIC",
    )
    SERVICE_ACCOUNT_EMAIL: str = Field(
        default="infosphere-engine-sa@infosphere-511.iam.gserviceaccount.com",
        alias="SERVICE_ACCOUNT_EMAIL",
    )

    # Ephemeral cryptographic secret in local dev; injected from Secret Manager in staging/prod
    JWT_SECRET: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32), alias="JWT_SECRET"
    )
    JWT_PREVIOUS_SECRET: str = Field(default="", alias="JWT_PREVIOUS_SECRET")
    ENFORCE_AUTH: bool = Field(default=False, alias="ENFORCE_AUTH")
    ALLOWED_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:4200",
            "https://infosphere-511.web.app",
            "https://infosphere-511.firebaseapp.com",
        ],
        alias="ALLOWED_ORIGINS",
    )

    # 3-Tier Vertex AI Model Routing (Keyless ADC)
    FAST_MODEL: str = Field(default="gemini-2.5-flash", alias="FAST_MODEL")
    CAPABLE_MODEL: str = Field(default="gemini-2.5-pro", alias="CAPABLE_MODEL")
    JUDGE_MODEL: str = Field(default="gemini-2.5-flash", alias="JUDGE_MODEL")
    EMBEDDING_MODEL: str = Field(default="text-embedding-004", alias="EMBEDDING_MODEL")

    # Module 2 External Model Integration (DeepSeek via Secret Manager API Key + ADK LiteLlm)
    DEEPSEEK_API_KEY: str = Field(default="", alias="DEEPSEEK_API_KEY")
    DEEPSEEK_API_BASE: str = Field(default="https://api.deepseek.com/v1", alias="DEEPSEEK_API_BASE")
    DEEPSEEK_CHAT_MODEL: str = Field(default="deepseek/deepseek-chat", alias="DEEPSEEK_CHAT_MODEL")
    DEEPSEEK_REASONER_MODEL: str = Field(
        default="deepseek/deepseek-reasoner", alias="DEEPSEEK_REASONER_MODEL"
    )

    # Feature Flags & AI Lifecycle Experiment Config
    ENABLE_RAG_GROUNDING: bool = Field(default=True, alias="ENABLE_RAG_GROUNDING")
    ENABLE_STRICT_GUARDRAILS: bool = Field(default=True, alias="ENABLE_STRICT_GUARDRAILS")
    ENABLE_ASYNC_PUBSUB: bool = Field(default=False, alias="ENABLE_ASYNC_PUBSUB")
    PROMPT_EXPERIMENT_VARIANT: Literal["v1.0-baseline", "v2.0-cot-grounded", "ab_split"] = Field(
        default="v2.0-cot-grounded", alias="PROMPT_EXPERIMENT_VARIANT"
    )

    # Simulation Clock & Cost Governance Parameters
    TICK_INTERVAL_SECONDS: int = Field(default=10, alias="TICK_INTERVAL_SECONDS")
    INACTIVITY_TIMEOUT_SECONDS: int = Field(default=60, alias="INACTIVITY_TIMEOUT_SECONDS")
    DEFAULT_SIMULATION_NODES: int = Field(default=500, alias="DEFAULT_SIMULATION_NODES")
    DEFAULT_TOKEN_BUDGET: int = Field(default=300000, alias="DEFAULT_TOKEN_BUDGET")
    SERVICE_URL: str = Field(default="", alias="SERVICE_URL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# Export standard Vertex AI environment variables consumed by google-adk and google-genai
os.environ.setdefault(
    "GOOGLE_GENAI_USE_VERTEXAI", "TRUE" if settings.GOOGLE_GENAI_USE_VERTEXAI else "FALSE"
)
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", settings.PROJECT_ID)
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", settings.REGION)
