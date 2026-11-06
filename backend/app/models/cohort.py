# backend/app/models/cohort.py
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CohortModuleConfig(BaseModel):
    enabled: bool = True
    pass_score: float = Field(default=70.0, ge=0.0, le=100.0)
    points_reward: int = Field(default=150, ge=0)
    parameters: Dict[str, Any] = Field(default_factory=dict)


class LocationTailoringRequest(BaseModel):
    city_name: str = Field(default="Wrocław", description="Target city or region, e.g. Wrocław")
    audience_mode: str = Field(default="seniors", description="professional | kids | seniors")
    language: str = Field(default="pl", description="en | pl | de | uk")
    local_mayor_or_leader: Optional[str] = Field(
        default=None, description="e.g. Mayor of Wrocław / Prezydent Miasta Wrocławia"
    )
    local_water_or_utility: Optional[str] = Field(
        default=None, description="e.g. MPWiK Wrocław"
    )
    local_official_portal: Optional[str] = Field(
        default=None, description="e.g. wroclaw.pl"
    )
    local_institution: Optional[str] = Field(
        default=None, description="e.g. Wrocławskie Centrum Seniora"
    )
    local_institution_or_school: Optional[str] = Field(
        default=None, description="Optional alias for local_institution"
    )
    custom_crisis_theme: Optional[str] = Field(
        default=None, description="Optional custom crisis theme"
    )
    trainer_notes: Optional[str] = Field(
        default="", description="Free-text trainer instructions for the AI agent"
    )
    create_ready_session: bool = Field(
        default=True, description="Automatically pre-create a ready-to-launch M1 session"
    )


class TailoredModuleContent(BaseModel):
    city_name: str
    audience_mode: str
    language: str
    local_mayor_or_leader: str
    local_water_or_utility: str
    local_official_portal: str
    local_institution: str
    m1_scenario_id: str
    m1_title_en: str
    m1_title_pl: str
    m1_starter_headline_en: str
    m1_starter_headline_pl: str
    m1_spoofed_article_headline_en: str
    m1_spoofed_article_headline_pl: str
    m1_official_inject_en: str
    m1_official_inject_pl: str
    m2_scenario_id: str
    m2_scam_title_en: str
    m2_scam_title_pl: str
    m2_initial_message_en: str
    m2_initial_message_pl: str
    m2_spoofed_sender: str
    m2_verification_channel: str
    m3_sample_id: str
    m3_sample_title: str
    m3_forensic_markers: List[str] = Field(default_factory=list)
    m4_preset_bio: str
    m5_echo_headlines: List[str] = Field(default_factory=list)
    adk_agent_name: str = "curriculum_location_tailor_agent"
    generated_at: float = Field(default_factory=lambda: time.time())


class Cohort(BaseModel):
    id: str
    name: str
    description: str = ""
    audience_mode: str = "professional"  # "professional" | "kids" | "seniors"
    location_name: Optional[str] = None
    prepared_session_id: Optional[str] = None
    tailored_environment: Optional[TailoredModuleContent] = None
    created_by: str = "admin"
    created_at: float = Field(default_factory=lambda: time.time())
    is_active: bool = True
    module_configs: Dict[str, CohortModuleConfig] = Field(default_factory=dict)
    assigned_user_ids: List[str] = Field(default_factory=list)


class CreateCohortRequest(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    audience_mode: Optional[str] = "professional"
    location_name: Optional[str] = None
    module_configs: Optional[Dict[str, CohortModuleConfig]] = None
    assigned_user_ids: Optional[List[str]] = None


class UpdateCohortConfigRequest(BaseModel):
    module_configs: Dict[str, CohortModuleConfig]


class AssignUserCohortRequest(BaseModel):
    user_id: str
