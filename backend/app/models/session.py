import time
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, model_validator

class SessionStatus(str, Enum):
    LOBBY = "LOBBY"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"

class UserRole(str, Enum):
    FACILITATOR = "FACILITATOR"
    RED_TEAM = "RED_TEAM"
    BLUE_TEAM = "BLUE_TEAM"
    OBSERVER = "OBSERVER"

class SimulationMetrics(BaseModel):
    virality_index: float = Field(default=0.0, ge=0.0, le=100.0)
    polarization_score: float = Field(default=15.0, ge=0.0, le=100.0)
    institutional_trust: float = Field(default=75.0, ge=0.0, le=100.0)
    disinformation_reach: float = Field(default=0.0, ge=0.0, le=100.0)
    debunk_effectiveness: float = Field(default=0.0, ge=0.0, le=100.0)

class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd_estimated: float = 0.0
    budget_limit_tokens: int = 300000
    is_throttled: bool = False
    is_circuit_breaker_tripped: bool = False
    requests_count: int = 0

class TeamBudgets(BaseModel):
    red_team_capital: float = Field(default=50.0, ge=0.0, le=100.0)
    blue_team_bandwidth: float = Field(default=50.0, ge=0.0, le=100.0)
    red_cooldowns: Dict[str, int] = Field(default_factory=dict)
    blue_cooldowns: Dict[str, int] = Field(default_factory=dict)

class PlayerPresence(BaseModel):
    user_id: str
    role: UserRole
    handle: str
    last_heartbeat: float = Field(default_factory=lambda: time.time())
    is_active: bool = True

class StudioScenario(BaseModel):
    id: str
    platform_mock: str = "WHATSAPP"  # "WHATSAPP" | "TIKTOK" | "FACEBOOK" | "YOUTUBE" | "BROWSER"
    threat_category: str = "DEEPFAKE_AUDIO"  # "DEEPFAKE_AUDIO" | "DEEPFAKE_VIDEO" | "PHISHING" | "DISINFORMATION" | "ASTROTURFING"
    author: str
    author_handle: Optional[str] = None
    author_avatar: Optional[str] = None
    verified: bool = False
    title: str
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # "AUDIO" | "VIDEO" | "IMAGE" | "URL"
    red_flags: List[str] = Field(default_factory=list)
    safe_action_advice: str = ""
    is_authentic: bool = False

class StudioParticipant(BaseModel):
    username: str
    display_name: Optional[str] = None
    password: Optional[str] = ""
    ui_language_override: Optional[str] = None
    completed_scenarios: List[str] = Field(default_factory=list)
    score: int = 0
    connected: bool = False

class TrainerBroadcast(BaseModel):
    id: str
    timestamp: float = Field(default_factory=lambda: time.time())
    text: str = ""
    message: Optional[str] = None
    urgency: str = "INFO"  # "INFO" | "HINT" | "ALERT"
    severity: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            text = data.get("text") or data.get("message") or ""
            data["text"] = text
            data["message"] = text
            severity = data.get("severity") or data.get("urgency") or "hint"
            data["severity"] = str(severity).lower()
            data["urgency"] = str(severity).upper()
        return data

class Session(BaseModel):
    id: str
    scenario_id: str = "poland-grid-panic-2026"
    title: str = "Poland Power Grid Panic 2026"
    language: str = "en"
    audience_mode: str = "professional"  # "professional" | "kids" | "seniors"
    location_name: Optional[str] = None
    status: SessionStatus = SessionStatus.LOBBY
    current_tick: int = 0
    max_ticks: int = 40
    time_per_tick_seconds: int = 10
    created_at: float = Field(default_factory=lambda: time.time())
    updated_at: float = Field(default_factory=lambda: time.time())
    metrics: SimulationMetrics = Field(default_factory=SimulationMetrics)
    token_usage: TokenUsage = Field(default_factory=TokenUsage)
    budgets: TeamBudgets = Field(default_factory=TeamBudgets)
    players: Dict[str, PlayerPresence] = Field(default_factory=dict)
    history_metrics: List[Dict] = Field(default_factory=list)
    scenarios: List[StudioScenario] = Field(default_factory=list)
    roster: Dict[str, StudioParticipant] = Field(default_factory=dict)
    trainer_token: str = ""
    broadcast_hints: List[TrainerBroadcast] = Field(default_factory=list)
    submissions: List[Dict] = Field(default_factory=list)
