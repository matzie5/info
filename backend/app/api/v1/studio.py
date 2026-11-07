import logging
import uuid
import httpx
import re
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, model_validator
from typing import Any, List, Optional
from app.models.session import StudioScenario

logger = logging.getLogger(__name__)

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
    # 1. AUTHENTIC BROWSER SCENARIO (wroclaw.pl)
    StudioScenario(
        id="wroc-sen-browser-wroclaw",
        platform_mock="BROWSER",
        threat_category="AUTHENTIC_GOV",
        author="Oficjalny Portal Wrocław.pl",
        author_handle="https://www.wroclaw.pl/dla-mieszkanca/wroclawska-karta-seniora-znizki",
        author_avatar="/assets/avatars/wroclaw_herb.png",
        verified=True,
        title="Oficjalny Portal Wrocław.pl: Wrocławska Karta Seniora i bezpłatne przejazdy MPK",
        content="Prezydent Wrocławia i Wydział Zdrowia informują: Mieszkańcy Wrocławia po ukończeniu 60. roku życia mogą bezpłatnie odebrać Wrocławską Kartę Seniora uprawniającą do zniżek w muzeach, teatrach i ośrodkach rekreacyjnych. Od 65. roku życia przysługują bezpłatne przejazdy wszystkimi liniami tramwajowymi i autobusowymi MPK Wrocław na podstawie dowodu tożsamości. Wnioski przyjmuje Wrocławskie Centrum Seniora przy pl. Dominikańskim 6 oraz bezpieczny profil ePUAP.",
        media_url="https://www.wroclaw.pl/dla-mieszkanca/wroclawska-karta-seniora-znizki",
        media_type="URL",
        red_flags=[
            "Prawidłowy adres domeny w oficjalnej strefie samorządowej (.wroc.pl)",
            "Bezpieczne połączenie i ważny certyfikat SSL dla Urzędu Miejskiego Wrocławia",
            "Brak presji czasu, brak żądań podania haseł do banku czy kodów BLIK",
            "Oficjalne numery telefonów do Wydziału Zdrowia i pl. Dominikańskiego 6"
        ],
        safe_action_advice="Materiał jest w 100% autentyczny i bezpieczny! Możesz spokojnie korzystać z informacji z oficjalnego portalu miasta.",
        is_authentic=True,
        cloned_website={
            "original_url": "https://www.wroclaw.pl",
            "real_domain": "wroclaw.pl",
            "spoofed_url": "https://www.wroclaw.pl/dla-mieszkanca/wroclawska-karta-seniora-znizki",
            "spoofed_domain": "wroclaw.pl",
            "brand_name": "Oficjalny Serwis Wrocław.pl",
            "logo_text": "WROCŁAW.PL",
            "primary_color": "#dc2626",
            "accent_color": "#f59e0b",
            "nav_links": ["Wiadomości", "Komunikacja MPK", "Dla Mieszkańca", "Seniorzy", "Kultura", "BIP"],
            "alert_title": "OFICJALNY KOMUNIKAT MIEJSKI: Program Wrocławska Karta Seniora",
            "alert_body": "Prezydent Wrocławia przypomina o ulgach i bezpłatnych przejazdach tramwajami i autobusami MPK dla osób 65+. Wnioski bezpłatne w punkcie przy pl. Dominikańskim 6.",
            "cta_label": "Więcej informacji: Wrocławskie Centrum Seniora",
            "countdown_seconds": 0,
            "ssl_details": {
                "issuer": "DigiCert Global Root CA (Urząd Miejski Wrocławia)",
                "valid": True,
                "reason": "Certyfikat OV zweryfikowany notarialnie dla Gminy Wrocław"
            },
            "comparison": {
                "real_domain": "wroclaw.pl",
                "fake_domain": "— (Strona w 100% autentyczna)",
                "real_features": "Oficjalna domena samorządowa, brak żądania haseł do banku i brak płatności.",
                "fake_features": "Brak manipulacji. Prawdziwa informacja miejska."
            }
        }
    ),
    # 2. FAKE/PHISHING BROWSER SCENARIO (mpwik.wroc.pl clone)
    StudioScenario(
        id="wroc-sen-browser-mpwik",
        platform_mock="BROWSER",
        threat_category="PHISHING",
        author="Alert Miejski MPWiK Wrocław",
        author_handle="https://mpwik-wroclaw.pl.awaria-wodociagi.cc/komunikat-alarmowy",
        author_avatar="/assets/avatars/mpwik_logo.png",
        verified=False,
        title="Awaria magistrali i skażenie wody w dzielnicy Krzyki i Fabryczna",
        content="PILNY KOMUNIKAT MPWiK WROCŁAW: W związku z wykryciem groźnych bakterii w ujęciu 'Mokry Dwór', mieszkańcy Wrocławia proszeni są o natychmiastowe zamówienie tabletek dekontaminacyjnych z miejską dopłatą 90%. Zamów pakiet pod linkiem opłacając koszt wysyłki 4.80 zł przez szybką płatność BLIK.",
        media_url="https://mpwik.wroc.pl",
        media_type="URL",
        red_flags=[
            "Podejrzany adres strony internetowej (subdomena .cc zamiast .wroc.pl)",
            "Fałszywy certyfikat bezpieczeństwa z darmowej 30-dniowej rejestracji",
            "Sztuczny licznik odliczający 15 minut do rzekomego odcięcia wody",
            "Bramka płatności wyłudzająca kod BLIK i dane bankowości internetowej"
        ],
        safe_action_advice="Sprawdź oficjalną stronę www.mpwik.wroc.pl lub zadzwoń pod całodobowy bezpłatny numer alarmowy pogotowia wodociągowego 994.",
        is_authentic=False,
        cloned_website={
            "original_url": "https://mpwik.wroc.pl",
            "real_domain": "mpwik.wroc.pl",
            "spoofed_url": "https://mpwik-wroclaw.pl.awaria-wodociagi.cc/komunikat-alarmowy",
            "spoofed_domain": "mpwik-wroclaw.pl.awaria-wodociagi.cc",
            "brand_name": "MPWiK Wrocław S.A.",
            "logo_text": "MPWiK Wrocław",
            "primary_color": "#0072ce",
            "accent_color": "#dc2626",
            "nav_links": ["O nas", "Strefa Klienta", "Jakość Wody", "Awarie", "Kontakt"],
            "alert_title": "PILNY KOMUNIKAT: Wykrycie bakterii w ujęciu Mokry Dwór",
            "alert_body": "Szanowni Mieszkańcy Wrocławia! W dniu dzisiejszym wykryto krytyczne zanieczyszczenie ujęcia wody. W celu zabezpieczenia instalacji domowej konieczne jest pobranie kodu dekontaminacyjnego i wniesienie symbolicznej opłaty manipulacyjnej 4,80 zł. Brak opłaty spowoduje odcięcie zasilania.",
            "cta_label": "Potwierdź tożsamość i ureguluj 4,80 zł [BLIK]",
            "countdown_seconds": 895,
            "ssl_details": {
                "issuer": "Free Automated Domain Validator CA",
                "valid": False,
                "reason": "Certyfikat wystawiony dla domeny *.awaria-wodociagi.cc, brak tożsamości MPWiK S.A."
            },
            "comparison": {
                "real_domain": "mpwik.wroc.pl",
                "fake_domain": "mpwik-wroclaw.pl.awaria-wodociagi.cc",
                "real_features": "Oficjalny adres mpwik.wroc.pl, bezpłatny numer alarmowy 994, brak opłat BLIK.",
                "fake_features": "Adres .cc, fałszywy zegar odliczania, formularz wyłudzający 4.80 zł BLIKiem."
            }
        }
    ),
    # 3. AUTHENTIC WHATSAPP/SMS SCENARIO (Alert RCB)
    StudioScenario(
        id="wroc-sen-whatsapp-rcb",
        platform_mock="WHATSAPP",
        threat_category="AUTHENTIC_SMS",
        author="Alert RCB (Rządowe Centrum Bezpieczeństwa)",
        author_handle="+48 22 375 92 00",
        author_avatar="/assets/avatars/rcb_logo.png",
        verified=True,
        title="Oficjalny Alert RCB: Ostrzeżenie meteorologiczne dla Wrocławia",
        content="UWAGA! Dziś w nocy i jutro we Wrocławiu i powiecie wrocławskim prognozowany bardzo silny wiatr w porywach do 90 km/h. Możliwe przerwy w dostawie prądu. Zabezpiecz wolnostojące przedmioty na balkonach i parapetach. Unikaj parkowania pod drzewami. Śledź komunikaty IMGW.",
        media_url=None,
        media_type="TEXT",
        red_flags=[
            "Brak podejrzanych elementów - to prawdziwy Alert RCB!",
            "Brak jakichkolwiek linków zewnętrznych zmuszających do kliknięcia",
            "Brak prośby o pieniądze, kody BLIK czy logowanie do banku",
            "Oficjalna treść zbieżna z ostrzeżeniami IMGW i służb miejskich Wrocławia"
        ],
        safe_action_advice="Wiadomość jest prawdziwa. Zastosuj się do instrukcji: zamknij okna, zabezpiecz przedmioty na balkonie i zachowaj ostrożność na dworze.",
        is_authentic=True
    ),
    # 4. FAKE DEEPFAKE AUDIO SCENARIO (Grandchild clone)
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
            "Wiadomość z obcego numeru telefonu podszywająca się pod wnuka",
            "Presja czasu i panika emocjonalna ('pilnie teraz')",
            "Prośba o szybki przelew BLIK lub wypłatę gotówki",
            "Zakaz kontaktu z resztą rodziny ('nie mów mamie')",
            "Metaliczne artefakty i nienaturalne pauzy w głosie (klon AI)"
        ],
        safe_action_advice="Rozłącz się i zadzwoń do wnuka na jego znany, stały numer telefonu lub skontaktuj się bezpośrednio z rodzicami.",
        is_authentic=False
    ),
    # 5. FAKE FACEBOOK GROUP SCAM SCENARIO
    StudioScenario(
        id="wroc-sen-facebook-group",
        platform_mock="FACEBOOK",
        threat_category="SCAM_INVESTMENT",
        author="Wrocławianie - Grupa Sąsiedzka Krzyki/Śródmieście",
        author_handle="https://facebook.com/groups/wroclaw.krzyki.sasiedzi",
        author_avatar="/assets/avatars/fb_group_wroc.png",
        verified=False,
        title="Dofinansowanie dla emerytów z Dolnego Śląska na wymianę pieców (ostatnie 48h)",
        content="UWAGA SĄSIEDZI Z WROCŁAWIA: Urząd Marszałkowski uruchomił pilną pulę dopłat 12 000 zł do pomp ciepła i fotowoltaiki bez wkładu własnego dla osób 60+. Zgłoszenia przyjmują tylko przez formularz do jutra do godziny 18:00 ze względu na wyczerpanie środków unijnych. Wystarczy podać PESEL i numer dowodu osobistego w linku.",
        media_url="/assets/images/wroclaw_smog_furnace.jpg",
        media_type="IMAGE",
        red_flags=[
            "Wpis na prywatnej grupie sąsiedzkiej zamiast na oficjalnej stronie urzędu (bip.um.wroc.pl)",
            "Wyłudzanie wrażliwych danych tożsamości (PESEL, seria dowodu) przez nieznany formularz",
            "Sztuczny pośpiech i presja czasu ('ostatnie 48h', 'kto pierwszy ten lepszy')",
            "Brak weryfikacji tożsamości autora posta (profil założony 3 dni temu)"
        ],
        safe_action_advice="Nigdy nie podawaj numeru PESEL ani numeru dowodu osobistego na formularzach z mediów społecznościowych. Informacje o dotacjach sprawdzaj osobiście w Wydziale Środowiska Urzędu Miejskiego Wrocławia.",
        is_authentic=False
    )
]

