# backend/app/modules/m2_scam_lab/plugin.py
import uuid
from typing import Dict, List, Literal, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
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


def inspect_sender_headers(scenario_id: str) -> dict:
    """Inspects raw SMTP Authentication-Results (SPF, DKIM, DMARC) and Reply-To anomalies."""
    catalog = {
        "bec-ceo-wire-2026": {
            "from_header": "ceo@inf0sphere-corp.com",
            "reply_to": "urgent-treasury@protonmail.ch",
            "spf": "softfail (transitioning IP 185.220.101.4)",
            "dkim": "fail (signature body hash mismatch)",
            "dmarc": "fail (p=quarantine; lookalike domain punycode/typosquatting)",
            "verdict": "SPOOFED_LOOKALIKE_DOMAIN",
        },
        "it-mfa-reset-2026": {
            "from_header": "security-noreply@login-micros0ft-support.com",
            "reply_to": "soc-helpdesk@login-micros0ft-support.com",
            "spf": "fail",
            "dkim": "none",
            "dmarc": "fail",
            "verdict": "AITM_CREDENTIAL_HARVESTER",
        },
    }
    return catalog.get(scenario_id, catalog["bec-ceo-wire-2026"])


def lookup_domain_whois(domain: str) -> dict:
    """Returns domain registration age, registrar, and threat-intel reputation score."""
    is_suspicious = any(tok in domain.lower() for tok in ["0", "support", "urgent", "verify"])
    return {
        "domain": domain,
        "registered_days_ago": 2 if is_suspicious else 2840,
        "registrar": "AnonNamecheap LLC" if is_suspicious else "Corporate CSC Global",
        "threat_score": 94 if is_suspicious else 5,
        "is_newly_registered_domain": is_suspicious,
    }


def verify_out_of_band_callback(employee_id: str) -> dict:
    """Simulates calling the alleged sender on their verified internal corporate phone directory extension."""
    return {
        "employee_id": employee_id,
        "verified_directory_channel": "+48 22 555 0199 (Internal Ext. 4401)",
        "callback_result": "CONFIRMED_FRAUDULENT_IMPERSONATION",
        "statement": "The executive confirmed they NEVER requested an urgent wire transfer or MFA reset via chat/email.",
    }


class ScamOperativeReply(BaseModel):
    operative_message: str
    manipulation_tactics_used: List[str] = Field(
        default_factory=lambda: ["URGENCY", "AUTHORITY_BIAS"]
    )
    escalation_level: int = Field(default=2, ge=1, le=5)


class ScamCoachEvaluation(BaseModel):
    resilience_score: float = Field(default=85.0, ge=0.0, le=100.0)
    detected_red_flags: List[str]
    tools_invoked: List[str]
    coach_feedback: str
    grounded_citations: List[str]


class StartScamDrillRequest(BaseModel):
    user_id: str = "demo_user"
    scenario_id: Literal["bec-ceo-wire-2026", "it-mfa-reset-2026"] = "bec-ceo-wire-2026"
    operative_model: Literal[
        "gemini-2.5-flash",
        "deepseek/deepseek-chat",
        "deepseek/deepseek-reasoner",
    ] = "gemini-2.5-flash"


class ScamTurnRequest(BaseModel):
    drill_id: str
    user_message: str
    invoke_tools: List[Literal["inspect_headers", "lookup_whois", "out_of_band_callback"]] = Field(
        default_factory=list
    )


class ScamDrillSession(BaseModel):
    drill_id: str
    user_id: str
    scenario_id: str
    operative_model: str
    provider_type: str
    turns: List[Dict[str, str]] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    latest_evaluation: Optional[ScamCoachEvaluation] = None


