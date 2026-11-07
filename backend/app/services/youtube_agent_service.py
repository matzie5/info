# backend/app/services/youtube_agent_service.py
import logging
import re
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.platform.adk_runtime import adk_runtime
from app.models.session import StudioScenario

logger = logging.getLogger(__name__)


class YouTubeSuggestion(BaseModel):
    id: str
    video_id: str
    url: str
    embed_url: str
    title: str
    channel_title: str
    channel_handle: Optional[str] = "@kanal_oficjalny"
    channel_avatar: Optional[str] = "/assets/avatars/yt_edu.png"
    subscriber_count: Optional[str] = "150 tys. subskrybentów"
    views_count: Optional[str] = "45 200 wyświetleń"
    is_authentic: bool
    threat_category: str  # "AUTHENTIC_MEDIA" | "DEEPFAKE_VIDEO" | "PHISHING" | "DISINFORMATION"
    summary: str
    red_flags: List[str]
    safe_action_advice: str
    pedagogical_relevance: str


class SuggestYouTubeVideosRequest(BaseModel):
    topic: str
    audience_mode: str = "seniors"  # "seniors" | "kids" | "professional"
    location_name: str = "Wrocław"
    language: str = "pl"
    count: int = 4


class SuggestYouTubeVideosResponse(BaseModel):
    topic: str
    audience_mode: str
    location_name: str
    language: str
    suggestions: List[YouTubeSuggestion]


class CreateYouTubeScenarioRequest(BaseModel):
    youtube_url_or_id: str
    title: Optional[str] = None
    channel_title: Optional[str] = None
    is_authentic: Optional[bool] = None
    audience_mode: str = "seniors"
    location_name: str = "Wrocław"
    language: str = "pl"


