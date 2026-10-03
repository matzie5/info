# backend/app/services/cohort_service.py
import logging
import time
from typing import Any, Dict, List, Optional

from app.models.cohort import (
    Cohort,
    CohortModuleConfig,
    CreateCohortRequest,
    UpdateCohortConfigRequest,
)

logger = logging.getLogger(__name__)


class CohortService:
    _instance: Optional["CohortService"] = None

    def __init__(self):
        self._cohorts: Dict[str, Cohort] = {}
        self._seed_default_cohort()

    @classmethod
    def get_instance(cls) -> "CohortService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _seed_default_cohort(self):
        default_configs = {
            "m1_disinfo": CohortModuleConfig(
                enabled=True,
                pass_score=60.0,
                points_reward=100,
                parameters={
                    "scenario_id": "poland-grid-panic-2026",
                    "max_ticks": 40,
                },
            ),
            "m2_scam_lab": CohortModuleConfig(
                enabled=True,
                pass_score=70.0,
                points_reward=150,
                parameters={
                    "allowed_models": [
                        "gemini-2.5-flash",
                        "deepseek/deepseek-chat",
                        "deepseek/deepseek-reasoner",
                    ],
                },
            ),
            "m3_deepfake_lab": CohortModuleConfig(
                enabled=True,
                pass_score=75.0,
                points_reward=150,
                parameters={
                    "require_c2pa_check": True,
                    "require_synthid": True,
                },
            ),
            "m4_osint_lab": CohortModuleConfig(
                enabled=True,
                pass_score=70.0,
                points_reward=150,
                parameters={
                    "dlp_strictness": "HIGH",
                },
            ),
            "m5_algo_echo": CohortModuleConfig(
                enabled=True,
                pass_score=70.0,
                points_reward=150,
                parameters={
                    "target_entropy": 1.0,
                    "max_echo_radius": 0.45,
                },
            ),
        }

        default_cohort = Cohort(
            id="cohort_cyber_defense_2026",
            name="National Cybersecurity Cohort 2026",
            description="Operational training cohort for cognitive defense, synthetic forensics, and anti-phishing.",
            created_by="user_admin",
            created_at=time.time(),
            is_active=True,
            module_configs=default_configs,
            assigned_user_ids=["user_player1", "user_player2"],
        )
        self._cohorts[default_cohort.id] = default_cohort

    def create_cohort(
        self, req: CreateCohortRequest, created_by: str = "admin"
    ) -> Cohort:
        if req.id in self._cohorts:
            raise ValueError(f"Cohort '{req.id}' already exists.")

        module_configs = req.module_configs or {
            f"m{i}": CohortModuleConfig(points_reward=150) for i in range(1, 6)
        }
        cohort = Cohort(
            id=req.id.strip(),
            name=req.name.strip(),
            description=(req.description or "").strip(),
            created_by=created_by,
            created_at=time.time(),
            is_active=True,
            module_configs=module_configs,
            assigned_user_ids=req.assigned_user_ids or [],
        )
        self._cohorts[cohort.id] = cohort
        return cohort

    def get_cohort(self, cohort_id: str) -> Optional[Cohort]:
        return self._cohorts.get(cohort_id)

    def list_cohorts(self) -> List[Cohort]:
        return list(self._cohorts.values())

    def update_cohort_config(
        self, cohort_id: str, req: UpdateCohortConfigRequest
    ) -> Cohort:
        cohort = self.get_cohort(cohort_id)
        if not cohort:
            raise KeyError(f"Cohort '{cohort_id}' not found.")
        cohort.module_configs.update(req.module_configs)
        return cohort

    def assign_user_to_cohort(self, cohort_id: str, user_id: str) -> Cohort:
        cohort = self.get_cohort(cohort_id)
        if not cohort:
            raise KeyError(f"Cohort '{cohort_id}' not found.")
        if user_id not in cohort.assigned_user_ids:
            cohort.assigned_user_ids.append(user_id)
        return cohort


cohort_service = CohortService.get_instance()
