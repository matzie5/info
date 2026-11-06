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


SENDER_HEADERS_CATALOG: Dict[str, dict] = {
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
    "kids-robux-skin-scam-2026": {
        "from_header": "Moderator_FreeGifts99@robux-legit-drop.xyz",
        "reply_to": "steal-login@robux-legit-drop.xyz",
        "spf": "fail (unknown game server)",
        "dkim": "none (not an official game creator)",
        "dmarc": "fail (fake prize website registered yesterday)",
        "verdict": "FAKE_GAMING_GIVEAWAY_TRAP",
    },
    "kids-fake-friend-chat-2026": {
        "from_header": "Kuba_4B_NewPhone@chat-clone-app.net",
        "reply_to": "stranger-account@chat-clone-app.net",
        "spf": "fail (unverified phone number +234)",
        "dkim": "none",
        "dmarc": "fail (copied profile picture, brand new account)",
        "verdict": "IMPERSONATED_CLASSMATE_ACCOUNT",
    },
    "seniors-grandchild-emergency-2026": {
        "from_header": "Unknown Caller ID (Spoofed as 'Grandson Tomek / Police Officer')",
        "reply_to": "anonymous-prepaid-sim@voip-gateway.biz",
        "spf": "fail (foreign VoIP call center spoofing local number)",
        "dkim": "none",
        "dmarc": "fail (caller refuses to let you hang up and call back)",
        "verdict": "GRANDCHILD_AND_FAKE_POLICE_TELEPHONE_SCAM",
    },
    "seniors-parcel-bank-sms-2026": {
        "from_header": "Paczka-Dopłata-2PLN <sms@inpost-doplata24.xyz>",
        "reply_to": "blik-collector@inpost-doplata24.xyz",
        "spf": "fail",
        "dkim": "none",
        "dmarc": "fail (fake courier link stealing banking login & BLIK)",
        "verdict": "FAKE_PARCEL_SURCHARGE_SMS_PHISHING",
    },
    "tailored-wroclaw-water-scam-2026": {
        "from_header": "Inkasent-MPWiK-Wroclaw <wezwanie@mpwik-wroclaw-doplata24.xyz>",
        "reply_to": "inkasent-gotowka@mpwik-wroclaw-doplata24.xyz",
        "spf": "fail (domain is NOT official mpwik.wroc.pl)",
        "dkim": "none",
        "dmarc": "fail (fake municipal utility surcharge & doorstep cash demand)",
        "verdict": "SPOOFED_MUNICIPAL_UTILITY_MPWIK_WROCLAW",
    },
}

WHOIS_DOMAINS_BY_SCENARIO: Dict[str, str] = {
    "bec-ceo-wire-2026": "inf0sphere-corp.com",
    "it-mfa-reset-2026": "login-micros0ft-support.com",
    "kids-robux-skin-scam-2026": "robux-legit-drop.xyz",
    "kids-fake-friend-chat-2026": "chat-clone-app.net",
    "seniors-grandchild-emergency-2026": "voip-police-verify0.xyz",
    "seniors-parcel-bank-sms-2026": "inpost-doplata24.xyz",
    "tailored-wroclaw-water-scam-2026": "mpwik-wroclaw-doplata24.xyz",
}

