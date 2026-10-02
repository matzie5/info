import time
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from app.models.session import UserRole
from app.models.node import DemographicCluster

class ActionType(str, Enum):
    # Red Team Actions
    DEPLOY_BOT_SWARM = "DEPLOY_BOT_SWARM"
    AI_DEEPFAKE_ARTICLE = "AI_DEEPFAKE_ARTICLE"
    MICROTARGET_CLUSTER = "MICROTARGET_CLUSTER"
    ASTROTURF_COMMENTS = "ASTROTURF_COMMENTS"
    
    # Blue Team Actions
    PREBUNK_CAMPAIGN = "PREBUNK_CAMPAIGN"
    EVIDENCE_DEBUNK = "EVIDENCE_DEBUNK"
    VELOCITY_FRICTION = "VELOCITY_FRICTION"
    PUBLIC_ADVISORY = "PUBLIC_ADVISORY"
    
    # Facilitator Injects
    CRISIS_INJECT = "CRISIS_INJECT"

class ActionConfig:
    COSTS = {
        ActionType.DEPLOY_BOT_SWARM: 25.0,
        ActionType.AI_DEEPFAKE_ARTICLE: 40.0,
        ActionType.MICROTARGET_CLUSTER: 20.0,
        ActionType.ASTROTURF_COMMENTS: 15.0,
        ActionType.PREBUNK_CAMPAIGN: 20.0,
        ActionType.EVIDENCE_DEBUNK: 25.0,
        ActionType.VELOCITY_FRICTION: 35.0,
        ActionType.PUBLIC_ADVISORY: 30.0,
        ActionType.CRISIS_INJECT: 0.0,
    }
    
    COOLDOWNS = {
        ActionType.DEPLOY_BOT_SWARM: 2,
        ActionType.AI_DEEPFAKE_ARTICLE: 4,
        ActionType.MICROTARGET_CLUSTER: 1,
        ActionType.ASTROTURF_COMMENTS: 1,
        ActionType.PREBUNK_CAMPAIGN: 2,
        ActionType.EVIDENCE_DEBUNK: 2,
        ActionType.VELOCITY_FRICTION: 3,
        ActionType.PUBLIC_ADVISORY: 3,
        ActionType.CRISIS_INJECT: 0,
    }

class PlayerAction(BaseModel):
    id: str
    session_id: str
    user_id: str
    team: UserRole
    action_type: ActionType
    target_post_id: Optional[str] = None
    target_cluster: Optional[DemographicCluster] = None
    custom_prompt: Optional[str] = None
    headline: Optional[str] = None
    content: Optional[str] = None
    resource_cost: float = 0.0
    tick: int = 0
    timestamp: float = Field(default_factory=lambda: time.time())
    is_processed: bool = False
