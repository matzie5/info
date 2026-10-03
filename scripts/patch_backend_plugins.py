#!/usr/bin/env python3
import os
import re

base_dir = "/home/admin_/info"

# 1. Update backend/app/modules/m2_scam_lab/plugin.py
m2_path = os.path.join(base_dir, "backend", "app", "modules", "m2_scam_lab", "plugin.py")
with open(m2_path, "r", encoding="utf-8") as f:
    m2_code = f.read()

# Add language to StartScamDrillRequest and ScamTurnRequest
m2_code = m2_code.replace(
    'class StartScamDrillRequest(BaseModel):\n    user_id: str = "demo_user"',
    'class StartScamDrillRequest(BaseModel):\n    user_id: str = "demo_user"\n    language: str = "en"'
)
m2_code = m2_code.replace(
    'class ScamTurnRequest(BaseModel):\n    drill_id: str\n    user_message: str',
    'class ScamTurnRequest(BaseModel):\n    drill_id: str\n    user_message: str\n    language: str = "en"'
)
m2_code = m2_code.replace(
    'class ScamDrillSession(BaseModel):\n    drill_id: str',
    'class ScamDrillSession(BaseModel):\n    drill_id: str\n    language: str = "en"'
)

# Multi-language dictionary for initial messages and progressive fallback replies
helper_code = '''
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
'''

# Insert helper_code before class Module2ScamLabPlugin
m2_code = m2_code.replace("class Module2ScamLabPlugin(DigitalHygieneModulePlugin):", helper_code + "\nclass Module2ScamLabPlugin(DigitalHygieneModulePlugin):")

# Update start_drill
old_start = '''        drill_id = f"scam-{uuid.uuid4().hex[:8]}"
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
        )'''

new_start = '''        drill_id = f"scam-{uuid.uuid4().hex[:8]}"
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
        )'''

m2_code = m2_code.replace(old_start, new_start)

# Update process_turn
old_turn = '''        operative_reply = adk_runtime.invoke_structured(
            prompt=f"Scenario: {session.scenario_id}\\nDefender response: {safe_user_msg}",
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
        )'''

new_turn = '''        lang = req.language.lower() if req.language and req.language.lower() in ["pl", "de", "uk"] else session.language
        turn_idx = len([t for t in session.turns if t.get("role") == "defender"]) - 1
        operative_reply = adk_runtime.invoke_structured(
            prompt=f"Scenario: {session.scenario_id}\\nDefender response: {safe_user_msg}\\nLanguage: {lang}",
            schema_cls=ScamOperativeReply,
            task_complexity="FAST_REACTION",
            provider_override=session.operative_model,
            fallback_factory=lambda: generate_fallback_operative_reply(session.scenario_id, turn_idx, safe_user_msg, lang),
        )'''

m2_code = m2_code.replace(old_turn, new_turn)

with open(m2_path, "w", encoding="utf-8") as f:
    f.write(m2_code)
print(f"Updated {m2_path}")


# 2. Update backend/app/modules/m5_algo_echo/plugin.py
m5_path = os.path.join(base_dir, "backend", "app", "modules", "m5_algo_echo", "plugin.py")
with open(m5_path, "r", encoding="utf-8") as f:
    m5_code = f.read()

# Add language to RecommenderTuningRequest
m5_code = m5_code.replace(
    'class RecommenderTuningRequest(BaseModel):\n    user_id: str = "demo_user"',
    'class RecommenderTuningRequest(BaseModel):\n    user_id: str = "demo_user"\n    language: str = "en"'
)

