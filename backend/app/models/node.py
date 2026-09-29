from enum import Enum
from typing import List
from pydantic import BaseModel, Field

class DemographicCluster(str, Enum):
    HYPER_PARTISAN_A = "Hyper-Partisan A"
    HYPER_PARTISAN_B = "Hyper-Partisan B"
    INSTITUTIONAL_SKEPTICS = "Institutional Skeptics"
    SUSCEPTIBLE_NEUTRALS = "Susceptible Neutrals"
    APOLITICAL_YOUTH = "Apolitical Youth"

class NodeBehaviorState(str, Enum):
    UNAWARE = "UNAWARE"
    EXPOSED = "EXPOSED"
    BELIEVING = "BELIEVING"
    SHARING = "SHARING"
    DEBUNKING = "DEBUNKING"

class AudienceNode(BaseModel):
    index: int
    cluster: DemographicCluster
    trust: float = Field(default=0.7, ge=0.0, le=1.0)
    outrage_sensitivity: float = Field(default=0.5, ge=0.0, le=1.0)
    ideological_bias: float = Field(default=0.0, ge=-1.0, le=1.0)
    confirmation_bias: float = Field(default=0.5, ge=0.0, le=1.0)
    prebunk_shield: float = Field(default=0.0, ge=0.0, le=1.0)
    state: NodeBehaviorState = NodeBehaviorState.UNAWARE
    exposed_posts: List[str] = Field(default_factory=list)
    shared_posts: List[str] = Field(default_factory=list)