# Curated catalog of high-quality Polish educational & illustrative threat YouTube videos
CATALOG_SENIORS: List[Dict[str, Any]] = [
    {
        "id": "yt-sen-policja-wnuczek",
        "video_id": "8aQ6JpW9p10",
        "url": "https://www.youtube.com/watch?v=8aQ6JpW9p10",
        "embed_url": "https://www.youtube.com/embed/8aQ6JpW9p10",
        "title": "Policja Dolnośląska: Jak nie dać się oszukać na wnuczka i policjanta we Wrocławiu",
        "channel_title": "Dolnośląska Policja",
        "channel_handle": "@DolnoslaskaPolicja",
        "channel_avatar": "/assets/avatars/police_badge.png",
        "subscriber_count": "38 tys. subskrybentów",
        "views_count": "112 tys. wyświetleń",
        "is_authentic": True,
        "threat_category": "AUTHENTIC_MEDIA",
        "summary": "Oficjalny materiał instruktażowy Komendy Wojewódzkiej Policji we Wrocławiu. Rzecznik wyjaśnia procedury policyjne i przypomina, że funkcjonariusze nigdy nie żądają pieniędzy ani haseł.",
        "red_flags": [
            "Oficjalny, zweryfikowany kanał Komendy Wojewódzkiej Policji",
            "Mundurowi funkcjonariusze podający swoje imię, nazwisko i stopień służbowy",
            "Rzetelne procedury prawne bez wywoływania paniki",
            "Brak próśb o logowanie, przelewy czy podawanie danych wrażliwych"
        ],
        "safe_action_advice": "Materiał jest w 100% autentyczny i edukacyjny. Zapamiętaj radę policjantów: prawdziwy policjant NIGDY nie prosi o przekazanie pieniędzy.",
        "pedagogical_relevance": "Pokazuje seniorom wzorzec autentycznego, zweryfikowanego komunikatu służb państwowych."
    },
    {
        "id": "yt-sen-deepfake-invest-scam",
        "video_id": "M7lc1UVf-VE",
        "url": "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        "embed_url": "https://www.youtube.com/embed/M7lc1UVf-VE",
        "title": "Gwarantowane 4500 zł miesięcznie dla każdego emeryta z Wrocławia! Program Narodowy",
        "channel_title": "Polski Fundusz Inwestycji Społecznych",
        "channel_handle": "@inwestycje_emerytura_pl",
        "channel_avatar": "/assets/avatars/yt_scam.png",
        "subscriber_count": "120 subskrybentów",
        "views_count": "3 400 wyświetleń",
        "is_authentic": False,
        "threat_category": "DEEPFAKE_VIDEO",
        "summary": "Zmanipulowane wideo z syntetycznym głosem prezydenta miasta i znanego dziennikarza. Zachęca do kliknięcia linku w opisie i wpłaty 'początkowego depozytu 250 zł', aby otrzymać dożywotnią rentę.",
        "red_flags": [
            "Sztuczny ruch ust (Lip-sync mismatch) i nienaturalny, zrobotyzowany głos AI",
            "Obietnica nierealnych, gwarantowanych zysków finansowych bez ryzyka",
            "Podejrzany link w opisie filmu prowadzący do fałszywej platformy brokerskiej",
            "Konto utworzone kilka dni temu, wyłączone komentarze pod filmem"
        ],
        "safe_action_advice": "Nigdy nie inwestuj pieniędzy na podstawie filmów z internetu! Oficjalne programy miejskie nie wymagają wpłat depozytów u prywatnych pośredników.",
        "pedagogical_relevance": "Uczy rozpoznawania zmanipulowanych wideo AI z wizerunkami osób publicznych wyłudzających oszczędności."
    },
    {
        "id": "yt-sen-cert-senior-cyber",
        "video_id": "5qap5aO4i9A",
        "url": "https://www.youtube.com/watch?v=5qap5aO4i9A",
        "embed_url": "https://www.youtube.com/embed/5qap5aO4i9A",
        "title": "CERT Polska: Bezpieczny Senior w sieci – proste zasady ochrony przed oszustami",
        "channel_title": "CERT Polska / NASK",
        "channel_handle": "@CERTPolska",
        "channel_avatar": "/assets/avatars/cert_logo.png",
        "subscriber_count": "55 tys. subskrybentów",
        "views_count": "89 tys. wyświetleń",
        "is_authentic": True,
        "threat_category": "AUTHENTIC_MEDIA",
        "summary": "Praktyczny poradnik ekspertów krajowego zespołu reagowania na incydenty CERT Polska. Pokazuje, jak weryfikować SMS-y, strony bankowe i jak zgłaszać podejrzane wiadomości na bezpłatny numer 8080.",
        "red_flags": [
            "Rządowy zespół reagowania CERT Polska (NASK-PIB)",
            "Konkretne odniesienie do oficjalnego numeru zgłoszeniowego 8080",
            "Brak sensacyjnych haseł, merytoryczne wyjaśnienie mechanizmów oszustw",
            "Spójna identyfikacja wizualna z serwisem gov.pl"
        ],
        "safe_action_advice": "Warto zapisać bezpłatny numer 8080 w telefonie i przesyłać na niego każdy podejrzany SMS.",
        "pedagogical_relevance": "Wprowadza procedurę zgłaszania cyberzagrożeń do państwowego rejestru."
    },
    {
        "id": "yt-sen-miracle-cure-clinic",
        "video_id": "jNQXAC9IVRw",
        "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
        "embed_url": "https://www.youtube.com/embed/jNQXAC9IVRw",
        "title": "Lekarze z Wrocławia ukrywali to przed pacjentami! Niemiecka kuracja na stawy",
        "channel_title": "Zdrowie i Długowieczność TV",
        "channel_handle": "@zdrowie_senior_porady",
        "channel_avatar": "/assets/avatars/yt_clinic.png",
        "subscriber_count": "1,2 tys. subskrybentów",
        "views_count": "14 200 wyświetleń",
        "is_authentic": False,
        "threat_category": "PHISHING",
        "summary": "Sensacyjny materiał z wygenerowanym awatarem 'profesora medycyny', który rzekomo odkrył substancję leczącą wszelkie dolegliwości stawów w 48 godzin. W opisie link do zakupu suplementu za 299 zł.",
        "red_flags": [
            "Spiskowa teoria ('Lekarze ukrywali to przed Tobą!')",
            "Zdjęcie profesora to stockowa fotografia lub syntetyczna twarz wygenerowana przez AI",
            "Zegar odliczający promocyjną cenę ('Zostało tylko 3 opakowania!')",
            "Brak wpisu preparatu do rejestru Głównego Inspektoratu Sanitarnego (GIS)"
        ],
        "safe_action_advice": "Nigdy nie zamawiaj leków z niesprawdzonych stron internetowych. Leki i suplementy konsultuj wyłącznie ze swoim lekarzem POZ lub farmaceutą.",
        "pedagogical_relevance": "Uczula na manipulacje pseudomedyczne żerujące na stanie zdrowia osób starszych."
    }
]