WROCLAW_KIDS_SCENARIOS = [
    # 1. AUTHENTIC BROWSER SCENARIO (Librus official)
    StudioScenario(
        id="wroc-kids-browser-librus-official",
        platform_mock="BROWSER",
        threat_category="AUTHENTIC_SCHOOL",
        author="LIBRUS Synergia - Dziennik Szkolny",
        author_handle="https://portal.librus.pl/rodzina/synergia",
        author_avatar="/assets/avatars/librus_logo.png",
        verified=True,
        title="Oficjalny panel Librus: Komunikat wychowawcy i wyjście do Hydropolis",
        content="Szanowni Uczniowie klasy 7A. Przypominam, że w najbliższy piątek odbędzie się wyjście edukacyjne do centrum wiedzy o wodzie Hydropolis we Wrocławiu przy ul. Na Grobli. Zbiórka o godzinie 8:30 przed wejściem głównym do szkoły. Prosimy o zabranie ważnych legitymacji szkolnych. Pozdrawiam, Wychowawca klasy.",
        media_url="https://portal.librus.pl",
        media_type="URL",
        red_flags=[
            "Prawidłowy adres domeny portal.librus.pl z szyfrowaniem HTTPS",
            "Ważny certyfikat bezpieczeństwa wystawiony dla Librus Sp. z o.o.",
            "Wiadomość z podpisem znanego wychowawcy bez próśb o hasła",
            "Brak jakichkolwiek podejrzanych załączników (.exe, .apk) czy linków do płatności"
        ],
        safe_action_advice="Wiadomość jest autentyczna. Zanotuj godzinę zbiórki na wycieczkę do Hydropolis i pamiętaj o legitymacji.",
        is_authentic=True,
        cloned_website={
            "original_url": "https://portal.librus.pl",
            "real_domain": "portal.librus.pl",
            "spoofed_url": "https://portal.librus.pl/rodzina/synergia",
            "spoofed_domain": "portal.librus.pl",
            "brand_name": "Librus Synergia",
            "logo_text": "LIBRUS Synergia",
            "primary_color": "#1e3a8a",
            "accent_color": "#0284c7",
            "nav_links": ["Tablica Ogłoszeń", "Oceny", "Nieobecności", "Plan Lekcji", "Zadania Domowe"],
            "alert_title": "OGŁOSZENIE WYCHOWAWCY: Wyjście klasowe do Hydropolis",
            "alert_body": "Informacja dla klasy 7A: Zbiórka w piątek o 8:30. Obowiązkowe legitymacje szkolne uprawniające do bezpłatnego biletu wstępu.",
            "cta_label": "Przejdź do planu lekcji na piątek",
            "countdown_seconds": 0,
            "ssl_details": {
                "issuer": "DigiCert TLS RSA SHA256 (Librus Sp. z o.o.)",
                "valid": True,
                "reason": "Certyfikat zweryfikowany dla oficjalnego dostawcy oprogramowania szkolnego"
            },
            "comparison": {
                "real_domain": "portal.librus.pl",
                "fake_domain": "— (Strona autentyczna)",
                "real_features": "Prawdziwy dziennik Synergia, bezpieczne logowanie, brak złośliwych skryptów.",
                "fake_features": "Brak manipulacji. Prawdziwy komunikat szkoły."
            }
        }
    ),
    # 2. FAKE/PHISHING BROWSER SCENARIO (Librus spoof)
    StudioScenario(
        id="wroc-kids-browser-librus",
        platform_mock="BROWSER",
        threat_category="PHISHING",
        author="Librus Synergia - Portal Edukacyjny",
        author_handle="https://synergia-librus.pl.szkolny-portal.cc/loguj/wroclaw-lo",
        author_avatar="/assets/avatars/browser_shield.png",
        verified=False,
        title="Fałszywy panel logowania Librus: Wyciek pytań ze sprawdzianu",
        content="UWAGA UCZNIOWIE: Zmiana systemu logowania i baza pytań z egzaminu ósmoklasisty i matury. Zaloguj się kontem ucznia lub rodzica aby odblokować dostęp.",
        media_url="https://portal.librus.pl",
        media_type="URL",
        red_flags=[
            "Podejrzany adres domeny (.szkolny-portal.cc zamiast oficjalnego librus.pl)",
            "Wyłudzanie haseł uczniów i rodziców",
            "Obejściowy panel podszywający się pod platformę Synergia",
            "Darmowy, podejrzany certyfikat SSL bez tożsamości szkoły"
        ],
        safe_action_advice="Zawsze wpisuj adres szkolnego dziennika bezpośrednio lub korzystaj z oficjalnej aplikacji w telefonie. Nigdy nie podawaj hasła na nieznanych stronach.",
        is_authentic=False,
        cloned_website={
            "original_url": "https://portal.librus.pl",
            "real_domain": "portal.librus.pl",
            "spoofed_url": "https://synergia-librus.pl.szkolny-portal.cc/loguj/wroclaw-lo",
            "spoofed_domain": "synergia-librus.pl.szkolny-portal.cc",
            "brand_name": "Librus Synergia",
            "logo_text": "LIBRUS Synergia",
            "primary_color": "#1e3a8a",
            "accent_color": "#0284c7",
            "nav_links": ["Wiadomości", "Oceny", "Plan Lekcji", "Zadania Domowe", "Ustawienia"],
            "alert_title": "UWAGA UCZNIOWIE: Weryfikacja konta i dostęp do arkuszy",
            "alert_body": "W związku z awarią centralnego serwera Librus, zaloguj się ponownie swoim loginem i hasłem, aby zweryfikować obecność na liście uczniów oraz odblokować dostęp do oficjalnych arkuszy próbnych.",
            "cta_label": "Zaloguj się kontem ucznia / rodzica",
            "countdown_seconds": 600,
            "ssl_details": {
                "issuer": "Free Automated Cert Authority",
                "valid": False,
                "reason": "Certyfikat wystawiony dla *.szkolny-portal.cc, brak tożsamości Librus Sp. z o.o."
            },
            "comparison": {
                "real_domain": "portal.librus.pl",
                "fake_domain": "synergia-librus.pl.szkolny-portal.cc",
                "real_features": "Adres portal.librus.pl, autoryzacja dwuskładnikowa, certyfikat korporacyjny.",
                "fake_features": "Fałszywa domena szkolny-portal.cc, żądanie haseł bez 2FA."
            }
        }
    ),
    # 3. FAKE DEEPFAKE TIKTOK SCENARIO
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
    # 4. AUTHENTIC YOUTUBE EDU SCENARIO
    StudioScenario(
        id="wroc-kids-youtube-edu",
        platform_mock="YOUTUBE",
        threat_category="AUTHENTIC_MEDIA",
        author="Wrocławskie Centrum Doskonalenia Nauczycieli",
        author_handle="@wcdn_wroclaw_edu",
        author_avatar="/assets/avatars/yt_edu.png",
        verified=True,
        title="Jak powstał Wrocław? Tajemnice Ostrowa Tumskiego i Mostu Grunwaldzkiego",
        content="Oficjalny film edukacyjny zrealizowany we współpracy z Muzeum Miejskim Wrocławia i Wydziałem Edukacji Urzędu Miejskiego. Odkryj sekrety wrocławskich wysp, zabytkowych mostów i odbudowy miasta po 1945 roku. Materiał dydaktyczny polecany dla uczniów wrocławskich szkół podstawowych i ponadpodstawowych.",
        media_url="/assets/audio/wroclaw_school_closure_announcement.mp3",
        media_type="VIDEO",
        red_flags=[
            "Zweryfikowany profil miejskiej instytucji edukacyjnej (WCDN)",
            "Oficjalna współpraca z Muzeum Miejskim Wrocławia i Urzędem Miejskim",
            "Rzetelna narracja naukowa bez sensacji, clickbaitu i żądań podawania danych",
            "Brak podejrzanych linków zewnętrznych w opisie"
        ],
        safe_action_advice="Materiał jest autentyczny i wartościowy dydaktycznie. Możesz go bezpiecznie oglądać i czerpać rzetelną wiedzę.",
        is_authentic=True
    ),
    # 5. FAKE TIKTOK ROBUX PHISHING SCENARIO
    StudioScenario(
        id="wroc-kids-tiktok-magnolia",
        platform_mock="TIKTOK",
        threat_category="PHISHING",
        author="Roblox_Polska_Official_Drop",
        author_handle="@roblox_polska_kody_wroc",
        author_avatar="/assets/avatars/tiktok_roblox.png",
        verified=False,
        title="Darmowe Robuxy i Kody w Magnolia Park Wrocław! Kod ważny tylko dziś!",
        content="SIEMA WROCŁAW! Specjalny event w Magnolia Park na Legnickiej! Rozdajemy 50 000 Robuxów i kody do Brawl Stars dla pierwszych 100 osób z Wrocławia! Wejdź w link w moim bio: 'roblox-prezenty-wroclaw.shop', pobierz paczkę z darmowymi skinami i podaj swój login żeby odebrać doładowanie!",
        media_url=None,
        media_type="TEXT",
        red_flags=[
            "Obietnica darmowych przedmiotów i wirtualnej waluty o dużej wartości ('za darmo')",
            "Nieoficjalny link poza oficjalnym sklepem Roblox (domena .shop)",
            "Pobieranie nieznanych paczek lub aplikacji z zewnętrznych stron",
            "Wyłudzanie loginu i hasła do konta w grze"
        ],
        safe_action_advice="Nigdy nie klikaj linków oferujących darmową walutę w grach i nie pobieraj nieznanych plików. Legalne kody kupuje się tylko w oficjalnych sklepach.",
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

class StudioGenerateMediaRequest(BaseModel):
    media_type: str = "AUDIO"  # "AUDIO" | "IMAGE"
    prompt_or_text: str
    language: Optional[str] = "pl"
    voice_persona: Optional[str] = "grandchild_distress"
    aspect_ratio: Optional[str] = "1:1"
    scenario_title: Optional[str] = None
    session_id: Optional[str] = None

@router.post("/generate-media")
def studio_generate_media(req: StudioGenerateMediaRequest):
    """
    Connects to real Google Cloud services (Text-to-Speech & Vertex AI Imagen 3)
    to generate authentic audio voiceovers or images for training scenarios in the Supervisor Studio.
    """
    from app.services.google_media_service import GoogleMediaService
    service = GoogleMediaService.get_instance()
    if req.media_type.upper() == "IMAGE":
        return service.generate_image(
            prompt=req.prompt_or_text,
            aspect_ratio=req.aspect_ratio or "1:1",
            scenario_title=req.scenario_title,
            session_id=req.session_id,
        )
    return service.generate_audio_speech(
        text=req.prompt_or_text,
        language=req.language or "pl",
        voice_persona=req.voice_persona or "grandchild_distress",
        session_id=req.session_id,
    )


class InspectWebsiteRequest(BaseModel):
    url: str


class CloneWebsiteRequest(BaseModel):
    url: str
    audience_mode: str = "seniors"
    language: str = "pl"
    threat_type: str = "PHISHING"
    custom_scenario_title: Optional[str] = None


@router.post("/inspect-real-website")
def inspect_real_website(req: InspectWebsiteRequest):
    """
    Inspects a real website URL, extracting brand metadata, colors, title, and structure.
    Used by the Supervisor Studio Website Cloner Agent.
    """
    from app.services.website_cloner_service import WebsiteClonerService
    service = WebsiteClonerService.get_instance()
    return service.inspect_real_website(req.url)


@router.post("/clone-website")
def clone_website(req: CloneWebsiteRequest):
    """
    Creates an authentic spoofed website scenario based on a real website,
    with educational red flags and audience-tailored pedagogic advice.
    """
    from app.services.website_cloner_service import WebsiteClonerService
    service = WebsiteClonerService.get_instance()
    return service.clone_and_spoof_website(
        url=req.url,
        audience_mode=req.audience_mode,
        language=req.language,
        threat_type=req.threat_type,
        custom_scenario_title=req.custom_scenario_title,
    )


def generate_institutional_fallback_html(clean_url: str, is_authentic: bool = True) -> str:
    """
    Generates a high-fidelity visual mirror snapshot of Polish institutional websites
    (MPWiK Wrocław, Wrocław.pl, Librus Synergia) for resilient iframe rendering.
    Supports both authentic official portals and realistic deceptive phishing clones.
    """
    lowered = clean_url.lower()

    # 1. LIBRUS SYNERGIA (School electronic gradebook portal)
    if "librus" in lowered or "synergia" in lowered or "szkolny" in lowered:
        if not is_authentic:
            return """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LIBRUS Synergia - Wymagana Weryfikacja Bezpieczeństwa</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; }
    .librus-top { background: #1e1b4b; border-bottom: 2px solid #38bdf8; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 20px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 10px; }
    .school-info { font-size: 12px; color: #94a3b8; font-weight: 500; }
    .subnav { background: #1e293b; padding: 10px 24px; display: flex; gap: 20px; font-size: 13px; font-weight: 600; color: #cbd5e1; border-bottom: 1px solid #334155; }
    .subnav span.active { color: #38bdf8; border-bottom: 2px solid #38bdf8; padding-bottom: 8px; }
    .container { max-width: 820px; margin: 32px auto; padding: 0 16px; }
    .alert-banner { background: #450a0a; border: 1px solid #dc2626; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; gap: 14px; align-items: flex-start; }
    .alert-title { color: #fca5a5; font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .alert-text { color: #fecaca; font-size: 12px; line-height: 1.5; margin: 0; }
    .card { background: #1e293b; border-radius: 14px; border: 1px solid #334155; padding: 28px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    h1 { font-size: 20px; font-weight: 800; color: #f1f5f9; margin: 0 0 12px 0; }
    p { font-size: 13px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; }
    input { width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; border-radius: 8px; padding: 10px 14px; color: #f8fafc; font-size: 13px; }
    input:focus { outline: none; border-color: #38bdf8; }
    .btn-submit { background: #0284c7; color: white; border: none; border-radius: 8px; padding: 12px 20px; font-size: 13px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 10px; transition: background 0.2s; }
    .btn-submit:hover { background: #0369a1; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 36px; padding: 16px; }
  </style>
</head>
<body>
  <div class="librus-top">
    <div class="brand">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
      <span>LIBRUS Synergia</span>
    </div>
    <div class="school-info">Szkoła Podstawowa nr 3 we Wrocławiu • Panel Ucznia i Rodzica</div>
  </div>
  <div class="subnav">
    <span class="active">Powiadomienia</span>
    <span>Oceny</span>
    <span>Frekwencja</span>
    <span>Plan Lekcji</span>
    <span>Wiadomości</span>
  </div>
  <div class="container">
    <div class="alert-banner">
      <div style="font-size: 20px; line-height: 1;">⚠️</div>
      <div>
        <div class="alert-title">Krytyczna aktualizacja bezpieczeństwa konta rodzica</div>
        <p class="alert-text">Z powodu wdrożenia wymogów dyrektywy NIS-2, Twoje konto wymaga natychmiastowej ponownej weryfikacji. Brak potwierdzenia danych w ciągu 24 godzin spowoduje zawieszenie dostępu do e-dziennika i podglądu ocen.</p>
      </div>
    </div>
    <div class="card">
      <h1>Potwierdź dane logowania konta rodzica</h1>
      <p>Wprowadź numer telefonu rodzica oraz aktualne hasło, aby zachować ciągłość powiadomień SMS o ocenach i nieobecnościach ucznia.</p>
      <form onsubmit="event.preventDefault(); alert('Symulacja ataku phishingowego: W prawdziwym świecie Twoje hasło i numer telefonu trafiłyby do oszustów!');">
        <div class="form-group">
          <label>Numer telefonu komórkowego opiekuna:</label>
          <input type="tel" placeholder="+48 ___ ___ ___" required>
        </div>
        <div class="form-group">
          <label>Aktualne hasło do systemu Synergia:</label>
          <input type="password" placeholder="Wprowadź swoje hasło" required>
        </div>
        <button type="submit" class="btn-submit">Zweryfikuj konto i zachowaj dostęp</button>
      </form>
    </div>
    <div class="footer">
      Synergia System v2026.1 • Librus Sp. z o.o. • Bezpieczne połączenie z certyfikatem Cloudflare
    </div>
  </div>
</body>
</html>"""
        else:
            return """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LIBRUS Synergia - Oficjalny Dziennik Elektroniczny</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; }
    .librus-top { background: #1e1b4b; border-bottom: 2px solid #38bdf8; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 20px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 10px; }
    .school-info { font-size: 12px; color: #94a3b8; font-weight: 500; }
    .subnav { background: #1e293b; padding: 10px 24px; display: flex; gap: 20px; font-size: 13px; font-weight: 600; color: #cbd5e1; border-bottom: 1px solid #334155; }
    .subnav span.active { color: #38bdf8; border-bottom: 2px solid #38bdf8; padding-bottom: 8px; }
    .container { max-width: 820px; margin: 32px auto; padding: 0 16px; }
    .card { background: #1e293b; border-radius: 14px; border: 1px solid #334155; padding: 28px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); }
    .badge { display: inline-block; background: #064e3b; color: #6ee7b7; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-bottom: 12px; }
    h1 { font-size: 20px; font-weight: 800; color: #f1f5f9; margin: 0 0 12px 0; }
    .meta { font-size: 12px; color: #94a3b8; margin-bottom: 16px; border-bottom: 1px solid #334155; padding-bottom: 12px; }
    .msg-content { font-size: 14px; line-height: 1.7; color: #e2e8f0; background: #0f172a; border-left: 4px solid #38bdf8; padding: 18px; border-radius: 8px; margin-bottom: 20px; }
    .info-footer { font-size: 12px; color: #64748b; line-height: 1.5; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 36px; padding: 16px; }
  </style>
</head>
<body>
  <div class="librus-top">
    <div class="brand">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
      <span>LIBRUS Synergia</span>
    </div>
    <div class="school-info">Szkoła Podstawowa nr 3 we Wrocławiu • Panel Ucznia i Rodzica</div>
  </div>
  <div class="subnav">
    <span class="active">Wiadomości</span>
    <span>Oceny</span>
    <span>Frekwencja</span>
    <span>Plan Lekcji</span>
    <span>Zadania Domowe</span>
  </div>
  <div class="container">
    <div class="card">
      <span class="badge">Wiadomość Szkolna</span>
      <h1>Wycieczka edukacyjna do Hydropolis - Wrocław</h1>
      <div class="meta">
        Nadawca: <strong>mgr Anna Nowak (Wychowawca klasy 7A)</strong> • Data: 7 listopada 2026, 08:15
      </div>
      <div class="msg-content">
        Drodzy Rodzice i Uczniowie,<br><br>
        Przypominam, że w najbliższy piątek cała klasa wyrusza na warsztaty edukacyjne z ekologii i zasobów wodnych do wrocławskiego centrum wiedzy o wodzie <strong>Hydropolis</strong> przy ul. Na Grobli 17.<br><br>
        Zbiórka o godzinie 8:30 przed głównym wejściem do szkoły. Proszę wszystkich o zabranie ważnych legitymacji szkolnych oraz wygodnego obuwia. Koszt wstępu pokryty jest z funduszu klasowego - nie są wymagane żadne dodatkowe wpłaty.<br><br>
        Z poważaniem,<br>
        Anna Nowak, wychowawca
      </div>
      <div class="info-footer">
        🔒 Wiadomość wysłana z oficjalnego systemu LIBRUS Synergia. Portal nigdy nie prosi o podawanie haseł w wiadomościach.
      </div>
    </div>
    <div class="footer">
      Oficjalny System Synergia • Librus Sp. z o.o. • Bezpieczne połączenie szyfrowane TLS 1.3
    </div>
  </div>
</body>
</html>"""

    # 2. MPWiK WROCŁAW (Municipal Water & Sewage Utility)
    if "mpwik" in lowered or "wodociag" in lowered or "awaria-wodociagi" in lowered or "woda" in lowered:
        if not is_authentic:
            return """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MPWiK Wrocław S.A. - Alert Kryzysowy i Dekontaminacja</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
    .topbar { background: #00264d; color: #cbd5e1; padding: 8px 24px; font-size: 11px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a; }
    .topbar-alert { color: #f87171; font-weight: 700; display: flex; align-items: center; gap: 6px; }
    .header { background: #003366; color: white; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #00a0e3; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-title { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; }
    .brand-sub { font-size: 11px; color: #7dd3fc; font-weight: 500; }
    .nav { display: flex; gap: 18px; font-size: 13px; font-weight: 600; color: #e2e8f0; }
    .breadcrumb { background: #e2e8f0; padding: 8px 24px; font-size: 11px; color: #475569; display: flex; justify-content: space-between; }
    .container { max-width: 900px; margin: 28px auto; padding: 0 16px; }
    .alert-card { background: #ffffff; border-radius: 12px; border-top: 6px solid #dc2626; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 24px; }
    .alert-header { background: #fef2f2; padding: 20px 24px; border-bottom: 1px solid #fecaca; display: flex; align-items: flex-start; gap: 14px; }
    .alert-badge { background: #dc2626; color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; display: inline-block; margin-bottom: 6px; }
    .alert-title { font-size: 20px; font-weight: 800; color: #991b1b; margin: 0; line-height: 1.3; }
    .alert-body { padding: 24px; font-size: 14px; line-height: 1.6; color: #334155; }
    .alert-body p { margin-top: 0; }
    .action-box { background: #fffbeb; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .action-title { font-size: 15px; font-weight: 800; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
    .timer { font-family: monospace; font-size: 14px; background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
    .form-field { display: flex; flex-col; gap: 4px; }
    .form-field label { font-size: 11px; font-weight: 700; color: #78350f; }
    .form-field input, .form-field select { padding: 8px 12px; border: 1px solid #d97706; border-radius: 6px; font-size: 13px; background: white; }
    .btn-pay { background: #059669; color: white; border: none; border-radius: 8px; padding: 14px 24px; font-size: 14px; font-weight: 800; cursor: pointer; width: 100%; margin-top: 16px; text-transform: uppercase; letter-spacing: 0.5px; transition: background 0.2s; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.4); }
    .btn-pay:hover { background: #047857; }
    .footer { background: #00264d; color: #94a3b8; padding: 28px 24px; font-size: 11px; line-height: 1.6; text-align: center; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-alert">
      <span>🚨</span>
      <span>SYSTEM POWIADAMIANIA KRYZYSOWEGO MPWiK WROCŁAW • STREFA 1 I 2</span>
    </div>
    <div>Biuro Obsługi Mieszkańców: +48 71 340 95 00</div>
  </div>
  <div class="header">
    <div class="brand">
      <svg width="36" height="36" viewBox="0 0 38 38" fill="none">
        <path d="M19 3C19 3 7 17 7 24.5C7 31.1274 12.3726 36.5 19 36.5C25.6274 36.5 31 31.1274 31 24.5C31 17 19 3 19 3Z" fill="#00a0e3"/>
        <path d="M15 22C15 19.7909 16.7909 18 19 18C19.5523 18 20 17.5523 20 17C20 16.4477 19.5523 16 19 16C15.6863 16 13 18.6863 13 22C13 22.5523 13.4477 23 14 23C14.5523 23 15 22.5523 15 22Z" fill="#ffffff" opacity="0.6"/>
      </svg>
      <div>
        <div class="brand-title">MPWiK Wrocław S.A.</div>
        <div class="brand-sub">Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji we Wrocławiu</div>
      </div>
    </div>
    <div class="nav">
      <span>Awarie i Wyłączenia</span>
      <span>Jakość Wody</span>
      <span>Strefa Klienta</span>
      <span>Kontakt</span>
    </div>
  </div>
  <div class="breadcrumb">
    <span>Strona główna &gt; Komunikaty kryzysowe &gt; Alert sanitarny nr 04/2026/WROC</span>
    <span style="color: #dc2626; font-weight: bold;">Status sieci: AWARIA KRYTYCZNA</span>
  </div>
  <div class="container">
    <div class="alert-card">
      <div class="alert-header">
        <div style="font-size: 28px; line-height: 1;">⚠️</div>
        <div>
          <span class="alert-badge">Zarządzenie Kryzysowe</span>
          <h1 class="alert-title">Skażenie chemiczno-biologiczne magistrali wodociągowej Wrocław Południe i Zachód</h1>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Data: 7 listopada 2026 • Identyfikator zgłoszenia: MPWIK/DEKONT/8812</div>
        </div>
      </div>
      <div class="alert-body">
        <p><strong>Uwaga mieszkańcy osiedli: Krzyki, Oporów, Fabryczna, Gaj oraz Borek!</strong></p>
        <p>W trakcie prac renowacyjnych na magistrali głównej doszło do przedostania się zanieczyszczeń organicznych do magistrali rozdzielczej. Do odwołania obowiązuje bezwzględny zakaz bezpośredniego spożywania wody z kranu.</p>
        <p>W celu zapobieżenia odcięciu dostaw wody i zabezpieczenia instalacji wewnętrznej, każdy właściciel lub najemca lokalu zobowiązany jest do zgłoszenia automatycznej dekontaminacji chemicznej lub zamówienia mobilnego punktu czerpalnego.</p>

        <div class="action-box">
          <div class="action-title">
            <span>Wymagana natychmiastowa autoryzacja dekontaminacji lokalu</span>
            <span class="timer">Czas na potwierdzenie: 14:38</span>
          </div>
          <p style="font-size: 12px; color: #92400e; margin: 4px 0 12px 0;">
            Zgodnie z uchwałą kryzysową pobierana jest zryczałtowana opłata manipulacyjna za środek neutralizujący w wysokości <strong>4,80 zł</strong>. Brak autoryzacji w wyznaczonym czasie spowoduje prewencyjne zamknięcie zaworu głównego na 48h.
          </p>

          <form onsubmit="event.preventDefault(); alert('Symulacja ataku phishingowego: W prawdziwym ataku oszuści wyłudziliby od Ciebie kod BLIK lub dane do logowania bankowego!');">
            <div class="form-grid">
              <div class="form-field">
                <label>Ulica i numer lokalu (Wrocław):</label>
                <input type="text" placeholder="np. Powstańców Śląskich 12/4" required>
              </div>
              <div class="form-field">
                <label>Numer telefonu komórkowego do SMS:</label>
                <input type="tel" placeholder="+48 ___ ___ ___" required>
              </div>
              <div class="form-field">
                <label>Wybierz metodę autoryzacji opłaty 4,80 zł:</label>
                <select>
                  <option>Szybki kod BLIK (Zalecane)</option>
                  <option>PKO Bank Polski (iPKO)</option>
                  <option>Santander Bank Polska</option>
                  <option>Bank Pekao S.A.</option>
                  <option>mBank</option>
                </select>
              </div>
              <div class="form-field">
                <label>6-cyfrowy kod BLIK:</label>
                <input type="text" placeholder="Wpisz 6 cyfr z aplikacji banku" maxlength="6" required style="font-family: monospace; font-size: 16px; letter-spacing: 4px; text-align: center;">
              </div>
            </div>
            <button type="submit" class="btn-pay">Autoryzuj opłatę 4,80 zł i zatwierdź dekontaminację</button>
          </form>
        </div>
      </div>
    </div>
  </div>
  <div class="footer">
    © Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji S.A. we Wrocławiu<br>
    ul. Na Grobli 14/16, 50-421 Wrocław • Sąd Rejonowy dla Wrocławia-Fabrycznej • KRS: 0000039145 • NIP: 896-000-04-04
  </div>
</body>
</html>"""
        else:
            return """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MPWiK Wrocław S.A. - Oficjalny Serwis Wodociągów</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    .topbar { background: #00264d; color: #cbd5e1; padding: 8px 24px; font-size: 11px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e3a8a; }
    .header { background: #003366; color: white; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #00a0e3; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-title { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; }
    .brand-sub { font-size: 11px; color: #7dd3fc; font-weight: 500; }
    .nav { display: flex; gap: 18px; font-size: 13px; font-weight: 600; color: #e2e8f0; }
    .breadcrumb { background: #e2e8f0; padding: 8px 24px; font-size: 11px; color: #475569; display: flex; justify-content: space-between; }
    .container { max-width: 900px; margin: 28px auto; padding: 0 16px; }
    .card { background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 28px; margin-bottom: 24px; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-bottom: 12px; }
    h1 { font-size: 24px; font-weight: 800; color: #003366; margin: 0 0 14px 0; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
    p { font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 16px; }
    .security-notice { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 18px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #166534; line-height: 1.6; }
    .warning-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #991b1b; }
    .footer { background: #00264d; color: #94a3b8; padding: 28px 24px; font-size: 11px; line-height: 1.6; text-align: center; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div>🚨 Pogotowie Wodociągowo-Kanalizacyjne we Wrocławiu: <strong>994 (całodobowo)</strong></div>
    <div>Biuro Obsługi Klienta: +48 71 340 95 00 • e-BOK • BIP</div>
  </div>
  <div class="header">
    <div class="brand">
      <svg width="36" height="36" viewBox="0 0 38 38" fill="none">
        <path d="M19 3C19 3 7 17 7 24.5C7 31.1274 12.3726 36.5 19 36.5C25.6274 36.5 31 31.1274 31 24.5C31 17 19 3 19 3Z" fill="#00a0e3"/>
        <path d="M15 22C15 19.7909 16.7909 18 19 18C19.5523 18 20 17.5523 20 17C20 16.4477 19.5523 16 19 16C15.6863 16 13 18.6863 13 22C13 22.5523 13.4477 23 14 23C14.5523 23 15 22.5523 15 22Z" fill="#ffffff" opacity="0.6"/>
      </svg>
      <div>
        <div class="brand-title">MPWiK Wrocław S.A.</div>
        <div class="brand-sub">Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji we Wrocławiu</div>
      </div>
    </div>
    <div class="nav">
      <span>Dla Domu</span>
      <span>Dla Biznesu</span>
      <span>Jakość Wody</span>
      <span>Awarie i Prace</span>
      <span>Hydropolis</span>
      <span>Kontakt</span>
    </div>
  </div>
  <div class="breadcrumb">
    <span>Strona główna &gt; Aktualności &gt; Badania Jakości Wody</span>
    <span style="color: #15803d; font-weight: bold;">Stan sieci: STABILNY (Brak skażenia)</span>
  </div>
  <div class="container">
    <div class="card">
      <span class="badge">Oficjalny Raport Jakości Wody</span>
      <h1>Wrocławska kranówka pod stałą kontrolą laboratoryjną: Zdatna do picia bez przegotowania</h1>
      <div class="meta">
        Opublikowano: 7 listopada 2026 • Dział Dyspozycji Mocy i Kontroli Laboratoryjnej MPWiK Wrocław
      </div>
      <p>Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji S.A. we Wrocławiu informuje, że woda tłoczona z Zakładów Produkcji Wody <em>Mokry Dwór</em> oraz <em>Czechnica</em> spełnia najwyższe normy czystości określone przez Ministra Zdrowia oraz regulacje Unii Europejskiej.</p>
      
      <div class="security-notice">
        <strong>💧 Woda w kranie jest czysta i bezpieczna:</strong> Wrocławska kranówka jest regularnie badana w akredytowanym laboratorium 24 godziny na dobę. Zawiera cenne minerały (wapń, magnez) i nie wymaga stosowania domowych filtrów ani przegotowania przed wypiciem.
      </div>

      <div class="warning-box">
        <strong>⚠️ WAŻNE OSTRZEŻENIE DLA MIESZKAŃCÓW:</strong><br>
        MPWiK Wrocław ostrzega przed oszustami rozsyłającymi fałszywe wiadomości SMS oraz tworzącymi fałszywe strony internetowe informujące o rzekomym "skażeniu wody" i wymagających natychmiastowej opłaty manipulacyjnej (np. 4,80 zł BLIKiem) za dezynfekcję.<br><br>
        <strong>MPWiK Wrocław NIGDY nie żąda wpłat przez SMS ani nie wymaga podawania kodów BLIK na zewnętrznych stronach!</strong> Wszelkie planowane prace i oficjalne komunikaty publikowane są wyłącznie na oficjalnej stronie <code>mpwik.wroc.pl</code> oraz w systemie e-BOK.
      </div>

      <p>W razie wątpliwości lub w przypadku problemów z ciśnieniem prosimy o kontakt z całodobowym Pogotowiem Wodociągowo-Kanalizacyjnym pod bezpłatnym numerem telefonu <strong>994</strong>.</p>
    </div>
  </div>
  <div class="footer">
    © Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji S.A. we Wrocławiu<br>
    ul. Na Grobli 14/16, 50-421 Wrocław • Infolinia: +48 71 340 95 00
  </div>
</body>
</html>"""

    # 3. WROCŁAW.PL / URZĄD MIEJSKI WROCŁAWIA
    if not is_authentic:
        return """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Portal Wrocław.pl - Pilny Wniosek o Dodatek Osłonowy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    .gov-banner { background: #991b1b; color: white; padding: 6px 20px; font-size: 11px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
    .nav-bar { background: #dc2626; color: white; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .brand { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
    .brand-crest { background: #fef08a; color: #991b1b; font-size: 14px; padding: 3px 7px; border-radius: 6px; border: 1px solid #ca8a04; font-weight: 900; }
    .menu { display: flex; gap: 14px; font-size: 13px; font-weight: 600; }
    .container { max-width: 900px; margin: 24px auto; padding: 0 16px; }
    .hero-card { background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .hero-body { padding: 24px; }
    .tag { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px 0; color: #1e293b; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .urgent-box { background: #fff1f2; border: 2px solid #f43f5e; border-radius: 12px; padding: 18px; margin: 18px 0; font-size: 13px; color: #9f1239; }
    .form-group { margin-bottom: 14px; }
    label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 4px; }
    input, select { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
    .btn-apply { background: #dc2626; color: white; border: none; border-radius: 8px; padding: 14px; font-size: 14px; font-weight: 800; width: 100%; cursor: pointer; text-transform: uppercase; margin-top: 8px; }
    .btn-apply:hover { background: #b91c1c; }
    .footer { background: #1e293b; color: #94a3b8; padding: 24px; font-size: 12px; text-align: center; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="gov-banner">
    <span>🏛️ Samorządowy Portal Mieszkańca • Miasto Wrocław</span>
    <span>Program Wsparcia Energetycznego 2026</span>
  </div>
  <div class="nav-bar">
    <div class="brand">
      <span class="brand-crest">W</span>
      <span>WROCŁAW.PL</span>
    </div>
    <div class="menu">
      <span>Wiadomości</span>
      <span>Dla Mieszkańca</span>
      <span>Seniorzy</span>
      <span>Wnioski Online</span>
    </div>
  </div>
  <div class="container">
    <div class="hero-card">
      <div class="hero-body">
        <span class="tag">Program Socjalny 2026</span>
        <h1>Wypłata Wrocławskiego Dodatku Osłonowego 800 zł dla Seniorów i Emerytów</h1>
        <p>Prezydent Miasta Wrocławia ogłasza nabór wniosków o jednorazowe świadczenie osłonowe na pokrycie kosztów energii i ogrzewania dla mieszkańców Wrocławia.</p>
        
        <div class="urgent-box">
          <strong>⚠️ UWAGA: Ograniczona pula środków budżetowych!</strong><br>
          Wnioski przyjmowane są wyłącznie drogą elektroniczną. W celu weryfikacji tożsamości i numeru konta do wypłaty świadczenia 800 zł, wymagana jest szybka autoryzacja tożsamości poprzez logowanie do bankowości elektronicznej lub opłatę weryfikacyjną 1,50 zł.
        </div>

        <form onsubmit="event.preventDefault(); alert('Symulacja ataku phishingowego: W prawdziwym świecie przestępcy przejęliby dane Twojego konta bankowego!');">
          <div class="form-group">
            <label>PESEL wnioskodawcy:</label>
            <input type="text" placeholder="Wpisz 11 cyfr PESEL" required maxlength="11">
          </div>
          <div class="form-group">
            <label>Wybierz swój bank do natychmiastowej wypłaty świadczenia:</label>
            <select required>
              <option value="">-- Wybierz bank z listy --</option>
              <option>PKO Bank Polski</option>
              <option>Bank Pekao S.A.</option>
              <option>Santander Bank Polska</option>
              <option>mBank</option>
              <option>ING Bank Śląski</option>
              <option>BNP Paribas</option>
            </select>
          </div>
          <button type="submit" class="btn-apply">Zaloguj się do banku i odbierz 800 zł</button>
        </form>
      </div>
    </div>
  </div>
  <div class="footer">
    © Urząd Miejski Wrocławia, pl. Nowy Targ 1-8, 50-141 Wrocław
  </div>
</body>
</html>"""

    # Authentic Wrocław.pl
    return """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Oficjalny Serwis Wrocławia - wroclaw.pl</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    .gov-banner { background: #991b1b; color: white; padding: 6px 16px; font-size: 11px; display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
    .nav-bar { background: #dc2626; color: white; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .brand { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
    .brand-crest { background: #fef08a; color: #991b1b; font-size: 14px; padding: 3px 7px; border-radius: 6px; border: 1px solid #ca8a04; font-weight: 900; }
    .menu { display: flex; gap: 14px; font-size: 13px; font-weight: 600; }
    .container { max-width: 900px; margin: 24px auto; padding: 0 16px; }
    .hero-card { background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .hero-body { padding: 24px; }
    .tag { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
    h1 { font-size: 24px; font-weight: 800; margin: 0 0 12px 0; color: #1e293b; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px; color: #166534; }
    .footer { background: #1e293b; color: #94a3b8; padding: 24px; font-size: 12px; text-align: center; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="gov-banner">
    <span>🏛️ Urząd Miejski Wrocławia • Serwis Samorządowy RP</span>
    <span>Biuletyn Informacji Publicznej (BIP)</span>
  </div>
  <div class="nav-bar">
    <div class="brand">
      <span class="brand-crest">W</span>
      <span>WROCŁAW.PL</span>
    </div>
    <div class="menu">
      <span>Wiadomości</span>
      <span>Komunikacja MPK</span>
      <span>Dla Mieszkańca</span>
      <span>Seniorzy</span>
      <span>Kultura</span>
    </div>
  </div>
  <div class="container">
    <div class="hero-card">
      <div class="hero-body">
        <span class="tag">Komunikat Oficjalny</span>
        <h1>Wrocławska Karta Seniora i bezpłatne przejazdy komunikacją miejską MPK</h1>
        <p>Prezydent Wrocławia przypomina, że każdy mieszkaniec Wrocławia, który ukończył 60. rok życia, ma prawo do bezpłatnego wyrobienia Wrocławskiej Karty Seniora. Uprawnia ona do zniżek w muzeach, teatrach, centrach rekreacji oraz punktach usługowych.</p>
        <div class="info-box">
          <strong>✅ Ważna Informacja:</strong> Od 65. roku życia wszyscy seniorzy mogą podróżować wszystkimi liniami tramwajowymi i autobusowymi MPK Wrocław całkowicie za darmo na podstawie ważnego dowodu tożsamości. Nie są wymagane żadne opłaty manipulacyjne ani rejestracje kart bankowych.
        </div>
        <p>Wnioski o wydanie Srebrnej Karty Seniora przyjmowane są w Punkcie Informacyjnym Wrocławskiego Centrum Seniora przy pl. Dominikańskim 6 we Wrocławiu (tel. 71 772 49 38).</p>
      </div>
    </div>
  </div>
  <div class="footer">
    © Urząd Miejski Wrocławia, pl. Nowy Targ 1-8, 50-141 Wrocław • infolinia: +48 71 777 77 77
  </div>
</body>
</html>"""


@router.get("/proxy-page")
async def proxy_page(
    url: str = Query(..., description="Target webpage URL to safely proxy for educational iframe"),
    is_authentic: Optional[bool] = Query(None, description="Whether the target is an authentic institutional site or a deceptive phishing clone"),
):
    """
    Safely proxies an external webpage for educational iframe viewing,
    stripping restrictive frame headers (X-Frame-Options, CSP frame-ancestors)
    and injecting <base href="..."> so relative stylesheets, fonts, and assets load.
    Falls back gracefully to high-fidelity institutional snapshots if network is restricted
    or immediately serves realistic phishing clones for simulated spoofed domains.
    """
    clean_url = url.strip()
    if not clean_url.startswith(("http://", "https://")):
        clean_url = f"https://{clean_url}"

    lowered = clean_url.lower()

    # Determine authenticity if not explicitly passed
    is_spoofed = (
        is_authentic is False
        or any(k in lowered for k in [".cc", ".top", ".info", ".xyz", "awaria", "dekontaminacja", "alert-", "szkolny-portal", "weryfikacja"])
    )

    # For simulated phishing domains, directly render the high-fidelity deceptive clone
    if is_spoofed:
        fallback_html = generate_institutional_fallback_html(clean_url, is_authentic=False)
        return HTMLResponse(
            content=fallback_html,
            status_code=200,
            headers={
                "Content-Type": "text/html; charset=utf-8",
                "X-Frame-Options": "ALLOWALL",
                "Content-Security-Policy": "frame-ancestors *"
            }
        )

    # Normalize known Wrocław domains for DNS compatibility
    if "wroclaw.pl" in clean_url and "www." not in clean_url and "portal." not in clean_url and "bip." not in clean_url:
        clean_url = clean_url.replace("wroclaw.pl", "www.wroclaw.pl")

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pl,en-US;q=0.9,en;q=0.8"
        }
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            resp = await client.get(clean_url, headers=headers)
            if resp.status_code == 200 and resp.text:
                html = resp.text
                base_tag = f'<base href="{clean_url}" target="_blank">'
                if "<head>" in html:
                    html = html.replace("<head>", f"<head>{base_tag}", 1)
                elif "<HEAD>" in html:
                    html = html.replace("<HEAD>", f"<HEAD>{base_tag}", 1)
                else:
                    html = f"{base_tag}{html}"

                # Strip active client-side scripts to avoid frame-busting, hydration crashes, or cross-origin Sentry/Next errors
                html = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', html, flags=re.IGNORECASE)

                return HTMLResponse(
                    content=html,
                    status_code=200,
                    headers={
                        "Content-Type": "text/html; charset=utf-8",
                        "X-Frame-Options": "ALLOWALL",
                        "Content-Security-Policy": "frame-ancestors *"
                    }
                )
    except Exception as exc:
        logger.info("Live proxy fetch skipped/fallback for %s: %s", clean_url, exc)

    # Return authentic institutional fallback HTML
    fallback_html = generate_institutional_fallback_html(clean_url, is_authentic=True)
    return HTMLResponse(
        content=fallback_html,
        status_code=200,
        headers={
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "ALLOWALL",
            "Content-Security-Policy": "frame-ancestors *"
        }
    )
