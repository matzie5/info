import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator
from typing import Any, List, Optional
from app.models.session import StudioScenario

router = APIRouter(prefix="/studio", tags=["studio"])

class ProposeScenariosRequest(BaseModel):
    location_name: str = "Wrocław"
    audience_mode: str = "seniors"  # "seniors" | "kids" | "professional"
    language: str = "pl"

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "location" in data and "location_name" not in data:
                data["location_name"] = data["location"]
            if "audience" in data and "audience_mode" not in data:
                data["audience_mode"] = data["audience"]
        return data

class ProposeScenariosResponse(BaseModel):
    location_name: str
    audience_mode: str
    language: str
    scenarios: List[StudioScenario]

WROCLAW_SENIORS_SCENARIOS = [
    StudioScenario(
        id="wroc-sen-whatsapp-grandchild",
        platform_mock="WHATSAPP",
        threat_category="DEEPFAKE_AUDIO",
        author="Wnuczek Tomek (nieznany numer)",
        author_handle="+48 71 892 11 02",
        author_avatar="/assets/avatars/grandchild.png",
        verified=False,
        title="Wypadek na Moście Grunwaldzkim we Wrocławiu",
        content="Babciu! Miałem wypadek na Moście Grunwaldzkim, rozbiłem auto i policja zabiera mnie na komisariat na Trzemeskiej! Pilnie potrzebuję 2500 zł na kaucję BLIKiem. Proszę, nie mów mamie ani tacie, to moja wina!",
        media_url="/assets/audio/wroclaw_grandchild_distress.mp3",
        media_type="AUDIO",
        red_flags=[
            "Wiadomość z obcego numeru telefonu",
            "Presja czasu i panika emocjonalna ('pilnie teraz')",
            "Prośba o szybki przelew BLIK lub wypłatę gotówki",
            "Zakaz kontaktu z resztą rodziny ('nie mów mamie')",
            "Metaliczne artefakty i nienaturalne pauzy w głosie (klon AI)"
        ],
        safe_action_advice="Rozłącz się i zadzwoń do wnuka na jego znany, stały numer telefonu lub skontaktuj się bezpośrednio z rodzicami.",
        is_authentic=False
    ),
    StudioScenario(
        id="wroc-sen-browser-mpwik",
        platform_mock="BROWSER",
        threat_category="PHISHING",
        author="Alert Miejski MPWiK Wrocław",
        author_handle="https://wroclaw-mpwik-awaria.pl.alert-security.net/komunikat",
        author_avatar="/assets/avatars/mpwik_logo.png",
        verified=False,
        title="Awaria magistrali i skażenie wody w dzielnicy Krzyki i Fabryczna",
        content="PILNY KOMUNIKAT MPWiK WROCŁAW: W związku z wykryciem groźnych bakterii w ujęciu 'Mokry Dwór', mieszkańcy Wrocławia proszeni są o natychmiastowe zamówienie tabletek dekontaminacyjnych z miejską dopłatą 90%. Zamów pakiet pod linkiem opłacając koszt wysyłki 14.99 zł przez szybką płatność PayU-Expres.",
        media_url="/assets/images/wroclaw_water_pipe.jpg",
        media_type="URL",
        red_flags=[
            "Podejrzany adres strony internetowej (subdomena spoofing)",
            "Fałszywy certyfikat bezpieczeństwa z anonimowej rejestracji",
            "Wywoływanie paniki zdrowotnej",
            "Bramka płatności wyłudzająca dane karty płatniczej"
        ],
        safe_action_advice="Sprawdź oficjalną stronę www.mpwik.wroc.pl lub zadzwoń pod całodobowy numer alarmowy 994.",
        is_authentic=False
    ),
    StudioScenario(
        id="wroc-sen-facebook-group",
        platform_mock="FACEBOOK",
        threat_category="DISINFORMATION",
        author="Mieszkańcy Wrocławia - Grupa Sąsiedzka",
        author_handle="@wroclaw_spolecznosc_info",
        author_avatar="/assets/avatars/fb_group.png",
        verified=False,
        title="Nowa uchwała Rady Miejskiej Wrocławia: obowiązkowa wymiana liczników prądu",
        content="Uwaga sąsiedzi z Oporowa i Grabiszyna! Od poniedziałku chodzą kontrolerzy z Tauronu i Urzędu Miasta. Każdy senior ma obowiązek wpuścić kontrolera i podpisać aneks z opłatą 350 zł za nowy cyfrowy licznik. Jeśli nie podpiszecie, odetną prąd we wtorek! Klikajcie w link żeby zarezerwować darmowy termin.",
        media_url="/assets/images/electric_meter.jpg",
        media_type="IMAGE",
        red_flags=[
            "Konto autora założone wczoraj z jednym postem",
            "Straszenie natychmiastowym odcięciem prądu",
            "Zalecenie wpuszczania nieznajomych do mieszkania i płacenia gotówką",
            "Komentarze pod postem to fałszywe profile (boty) potęgujące strach"
        ],
        safe_action_advice="Urzędy ani dostawcy energii nigdy nie pobierają gotówki w mieszkaniach ani nie grożą natychmiastowym odcięciem. Zadzwoń do dostawcy prądu.",
        is_authentic=False
    ),
    StudioScenario(
        id="wroc-sen-youtube-clinic",
        platform_mock="YOUTUBE",
        threat_category="DEEPFAKE_VIDEO",
        author="Wrocław Zdrowie TV - Kanał Medyczny",
        author_handle="@wroclaw_zdrowie_senior",
        author_avatar="/assets/avatars/yt_doctor.png",
        verified=False,
        title="Lekarz ze Szpitala Wojskowego we Wrocławiu ujawnia cudowny lek na stawy",
        content="Znany wrocławski kardiolog i reumatolog w wywiadzie wideo: 'NFZ zataja ten tani preparat z Wrocławia przed emerytami, bo apteki by zbankrutowały! Zostało tylko 50 darmowych opakowań dla mieszkańców Dolnego Śląska'.",
        media_url="/assets/audio/wroclaw_mayor_emergency_clone.mp3",
        media_type="VIDEO",
        red_flags=[
            "Ruch warg nie pokrywa się precyzyjnie ze słowami (Deepfake lipsync)",
            "Kanał ma wyłączone komentarze",
            "Teoria spiskowa o zatajaniu leków przez NFZ",
            "Link w opisie filmu kieruje do podejrzanego sklepu internetowego"
        ],
        safe_action_advice="Nigdy nie zamawiaj leków z niesprawdzonych filmów w internecie. Każdy lek skonsultuj ze swoim lekarzem rodzinnym.",
        is_authentic=False
    )
]

