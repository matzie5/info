# backend/app/platform/passport_service.py
from datetime import datetime, timezone
from typing import Any, Dict, List
import uuid
from pydantic import BaseModel, Field


class ModuleScoreEntry(BaseModel):
    module_id: str
    dimension_label: str
    score: float = Field(default=50.0, ge=0.0, le=100.0)
    completed_exercises: int = 0
    last_takeaway: str = Field(default="Pending lab completion")


class DigitalHygienePassport(BaseModel):
    user_or_session_id: str
    overall_hygiene_index: float
    maturity_tier: str
    dimensions: Dict[str, ModuleScoreEntry]
    recommendations: List[str]


class DigitalHygienePassportService:
    DEFAULT_DIMENSIONS = {
        "m1_disinfo": ("Macro Narrative & CIB Defense", 60.0),
        "m2_scam_lab": ("Social Engineering & Phishing Resilience", 50.0),
        "m3_deepfake_lab": ("Synthetic Media & Deepfake Literacy", 50.0),
        "m4_osint_exposure": ("OSINT Footprint & DLP Hygiene", 50.0),
        "m5_algo_echo": ("Algorithmic & Echo-Chamber Autonomy", 50.0),
    }

    def __init__(self):
        self._store: Dict[str, Dict[str, ModuleScoreEntry]] = {}

    def _ensure_entry(self, subject_id: str) -> Dict[str, ModuleScoreEntry]:
        if subject_id not in self._store:
            self._store[subject_id] = {
                mod_id: ModuleScoreEntry(
                    module_id=mod_id,
                    dimension_label=label,
                    score=default_score,
                    completed_exercises=0,
                    last_takeaway="Baseline diagnostic initialized.",
                )
                for mod_id, (label, default_score) in self.DEFAULT_DIMENSIONS.items()
            }
        return self._store[subject_id]

    def record_module_score(
        self, subject_id: str, module_id: str, score: float, takeaway: str
    ) -> DigitalHygienePassport:
        dims = self._ensure_entry(subject_id)
        if module_id in dims:
            entry = dims[module_id]
            entry.score = round(max(0.0, min(100.0, score)), 1)
            entry.completed_exercises += 1
            entry.last_takeaway = takeaway
        return self.get_passport(subject_id)

    def get_passport(self, subject_id: str) -> DigitalHygienePassport:
        dims = self._ensure_entry(subject_id)
        scores = [d.score for d in dims.values()]
        overall = round(sum(scores) / max(1, len(scores)), 1)
        if overall >= 80.0:
            tier = "RESILIENT_DEFENDER"
        elif overall >= 60.0:
            tier = "AWARE_OPERATOR"
        else:
            tier = "HIGH_EXPOSURE_RISK"

        recs = [
            f"[{d.dimension_label}] {d.last_takeaway}"
            for d in sorted(dims.values(), key=lambda x: x.score)[:2]
        ]
        return DigitalHygienePassport(
            user_or_session_id=subject_id,
            overall_hygiene_index=overall,
            maturity_tier=tier,
            dimensions=dims,
            recommendations=recs,
        )

    def export_stix21_bundle(self, subject_id: str) -> Dict[str, Any]:
        passport = self.get_passport(subject_id)
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        return {
            "type": "bundle",
            "id": f"bundle--{uuid.uuid4()}",
            "spec_version": "2.1",
            "objects": [
                {
                    "type": "identity",
                    "spec_version": "2.1",
                    "id": f"identity--{uuid.uuid4()}",
                    "created": now_iso,
                    "modified": now_iso,
                    "name": f"Infosphere Digital Hygiene Subject ({subject_id})",
                    "identity_class": "individual",
                },
                {
                    "type": "report",
                    "spec_version": "2.1",
                    "id": f"report--{uuid.uuid4()}",
                    "created": now_iso,
                    "modified": now_iso,
                    "name": f"Digital Hygiene Posture Report: {passport.maturity_tier}",
                    "description": f"Overall Hygiene Index: {passport.overall_hygiene_index}/100",
                    "published": now_iso,
                    "report_types": ["threat-actor", "indicator"],
                },
            ],
        }


passport_service = DigitalHygienePassportService()
