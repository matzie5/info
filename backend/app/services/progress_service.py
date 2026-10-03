# backend/app/services/progress_service.py
import logging
import time
from typing import Any, Dict, List, Optional

from app.models.progress import (
    LeaderboardEntry,
    ModuleCompletionRequest,
    ModuleProgressRecord,
    UserProgress,
)
from app.platform.passport_service import passport_service
from app.services.cohort_service import cohort_service
from app.services.user_service import user_service

logger = logging.getLogger(__name__)

MODULE_BADGES = {
    "m1_disinfo": "DISINFO_DEFENDER",
    "m2_scam_lab": "SCAM_RESILIENT",
    "m3_deepfake_lab": "SYNTHID_FORENSIC",
    "m4_osint_lab": "DLP_GUARDIAN",
    "m5_algo_echo": "ECHO_CHAMBER_BREAKER",
}

ALL_MODULE_IDS = ["m1_disinfo", "m2_scam_lab", "m3_deepfake_lab", "m4_osint_lab", "m5_algo_echo"]


class ProgressService:
    _instance: Optional["ProgressService"] = None

    def __init__(self):
        self._progress: Dict[str, UserProgress] = {}
        self._seed_default_progress()

    @classmethod
    def get_instance(cls) -> "ProgressService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _seed_default_progress(self):
        # Seed Player 1 with baseline progress in M1 & M2
        p1 = self._get_or_create_progress("user_player1", "cohort_cyber_defense_2026")
        p1.module_records["m1_disinfo"] = ModuleProgressRecord(
            module_id="m1_disinfo",
            is_completed=True,
            best_score=88.0,
            points_earned=100,
            attempts=1,
            completed_at=time.time() - 7200,
            takeaway="Inoculated 320 grid nodes against blackout panic.",
        )
        p1.module_records["m2_scam_lab"] = ModuleProgressRecord(
            module_id="m2_scam_lab",
            is_completed=True,
            best_score=92.5,
            points_earned=150,
            attempts=2,
            completed_at=time.time() - 3600,
            takeaway="Identified BEC payroll detour and verified via callback.",
        )
        p1.completed_modules = ["m1_disinfo", "m2_scam_lab"]
        p1.total_points = 250
        p1.badges = ["DISINFO_DEFENDER", "SCAM_RESILIENT"]
        passport_service.record_module_score("user_player1", "m1_disinfo", 88.0, "Inoculated 320 grid nodes.")
        passport_service.record_module_score("user_player1", "m2_scam_lab", 92.5, "Verified BEC payroll callback.")

        # Seed Player 2 with baseline progress in M2
        p2 = self._get_or_create_progress("user_player2", "cohort_cyber_defense_2026")
        p2.module_records["m2_scam_lab"] = ModuleProgressRecord(
            module_id="m2_scam_lab",
            is_completed=True,
            best_score=78.0,
            points_earned=150,
            attempts=1,
            completed_at=time.time() - 1800,
            takeaway="Detected typo-squatted domain header.",
        )
        p2.completed_modules = ["m2_scam_lab"]
        p2.total_points = 150
        p2.badges = ["SCAM_RESILIENT"]
        passport_service.record_module_score("user_player2", "m2_scam_lab", 78.0, "Detected typo-squatted domain.")

    def _get_or_create_progress(self, user_id: str, cohort_id: Optional[str] = None) -> UserProgress:
        if user_id not in self._progress:
            c_id = cohort_id or "cohort_cyber_defense_2026"
            # Initialize empty module records for all 5 modules
            records = {
                mod: ModuleProgressRecord(module_id=mod)
                for mod in ALL_MODULE_IDS
            }
            self._progress[user_id] = UserProgress(
                user_id=user_id,
                cohort_id=c_id,
                total_points=0,
                completed_modules=[],
                module_records=records,
                badges=[],
                updated_at=time.time(),
            )
        return self._progress[user_id]

    def get_user_progress(self, user_id: str, cohort_id: Optional[str] = None) -> UserProgress:
        progress = self._get_or_create_progress(user_id, cohort_id)
        # Ensure all 5 module slots exist in records
        for mod in ALL_MODULE_IDS:
            if mod not in progress.module_records:
                progress.module_records[mod] = ModuleProgressRecord(module_id=mod)
        return progress

    def complete_module(
        self, user_id: str, req: ModuleCompletionRequest
    ) -> UserProgress:
        user = user_service.get_user_by_id(user_id)
        cohort_id = user.cohort_id if user and user.cohort_id else "cohort_cyber_defense_2026"
        cohort = cohort_service.get_cohort(cohort_id)

        # Inspect cohort module configuration
        pass_score = 70.0
        points_reward = 150
        if cohort and req.module_id in cohort.module_configs:
            cfg = cohort.module_configs[req.module_id]
            pass_score = cfg.pass_score
            points_reward = cfg.points_reward

        progress = self._get_or_create_progress(user_id, cohort_id)
        record = progress.module_records.get(
            req.module_id, ModuleProgressRecord(module_id=req.module_id)
        )

        record.attempts += 1
        record.best_score = max(record.best_score, req.score)
        record.takeaway = req.takeaway or record.takeaway

        is_passing = req.score >= pass_score

        if is_passing:
            if not record.is_completed:
                record.is_completed = True
                record.points_earned = points_reward
                record.completed_at = time.time()
                progress.total_points += points_reward
                if req.module_id not in progress.completed_modules:
                    progress.completed_modules.append(req.module_id)

            # Award module badge
            badge = MODULE_BADGES.get(req.module_id)
            if badge and badge not in progress.badges:
                progress.badges.append(badge)

            # Master badge if all 5 modules completed
            if len(progress.completed_modules) >= 5 and "COGNITIVE_SHIELD_MASTER" not in progress.badges:
                progress.badges.append("COGNITIVE_SHIELD_MASTER")

        progress.module_records[req.module_id] = record
        progress.updated_at = time.time()

        # Update Passport Service automatically
        passport_service.record_module_score(
            subject_id=user_id,
            module_id=req.module_id,
            score=record.best_score,
            takeaway=record.takeaway,
        )

        return progress

    def get_cohort_leaderboard(self, cohort_id: str) -> List[LeaderboardEntry]:
        cohort = cohort_service.get_cohort(cohort_id)
        assigned_uids = cohort.assigned_user_ids if cohort else []

        entries = []
        for uid in assigned_uids:
            prog = self.get_user_progress(uid, cohort_id)
            user = user_service.get_user_by_id(uid)
            display_name = user.display_name if user else uid
            username = user.username if user else uid
            entries.append({
                "user_id": uid,
                "username": username,
                "display_name": display_name,
                "total_points": prog.total_points,
                "completed_modules_count": len(prog.completed_modules),
                "badges_count": len(prog.badges),
            })

        # Rank by total_points descending, then completed_modules_count
        entries.sort(key=lambda x: (x["total_points"], x["completed_modules_count"]), reverse=True)
        for i, entry in enumerate(entries):
            entry["rank"] = i + 1

        return [LeaderboardEntry(**e) for e in entries]

    def get_cohort_analytics(self, cohort_id: str) -> Dict[str, Any]:
        cohort = cohort_service.get_cohort(cohort_id)
        if not cohort:
            return {"error": f"Cohort {cohort_id} not found"}

        assigned_uids = cohort.assigned_user_ids
        total_members = len(assigned_uids)
        if total_members == 0:
            return {
                "cohort_id": cohort_id,
                "cohort_name": cohort.name,
                "total_members": 0,
                "average_points": 0,
                "module_completion_rates": {},
                "average_module_scores": {},
            }

        module_completions = {m: 0 for m in ALL_MODULE_IDS}
        module_scores = {m: [] for m in ALL_MODULE_IDS}
        total_pts_sum = 0

        for uid in assigned_uids:
            prog = self.get_user_progress(uid, cohort_id)
            total_pts_sum += prog.total_points
            for mod in ALL_MODULE_IDS:
                rec = prog.module_records.get(mod)
                if rec and rec.is_completed:
                    module_completions[mod] += 1
                if rec and rec.best_score > 0:
                    module_scores[mod].append(rec.best_score)

        completion_rates = {
            m: round((module_completions[m] / total_members) * 100, 1)
            for m in ALL_MODULE_IDS
        }
        average_scores = {
            m: round(sum(module_scores[m]) / max(1, len(module_scores[m])), 1)
            for m in ALL_MODULE_IDS
        }

        return {
            "cohort_id": cohort_id,
            "cohort_name": cohort.name,
            "total_members": total_members,
            "average_points": round(total_pts_sum / total_members, 1),
            "module_completion_rates": completion_rates,
            "average_module_scores": average_scores,
            "leaderboard": [e.model_dump() for e in self.get_cohort_leaderboard(cohort_id)],
        }


progress_service = ProgressService.get_instance()