WROCLAW_KIDS_SCENARIOS = [
    StudioScenario(
        id="wroc-kids-tiktok-snowday",
        platform_mock="TIKTOK",
        threat_category="DEEPFAKE_AUDIO",
        author="Wrocław_Alert_Official",
        author_handle="@wroc_alert_24",
        author_avatar="/assets/avatars/tiktok_news.png",
        verified=False,
        title="Jutro wszystkie szkoły we Wrocławiu zamknięte! Oficjalny komunikat",
        content="PILNE! Z powodu mrozu -22°C i awarii ogrzewania, prezydent miasta i dyrektorzy szkół SP i LO we Wrocławiu ogłosili całkowite zamknięcie szkół od czwartku do końca tygodnia! Posłuchajcie nagrania dyrektora. Podajcie dalej wszystkim z klasy żeby nikt nie szedł jutro na lekcje! #wroclaw #szkola #wolne #zima",
        media_url="/assets/audio/wroclaw_school_closure_announcement.mp3",
        media_type="AUDIO",
        red_flags=[
            "Konto na TikToku nie posiada oficjalnego niebieskiego znaczka weryfikacji",
            "Audio to syntetyczny głos ze sztucznym tonem (Zero-shot voice cloning)",
            "Brak jakiegokolwiek potwierdzenia na wroclaw.pl czy w Librusie/Vulcanie",
            "Agresywna zachęta do masowego repostowania przed sprawdzeniem faktów"
        ],
        safe_action_advice="Zawsze weryfikuj takie wiadomości w oficjalnym dzienniku elektronicznym szkoły (Librus/Vulcan) lub u wychowawcy.",
        is_authentic=False
    ),
    StudioScenario(
        id="wroc-kids-youtube-robux",
        platform_mock="YOUTUBE",
        threat_category="PHISHING",
        author="MasterGamer Polska",
        author_handle="@master_gamer_pl",
        author_avatar="/assets/avatars/yt_gamer.png",
        verified=False,
        title="DARMOWE ROBUXY I SKINKI W MAGNOLIA PARK WROCŁAW! (Kod promocyjny 2026)",
        content="Siema ekipa! Z okazji otwarcia nowego stoiska w Magnolia Park we Wrocławiu rozdaję 10 000 Robuxów i kody do Brawl Stars! Wystarczy wejść w link w opisie filmu: magnolia-event-robux.xyz, zalogować się swoim kontem Roblox i odebrać darmowe punkty. Spieszcie się, tylko pierwsze 500 osób!",
        media_url="/assets/audio/wroclaw_youtuber_robux_giveaway.mp3",
        media_type="VIDEO",
        red_flags=[
            "Fałszywy głos YouTubera wygenerowany przez AI",
            "Podejrzany adres strony (.xyz zamiast oficjalnego roblox.com)",
            "Strona wymaga podania loginu i hasła do swojego konta Roblox",
            "Sztuczne komentarze botów pod filmem ('działa, dostałem 5000 robuxów!')"
        ],
        safe_action_advice="Nigdy nie wpisuj swoich haseł ani loginów na zewnętrznych stronach oferujących 'darmowe' przedmioty w grach.",
        is_authentic=False
    ),
    StudioScenario(
        id="wroc-kids-whatsapp-gossip",
        platform_mock="WHATSAPP",
        threat_category="DISINFORMATION",
        author="Ktoś z równoległej klasy SP3",
        author_handle="+48 71 501 33 22",
        author_avatar="/assets/avatars/student.png",
        verified=False,
        title="Zdjęcia sprawdzianu z matematyki na jutro!",
        content="Hej, mam fotki jutrzejszego sprawdzianu z matmy dla klas 7-8 w całym Wrocławiu! Wychowawczyni dostała je z kuratorium. Ściągnij plik zip z linku: sprawdzian-wroclaw-2026.apk zanim usuną z serwera!",
        media_url="/assets/images/exam_leak.png",
        media_type="IMAGE",
        red_flags=[
            "Rozszerzenie pliku to .apk (program szpiegujący na telefon Android), a nie zdjęcie",
            "Nieznany numer podszywający się pod znajomego ze szkoły",
            "Wiadomość ma etykietę 'Przekazana wielokrotnie'",
            "Próba zainfekowania telefonu złośliwym oprogramowaniem"
        ],
        safe_action_advice="Nigdy nie instaluj plików z rozszerzeniem .apk lub .exe przesyłanych przez komunikatory.",
        is_authentic=False
    )
]

