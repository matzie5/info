# backend/app/models/cohort.py
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CohortModuleConfig(BaseModel):
    enabled: bool = True
    pass_score: float = Field(default=70.0, ge=0.0, le=100.0)
    points_reward: int = Field(default=150, ge=0)
    parameters: Dict[str, Any] = Field(default_factory=dict)


class Cohort(BaseModel):
    id: str
    name: str
    description: str = ""
    created_by: str = "admin"
    created_at: float = Field(default_factory=lambda: time.time())
    is_active: bool = True
    module_configs: Dict[str, CohortModuleConfig] = Field(default_factory=dict)
    assigned_user_ids: List[str] = Field(default_factory=list)


class CreateCohortRequest(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    module_configs: Optional[Dict[str, CohortModuleConfig]] = None
    assigned_user_ids: Optional[List[str]] = None


class UpdateCohortConfigRequest(BaseModel):
    module_configs: Dict[str, CohortModuleConfig]


class AssignUserCohortRequest(BaseModel):
    user_id: str