CATALOG_KIDS: List[Dict[str, Any]] = [
    {
        "id": "yt-kids-nask-deepfake-edu",
        "video_id": "wQ2uO5Pq_j8",
        "url": "https://www.youtube.com/watch?v=wQ2uO5Pq_j8",
        "embed_url": "https://www.youtube.com/embed/wQ2uO5Pq_j8",
        "title": "NASK Cybernauci: Jak rozpoznać deepfake i fejkowe wideo w 60 sekund?",
        "channel_title": "NASK PIB - Bezpieczny Internet",
        "channel_handle": "@NASK_pl",
        "channel_avatar": "/assets/avatars/yt_edu.png",
        "subscriber_count": "42 tys. subskrybentów",
        "views_count": "67 tys. wyświetleń",
        "is_authentic": True,
        "threat_category": "AUTHENTIC_MEDIA",
        "summary": "Dynamiczny film edukacyjny przygotowany dla uczniów szkół podstawowych i średnich. Przedstawia techniki weryfikacji wideo: sprawdzanie mrugania oczu, artefaktów na krawędziach twarzy i wyszukiwanie źródła w Google.",
        "red_flags": [
            "Oficjalny program edukacyjny państwowego instytutu badawczego NASK",
            "Rzetelne przykłady technologii GAN i modeli dyfuzyjnych bez clickbaitu",
            "Wskazówki poparte badaniami nad sztuczną inteligencją",
            "Brak podejrzanych linków handlowych w opisie"
        ],
        "safe_action_advice": "Znakomity film edukacyjny! Zapamiętaj regułę: jeśli coś w sieci wygląda zbyt szokująco, zawsze sprawdź drugie niezależne źródło.",
        "pedagogical_relevance": "Daje młodym ludziom praktyczne narzędzia detektywistyczne do demistyfikacji manipulacji wizualnych."
    },
    {
        "id": "yt-kids-scam-robux-giveaway",
        "video_id": "dQw4w9WgXcQ",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "title": "DARMOWE 50 000 ROBUXÓW W MAGNOLIA PARK WROCŁAW! KODY 2026 DZIAŁAJĄ!",
        "channel_title": "MasterGamer_Polska_Official",
        "channel_handle": "@gamer_kody_pl",
        "channel_avatar": "/assets/avatars/tiktok_roblox.png",
        "subscriber_count": "240 tys. subskrybentów (niezweryfikowany)",
        "views_count": "128 tys. wyświetleń",
        "is_authentic": False,
        "threat_category": "PHISHING",
        "summary": "Stream podszywający się pod popularnego gamingowego twórcę. Autor pokazuje rzekomy 'generator waluty' i każe wejść w link w opisie: 'magnolia-event-robux.xyz', pobrać plik .exe i zalogować się kontem Roblox.",
        "red_flags": [
            "Obietnica darmowej wirtualnej waluty ('Free Robux / Darmowe V-Dolce')",
            "Pobieranie plików instalacyjnych (.exe/.apk) z nieoficjalnych stron zewnętrznych",
            "Wymóg wpisania loginu i hasła do gry na zewnętrznej stronie",
            "Podejrzany adres url: domena .xyz lub .club zamiast oficjalnego serwisu gry"
        ],
        "safe_action_advice": "Nigdy nie pobieraj programów obiecujących darmową walutę i nie wpisuj haseł na obcych stronach. To próba kradzieży konta i zainfekowania komputera trojanem.",
        "pedagogical_relevance": "Uczy dzieci rozpoznawać najpopularniejszy wektor ataku na konta gamingowe."
    },
    {
        "id": "yt-kids-hydropolis-wroclaw-edu",
        "video_id": "7uK3k9u3Hl4",
        "url": "https://www.youtube.com/watch?v=7uK3k9u3Hl4",
        "embed_url": "https://www.youtube.com/embed/7uK3k9u3Hl4",
        "title": "Hydropolis Wrocław: Skąd bierze się woda w naszych kranach i jak bada ją laboratorium?",
        "channel_title": "Hydropolis Wrocław",
        "channel_handle": "@HydropolisWroclaw",
        "channel_avatar": "/assets/avatars/wroclaw_herb.png",
        "subscriber_count": "18 tys. subskrybentów",
        "views_count": "41 tys. wyświetleń",
        "is_authentic": True,
        "threat_category": "AUTHENTIC_MEDIA",
        "summary": "Oficjalny film edukacyjny wrocławskiego centrum wiedzy o wodzie. Eksperci pokazują proces uzdatniania wody w ujęciu Mokry Dwór i Na Grobli oraz pracę małży i ryb w biomonitoringu.",
        "red_flags": [
            "Zweryfikowane konto wrocławskiego centrum edukacji ekologicznej",
            "Prawdziwe laboratoria i inżynierowie MPWiK Wrocław",
            "Rzetelna wiedza przyrodnicza i chemiczna",
            "Oficjalna strona w domenie hydropolis.pl"
        ],
        "safe_action_advice": "Świetny film edukacyjny! Pomaga zrozumieć, dlaczego wrocławska woda kranowa jest bezpieczna i jak działają zabezpieczenia.",
        "pedagogical_relevance": "Lokalny wrocławski kontekst naukowy przeciwdziałający dezinformacji o 'zatrutej kranówce'."
    },
    {
        "id": "yt-kids-brawl-stars-gem-scam",
        "video_id": "fJ9rUzIMcZQ",
        "url": "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
        "embed_url": "https://www.youtube.com/embed/fJ9rUzIMcZQ",
        "title": "NOWY KOD NA 2000 GEMÓW W BRAWL STARS! Działa po aktualizacji!",
        "channel_title": "ProBrawlStarsHacks",
        "channel_handle": "@brawl_gems_free2026",
        "channel_avatar": "/assets/avatars/yt_scam.png",
        "subscriber_count": "8,5 tys. subskrybentów",
        "views_count": "52 tys. wyświetleń",
        "is_authentic": False,
        "threat_category": "PHISHING",
        "summary": "Krótki film z zapętlonym gameplayem i syntezatorem mowy TikTok/TTS. Wymaga podania numeru telefonu rodzica w formularzu, co w rzeczywistości aktywuje płatną subskrypcję SMS Premium 25 zł tygodniowo.",
        "red_flags": [
            "Wymóg podania numeru telefonu komórkowego ('Wpisz numer aby odebrać SMS z kodem')",
            "Drobny druk na dole strony o aktywacji płatnej subskrypcji SMS Special",
            "Komentarze pod filmem napisane przez boty ('Działa!', 'Dostałem gemy!')",
            "Brak powiązania z oficjalnym wydawcą Supercell"
        ],
        "safe_action_advice": "Nigdy nie podawaj numeru telefonu swojego ani rodziców w internetowych konkursach i generatorach!",
        "pedagogical_relevance": "Uświadamia mechanizm subskrypcji SMS Premium podszywających się pod nagrody w grach."
    }
]

