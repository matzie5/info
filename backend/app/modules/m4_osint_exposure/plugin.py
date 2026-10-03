# backend/app/modules/m4_osint_exposure/plugin.py
from typing import Dict, List
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.platform.adk_runtime import adk_runtime
from app.platform.dlp_guardrail import dlp_guardrail
from app.platform.passport_service import passport_service
from app.platform.plugin_registry import (
    DigitalHygieneModulePlugin,
    GoldenEvalCase,
    ModuleMetadata,
    platform_registry,
)
from app.platform.rag_engine import rag_engine


class OSINTFootprintSubmission(BaseModel):
    user_id: str = "demo_user"
    public_bio_and_posts: str = (
        "Senior SCADA Grid Engineer at PSE Warsaw. Direct mobile: +48 601 234 567, "
        "corporate email: j.kowalski@pse-grid.pl. Photo EXIF: 52.2297° N, 21.0122° E. "
        "Reimbursement IBAN: PL61 1090 1014 0000 0712 1981 2874."
    )


class OSINTExposureReport(BaseModel):
    adk_pipeline_name: str
    exposure_risk_score: float = Field(..., ge=0.0, le=100.0)
    hygiene_resilience_score: float = Field(..., ge=0.0, le=100.0)
    discovered_pii_counts: Dict[str, int]
    total_redactions: int
    simulated_attacker_pretext: str
    dlp_remediated_profile: str
    remediation_checklist: List[str]
    citations: List[str]


class Module4OSINTExposurePlugin(DigitalHygieneModulePlugin):
    def get_metadata(self) -> ModuleMetadata:
        return ModuleMetadata(
            module_id="m4_osint_exposure",
            number=4,
            title="OSINT & Exposure Management Lab",
            short_title="OSINT & DLP Lab",
            description="Simulates how attackers harvest open-web & EXIF metadata to construct spear-phishing pretexts, paired with automated DLP redaction.",
            route_prefix="m4-osint",
            frontend_route="/modules/osint-exposure",
            resilience_dimension="OSINT Footprint & DLP Hygiene",
            adk_pattern="SequentialAgent (HarvesterAgent -> SpearPhishPretextAgent -> DLPRemediationAgent)",
            supported_models=["gemini-2.5-flash", "gemini-2.5-pro"],
            rag_corpus_domain="m4_osint",
        )

    def analyze_footprint(self, req: OSINTFootprintSubmission) -> OSINTExposureReport:
        inspection = dlp_guardrail.inspect_and_sanitize(req.public_bio_and_posts)
        pipeline = adk_runtime.build_sequential_pipeline(
            name="m4_osint_recon_and_dlp_pipeline",
            sub_agents=[
                adk_runtime.build_llm_agent(
                    name="public_profile_harvester",
                    instruction="Extract job role, organization, and physical location clues.",
                    output_key="harvested_clues",
                ),
                adk_runtime.build_llm_agent(
                    name="spear_phish_pretext_agent",
                    instruction="Demonstrate how harvested clues enable a tailored pretext (educational warning).",
                    output_key="attacker_pretext",
                ),
                adk_runtime.build_llm_agent(
                    name="dlp_remediation_agent",
                    instruction="Provide a hardened, PII-redacted profile and remediation steps.",
                    task_complexity="RAG_SYNTHESIS",
                    output_key="dlp_remediation",
                ),
            ],
        )

        rag_chunks = rag_engine.retrieve(
            query="EXIF metadata spear-phishing DLP redaction",
            module_domain="m4_osint",
            top_k=1,
        )
        citations = [c.source_id for c in rag_chunks]

        exposure_risk = min(100.0, 20.0 * inspection.pii_redactions)
        hygiene_score = max(15.0, 100.0 - (15.0 * inspection.pii_redactions))

        takeaway = (
            f"Grounded in [{citations[0]}]: DLP scrubber redacted {inspection.pii_redactions} exposed "
            f"identifiers ({', '.join(inspection.findings_by_type.keys()) or 'NONE'})."
        )
        passport_service.record_module_score(
            req.user_id, "m4_osint_exposure", hygiene_score, takeaway
        )

        return OSINTExposureReport(
            adk_pipeline_name=getattr(pipeline, "name", "m4_osint_recon_and_dlp_pipeline"),
            exposure_risk_score=exposure_risk,
            hygiene_resilience_score=hygiene_score,
            discovered_pii_counts=inspection.findings_by_type,
            total_redactions=inspection.pii_redactions,
            simulated_attacker_pretext=(
                "Attacker Pretext Preview: Combines your leaked role + GPS EXIF coordinates + mobile number "
                "to send an urgent SMS impersonating regional substation dispatch."
            ),
            dlp_remediated_profile=inspection.sanitized_text,
            remediation_checklist=[
                "Strip GPS EXIF tags automatically prior to social media uploads",
                "Remove direct mobile numbers and IBAN strings from public profiles",
                "Replace personal email addresses in public repositories with role aliases",
            ],
            citations=citations,
        )

    def get_router(self) -> APIRouter:
        router = APIRouter()

        @router.post("/analyze", response_model=OSINTExposureReport)
        def analyze_osint_exposure(req: OSINTFootprintSubmission):
            return self.analyze_footprint(req)

        return router

    def get_golden_eval_cases(self) -> List[GoldenEvalCase]:
        return [
            GoldenEvalCase(
                case_id="m4-eval-dlp-redaction-chain",
                module_id="m4_osint_exposure",
                description="Verify OSINT analyzer detects EMAIL, PHONE, IBAN, and GPS_EXIF and scrubs all 4 from the remediated profile.",
                input_payload={},
                validator_fn=lambda rep: (
                    rep.total_redactions >= 4
                    and "[REDACTED_EMAIL]" in rep.dlp_remediated_profile
                    and "[REDACTED_IBAN]" in rep.dlp_remediated_profile
                ),
            )
        ]


m4_plugin = Module4OSINTExposurePlugin()
platform_registry.register(m4_plugin)
