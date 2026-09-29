import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_ID: str = Field(default="infosphere-511", alias="PROJECT_ID")
    REGION: str = Field(default="europe-west1", alias="REGION")
    ASSETS_BUCKET: str = Field(default="infosphere-511-infosphere-assets", alias="ASSETS_BUCKET")
    CLOUD_TASKS_QUEUE: str = Field(
        default="projects/infosphere-511/locations/europe-west1/queues/simulation-ticks-queue",
        alias="CLOUD_TASKS_QUEUE"
    )
    PUBSUB_TOPIC: str = Field(
        default="projects/infosphere-511/topics/session-ai-tasks",
        alias="PUBSUB_TOPIC"
    )
    JWT_SECRET: str = Field(default="infosphere-jwt-super-secret-key-change-in-prod-38294", alias="JWT_SECRET")
    TICK_INTERVAL_SECONDS: int = Field(default=10, alias="TICK_INTERVAL_SECONDS")
    INACTIVITY_TIMEOUT_SECONDS: int = Field(default=60, alias="INACTIVITY_TIMEOUT_SECONDS")
    DEFAULT_SIMULATION_NODES: int = Field(default=500, alias="DEFAULT_SIMULATION_NODES")
    SERVICE_URL: str = Field(default="", alias="SERVICE_URL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