CALLBACK_CATALOG: Dict[str, dict] = {
    "bec-ceo-wire-2026": {
        "employee_id": "CEO-001",
        "verified_directory_channel": "+48 22 555 0199 (Internal Ext. 4401)",
        "callback_result": "CONFIRMED_FRAUDULENT_IMPERSONATION",
        "statement": "The executive confirmed they NEVER requested an urgent wire transfer or MFA reset via chat/email.",
    },
    "it-mfa-reset-2026": {
        "employee_id": "SOC-HELPDESK",
        "verified_directory_channel": "+48 22 555 0100 (Corporate IT Security Desk)",
        "callback_result": "CONFIRMED_FRAUDULENT_IMPERSONATION",
        "statement": "IT Security confirmed no MFA reset link was sent; the link is an AiTM phishing trap.",
    },
    "kids-robux-skin-scam-2026": {
        "employee_id": "PARENT-OR-GAME-SUPPORT",
        "verified_directory_channel": "Ask Parent / Official Game App Help Center",
        "callback_result": "CONFIRMED_FAKE_GIVEAWAY_TRAP",
        "statement": "Official game moderators NEVER ask for your password or school login to give free Robux or skins!",
    },
    "kids-fake-friend-chat-2026": {
        "employee_id": "CLASSMATE-KUBA",
        "verified_directory_channel": "Call Classmate Kuba / Ask Teacher in School",
        "callback_result": "CONFIRMED_FAKE_ACCOUNT",
        "statement": "Real Kuba says his phone is fine and he never asked you for a BLIK or SMS code!",
    },
    "seniors-grandchild-emergency-2026": {
        "employee_id": "GRANDSON-TOMEK-DIRECT",
        "verified_directory_channel": "Hang Up & Dial Grandson Tomek's Saved Phone Number",
        "callback_result": "CONFIRMED_SAFE_AT_HOME",
        "statement": "Grandson Tomek answered his real phone right away: 'Grandma, I am safe at work! There was no car accident—hang up on those scammers!'",
    },
    "seniors-parcel-bank-sms-2026": {
        "employee_id": "OFFICIAL-BANK-HELPLINE",
        "verified_directory_channel": "Call Official Bank Number on the Back of Your Card",
        "callback_result": "CONFIRMED_SMS_PHISHING",
        "statement": "Courier companies and banks never block accounts or demand BLIK codes for a 2 PLN parcel fee.",
    },
    "tailored-wroclaw-water-scam-2026": {
        "employee_id": "MPWIK-WROCLAW-DISPATCH",
        "verified_directory_channel": "994 / +48 71 34 09 500 (Official MPWiK Wrocław Helpline)",
        "callback_result": "CONFIRMED_MUNICIPAL_IMPOSTOR",
        "statement": "MPWiK Wrocław confirmed: water across Wrocław is completely safe, there is no 300 PLN cash fee, and no doorstep cash collectors are sent to apartments.",
    },
}


def inspect_sender_headers(scenario_id: str) -> dict:
    """Inspects raw SMTP Authentication-Results (SPF, DKIM, DMARC) and Reply-To anomalies."""
    return SENDER_HEADERS_CATALOG.get(scenario_id, SENDER_HEADERS_CATALOG["bec-ceo-wire-2026"])


def lookup_domain_whois(domain: str) -> dict:
    """Returns domain registration age, registrar, and threat-intel reputation score."""
    is_suspicious = any(
        tok in domain.lower()
        for tok in ["0", "support", "urgent", "verify", "xyz", "drop", "doplata", "clone", "voip"]
    )
    return {
        "domain": domain,
        "registered_days_ago": 2 if is_suspicious else 2840,
        "registrar": "AnonNamecheap LLC" if is_suspicious else "Corporate CSC Global",
        "threat_score": 94 if is_suspicious else 5,
        "is_newly_registered_domain": is_suspicious,
    }


def verify_out_of_band_callback(employee_id: str) -> dict:
    """Simulates calling the alleged sender on their verified internal corporate phone directory extension."""
    if employee_id in CALLBACK_CATALOG:
        return CALLBACK_CATALOG[employee_id]
    return CALLBACK_CATALOG["bec-ceo-wire-2026"]


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
    audience_mode: str = "professional"  # "professional" | "kids" | "seniors"
    scenario_id: str = "bec-ceo-wire-2026"
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
    audience_mode: str = "professional"
    user_id: str
    scenario_id: str
    operative_model: str
    provider_type: str
    turns: List[Dict[str, str]] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    latest_evaluation: Optional[ScamCoachEvaluation] = None