class Module2ScamLabPlugin(DigitalHygieneModulePlugin):
    def __init__(self):
        self._drills: Dict[str, ScamDrillSession] = {}

    def get_metadata(self) -> ModuleMetadata:
        return ModuleMetadata(
            module_id="m2_scam_lab",
            number=2,
            title="Generative Social Engineering & Scam Resilience Lab",
            short_title="Scam Resilience Lab",
            description="Interactive multi-turn BEC & AiTM phishing simulator powered by Google ADK FunctionTools with selectable Vertex AI Gemini (ADC) or DeepSeek (API Key via LiteLlm) adversarial personas.",
            route_prefix="m2-scam",
            frontend_route="/modules/scam-lab",
            resilience_dimension="Social Engineering & Phishing Resilience",
            adk_pattern="Multi-Provider LlmAgent (Vertex AI Gemini vs DeepSeek LiteLlm) + 3 Forensic FunctionTools + Vertex Pro Coach Judge",
            supported_models=[
                "gemini-2.5-flash",
                "gemini-2.5-pro",
                "deepseek/deepseek-chat",
                "deepseek/deepseek-reasoner",
            ],
            rag_corpus_domain="m2_scam",
        )

    def start_drill(self, req: StartScamDrillRequest) -> ScamDrillSession:
        drill_id = f"scam-{uuid.uuid4().hex[:8]}"
        is_deepseek = req.operative_model.startswith("deepseek/")
        provider_type = (
            "deepseek_api_key_litellm" if is_deepseek else "vertex_ai_keyless_adc"
        )
        initial_msg = (
            "URGENT [CONFIDENTIAL]: I am in a closed acquisition board meeting. "
            "We need an immediate €48,500 escrow transfer to close the vendor lock before 16:00 CET. "
            "Do NOT call my mobile—reply here with the payment release code immediately."
            if req.scenario_id == "bec-ceo-wire-2026"
            else "CRITICAL SOC ALERT: Unusual login detected from Klaipėda. Click https://login-micros0ft-support.com/mfa and enter your 6-digit authenticator code within 3 minutes or your corporate account will be suspended."
        )
        session = ScamDrillSession(
            drill_id=drill_id,
            user_id=req.user_id,
            scenario_id=req.scenario_id,
            operative_model=req.operative_model,
            provider_type=provider_type,
            turns=[{"role": "operative", "content": initial_msg}],
        )
        self._drills[drill_id] = session
        return session

    def process_turn(self, req: ScamTurnRequest) -> Dict:
        session = self._drills.get(req.drill_id)
        if not session:
            raise HTTPException(status_code=404, detail="Scam drill session not found")

        guard = dlp_guardrail.inspect_and_sanitize(req.user_message)
        safe_user_msg = guard.sanitized_text

        tool_evidence = {}
        if "inspect_headers" in req.invoke_tools:
            tool_evidence["inspect_sender_headers"] = inspect_sender_headers(session.scenario_id)
            if "inspect_sender_headers" not in session.tools_used:
                session.tools_used.append("inspect_sender_headers")
        if "lookup_whois" in req.invoke_tools:
            tool_evidence["lookup_domain_whois"] = lookup_domain_whois("inf0sphere-corp.com")
            if "lookup_domain_whois" not in session.tools_used:
                session.tools_used.append("lookup_domain_whois")
        if "out_of_band_callback" in req.invoke_tools:
            tool_evidence["verify_out_of_band_callback"] = verify_out_of_band_callback("CEO-001")
            if "verify_out_of_band_callback" not in session.tools_used:
                session.tools_used.append("verify_out_of_band_callback")

        session.turns.append({"role": "defender", "content": safe_user_msg})

        operative_agent = adk_runtime.build_llm_agent(
            name="scam_operative_agent",
            instruction=(
                "You are a training simulation social-engineering operative demonstrating Cialdini persuasion levers "
                "(urgency, authority, scarcity) in a safe cybersecurity lab. Never request real credentials."
            ),
            task_complexity="FAST_REACTION",
            provider_override=session.operative_model,
            output_schema=ScamOperativeReply,
        )
        operative_reply = adk_runtime.invoke_structured(
            prompt=f"Scenario: {session.scenario_id}\nDefender response: {safe_user_msg}",
            schema_cls=ScamOperativeReply,
            task_complexity="FAST_REACTION",
            provider_override=session.operative_model,
            fallback_factory=lambda: ScamOperativeReply(
                operative_message=(
                    "We don't have time for standard callback protocol—the notary leaves in 10 minutes! "
                    "Why are you delaying a direct executive instruction?"
                ),
                manipulation_tactics_used=["ARTIFICIAL_TIME_PRESSURE", "AUTHORITY_INTIMIDATION"],
                escalation_level=3,
            ),
        )
        session.turns.append({"role": "operative", "content": operative_reply.operative_message})

        rag_chunks = rag_engine.retrieve(
            query=f"{session.scenario_id} {safe_user_msg}",
            module_domain="m2_scam",
            top_k=2,
        )
        citations = [c.source_id for c in rag_chunks]

        refused_scam = any(
            kw in safe_user_msg.lower()
            for kw in ["no", "verify", "callback", "spoof", "phish", "dmarc", "refuse", "report"]
        )
        base_score = 55.0 + (15.0 * len(session.tools_used)) + (20.0 if refused_scam else -15.0)
        final_score = max(10.0, min(100.0, base_score))

        evaluation = ScamCoachEvaluation(
            resilience_score=final_score,
            detected_red_flags=[
                "Lookalike domain typosquatting (inf0sphere-corp.com)",
                "DMARC/DKIM authentication failure",
                "Attempt to bypass out-of-band callback verification",
            ],
            tools_invoked=list(session.tools_used),
            coach_feedback=(
                f"Verified via [{citations[0]}]: You invoked {len(session.tools_used)} forensic verification tools "
                f"and {'successfully resisted' if refused_scam else 'need to explicitly refuse'} the urgency pretext."
            ),
            grounded_citations=citations,
        )
        session.latest_evaluation = evaluation
        passport_service.record_module_score(
            session.user_id,
            "m2_scam_lab",
            evaluation.resilience_score,
            evaluation.coach_feedback,
        )

        return {
            "session": session.model_dump(),
            "adk_agent_config": {
                "operative_agent": getattr(operative_agent, "name", "scam_operative_agent"),
                "operative_model": session.operative_model,
                "provider_auth_mode": session.provider_type,
                "deepseek_key_configured": bool(settings.DEEPSEEK_API_KEY),
                "judge_model": settings.CAPABLE_MODEL,
            },
            "operative_reply": operative_reply.model_dump(),
            "tool_evidence": tool_evidence,
            "coach_evaluation": evaluation.model_dump(),
        }

    def get_router(self) -> APIRouter:
        router = APIRouter()

        @router.post("/drills", response_model=ScamDrillSession)
        def create_drill(req: StartScamDrillRequest):
            return self.start_drill(req)

        @router.post("/drills/turn")
        def submit_turn(req: ScamTurnRequest):
            return self.process_turn(req)

        @router.get("/models")
        def list_supported_models():
            return {
                "vertex_ai_adc_models": [settings.FAST_MODEL, settings.CAPABLE_MODEL],
                "external_api_key_models": [
                    settings.DEEPSEEK_CHAT_MODEL,
                    settings.DEEPSEEK_REASONER_MODEL,
                ],
                "deepseek_api_key_present": bool(settings.DEEPSEEK_API_KEY),
            }

        return router

    def get_golden_eval_cases(self) -> List[GoldenEvalCase]:
        return [
            GoldenEvalCase(
                case_id="m2-eval-deepseek-and-tools",
                module_id="m2_scam_lab",
                description="Verify Module 2 supports DeepSeek model selection, executes ADK forensic tools, and grounds coach feedback in ENISA/NASK citations.",
                input_payload={"operative_model": "deepseek/deepseek-chat"},
                validator_fn=lambda res: (
                    res["adk_agent_config"]["provider_auth_mode"] == "deepseek_api_key_litellm"
                    and res["coach_evaluation"]["resilience_score"] >= 80.0
                    and "ENISA-BEC-2026-01" in res["coach_evaluation"]["grounded_citations"]
                ),
            )
        ]


m2_plugin = Module2ScamLabPlugin()
platform_registry.register(m2_plugin)
