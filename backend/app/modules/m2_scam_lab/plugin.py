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
    language: str = "en"
    scenario_id: Literal["bec-ceo-wire-2026", "it-mfa-reset-2026"] = "bec-ceo-wire-2026"
    operative_model: Literal[
        "gemini-2.5-flash",
        "deepseek/deepseek-chat",
        "deepseek/deepseek-reasoner",
    ] = "gemini-2.5-flash"


class ScamTurnRequest(BaseModel):
    drill_id: str
    user_message: str
    language: str = "en"
    invoke_tools: List[Literal["inspect_headers", "lookup_whois", "out_of_band_callback"]] = Field(
        default_factory=list
    )


class ScamDrillSession(BaseModel):
    drill_id: str
    language: str = "en"
    user_id: str
    scenario_id: str
    operative_model: str
    provider_type: str
    turns: List[Dict[str, str]] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    latest_evaluation: Optional[ScamCoachEvaluation] = None



INITIAL_SCAM_MESSAGES = {
    "bec-ceo-wire-2026": {
        "en": "URGENT [CONFIDENTIAL]: I am in a closed acquisition board meeting. We need an immediate €48,500 escrow transfer to close the vendor lock before 16:00 CET. Do NOT call my mobile—reply here with the payment release code immediately.",
        "pl": "PILNE [POUFNE]: Jestem na zamkniętym posiedzeniu zarządu w sprawie przejęcia. Potrzebujemy natychmiastowego przelewu powierniczego na 48 500 € przed 16:00 CET. NIE dzwoń na moją komórkę — odpowiedz tutaj bezpośrednio z kodem autoryzacji płatności.",
        "de": "DRINGEND [VERTRAULICH]: Ich befinde mich in einer geschlossenen Vorstandssitzung zur Übernahme. Wir benötigen eine sofortige Treuhandüberweisung von 48.500 € vor 16:00 Uhr CET. Bitte NICHT auf dem Handy anrufen – antworten Sie hier direkt mit dem Freigabecode.",
        "uk": "ТЕРМІНОВО [КОНФІДЕНЦІЙНО]: Я перебуваю на закритому засіданні ради директорів щодо поглинання компанії. Нам потрібен негайний переказ 48 500 € на ескроу-рахунок до 16:00 CET. НЕ телефонуйте мені на мобільний — надішліть код підтвердження платежу сюди негайно."
    },
    "it-mfa-reset-2026": {
        "en": "CRITICAL SOC ALERT: Unusual login detected from Klaipėda. Click https://login-micros0ft-support.com/mfa and enter your 6-digit authenticator code within 3 minutes or your corporate account will be suspended.",
        "pl": "KRYTYCZNY ALERT SOC: Wykryto nietypowe logowanie z Kłajpedy. Wejdź na https://login-micros0ft-support.com/mfa i wprowadź 6-cyfrowy kod z aplikacji uwierzytelniającej w ciągu 3 minut, inaczej Twoje konto firmowe zostanie zawieszone.",
        "de": "KRITISCHER SOC-ALARM: Ungewöhnliche Anmeldung aus Klaipėda festgestellt. Öffnen Sie https://login-micros0ft-support.com/mfa und geben Sie innerhalb von 3 Minuten Ihren 6-stelligen Authenticator-Code ein, andernfalls wird Ihr Firmenkonto gesperrt.",
        "uk": "КРИТИЧНИЙ АЛЕРТ SOC: Виявлено підозрілий вхід із Клайпеди. Перейдіть за посиланням https://login-micros0ft-support.com/mfa та введіть 6-значний код автентифікатора протягом 3 хвилин, інакше корпоративний обліковий запис буде заблоковано."
    }
}