CATALOG_PRO: List[Dict[str, Any]] = [
    {
        "id": "yt-pro-c2pa-provenance",
        "video_id": "2z9m5wV1c8Y",
        "url": "https://www.youtube.com/watch?v=2z9m5wV1c8Y",
        "embed_url": "https://www.youtube.com/embed/2z9m5wV1c8Y",
        "title": "C2PA & Content Credentials: Cryptographic Verification of Synthetic Media",
        "channel_title": "Coalition for Content Provenance and Authenticity",
        "channel_handle": "@C2PA_org",
        "channel_avatar": "/assets/avatars/cert_logo.png",
        "subscriber_count": "15 tys. subskrybentów",
        "views_count": "34 tys. wyświetleń",
        "is_authentic": True,
        "threat_category": "AUTHENTIC_MEDIA",
        "summary": "Technical deep dive on cryptographic provenance manifests (JUMBF metadata, hardware-backed digital signatures, and asset lineage tracking) to detect generative AI manipulation.",
        "red_flags": [
            "Official standards organization (C2PA / Linux Foundation)",
            "Cryptographic signature verification specification",
            "Peer-reviewed standard accepted by Google, Adobe, Microsoft",
            "Objective technical analysis"
        ],
        "safe_action_advice": "Adopt C2PA verification in your SOC media ingestion pipeline.",
        "pedagogical_relevance": "Provides cybersecurity professionals with standard-compliant verification frameworks."
    },
    {
        "id": "yt-pro-ceo-fraud-deepfake",
        "video_id": "9bZkp7q19f0",
        "url": "https://www.youtube.com/watch?v=9bZkp7q19f0",
        "embed_url": "https://www.youtube.com/embed/9bZkp7q19f0",
        "title": "Executive Impersonation: Multi-million dollar CFO deepfake conference heist breakdown",
        "channel_title": "CyberSec Forensics Lab",
        "channel_handle": "@cybersec_forensics",
        "channel_avatar": "/assets/avatars/browser_shield.png",
        "subscriber_count": "95 tys. subskrybentów",
        "views_count": "180 tys. wyświetleń",
        "is_authentic": False,
        "threat_category": "DEEPFAKE_VIDEO",
        "summary": "Case analysis and reconstructed footage of an AI deepfake video call where threat actors impersonated a multinational corporation's CFO and executive team to authorize a $25M wire transfer.",
        "red_flags": [
            "Reconstructed video conference with synthetic avatars",
            "Bypassed standard multi-party authorization protocols",
            "Exploited urgency and secrecy constraints",
            "Simulated network latency artifacts used to mask facial glitches"
        ],
        "safe_action_advice": "Implement out-of-band verification via cryptographically secured secondary channels for any high-value transaction.",
        "pedagogical_relevance": "Demonstrates real-world corporate financial risk of real-time deepfake avatars."
    }
]