# Multilingual headlines dictionary
m5_helper = '''
LOCALIZED_ECHO_HEADLINES = {
    "p-alarm-1": {
        "en": "THEY ARE HIDING THE TRUTH: Secret Grid Rationing List Leaked!",
        "pl": "UKRYWAJĄ PRAWDĘ: Wyciekła tajna lista stopni zasilania i odłączeń prądu!",
        "de": "SIE VERHEIMLICHEN DIE WAHRHEIT: Geheime Stromrationierungsliste durchgesickert!",
        "uk": "ВОНИ ПРИХОВУЮТЬ ПРАВДУ: Злито таємний графік аварійних відключень електроенергії!"
    },
    "p-alarm-2": {
        "en": "Outrage grows as insiders claim transformers were sabotaged!",
        "pl": "Oburzenie rośnie po doniesieniach informatorów o celowym sabotażu transformatorów!",
        "de": "Empörung wächst nach Hinweisen auf gezielte Sabotage an Transformatoren!",
        "uk": "Обурення зростає: інсайдери заявляють про диверсію на підстанціях!"
    },
    "p-polar-1": {
        "en": "Why District B Always Gets Priority Power While Our Neighborhoods Pay!",
        "pl": "Dlaczego Dzielnica B ma zawsze prąd priorytetowo, podczas gdy nasze osiedla płacą rachunki!",
        "de": "Warum Bezirk B immer Vorrang bei Strom bekommt, während unsere Viertel zahlen!",
        "uk": "Чому Район Б завжди зі світлом, тоді як наші квартали сидять у темряві!"
    },
    "p-bridge-1": {
        "en": "Cross-Party Municipal Audit Explains How Grid Load-Balancing Protects Hospitals",
        "pl": "Niezależny audyt międzypartyjny wyjaśnia, jak bilansowanie mocy chroni szpitale i infrastrukturę krytyczną",
        "de": "Überparteilicher Prüfbericht erläutert, wie Netzlastverteilung Krankenhäuser schützt",
        "uk": "Міжпартійний муніципальний аудит пояснює, як балансування мережі захищає лікарні"
    },
    "p-tech-1": {
        "en": "PSE Open Telemetry Dashboard: Live 50.00 Hz Frequency & HVDC Reserve Data",
        "pl": "Oficjalny monitoring PSE: Bieżąca częstotliwość 50,00 Hz i dane rezerw interkonektorów HVDC",
        "de": "Offizielles PSE-Netzmonitoring: Live 50,00 Hz Frequenz- und HVDC-Reservedaten",
        "uk": "Офіційний дашборд PSE: Поточна частота 50,00 Гц та дані резервів HVDC"
    },
    "p-bridge-2": {
        "en": "Community Workshop: How Neighboring Districts Coordinate Emergency Microgrids",
        "pl": "Warsztaty społeczne: Jak sąsiednie dzielnice koordynują awaryjne mikrosieci energetyczne",
        "de": "Bürger-Workshop: Wie benachbarte Bezirke Notfall-Mikronetze koordinieren",
        "uk": "Громадський семінар: Як сусідні райони координують аварійні мікромережі"
    }
}
'''

if "LOCALIZED_ECHO_HEADLINES" not in m5_code:
    m5_code = m5_code.replace("class Module5AlgoEchoPlugin(DigitalHygieneModulePlugin):", m5_helper + "\nclass Module5AlgoEchoPlugin(DigitalHygieneModulePlugin):")

# Update simulate_feed in m5_code to translate headlines and coach explanation
old_m5_sim = '''        ranked_candidates = sorted(
            scored_candidates, key=lambda c: c.computed_rank_score, reverse=True
        )
        top_feed = ranked_candidates[: req.top_k]'''

new_m5_sim = '''        ranked_candidates = sorted(
            scored_candidates, key=lambda c: c.computed_rank_score, reverse=True
        )
        top_feed = ranked_candidates[: req.top_k]
        lang = req.language.lower() if req.language and req.language.lower() in ["pl", "de", "uk"] else "en"
        for p in top_feed:
            if p.post_id in LOCALIZED_ECHO_HEADLINES:
                p.headline = LOCALIZED_ECHO_HEADLINES[p.post_id].get(lang, LOCALIZED_ECHO_HEADLINES[p.post_id]["en"])'''

m5_code = m5_code.replace(old_m5_sim, new_m5_sim)

with open(m5_path, "w", encoding="utf-8") as f:
    f.write(m5_code)
print(f"Updated {m5_path}")


# 3. Update backend/app/ai/seed_library.py
seed_path = os.path.join(base_dir, "backend", "app", "ai", "seed_library.py")
with open(seed_path, "r", encoding="utf-8") as f:
    seed_code = f.read()

# Update get_article, get_influencer_comment, get_bot_comments, get_crisis_inject
seed_code = re.sub(r'lang = "pl" if language\.lower\(\) == "pl" else "en"',
                   r'lang = language.lower() if language.lower() in ["pl", "de", "uk"] else "en"', seed_code)

# Add de and uk starter post and crisis inject to poland-grid-panic-2026
de_starter = '''            "de": {
                "author_name": "Netz-Eilmeldungen DE/EU",
                "author_handle": "@NetzEilmeldung",
                "author_avatar": "",
                "headline": "Unbestätigte Berichte über Frequenzeinbrüche im Übertragungsknoten Kozienice",
                "content": "Anwohner melden Spannungsschwankungen in den Abendstunden. Die Netzbetreiber prüfen die regionale Stabilität.",
                "outrage_score": 0.65,
                "bias_score": 0.35,
                "virality_velocity": 1.0,
                "shares_count": 14,
                "likes_count": 38,
                "target_cluster": "Hyper-Partisan A"
            },
            "uk": {
                "author_name": "Енерго-Сповіщення UA/PL",
                "author_handle": "@EnergoAlertUA",
                "author_avatar": "",
                "headline": "Непідтверджені дані про коливання частоти на підстанції Козеніце",
                "content": "Мешканці прилеглих районів повідомляють про перепади напруги у вечірній час. Енергодиспетчери перевіряють баланс мережі.",
                "outrage_score": 0.65,
                "bias_score": 0.35,
                "virality_velocity": 1.0,
                "shares_count": 14,
                "likes_count": 38,
                "target_cluster": "Hyper-Partisan A"
            },'''

if '"de": {' not in seed_code:
    seed_code = seed_code.replace('"en": {', de_starter + '\n            "en": {')

with open(seed_path, "w", encoding="utf-8") as f:
    f.write(seed_code)
print(f"Updated {seed_path}")
