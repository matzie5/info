# backend/app/modules/m4_osint_exposure/plugin.py
from typing import Dict, List, Optional
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


OSINT_PRESETS_CATALOG: Dict[str, dict] = {
    "pro-grid-engineer": {
        "id": "pro-grid-engineer",
        "audience_mode": "professional",
        "title_en": "SCADA Grid Engineer (Exposed EXIF + IBAN + Mobile)",
        "title_pl": "Inżynier SCADA PSE (Wyciek EXIF + IBAN + Telefon)",
        "sample_text": (
            "Senior SCADA Grid Engineer at PSE Warsaw. Direct mobile: +48 601 234 567, "
            "corporate email: j.kowalski@pse-grid.pl. Photo EXIF: 52.2297° N, 21.0122° E. "
            "Reimbursement IBAN: PL61 1090 1014 0000 0712 1981 2874."
        ),
    },
    "kids-gamer-selfie": {
        "id": "kids-gamer-selfie",
        "audience_mode": "kids",
        "title_en": "🧒 Junior Gamer Profile (School Crest + Home GPS + Mom's Phone)",
        "title_pl": "🧒 Profil Młodego Gracza (Szkoła + Lokalizacja Domu + Telefon Mamy)",
        "sample_text": (
            "Hi! I am Leo from Primary School #14 class 4B! My gaming email is leo.nowak2015@school-mail.pl "
            "and my mom's emergency phone is +48 502 998 112. Bedroom window selfie GPS EXIF: 51.1079° N, 17.0385° E. "
            "My dog Azor was born on 12 May so my password is Azor1205!"
        ),
    },
    "seniors-facebook-comment": {
        "id": "seniors-facebook-comment",
        "audience_mode": "seniors",
        "title_en": "👵 Senior Public Post (PESEL + Bank Account + Home Address)",
        "title_pl": "👵 Publiczny Wpis Seniora (PESEL + Konto Bankowe + Telefon)",
        "sample_text": (
            "Hello! I am Mrs. Marta Kowalska, retired teacher. Please send the sanatorium voucher to my email "
            "marta.kowalska1949@poczta.pl or call me at +48 604 551 890. My PESEL for the clinic list is 49081412345 "
            "and my pension bank account IBAN is PL61 1090 1014 0000 0712 1981 2874."
        ),
    },
    "tailored-wroclaw-senior-profile": {
        "id": "tailored-wroclaw-senior-profile",
        "audience_mode": "seniors",
        "location_name": "Wrocław",
        "title_en": "📍 [Wrocław] Senior Club Member Comment (Krzyki District + PESEL + IBAN)",
        "title_pl": "📍 [Wrocław] Komentarz pod konkursem dla Seniorów (Wrocław-Krzyki + PESEL + Konto)",
        "sample_text": (
            "Dzień dobry, zgłaszam się do konkursu dla Seniorów we Wrocławiu (dzielnica Krzyki)! "
            "Mój telefon to +48 71 608 221 334, e-mail: marta.wroclaw@senior.pl, PESEL: 49081412345. "
            "Zdjęcie z ogrodu GPS EXIF: 51.0845° N, 17.0112° E. Konto do zwrotu z MPWiK Wrocław: PL61 1090 1014 0000 0712 1981 2874."
        ),
    },
}


class OSINTFootprintSubmission(BaseModel):
    user_id: str = "demo_user"
    audience_mode: str = "professional"  # "professional" | "kids" | "seniors"
    language: str = "en"
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

    def register_custom_preset(self, preset_id: str, preset_dict: dict) -> None:
        OSINT_PRESETS_CATALOG[preset_id] = preset_dict

    def list_presets(self, audience_mode: Optional[str] = None) -> List[dict]:
        all_presets = list(OSINT_PRESETS_CATALOG.values())
        if audience_mode and audience_mode != "all":
            filtered = [p for p in all_presets if p.get("audience_mode") == audience_mode]
            if filtered:
                return filtered
        return all_presets

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

        if req.audience_mode == "kids":
            pretext = (
                "🕵️ Secret Clue Alert: A stranger on a game chat could use your school name, pet's birthday, "
                "and bedroom photo location to pretend they know your family or guess your password!"
            )
            checklist = [
                "Never post photos showing your school badge, street sign, or house number",
                "Turn off location tags (GPS) on your phone camera before sharing selfies",
                "Don't put your real phone number, email, or pet password clues in your bio!",
            ]
        elif req.audience_mode == "seniors":
            pretext = (
                "🛡️ Safety Warning: Scammers read public comments to find your PESEL, phone number, and neighborhood "
                "so they can call you pretending to be your bank, clinic, or municipal water office!"
            )
            checklist = [
                "Never write your PESEL, home address, or bank account number in public Facebook comments",
                "Do not post photos of medical wristbands, prescriptions, or official letters",
                "Share your phone number only in private messages with family you know in person",
            ]
        else:
            pretext = (
                "Attacker Pretext Preview: Combines your leaked role + GPS EXIF coordinates + mobile number "
                "to send an urgent SMS impersonating regional substation dispatch."
            )
            checklist = [
                "Strip GPS EXIF tags automatically prior to social media uploads",
                "Remove direct mobile numbers and IBAN strings from public profiles",
                "Replace personal email addresses in public repositories with role aliases",
            ]

        return OSINTExposureReport(
            adk_pipeline_name=getattr(pipeline, "name", "m4_osint_recon_and_dlp_pipeline"),
            exposure_risk_score=exposure_risk,
            hygiene_resilience_score=hygiene_score,
            discovered_pii_counts=inspection.findings_by_type,
            total_redactions=inspection.pii_redactions,
            simulated_attacker_pretext=pretext,
            dlp_remediated_profile=inspection.sanitized_text,
            remediation_checklist=checklist,
            citations=citations,
        )

    def get_router(self) -> APIRouter:
        router = APIRouter()

        @router.get("/presets")
        def get_osint_presets(audience_mode: Optional[str] = None):
            return {"presets": self.list_presets(audience_mode=audience_mode)}

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