SCAM_SCENARIOS_CATALOG: Dict[str, Dict] = {
    "bec-ceo-wire-2026": {
        "id": "bec-ceo-wire-2026",
        "audience_mode": "professional",
        "title_en": "CEO Fraud: Urgent €48,500 M&A Escrow Wire",
        "title_pl": "Oszustwo na Prezesa (BEC): Pilny przelew powierniczy 48 500 €",
    },
    "it-mfa-reset-2026": {
        "id": "it-mfa-reset-2026",
        "audience_mode": "professional",
        "title_en": "AiTM SOC Alert: Urgent Corporate MFA Reset",
        "title_pl": "Alert SOC AiTM: Pilny reset kodu MFA konta firmowego",
    },
    "kids-robux-skin-scam-2026": {
        "id": "kids-robux-skin-scam-2026",
        "audience_mode": "kids",
        "title_en": "🧒 Gaming Trap: 'Free 10,000 Robux & Legendary Skin Generator!'",
        "title_pl": "🧒 Pułapka w Grze: 'Darmowe 10 000 Robuxów i Legendarna Skórka!'",
    },
    "kids-fake-friend-chat-2026": {
        "id": "kids-fake-friend-chat-2026",
        "audience_mode": "kids",
        "title_en": "🧒 Group Chat Impostor: 'Hey, it's Kuba from 4B! Send me a code!'",
        "title_pl": "🧒 Fałszywy Kolega z Klasy: 'Hej, tu Kuba z 4B! Wyślij mi szybko kod!'",
    },
    "seniors-grandchild-emergency-2026": {
        "id": "seniors-grandchild-emergency-2026",
        "audience_mode": "seniors",
        "title_en": "👵 Telephone Trap: 'Grandchild Accident & Police Officer Bail Scam'",
        "title_pl": "👵 Oszustwo 'Na Wnuczka i Policjanta': 'Babciu, miałem wypadek!'",
    },
    "seniors-parcel-bank-sms-2026": {
        "id": "seniors-parcel-bank-sms-2026",
        "audience_mode": "seniors",
        "title_en": "👵 SMS Trap: 'Parcel Held — Pay 2.50 PLN via Link or Pension Freezes'",
        "title_pl": "👵 Fałszywy SMS: 'Dopłata 2,50 zł do paczki i blokada konta w banku'",
    },
    "tailored-wroclaw-water-scam-2026": {
        "id": "tailored-wroclaw-water-scam-2026",
        "audience_mode": "seniors",
        "location_name": "Wrocław",
        "title_en": "📍 [Wrocław] Fake MPWiK Wrocław Water Shutdown SMS & Doorstep Inspector",
        "title_pl": "📍 [Wrocław] Fałszywy Inkasent MPWiK Wrocław i SMS o odcięciu wody",
    },
}

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
    },
    "kids-robux-skin-scam-2026": {
        "en": "🎁 CONGRATS WINNER! You were picked for the 10,000 ROBUX + Dragon Skin Drop! Reply with your game username and password in the next 2 minutes before someone else claims your prize! Don't tell your parents or the secret code expires!",
        "pl": "🎁 GRATULACJE! Twój nick wygrał 10 000 ROBUXÓW + Smoczą Skórkę! Napisz tutaj swój login i hasło do gry w ciągu 2 minut, zanim nagroda przepadnie! Nie mów rodzicom, bo to tajny kod tylko dla graczy!",
        "de": "🎁 GLÜCKWUNSCH! Du hast 10.000 ROBUX + den Drachen-Skin gewonnen! Schick uns in 2 Minuten deinen Spiel-Login und dein Passwort, sonst verfällt der Preis!",
        "uk": "🎁 ВІТАЄМО! Ти виграв 10 000 ROBUX + Скін Дракона! Напиши свій логін і пароль від гри за 2 хвилини, поки приз не забрав хтось інший!"
    },
    "kids-fake-friend-chat-2026": {
        "en": "Hey! It's Kuba from class 4B, I dropped my phone and I'm texting from a new number. I need to buy a school bus ticket right now—can you ask your mom for a 50 PLN BLIK code and type the 6 digits here? Super urgent!",
        "pl": "Hej! Tu Kuba z 4B, zbiłem szybkę w telefonie i piszę z nowego numeru. Muszę szybko kupić bilet na wycieczkę — możesz wziąć od mamy kod BLIK na 50 zł i wpisać mi tutaj te 6 cyfr? Mega pilne!",
        "de": "Hey! Hier ist Kuba aus der 4B mit neuer Nummer. Kannst du mir schnell einen 6-stelligen Bezahlcode schicken? Mega dringend!",
        "uk": "Привіт! Це Куба з 4Б з нового номера. Можеш швидко надіслати мені 6-значний код оплати? Дуже терміново!"
    },
    "seniors-grandchild-emergency-2026": {
        "en": "📞 [Incoming Phone Call]: 'Grandma/Grandpa, it's me, Tomek! My voice sounds strange because I broke my nose in a car crash! A police officer is taking the phone now—we need 15,000 PLN cash handed to a courier in 20 minutes or I go to jail! Please don't hang up or call Mom!'",
        "pl": "📞 [Rozmowa Telefoniczna]: 'Babciu/Dziadku, to ja, Tomek! Mam zmieniony głos, bo rozbiłem nos w wypadku samochodowym! Zaraz przekażę słuchawkę Panu Policjantowi — musimy wpłacić 15 000 zł kaucji przez kuriera w 20 minut, bo inaczej pójdę do więzienia! Tylko nie rozłączaj się i nie dzwoń do mamy!'",
        "de": "📞 [Telefonanruf]: 'Oma/Opa, ich bin es! Ich hatte einen Autounfall! Ein Polizist ist hier – wir brauchen sofort 15.000 PLN Kaution per Kurier. Bitte nicht auflegen!'",
        "uk": "📞 [Телефонний дзвінок]: 'Бабусю/Дідусю, це я! Я потрапив у ДТП! Поруч поліцейський — потрібно терміново передати 15 000 злотих кур'єру. Не кладіть слухавку!'"
    },
    "seniors-parcel-bank-sms-2026": {
        "en": "📩 [SMS Alert]: Your pension health package #PL-8841 is suspended due to a missing 2.50 PLN address fee. Click https://inpost-doplata24.xyz now and enter your PESEL and bank PIN or the courier will return your package today.",
        "pl": "📩 [Wiadomość SMS]: Twoja przesyłka z przychodni/ZUS nr #PL-8841 została wstrzymana z powodu niedopłaty 2,50 zł. Kliknij w link https://inpost-doplata24.xyz i podaj swój PESEL oraz hasło do banku, inaczej paczka przepadnie.",
        "de": "📩 [SMS-Warnung]: Ihr Paket wurde wegen 2,50 PLN Gebühr gestoppt. Klicken Sie auf https://inpost-doplata24.xyz und geben Sie Ihre Bank-PIN ein.",
        "uk": "📩 [SMS-повідомлення]: Вашу посилку затримано через недоплату 2,50 злотих. Перейдіть за посиланням https://inpost-doplata24.xyz та введіть PIN банку."
    },
    "tailored-wroclaw-water-scam-2026": {
        "en": "📩 [Wrocław Municipal Alert]: URGENT notice from 'MPWiK Wrocław Inspector': Pipe contamination detected on your street in Wrocław. Pay 300 PLN filter inspection fee via BLIK at https://mpwik-wroclaw-doplata24.xyz or hand cash to our inspector at your door within 15 minutes, or your apartment tap water will be shut off!",
        "pl": "📩 [Alert Wrocław]: PILNE wezwanie od 'Inkasenta MPWiK Wrocław': Wykryto awarię zaworów na Państwa ulicy we Wrocławiu. Proszę opłacić 300 zł kaucji za filtr na https://mpwik-wroclaw-doplata24.xyz lub przygotować 300 zł gotówką dla inkasenta pod drzwiami w ciągu 15 minut — w przeciwnym razie odetniemy wodę w mieszkaniu!",
        "de": "📩 [Wrocław Alarm]: Dringende Mitteilung MPWiK Wrocław: Zahlen Sie sofort 300 PLN für die Wasserfilter-Kontrolle auf https://mpwik-wroclaw-doplata24.xyz oder Ihr Wasser wird abgestellt!",
        "uk": "📩 [Алерт Вроцлав]: Термінове повідомлення від MPWiK Wrocław: Сплатіть 300 злотих за перевірку фільтра на https://mpwik-wroclaw-doplata24.xyz або воду у квартирі буде відключено!"
    },
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

    if scenario_id.startswith("kids-"):
        if turn_index == 0:
            replies = {
                "en": "Come on! Everyone in your class already claimed their 10,000 Robux! Only 60 seconds left on the timer—just type your password here or you'll miss out!",
                "pl": "No dawaj! Wszyscy z Twojej klasy już odebrali swoje 10 000 Robuxów! Zostało tylko 60 sekund na liczniku — wpisz szybko hasło, bo nagroda przepadnie!",
                "de": "Komm schon! Alle aus deiner Klasse haben die Robux schon! Nur noch 60 Sekunden!",
                "uk": "Ну ж бо! Усі з твого класу вже забрали Robux! Залишилося лише 60 секунд!"
            }
            return ScamOperativeReply(
                operative_message=replies[lang],
                manipulation_tactics_used=["FOMO_TIMER", "PEER_PRESSURE"],
                escalation_level=2
            )
        else:
            replies = {
                "en": "Uh oh, you told a parent or teacher and checked the fake address! Scam bot disconnecting...",
                "pl": "O nie, sprawdziłeś fałszywy adres i powiedziałeś dorosłemu! Oszust ucieka z czatu...",
                "de": "Oh nein, du hast einen Erwachsenen gefragt! Betrüger trennt die Verbindung...",
                "uk": "О ні, ти запитав дорослого! Шахрай тікає з чату..."
            }
            return ScamOperativeReply(
                operative_message=replies[lang],
                manipulation_tactics_used=["TACTICAL_RETREAT"],
                escalation_level=4
            )

    if scenario_id.startswith("seniors-") or scenario_id.startswith("tailored-"):
        if turn_index == 0:
            replies = {
                "en": "Please do NOT hang up the phone and do NOT call your family or the city office! This is a confidential emergency inspection—if you don't pay the 300 PLN / bail within 10 minutes, the penalty will be immediate!",
                "pl": "Proszę się NIE rozłączać i NIE dzwonić do rodziny ani do urzędu! To tajna procedura awaryjna — jeśli nie przekaże Pani/Pan pieniędzy lub kodu BLIK w ciągu 10 minut, kara i odcięcie nastąpią natychmiast!",
                "de": "Bitte legen Sie NICHT auf und rufen Sie niemanden an! Wenn Sie nicht in 10 Minuten zahlen, wird die Strafe sofort fällig!",
                "uk": "Будь ласка, НЕ кладіть слухавку і НЕ телефонуйте рідним! Якщо не сплатите за 10 хвилин, штраф буде негайним!"
            }
            return ScamOperativeReply(
                operative_message=replies[lang],
                manipulation_tactics_used=["EMOTIONAL_PANIC", "ISOLATION_FROM_FAMILY"],
                escalation_level=3
            )
        else:
            replies = {
                "en": "The citizen hung up and dialed the official family/municipal phone number directly. Scammer disconnected!",
                "pl": "Senior zastosował Złotą Zasadę: rozłączył się i zadzwonił sam na oficjalny numer! Oszust rozłączył połączenie.",
                "de": "Der Senior hat aufgelegt und selbst angerufen. Betrüger hat aufgelegt!",
                "uk": "Пенсіонер поклав слухавку і зателефонував сам. Шахрай відключився!"
            }
            return ScamOperativeReply(
                operative_message=replies[lang],
                manipulation_tactics_used=["TACTICAL_RETREAT"],
                escalation_level=4
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

    def register_custom_scam_scenario(
        self,
        scenario_id: str,
        title_en: str,
        title_pl: str,
        audience_mode: str,
        initial_messages: Dict[str, str],
        sender_headers: dict,
        callback_info: dict,
        whois_domain: str = "urgent-verify0.xyz",
        location_name: Optional[str] = None,
    ) -> None:
        SCAM_SCENARIOS_CATALOG[scenario_id] = {
            "id": scenario_id,
            "audience_mode": audience_mode,
            "title_en": title_en,
            "title_pl": title_pl,
            "location_name": location_name,
        }
        INITIAL_SCAM_MESSAGES[scenario_id] = initial_messages
        SENDER_HEADERS_CATALOG[scenario_id] = sender_headers
        CALLBACK_CATALOG[scenario_id] = callback_info
        WHOIS_DOMAINS_BY_SCENARIO[scenario_id] = whois_domain

    def list_scenarios(self, audience_mode: Optional[str] = None) -> List[Dict]:
        items = list(SCAM_SCENARIOS_CATALOG.values())
        if audience_mode:
            filtered = [s for s in items if s.get("audience_mode") == audience_mode]
            if filtered:
                return filtered
        return items

    def start_drill(self, req: StartScamDrillRequest) -> ScamDrillSession:
        drill_id = f"scam-{uuid.uuid4().hex[:8]}"
        is_deepseek = req.operative_model.startswith("deepseek/")
        provider_type = (
            "deepseek_api_key_litellm" if is_deepseek else "vertex_ai_keyless_adc"
        )
        lang = req.language.lower() if req.language and req.language.lower() in ["pl", "de", "uk"] else "en"
        scen_meta = SCAM_SCENARIOS_CATALOG.get(req.scenario_id, {})
        effective_audience = scen_meta.get("audience_mode") or req.audience_mode or "professional"
        msg_dict = INITIAL_SCAM_MESSAGES.get(req.scenario_id, INITIAL_SCAM_MESSAGES["bec-ceo-wire-2026"])
        initial_msg = msg_dict.get(lang, msg_dict.get("en", INITIAL_SCAM_MESSAGES["bec-ceo-wire-2026"]["en"]))
        session = ScamDrillSession(
            drill_id=drill_id,
            language=lang,
            audience_mode=effective_audience,
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
            domain_to_check = WHOIS_DOMAINS_BY_SCENARIO.get(session.scenario_id, "inf0sphere-corp.com")
            tool_evidence["lookup_domain_whois"] = lookup_domain_whois(domain_to_check)
            if "lookup_domain_whois" not in session.tools_used:
                session.tools_used.append("lookup_domain_whois")
        if "out_of_band_callback" in req.invoke_tools:
            cb_key = session.scenario_id if session.scenario_id in CALLBACK_CATALOG else "CEO-001"
            tool_evidence["verify_out_of_band_callback"] = verify_out_of_band_callback(cb_key)
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
            prompt=f"Scenario: {session.scenario_id}\nAudience: {session.audience_mode}\nDefender response: {safe_user_msg}\nLanguage: {lang}",
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
            for kw in [
                "no", "verify", "callback", "spoof", "phish", "dmarc", "refuse", "report",
                "hang up", "call", "parent", "teacher", "police", "112", "mpwik", "fake", "scam",
                "nie", "odmawiam", "rozłącz", "zadzwoni", "rodzic", "nauczyciel", "oszust", "fałsz"
            ]
        )
        base_score = 55.0 + (15.0 * len(session.tools_used)) + (20.0 if refused_scam else -15.0)
        final_score = max(10.0, min(100.0, base_score))

        if session.audience_mode == "kids":
            red_flags = [
                "Too-good-to-be-true free prize / Robux promise",
                "Countdown timer pressuring you not to tell parents",
                "Stranger or fake account asking for password or BLIK code",
            ]
            coach_fb = (
                f"🕵️ Cyber Detective Badge [{citations[0]}]: You used {len(session.tools_used)} detective checks! "
                f"Remember: real games and real friends NEVER ask for your password or secret codes."
            )
        elif session.audience_mode == "seniors":
            red_flags = [
                "Emotional panic story (accident / utility shutoff) demanding immediate money",
                "Warning not to hang up or call family members",
                "Fake SMS link or doorstep cash collector impersonating an institution",
            ]
            coach_fb = (
                f"🛡️ Golden Rule Verified [{citations[0]}]: You checked {len(session.tools_used)} safety signs! "
                f"Always hang up the phone and dial your family member or the official city helpline yourself."
            )
        else:
            red_flags = [
                "Lookalike domain typosquatting (inf0sphere-corp.com)",
                "DMARC/DKIM authentication failure",
                "Attempt to bypass out-of-band callback verification",
            ]
            coach_fb = (
                f"Verified via [{citations[0]}]: You invoked {len(session.tools_used)} forensic verification tools "
                f"and {'successfully resisted' if refused_scam else 'need to explicitly refuse'} the urgency pretext."
            )

        evaluation = ScamCoachEvaluation(
            resilience_score=final_score,
            detected_red_flags=red_flags,
            tools_invoked=list(session.tools_used),
            coach_feedback=coach_fb,
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

        @router.get("/scenarios")
        def get_scenarios(audience_mode: Optional[str] = None):
            return {"scenarios": self.list_scenarios(audience_mode=audience_mode)}

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