def generate_location_scenarios(location: str, audience: str, language: str) -> List[StudioScenario]:
    loc_clean = location.strip()
    if "wroc" in loc_clean.lower():
        if audience == "kids":
            return WROCLAW_KIDS_SCENARIOS
        else:
            return WROCLAW_SENIORS_SCENARIOS
    
    # Generic grounded location template
    if audience == "kids":
        return [
            StudioScenario(
                id=f"{loc_clean.lower()}-kids-tiktok-alert",
                platform_mock="TIKTOK",
                threat_category="DEEPFAKE_AUDIO",
                author=f"{loc_clean}_Alert_Official",
                author_handle=f"@{loc_clean.lower()}_news",
                title=f"Wszystkie szkoły w mieście {loc_clean} zamknięte!",
                content=f"PILNE: Z powodu awarii sieci miejskiej w mieście {loc_clean} lekcje odwołane! Posłuchaj nagrania.",
                media_url="/assets/audio/wroclaw_school_closure_announcement.mp3",
                media_type="AUDIO",
                red_flags=["Brak oficjalnego potwierdzenia w e-dzienniku", "Klon głosu z artefaktami", "Podejrzane konto bez weryfikacji"],
                safe_action_advice="Sprawdź bezpośrednio w szkolnym e-dzienniku.",
                is_authentic=False
            ),
            StudioScenario(
                id=f"{loc_clean.lower()}-kids-youtube-gaming",
                platform_mock="YOUTUBE",
                threat_category="PHISHING",
                author="Gamer Club",
                author_handle="@gamer_club_pl",
                title=f"Event gamingowy w {loc_clean} - darmowe kody i skiny!",
                content=f"Wbijajcie do centrum handlowego w mieście {loc_clean}. Kliknijcie link po wejściówki VIP.",
                media_url="/assets/audio/wroclaw_youtuber_robux_giveaway.mp3",
                media_type="VIDEO",
                red_flags=["Phishing wyłudzający hasło do gier", "Nieprawdziwy konkurs bez regulaminu"],
                safe_action_advice="Nie podawaj haseł do kont w grach na obcych stronach.",
                is_authentic=False
            )
        ]
    else:
        return [
            StudioScenario(
                id=f"{loc_clean.lower()}-sen-whatsapp-emergency",
                platform_mock="WHATSAPP",
                threat_category="DEEPFAKE_AUDIO",
                author="Wnuczek (nowy numer)",
                author_handle="+48 22 123 45 67",
                title=f"Wypadek drogowy w mieście {loc_clean}",
                content=f"Babciu, miałem kolizję w centrum miasta {loc_clean}. Potrzebuję pilnie pomocy finansowej, policja czeka!",
                media_url="/assets/audio/wroclaw_grandchild_distress.mp3",
                media_type="AUDIO",
                red_flags=["Obcy numer telefonu", "Pośpiech i silne emocje", "Żądanie kodu BLIK"],
                safe_action_advice="Zadzwoń na tradycyjny, znany numer wnuczka.",
                is_authentic=False
            ),
            StudioScenario(
                id=f"{loc_clean.lower()}-sen-browser-alert",
                platform_mock="BROWSER",
                threat_category="PHISHING",
                author=f"Wodociągi Miejskie {loc_clean}",
                author_handle=f"https://wodociagi-{loc_clean.lower()}.pomoc-alert.com",
                title=f"Skażenie wody w mieście {loc_clean}",
                content=f"Mieszkańcy miasta {loc_clean}: wykryto przekroczenie norm czystości wody. Prosimy o natychmiastowe zamówienie pakietu filtrów.",
                media_url="/assets/images/water_pipe.jpg",
                media_type="URL",
                red_flags=["Podejrzany adres www", "Fałszywy certyfikat", "Wyłudzanie opłaty online"],
                safe_action_advice="Sprawdź oficjalny miejski portal informacyjny.",
                is_authentic=False
            ),
            StudioScenario(
                id=f"{loc_clean.lower()}-sen-facebook-warning",
                platform_mock="FACEBOOK",
                threat_category="DISINFORMATION",
                author=f"Mieszkańcy {loc_clean} i Okolic",
                author_handle=f"@{loc_clean.lower()}_spolecznosc",
                title=f"Pilna informacja dla seniorów z miasta {loc_clean}",
                content=f"Uwaga mieszkańcy {loc_clean}! W poniedziałek obowiązkowe opłaty administracyjne pobierane w domach.",
                media_url="/assets/images/notice.jpg",
                media_type="IMAGE",
                red_flags=["Profil bez historii", "Straszenie karami finansowymi", "Zachęta do wpuszczania oszustów"],
                safe_action_advice="Nigdy nie przekazuj pieniędzy obcym osobom w mieszkaniu.",
                is_authentic=False
            )
        ]

@router.post("/propose-scenarios", response_model=ProposeScenariosResponse)
def propose_scenarios(req: ProposeScenariosRequest):
    if not req.location_name or len(req.location_name.strip()) == 0:
        raise HTTPException(status_code=400, detail="Location name is required")
    scenarios = generate_location_scenarios(req.location_name, req.audience_mode, req.language)
    return ProposeScenariosResponse(
        location_name=req.location_name,
        audience_mode=req.audience_mode,
        language=req.language,
        scenarios=scenarios
    )