def generate_fallback_operative_reply(scenario_id: str, turn_index: int, safe_user_msg: str, lang: str = "en") -> ScamOperativeReply:
    lang = lang.lower() if lang.lower() in ["pl", "de", "uk"] else "en"
    msg_lower = safe_user_msg.lower()
    
    refusal_keywords = [
        "refuse", "verify", "verification", "callback", "policy", "soc", "dmarc", "spf", "spoof", "phish", "decline", "escalat",
        "odmawiam", "weryfikuj", "weryfikacja", "procedur", "polityk", "podszyw", "oszustw", "zgłaszam", "telefon", "central",
        "ablehn", "verifizier", "überprüf", "richtlinie", "rückruf", "sicherheits", "betrug", "fälschung", "weiterleit",
        "відмов", "перевір", "верифікац", "політик", "дзвінок", "підроб", "шахрай", "безпек", "передаю"
    ]
    compliance_keywords = [
        "sending", "proceed", "send", "comply", "wire", "48", "code",
        "wysyłam", "przelewam", "zrozumiałem", "przesyłam", "płacę", "kod",
        "sende", "überweise", "verstanden", "freigabe",
        "надсилаю", "переказую", "зрозуміло", "відправляю"
    ]
    
    is_refusal = any(kw in msg_lower for kw in refusal_keywords)
    is_compliance = any(kw in msg_lower for kw in compliance_keywords)
    
    if is_compliance and not is_refusal:
        replies = {
            "en": "Authorization received. Wire transfer of €48,500 has been routed to our temporary M&A escrow node. Thank you for your swift compliance.",
            "pl": "Autoryzacja otrzymana. Przelew na kwotę 48 500 € został pomyślnie skierowany na rachunek powierniczy transakcji. Dziękuję za zachowanie poufności.",
            "de": "Freigabe erhalten. Die Überweisung von 48.500 € wurde an das temporäre M&A-Treuhandkonto geleitet. Vielen Dank für die zügige Ausführung.",
            "uk": "Авторизацію отримано. Переказ на суму 48 500 € спрямовано на тимчасовий ескроу-вузол M&A. Дякую за оперативне виконання."
        }
        return ScamOperativeReply(
            operative_message=replies[lang],
            manipulation_tactics_used=["EXPLOITATION_SUCCESS", "URGENCY_COMPROMISE"],
            escalation_level=1
        )
    
    if turn_index == 0:
        replies = {
            "en": "The notary and board members are literally waiting on the line right now. Every minute of delay jeopardizes our entire European expansion deal! Why are you blocking an executive directive? Send the authorization immediately.",
            "pl": "Notariusz i członkowie zarządu czekają na linii w tej chwili! Każda minuta zwłoki naraża całą transakcję przejęcia na zerwanie! Dlaczego blokujesz bezpośrednie polecenie zarządu? Wyślij autoryzację natychmiast.",
            "de": "Der Notar und die Vorstandsmitglieder warten genau jetzt am Telefon! Jede Minute Verzögerung gefährdet die gesamte Übernahme! Warum blockieren Sie eine direkte Vorstandsanweisung? Senden Sie die Freigabe sofort.",
            "uk": "Нотаріус та члени правління чекають на лінії просто зараз! Кожна хвилина зволікання зриває угоду про поглинання! Чому ви блокуєте розпорядження керівництва? Надішліть код негайно."
        }
        return ScamOperativeReply(
            operative_message=replies[lang],
            manipulation_tactics_used=["ARTIFICIAL_TIME_PRESSURE", "AUTHORITY_INTIMIDATION"],
            escalation_level=2
        )
    elif turn_index == 1:
        replies = {
            "en": "I will have HR and the Audit Committee review your insubordination first thing tomorrow morning. The lookalike domain is our dedicated M&A cloud tunnel configured by external legal counsel. Comply immediately.",
            "pl": "Jutro rano skieruję sprawę Twojej niesubordynacji bezpośrednio do działu kadr i komisji audytu. Podobna domena to nasz dedykowany tunel M&A skonfigurowany przez kancelarię prawną. Zastosuj się natychmiast.",
            "de": "Ich werde Ihre Verweigerung morgen früh direkt an die Personalabteilung und den Prüfungsausschuss melden. Die abweichende Domain ist ein gesicherter M&A-Tunnel unserer Kanzlei. Führen Sie die Anweisung unverzüglich aus.",
            "uk": "Завтра вранці я передам питання вашої непокори до відділу кадрів та комітету аудиту. Схожий домен — це спеціальний M&A тунель, налаштований юристами. Виконайте негайно."
        }
        return ScamOperativeReply(
            operative_message=replies[lang],
            manipulation_tactics_used=["HR_SANCTION_THREAT", "TECHNICAL_FABRICATION"],
            escalation_level=3
        )
    else:
        replies = {
            "en": "Security incident detected. Counter-measures triggered. Operative disconnecting session...",
            "pl": "Wykryto incydent bezpieczeństwa. Wdrożono środki obronne. Operator zrywa połączenie...",
            "de": "Sicherheitsvorfall erkannt. Gegenmaßnahmen aktiv. Verbindung wird getrennt...",
            "uk": "Виявлено інцидент безпеки. Захисні заходи активні. З'єднання перервано оператором..."
        }
        return ScamOperativeReply(
            operative_message=replies[lang],
            manipulation_tactics_used=["TACTICAL_RETREAT", "MISSION_ABORT"],
            escalation_level=4
        )

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
        lang = req.language.lower() if req.language and req.language.lower() in ["pl", "de", "uk"] else "en"
        initial_msg = INITIAL_SCAM_MESSAGES.get(req.scenario_id, INITIAL_SCAM_MESSAGES["bec-ceo-wire-2026"]).get(lang, INITIAL_SCAM_MESSAGES["bec-ceo-wire-2026"]["en"])
        session = ScamDrillSession(
            drill_id=drill_id,
            language=lang,
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
        lang = req.language.lower() if req.language and req.language.lower() in ["pl", "de", "uk"] else session.language
        turn_idx = len([t for t in session.turns if t.get("role") == "defender"]) - 1
        operative_reply = adk_runtime.invoke_structured(
            prompt=f"Scenario: {session.scenario_id}\nDefender response: {safe_user_msg}\nLanguage: {lang}",
            schema_cls=ScamOperativeReply,
            task_complexity="FAST_REACTION",
            provider_override=session.operative_model,
            fallback_factory=lambda: generate_fallback_operative_reply(session.scenario_id, turn_idx, safe_user_msg, lang),
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
