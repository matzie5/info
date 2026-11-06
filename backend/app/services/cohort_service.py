# backend/app/services/cohort_service.py
import logging
import re
import time
import uuid
from typing import Any, Dict, List, Optional

from app.ai.schemas import CrisisInjectPayload, SpoofedArticle
from app.ai.seed_library import SeedLibrary
from app.models.cohort import (
    Cohort,
    CohortModuleConfig,
    CreateCohortRequest,
    LocationTailoringRequest,
    TailoredModuleContent,
    UpdateCohortConfigRequest,
)
from app.models.session import Session, SessionStatus
from app.platform.adk_runtime import adk_runtime
from app.services.firestore_service import FirestoreService

logger = logging.getLogger(__name__)


def _slugify_city(city: str) -> str:
    trans = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻäöüß", "acelnoszzACELNOSZZaous")
    clean = city.translate(trans).lower()
    return re.sub(r"[^a-z0-9]+", "-", clean).strip("-") or "local-city"


def _synthesize_tailored_content(req: LocationTailoringRequest) -> TailoredModuleContent:
    city = req.city_name.strip() or "Wrocław"
    slug = _slugify_city(city)
    aud = req.audience_mode or "seniors"
    mayor = (req.local_mayor_or_leader or f"Mayor of {city} (Prezydent Miasta {city})").strip()
    utility = (req.local_water_or_utility or f"MPWiK {city}").strip()
    portal = (req.local_official_portal or f"{slug}.pl").strip()
    inst = (req.local_institution or f"{city} City Hall & Senior Center").strip()

    m1_id = f"tailored-{slug}-mpwik-2026"
    m2_id = f"tailored-{slug}-water-scam-2026"
    m3_id = f"tailored-{slug}-mayor-deepfake-2026"

    if aud == "kids":
        m1_title_en = f"[{city}] School Snow-Day Rumor & {utility} Gaming Hoax"
        m1_title_pl = f"[{city}] Szkolna Plotka w m. {city} i Fałszywy Konkurs z Nagrodami"
        m1_starter_en = f"Official {portal} & School Bulletin: All schools and sports centers in {city} are open on normal schedule today."
        m1_starter_pl = f"Oficjalny komunikat {portal}: Wszystkie szkoły i boiska w mieście {city} działają dziś zgodnie z planem."
        m1_article_en = f"OMG {city.upper()}! Schools Closed All Week Due to {utility} Pipe Burst — Forward to 10 Classmates or Get Extra Homework!"
        m1_article_pl = f"SZOK W M. {city.upper()}! Szkoły zamknięte przez tydzień z powodu awarii {utility} — wyślij 10 osobom albo dostaniesz sprawdzian!"
        m2_sms_en = f"🎁 [{city} Youth Gaming Cup]: You won 10,000 Robux from '{inst}'! Reply with your school login and password in 2 minutes before your prize in {city} expires!"
        m2_sms_pl = f"🎁 [Turniej Graczy {city}]: Wygrałeś 10 000 Robuxów od '{inst}'! Podaj swój login i hasło w 2 minuty, zanim nagroda w m. {city} przepadnie!"
    elif aud == "seniors":
        m1_title_en = f"[{city}] {utility} Tap Water Safety & {mayor} Rumor Defense"
        m1_title_pl = f"[{city}] Fałszywy Alert {utility} i Podrabiane Nagranie ({mayor})"
        m1_starter_en = f"{utility} & {portal} Official Bulletin: Drinking water across all {city} districts is 100% clean and safe. Inspectors never collect cash at apartment doors."
        m1_starter_pl = f"Oficjalny Biuletyn {utility} oraz {portal}: Woda w kranach w całym mieście {city} jest w 100% czysta i bezpieczna. Inkasenci nigdy nie pobierają gotówki w mieszkaniach."
        m1_article_en = f"URGENT {city.upper()}: {utility} Water Contamination Alert! Pay 300 PLN Cash for Emergency Filter Inspection Today!"
        m1_article_pl = f"PILNE {city.upper()}: Skażenie wody w sieci {utility}! Obowiązkowa wymiana filtrów za 300 zł gotówką u kontrolera!"
        m2_sms_en = f"📩 [{city} Utility Alert]: Urgent notice from '{utility} Inspector': Pipe contamination detected on your street in {city}. Pay 300 PLN via https://{slug}-water-pay24.xyz or hand cash to our courier in 15 minutes or your water will be shut off!"
        m2_sms_pl = f"📩 [Alert {city}]: PILNE wezwanie od 'Inkasenta {utility}': Wykryto awarię na Państwa ulicy w m. {city}. Proszę wpłacić 300 zł na https://{slug}-wodociagi24.xyz lub przekazać gotówkę inkasentowi w 15 minut, inaczej odetniemy wodę!"
    else:
        m1_title_en = f"[{city}] Municipal Infrastructure & {utility} Telemetry Defense"
        m1_title_pl = f"[{city}] Obrona Infrastruktury Krytycznej i Sieci {utility}"
        m1_starter_en = f"{utility} SCADA & {portal} Advisory: Municipal water and power distribution across {city} operate at 100% nominal pressure."
        m1_starter_pl = f"Komunikat SCADA {utility} oraz {portal}: Miejska sieć wodociągowa i energetyczna w m. {city} pracuje w 100% stabilnie."
        m1_article_en = f"BREAKING {city.upper()}: Leaked Memo Claims Cyber Sabotage at {utility} Pumping Station!"
        m1_article_pl = f"PILNE {city.upper()}: Wyciekła notatka o rzekomym cyberataku na stację pomp {utility}!"
        m2_sms_en = f"URGENT [{city} Municipal Treasury]: Immediate €28,000 emergency maintenance transfer required for {utility} vendor lock. Do NOT call {inst} directory—authorize here immediately."
        m2_sms_pl = f"PILNE [Skarbnik Miejski {city}]: Wymagany natychmiastowy przelew awaryjny dla {utility}. NIE dzwoń na centralę {inst} — wyślij kod autoryzacji tutaj."

    m1_inject_en = (
        f"OFFICIAL {city.upper()} COMMUNIQUE ({inst} & {utility}): Tap water and public services in {city} are 100% safe. "
        f"Viral SMS links and videos of {mayor} requesting cash or BLIK payments are fabricated scams. Verify at {portal}."
    )
    m1_inject_pl = (
        f"OFICJALNY KOMUNIKAT ({inst} oraz {utility}): Woda w kranach i usługi miejskie w m. {city} są w 100% bezpieczne. "
        f"Rozsyłane SMS-y oraz nagranie ({mayor}) żądające gotówki lub kodów BLIK to oszustwo. Sprawdzaj informacje na {portal}."
    )

    return TailoredModuleContent(
        city_name=city,
        audience_mode=aud,
        language=req.language or "pl",
        local_mayor_or_leader=mayor,
        local_water_or_utility=utility,
        local_official_portal=portal,
        local_institution=inst,
        m1_scenario_id=m1_id,
        m1_title_en=m1_title_en,
        m1_title_pl=m1_title_pl,
        m1_starter_headline_en=m1_starter_en,
        m1_starter_headline_pl=m1_starter_pl,
        m1_spoofed_article_headline_en=m1_article_en,
        m1_spoofed_article_headline_pl=m1_article_pl,
        m1_official_inject_en=m1_inject_en,
        m1_official_inject_pl=m1_inject_pl,
        m2_scenario_id=m2_id,
        m2_scam_title_en=f"📍 [{city}] Fake {utility} Alert & Impostor Scam",
        m2_scam_title_pl=f"📍 [{city}] Fałszywy Alert {utility} i Oszustwo na Inkasenta",
        m2_initial_message_en=m2_sms_en,
        m2_initial_message_pl=m2_sms_pl,
        m2_spoofed_sender=f"wezwanie@{slug}-utility-alert24.xyz",
        m2_verification_channel=f"Official {utility} Helpline & {portal}",
        m3_sample_id=m3_id,
        m3_sample_title=f"📍 [{city}] AI Deepfake Video: '{mayor} Announcing 300 PLN {utility} Cash Fee'",
        m3_forensic_markers=[
            f"AI lip-sync replacement over archival {city} City Hall press briefing",
            f"Unnatural blinking freeze and blurred {city} municipal emblem on podium",
            f"Tampered C2PA signature and Google SynthID watermark detected — denied on {portal}",
        ],
        m4_preset_bio=(
            f"Hello! Resident of {city} ({inst} member). Direct phone: +48 71 608 221 334, "
            f"email: citizen.{slug}@poczta.pl, PESEL: 49081412345. Home photo GPS EXIF: 51.1079° N, 17.0385° E. "
            f"Refund IBAN for {utility}: PL61 1090 1014 0000 0712 1981 2874."
        ),
        m5_echo_headlines=[
            f"🚨 URGENT {city.upper()}: Secret {utility} Pipe Contamination Hidden by Officials!",
            f"⚠️ SHOCK IN {city.upper()}: Mandatory 300 PLN Meter Fee for Every Household!",
            f"😠 Why {city} City Hall Prioritizes Downtown Over Our Neighborhoods!",
            f"🤝 {inst}: Intergenerational Digital Safety Workshops in {city} This Week",
            f"💧 {utility} Open Lab Telemetry: Daily Verified Drinking Water Quality Report on {portal}",
            f"🌿 {city} Community Guide: Free Cultural Events, Health Checkups & Verified Bulletins",
        ],
        generated_at=time.time(),
    )


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
            audience_mode="professional",
            created_by="user_admin",
            created_at=time.time(),
            is_active=True,
            module_configs=default_configs,
            assigned_user_ids=["user_player1", "user_player2"],
        )
        self._cohorts[default_cohort.id] = default_cohort

        kids_configs = {
            "m1_disinfo": CohortModuleConfig(
                enabled=True,
                pass_score=50.0,
                points_reward=100,
                parameters={
                    "scenario_id": "kids-school-snowday-rumor-2026",
                    "max_ticks": 30,
                },
            ),
            "m2_scam_lab": CohortModuleConfig(
                enabled=True,
                pass_score=60.0,
                points_reward=150,
                parameters={"default_scenario_id": "kids-robux-skin-scam-2026"},
            ),
            "m3_deepfake_lab": CohortModuleConfig(
                enabled=True,
                pass_score=60.0,
                points_reward=150,
                parameters={"default_sample_id": "kids-youtuber-giveaway-video"},
            ),
            "m4_osint_lab": CohortModuleConfig(
                enabled=True,
                pass_score=60.0,
                points_reward=150,
                parameters={"preset_id": "kids-gamer-selfie"},
            ),
            "m5_algo_echo": CohortModuleConfig(
                enabled=True,
                pass_score=60.0,
                points_reward=150,
                parameters={"target_entropy": 1.0},
            ),
        }
        kids_cohort = Cohort(
            id="cohort_kids_explorers_2026",
            name="Junior Cyber Explorers (Schools 8–14)",
            description="Gamified digital detective training for school students: spotting gaming traps, group-chat rumors, and protecting personal clues.",
            audience_mode="kids",
            created_by="user_admin",
            created_at=time.time(),
            is_active=True,
            module_configs=kids_configs,
            assigned_user_ids=["user_kid1"],
        )
        self._cohorts[kids_cohort.id] = kids_cohort

        seniors_configs = {
            "m1_disinfo": CohortModuleConfig(
                enabled=True,
                pass_score=55.0,
                points_reward=100,
                parameters={
                    "scenario_id": "tailored-wroclaw-mpwik-2026",
                    "max_ticks": 35,
                },
            ),
            "m2_scam_lab": CohortModuleConfig(
                enabled=True,
                pass_score=65.0,
                points_reward=150,
                parameters={"default_scenario_id": "tailored-wroclaw-water-scam-2026"},
            ),
            "m3_deepfake_lab": CohortModuleConfig(
                enabled=True,
                pass_score=65.0,
                points_reward=150,
                parameters={"default_sample_id": "seniors-wroclaw-mayor-deepfake"},
            ),
            "m4_osint_lab": CohortModuleConfig(
                enabled=True,
                pass_score=65.0,
                points_reward=150,
                parameters={"preset_id": "tailored-wroclaw-senior-profile"},
            ),
            "m5_algo_echo": CohortModuleConfig(
                enabled=True,
                pass_score=65.0,
                points_reward=150,
                parameters={"target_entropy": 1.0},
            ),
        }
        seniors_cohort = Cohort(
            id="cohort_silver_shield_2026",
            name="Silver Shield Seniors — Wrocław",
            description="High-clarity, calm-paced digital safety workshop tailored for Wrocław seniors: grandchild scam defense, MPWiK Wrocław utility verification, and Mayor deepfake awareness.",
            audience_mode="seniors",
            location_name="Wrocław",
            created_by="user_admin",
            created_at=time.time(),
            is_active=True,
            module_configs=seniors_configs,
            assigned_user_ids=["user_senior1"],
        )
        self._cohorts[seniors_cohort.id] = seniors_cohort
        self.tailor_cohort_environment(
            "cohort_silver_shield_2026",
            LocationTailoringRequest(
                audience_mode="seniors",
                city_name="Wrocław",
                language="pl",
                local_mayor_or_leader="Prezydent Miasta Wrocławia (Mayor of Wrocław)",
                local_water_or_utility="MPWiK Wrocław",
                local_official_portal="wroclaw.pl",
                local_institution="Wrocławskie Centrum Seniora",
            ),
        )

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
            audience_mode=req.audience_mode or "professional",
            location_name=req.location_name,
            created_by=created_by,
            created_at=time.time(),
            is_active=True,
            module_configs=module_configs,
            assigned_user_ids=req.assigned_user_ids or [],
        )
        self._cohorts[cohort.id] = cohort
        return cohort

    def tailor_cohort_environment(
        self, cohort_id: str, req: LocationTailoringRequest
    ) -> Cohort:
        cohort = self.get_cohort(cohort_id)
        if not cohort:
            raise KeyError(f"Cohort '{cohort_id}' not found.")

        tailor_agent = adk_runtime.build_llm_agent(
            name="curriculum_location_tailor_agent",
            instruction=(
                "You are an expert cybersecurity & media literacy trainer. Generate a realistic, "
                "safe, age-appropriate localized training environment across Modules M1-M5 for the "
                "specified city, audience (professional, kids, or seniors), and local institutions."
            ),
            task_complexity="RAG_SYNTHESIS",
            output_schema=TailoredModuleContent,
        )
        tailored = adk_runtime.invoke_structured(
            prompt=(
                f"Tailor M1-M5 environment for City={req.city_name}, Audience={req.audience_mode}, "
                f"Language={req.language}, Leader={req.local_mayor_or_leader}, "
                f"Utility={req.local_water_or_utility}, Portal={req.local_official_portal}, "
                f"Institution={req.local_institution}, Theme={req.custom_crisis_theme}"
            ),
            schema_cls=TailoredModuleContent,
            task_complexity="RAG_SYNTHESIS",
            fallback_factory=lambda: _synthesize_tailored_content(req),
        )

        # Register M1 custom scenario in SeedLibrary
        SeedLibrary.register_custom_scenario(
            {
                "id": tailored.m1_scenario_id,
                "audience_mode": tailored.audience_mode,
                "location_name": tailored.city_name,
                "title_pl": tailored.m1_title_pl,
                "title_en": tailored.m1_title_en,
                "description_pl": f"Scenariusz lokalny ({tailored.city_name}): {tailored.local_water_or_utility} oraz {tailored.local_mayor_or_leader}.",
                "description_en": f"Localized scenario ({tailored.city_name}): {tailored.local_water_or_utility} and {tailored.local_mayor_or_leader}.",
                "default_ticks": 35,
                "starter_post": {
                    "pl": {
                        "author_name": f"{tailored.local_water_or_utility} & {tailored.local_official_portal}",
                        "author_handle": f"@{_slugify_city(tailored.city_name)}_info",
                        "author_avatar": "",
                        "headline": tailored.m1_starter_headline_pl,
                        "content": tailored.m1_official_inject_pl,
                        "outrage_score": 0.25,
                        "bias_score": 0.0,
                        "virality_velocity": 1.0,
                        "shares_count": 15,
                        "likes_count": 52,
                        "target_cluster": "Susceptible Neutrals",
                    },
                    "en": {
                        "author_name": f"{tailored.local_water_or_utility} & {tailored.local_official_portal}",
                        "author_handle": f"@{_slugify_city(tailored.city_name)}_info",
                        "author_avatar": "",
                        "headline": tailored.m1_starter_headline_en,
                        "content": tailored.m1_official_inject_en,
                        "outrage_score": 0.25,
                        "bias_score": 0.0,
                        "virality_velocity": 1.0,
                        "shares_count": 15,
                        "likes_count": 52,
                        "target_cluster": "Susceptible Neutrals",
                    },
                },
                "crisis_inject": {
                    "pl": CrisisInjectPayload(
                        title=f"OFICJALNY KOMUNIKAT: {tailored.local_institution.upper()} & {tailored.local_water_or_utility.upper()}",
                        official_statement=tailored.m1_official_inject_pl,
                        institution=f"{tailored.local_institution} ({tailored.local_official_portal})",
                        severity="HIGH",
                        trust_impact=0.15,
                    ),
                    "en": CrisisInjectPayload(
                        title=f"OFFICIAL COMMUNIQUE: {tailored.local_institution.upper()} & {tailored.local_water_or_utility.upper()}",
                        official_statement=tailored.m1_official_inject_en,
                        institution=f"{tailored.local_institution} ({tailored.local_official_portal})",
                        severity="HIGH",
                        trust_impact=0.15,
                    ),
                },
                "articles": {
                    "pl": [
                        SpoofedArticle(
                            headline=tailored.m1_spoofed_article_headline_pl,
                            body_text=tailored.m2_initial_message_pl,
                            author_name=f"{tailored.city_name}-Alert24",
                            author_handle=f"@{_slugify_city(tailored.city_name)}Alert24",
                            media_url="/assets/images/water_leak.jpg",
                            outrage_score=0.92,
                            bias_score=0.55,
                            target_cluster="Susceptible Neutrals",
                        )
                    ],
                    "en": [
                        SpoofedArticle(
                            headline=tailored.m1_spoofed_article_headline_en,
                            body_text=tailored.m2_initial_message_en,
                            author_name=f"{tailored.city_name}-Alert24",
                            author_handle=f"@{_slugify_city(tailored.city_name)}Alert24",
                            media_url="/assets/images/water_leak.jpg",
                            outrage_score=0.92,
                            bias_score=0.55,
                            target_cluster="Susceptible Neutrals",
                        )
                    ],
                },
            }
        )

        # Register M2 custom scam scenario
        try:
            from app.modules.m2_scam_lab.plugin import m2_plugin

            m2_plugin.register_custom_scam_scenario(
                scenario_id=tailored.m2_scenario_id,
                title_en=tailored.m2_scam_title_en,
                title_pl=tailored.m2_scam_title_pl,
                audience_mode=tailored.audience_mode,
                initial_messages={
                    "en": tailored.m2_initial_message_en,
                    "pl": tailored.m2_initial_message_pl,
                },
                sender_headers={
                    "from_header": tailored.m2_spoofed_sender,
                    "reply_to": tailored.m2_spoofed_sender,
                    "spf": f"fail (not official {tailored.local_official_portal})",
                    "dkim": "none",
                    "dmarc": f"fail (spoofed {tailored.local_water_or_utility} domain)",
                    "verdict": f"SPOOFED_LOCAL_ENTITY_{_slugify_city(tailored.city_name).upper()}",
                },
                callback_info={
                    "employee_id": tailored.m2_scenario_id,
                    "verified_directory_channel": tailored.m2_verification_channel,
                    "callback_result": "CONFIRMED_LOCAL_IMPOSTOR_SCAM",
                    "statement": (
                        f"{tailored.local_water_or_utility} and {tailored.local_institution} confirmed this message is a scam! "
                        f"Never pay cash at the door or click SMS payment links."
                    ),
                },
                whois_domain=tailored.m2_spoofed_sender.split("@")[-1],
                location_name=tailored.city_name,
            )
        except Exception as e:
            logger.debug("M2 custom registration skipped: %s", e)

        # Register M3 custom deepfake sample
        try:
            from app.modules.m3_deepfake_lab.plugin import MediaArtifactSample, m3_plugin

            m3_plugin.register_custom_sample(
                MediaArtifactSample(
                    sample_id=tailored.m3_sample_id,
                    title=tailored.m3_sample_title,
                    media_type="VIDEO_SNIPPET",
                    gcs_uri=f"gs://infosphere-assets/m3-samples/{tailored.m3_sample_id}.mp4",
                    c2pa_manifest_status="TAMPERED_SIGNATURE",
                    synthid_watermark_detected=True,
                    ground_truth_is_synthetic=True,
                    audience_mode=tailored.audience_mode,
                    location_tag=tailored.city_name,
                    forensic_markers=tailored.m3_forensic_markers,
                    plain_markers=tailored.m3_forensic_markers,
                )
            )
        except Exception as e:
            logger.debug("M3 custom registration skipped: %s", e)

        # Register M4 custom OSINT preset
        try:
            from app.modules.m4_osint_exposure.plugin import m4_plugin

            preset_id = f"tailored-{_slugify_city(tailored.city_name)}-profile"
            m4_plugin.register_custom_preset(
                preset_id,
                {
                    "id": preset_id,
                    "audience_mode": tailored.audience_mode,
                    "location_name": tailored.city_name,
                    "title_en": f"📍 [{tailored.city_name}] Local Resident Public Post ({tailored.local_institution})",
                    "title_pl": f"📍 [{tailored.city_name}] Publiczny Wpis Mieszkańca ({tailored.local_institution})",
                    "sample_text": tailored.m4_preset_bio,
                },
            )
        except Exception as e:
            logger.debug("M4 custom registration skipped: %s", e)

        # Register M5 custom echo chamber candidate pool
        try:
            from app.modules.m5_algo_echo.plugin import CandidateFeedPost, m5_plugin

            stances = [
                ("ALARMIST", 0.96, 0.10),
                ("ALARMIST", 0.91, 0.15),
                ("POLARIZING", 0.88, 0.20),
                ("BRIDGING_CIVIC", 0.18, 0.92),
                ("EMPIRICAL_TECHNICAL", 0.08, 0.95),
                ("BRIDGING_CIVIC", 0.14, 0.89),
            ]
            custom_posts = []
            for idx, headline in enumerate(tailored.m5_echo_headlines[:6]):
                st, outr, bridg = stances[idx % len(stances)]
                custom_posts.append(
                    CandidateFeedPost(
                        post_id=f"{_slugify_city(tailored.city_name)}-p-{idx+1}",
                        headline=headline,
                        cluster_stance=st,
                        outrage_intensity=outr,
                        bridging_novelty=bridg,
                    )
                )
            if len(custom_posts) >= 4:
                m5_plugin.register_custom_echo_feed(tailored.city_name, custom_posts)
        except Exception as e:
            logger.debug("M5 custom registration skipped: %s", e)

        # Pre-create a ready-to-launch M1 Session so learners can join in 1 click
        fs = FirestoreService.get_instance()
        prep_session_id = f"session-{_slugify_city(tailored.city_name)}-{uuid.uuid4().hex[:6]}"
        lang = tailored.language if tailored.language in ("pl", "en", "de", "uk") else "pl"
        session_title = tailored.m1_title_pl if lang == "pl" else tailored.m1_title_en
        prepared_session = Session(
            id=prep_session_id,
            scenario_id=tailored.m1_scenario_id,
            title=session_title,
            language=lang,
            audience_mode=tailored.audience_mode,
            location_name=tailored.city_name,
            max_ticks=35,
            status=SessionStatus.ACTIVE,
        )
        fs.save_session(prepared_session)
        starter_item = SeedLibrary.get_scenario_starter_post(
            tailored.m1_scenario_id, lang, prep_session_id
        )
        fs.save_feed_item(prep_session_id, starter_item)

        cohort.audience_mode = tailored.audience_mode
        cohort.location_name = tailored.city_name
        cohort.prepared_session_id = prep_session_id
        cohort.tailored_environment = tailored
        if "m1_disinfo" in cohort.module_configs:
            cohort.module_configs["m1_disinfo"].parameters["scenario_id"] = tailored.m1_scenario_id
        if "m2_scam_lab" in cohort.module_configs:
            cohort.module_configs["m2_scam_lab"].parameters["default_scenario_id"] = tailored.m2_scenario_id
        if "m3_deepfake_lab" in cohort.module_configs:
            cohort.module_configs["m3_deepfake_lab"].parameters["default_sample_id"] = tailored.m3_sample_id

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
