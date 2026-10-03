# backend/app/models/progress.py
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ModuleCompletionRequest(BaseModel):
    module_id: str
    score: float = Field(default=85.0, ge=0.0, le=100.0)
    takeaway: Optional[str] = "Completed drill with defensive diligence."
    metadata: Optional[Dict[str, Any]] = None


class ModuleProgressRecord(BaseModel):
    module_id: str
    is_completed: bool = False
    best_score: float = 0.0
    points_earned: int = 0
    attempts: int = 0
    completed_at: Optional[float] = None
    takeaway: str = ""


class UserProgress(BaseModel):
    user_id: str
    cohort_id: str = "cohort_cyber_defense_2026"
    total_points: int = 0
    completed_modules: List[str] = Field(default_factory=list)
    module_records: Dict[str, ModuleProgressRecord] = Field(default_factory=dict)
    badges: List[str] = Field(default_factory=list)
    updated_at: float = Field(default_factory=lambda: time.time())


class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    display_name: str
    total_points: int
    completed_modules_count: int
    badges_count: int
    rank: int = 1
