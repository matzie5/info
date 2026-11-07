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


def generate_institutional_fallback_html(clean_url: str) -> str:
    """
    Generates a high-fidelity visual mirror snapshot of Polish institutional websites
    (Wrocław.pl, MPWiK Wrocław, Librus Synergia) for resilient iframe rendering.
    """
    lowered = clean_url.lower()

    if "wroclaw.pl" in lowered:
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
    .brand-crest { background: #fef08a; color: #991b1b; font-size: 14px; padding: 3px 7px; border-radius: 6px; border: 1px solid #ca8a04; }
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

    if "librus" in lowered:
        return """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LIBRUS Synergia - Oficjalny Portal Edukacyjny</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #0f172a; color: #f8fafc; }
    .librus-top { background: #1e1b4b; border-bottom: 1px solid #312e81; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 18px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .school-info { font-size: 12px; color: #94a3b8; font-weight: 600; }
    .subnav { background: #1e293b; padding: 8px 20px; display: flex; gap: 16px; font-size: 12px; font-weight: 600; color: #cbd5e1; border-bottom: 1px solid #334155; }
    .subnav span.active { color: #38bdf8; border-bottom: 2px solid #38bdf8; padding-bottom: 6px; }
    .container { max-width: 860px; margin: 24px auto; padding: 0 16px; }
    .card { background: #1e293b; border-radius: 14px; border: 1px solid #334155; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    h1 { font-size: 20px; font-weight: 800; color: #f1f5f9; margin-top: 0; }
    p { font-size: 13px; line-height: 1.6; color: #94a3b8; }
    .msg-box { background: #0f172a; border-left: 4px solid #38bdf8; padding: 14px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #e2e8f0; }
    .notice { font-size: 11px; color: #64748b; margin-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="librus-top">
    <div class="brand">
      <span>📚</span>
      <span>LIBRUS Synergia</span>
    </div>
    <div class="school-info">Szkoła Podstawowa nr 3 we Wrocławiu • Uczeń / Rodzic</div>
  </div>
  <div class="subnav">
    <span class="active">Wiadomości</span>
    <span>Oceny</span>
    <span>Frekwencja</span>
    <span>Plan Lekcji</span>
    <span>Zadania Domowe</span>
    <span>Ogłoszenia</span>
  </div>
  <div class="container">
    <div class="card">
      <h1>Wiadomość od: Anna Nowak (Wychowawca klasy 7A)</h1>
      <p>Data nadania: 7 listopada 2026, 08:15 • Temat: <strong>Wyjście edukacyjne do Hydropolis</strong></p>
      <div class="msg-box">
        Drodzy Uczniowie i Rodzice!<br><br>
        Przypominam, że w najbliższy piątek cała klasa 7A wyrusza na wycieczkę edukacyjną do centrum Hydropolis przy ul. Na Grobli we Wrocławiu. Zbiórka o godzinie 8:30 przed głównym wejściem szkoły. Proszę wszystkich o zabranie ważnych legitymacji szkolnych.<br><br>
        Z poważaniem,<br>
        Anna Nowak, wychowawca
      </div>
      <p class="notice">Oficjalny system Synergia • Librus Sp. z o.o. • Bezpieczne połączenie szyfrowane TLS</p>
    </div>
  </div>
</body>
</html>"""

    # Default MPWiK / Municipal utility layout
    return """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MPWiK Wrocław S.A. - Oficjalna strona wodociągów</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    .topbar { background: #003b73; color: white; padding: 6px 20px; font-size: 11px; display: flex; justify-content: space-between; font-weight: 600; }
    .header { background: #0072ce; color: white; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 20px; font-weight: 900; display: flex; align-items: center; gap: 8px; }
    .nav { display: flex; gap: 16px; font-size: 13px; font-weight: 600; }
    .container { max-width: 880px; margin: 24px auto; padding: 0 16px; }
    .card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    h1 { font-size: 22px; font-weight: 800; color: #003b73; margin-top: 0; }
    p { font-size: 14px; line-height: 1.6; color: #475569; }
    .status-badge { background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; display: inline-block; margin-bottom: 12px; }
    .hotline-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px; margin: 16px 0; font-size: 13px; color: #1e3a8a; }
    .footer { background: #00264d; color: #94a3b8; padding: 20px; font-size: 11px; text-align: center; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="topbar">
    <span>🚨 Pogotowie Wodociągowe Wrocław: 994 (całodobowo)</span>
    <span>BOK: +48 71 340 95 00 • E-BOK Logowanie</span>
  </div>
  <div class="header">
    <div class="brand">
      <span>💧</span>
      <span>MPWiK Wrocław S.A.</span>
    </div>
    <div class="nav">
      <span>Dla Mieszkańców</span>
      <span>Jakość Wody</span>
      <span>Awarie i Prace</span>
      <span>Edukacja - Hydropolis</span>
      <span>Kontakt</span>
    </div>
  </div>
  <div class="container">
    <div class="card">
      <span class="status-badge">Aktualność Miejska</span>
      <h1>Jakość wody we Wrocławiu - Raport i Parametry dla Dzielnic</h1>
      <p>Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji S.A. we Wrocławiu informuje, że woda dostarczana mieszkańcom Wrocławia spełnia wszelkie rygorystyczne normy unijne oraz polskie wymogi sanitarne. Ujęcia wody Mokry Dwór oraz Czechnica pracują w trybie ciągłym bez jakichkolwiek zakłóceń.</p>
      <div class="hotline-box">
        <strong>Pamiętaj:</strong> Wrocławska kranówka jest w 100% zdatna do picia bezpośrednio z kranu. MPWiK nigdy nie pobiera opłat przez SMS ani nie wymaga wpłacania zaliczek BLIKiem za usuwanie awarii czy dezynfekcję rur.
      </div>
      <p>W przypadku jakichkolwiek pytań dotyczących ciśnienia lub jakości wody, prosimy o kontakt z bezpłatnym Pogotowiem Wodociągowym pod numerem 994.</p>
    </div>
  </div>
  <div class="footer">
    © MPWiK S.A. we Wrocławiu, ul. Na Grobli 14/16, 50-421 Wrocław • NIP: 896-000-04-04
  </div>
</body>
</html>"""


@router.get("/proxy-page")
async def proxy_page(url: str = Query(..., description="Target webpage URL to safely proxy for educational iframe")):
    """
    Safely proxies an external webpage for educational iframe viewing,
    stripping restrictive frame headers (X-Frame-Options, CSP frame-ancestors)
    and injecting <base href="..."> so relative stylesheets, fonts, and assets load.
    Falls back gracefully to high-fidelity institutional snapshots if network is restricted.
    """
    clean_url = url.strip()
    if not clean_url.startswith(("http://", "https://")):
        clean_url = f"https://{clean_url}"

    # Normalize known Wrocław domains for DNS compatibility
    if "wroclaw.pl" in clean_url and "www." not in clean_url and "portal." not in clean_url and "bip." not in clean_url:
        clean_url = clean_url.replace("wroclaw.pl", "www.wroclaw.pl")

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pl,en-US;q=0.9,en;q=0.8"
        }
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
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

                # Neutralize client-side top frame-busting
                html = html.replace("top.location", "self.location")
                html = html.replace("parent.location", "self.location")

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
    fallback_html = generate_institutional_fallback_html(clean_url)
    return HTMLResponse(
        content=fallback_html,
        status_code=200,
        headers={
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "ALLOWALL",
            "Content-Security-Policy": "frame-ancestors *"
        }
    )