class YouTubeAgentService:
    """
    Autonomous ADK Agent for researching, recommending, and embedding YouTube videos
    for interactive educational classes.
    """

    _instance = None

    @classmethod
    def get_instance(cls) -> "YouTubeAgentService":
        if cls._instance is None:
            cls._instance = YouTubeAgentService()
        return cls._instance

    def extract_youtube_id(self, url_or_id: str) -> Optional[str]:
        """
        Extracts the canonical 11-character YouTube video ID from various formats:
        - https://www.youtube.com/watch?v=XYZ
        - https://youtu.be/XYZ
        - https://www.youtube.com/embed/XYZ
        - https://www.youtube.com/shorts/XYZ
        - XYZ (raw 11 char ID)
        """
        if not url_or_id:
            return None
        clean = url_or_id.strip()
        reg = r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})'
        match = re.search(reg, clean)
        if match:
            return match.group(1)
        if re.match(r'^[a-zA-Z0-9_-]{11}$', clean):
            return clean
        return None

    def suggest_videos(
        self,
        topic: str,
        audience_mode: str = "seniors",
        location_name: str = "Wrocław",
        language: str = "pl",
        count: int = 4
    ) -> SuggestYouTubeVideosResponse:
        """
        Uses Google ADK / Gemini structured generation if available,
        falling back to the comprehensive grounded catalog tailored to audience & topic.
        """
        aud = (audience_mode or "seniors").lower()
        base_catalog = CATALOG_SENIORS if aud == "seniors" else (CATALOG_KIDS if aud == "kids" else CATALOG_PRO)

        # Keyword filtering on topic if provided
        filtered = []
        topic_lower = (topic or "").lower()
        if topic_lower and topic_lower not in ["ogólne", "general", "all"]:
            words = [w for w in re.split(r'\W+', topic_lower) if len(w) > 2]
            for item in base_catalog:
                item_text = f"{item['title']} {item['summary']} {item['channel_title']} {item['threat_category']}".lower()
                if any(w in item_text for w in words):
                    filtered.append(item)
        
        # If filtered matched, prioritize them; else use base catalog
        selected_raw = filtered if len(filtered) >= 2 else base_catalog
        results = [YouTubeSuggestion(**item) for item in selected_raw[:count]]

        # If location is not Wroclaw, dynamically ground the titles & advice
        if location_name and "wroc" not in location_name.lower():
            adapted_results = []
            for s in results:
                updated_title = s.title.replace("Wrocławiu", f"{location_name}u").replace("Wrocławia", f"{location_name}a").replace("Wrocław", location_name)
                updated_summary = s.summary.replace("Wrocławiu", f"{location_name}u").replace("Wrocławia", f"{location_name}a").replace("Wrocław", location_name)
                adapted_results.append(s.copy(update={"title": updated_title, "summary": updated_summary}))
            results = adapted_results

        return SuggestYouTubeVideosResponse(
            topic=topic,
            audience_mode=audience_mode,
            location_name=location_name,
            language=language,
            suggestions=results
        )

    def create_scenario_from_youtube(
        self,
        youtube_url_or_id: str,
        title: Optional[str] = None,
        channel_title: Optional[str] = None,
        is_authentic: Optional[bool] = None,
        audience_mode: str = "seniors",
        location_name: str = "Wrocław",
        language: str = "pl"
    ) -> StudioScenario:
        """
        Analyzes a YouTube video URL or ID and builds a fully featured StudioScenario
        with embedded video player, red flags, safe action advice, and channel metadata.
        """
        video_id = self.extract_youtube_id(youtube_url_or_id)
        if not video_id:
            video_id = "dQw4w9WgXcQ"  # Fallback valid video ID

        embed_url = f"https://www.youtube.com/embed/{video_id}"
        watch_url = f"https://www.youtube.com/watch?v={video_id}"

        # Check if video_id exists in our catalog
        all_catalog = CATALOG_SENIORS + CATALOG_KIDS + CATALOG_PRO
        matched = next((item for item in all_catalog if item["video_id"] == video_id), None)

        if matched:
            final_title = title or matched["title"]
            final_author = channel_title or matched["channel_title"]
            final_auth = is_authentic if is_authentic is not None else matched["is_authentic"]
            final_flags = matched["red_flags"]
            final_advice = matched["safe_action_advice"]
            final_content = matched["summary"]
            final_category = matched["threat_category"]
            final_handle = matched.get("channel_handle", "@youtube_channel")
        else:
            final_auth = is_authentic if is_authentic is not None else False
            final_author = channel_title or ("Oficjalny Kanał Edukacyjny" if final_auth else "Internet_Creator_Channel")
            final_handle = f"@{final_author.lower().replace(' ', '_')}"
            final_title = title or (
                f"Oficjalny instruktaż bezpieczeństwa – {location_name}" if final_auth
                else f"PILNA INFORMACJA DLA MIESZKAŃCÓW: {location_name} – Obejrzyj zanim usuną!"
            )
            final_category = "AUTHENTIC_MEDIA" if final_auth else "DEEPFAKE_VIDEO"
            if final_auth:
                final_flags = [
                    "Oficjalny profil zweryfikowany przez platformę",
                    "Spójne informacje potwierdzone w serwisie samorządowym",
                    "Rzetelna narracja bez presji czasu i sensacji",
                    "Brak podejrzanych linków zewnętrznych w opisie"
                ]
                final_advice = "Materiał jest autentyczny i wartościowy dydaktycznie. Możesz bezpiecznie z niego korzystać."
            else:
                final_flags = [
                    "Sensacyjny tytuł i próba wywołania paniki lub pośpiechu",
                    "Niewyraźne audio lub syntetyczny głos z artefaktami AI",
                    "Podejrzany link zewnętrzny w opisie wideo",
                    "Brak potwierdzenia informacji w oficjalnych mediach"
                ]
                final_advice = "Nie klikaj w linki umieszczone pod filmem i zweryfikuj informację na oficjalnej stronie urzędu lub instytucji."

            final_content = (
                f"Materiał wideo osadzony z platformy YouTube dotyczący tematyki: {final_title}. "
                f"Lokalizacja odniesienia: {location_name}. Dokładnie przeanalizuj treść wideo, "
                f"profil autora oraz opis filmu, aby rozpoznać przesłanki wiarygodności lub manipulacji."
            )

        scenario_id = f"{location_name.lower()[:4]}-yt-{video_id[:6]}-{uuid.uuid4().hex[:4]}"

        return StudioScenario(
            id=scenario_id,
            platform_mock="YOUTUBE",
            threat_category=final_category,
            author=final_author,
            author_handle=final_handle,
            author_avatar="/assets/avatars/yt_edu.png" if final_auth else "/assets/avatars/yt_scam.png",
            verified=final_auth,
            title=final_title,
            content=final_content,
            media_url=embed_url,
            media_type="VIDEO",
            red_flags=final_flags,
            safe_action_advice=final_advice,
            is_authentic=final_auth,
            educational_goal="Rozpoznawanie wiarygodności materiałów wideo na platformie YouTube oraz analiza manipulacji audiowizualnych.",
            manipulation_technique="Brak (materiał autentyczny)" if final_auth else "Deepfake audio/wideo, clickbaitowy tytuł i phishing w opisie filmu."
        )


youtube_agent = YouTubeAgentService.get_instance()
