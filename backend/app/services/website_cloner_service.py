# backend/app/services/website_cloner_service.py
import logging
import re
import urllib.parse
from typing import Any, Dict, List, Optional
import uuid

logger = logging.getLogger(__name__)

KNOWN_PROFILES = {
    "mpwik.wroc.pl": {
        "brand_name": "MPWiK Wrocław S.A.",
        "short_title": "Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji",
        "primary_color": "#0072ce",
        "secondary_color": "#003b73",
        "accent_color": "#dc2626",
        "real_domain": "mpwik.wroc.pl",
        "spoofed_domain": "mpwik-wroclaw.pl.awaria-wodociagi.cc",
        "spoofed_url": "https://mpwik-wroclaw.pl.awaria-wodociagi.cc/komunikat-alarmowy",
        "logo_text": "MPWiK Wrocław",
        "nav_links": ["O nas", "Strefa Klienta", "Jakość Wody", "Awarie", "Kontakt"],
        "official_hotline": "994 (Pogotowie Wodociągowe)",
        "scenario_title_pl": "Fałszywa strona MPWiK Wrocław: Skażenie wody i opłata za dezynfekcję",
        "scenario_title_en": "Fake MPWiK Wrocław Website: Water Contamination & Disinfection Fee",
        "phishing_alert_title": "PILNY KOMUNIKAT: Wykrycie bakterii w ujęciu Mokry Dwór",
        "phishing_body": (
            "Szanowni Mieszkańcy Wrocławia! W dniu dzisiejszym wykryto krytyczne zanieczyszczenie ujęcia wody. "
            "W celu zabezpieczenia instalacji domowej konieczne jest pobranie kodu dekontaminacyjnego i wniesienie "
            "symbolicznej opłaty manipulacyjnej w kwocie 4,80 zł. Brak opłaty spowoduje natychmiastowe odcięcie zasilania."
        ),
        "cta_label": "Potwierdź tożsamość i ureguluj 4,80 zł [BLIK / Szybki Przelew]",
        "red_flags": [
            "Podejrzany adres domeny: Kończy się na '.cc', a nie na oficjalne '.wroc.pl'",
            "Sztuczna presja czasu: Zegar odliczający minuty pod rygorem natychmiastowego odcięcia wody",
            "Żądanie mikro-płatności BLIK lub podania danych karty płatniczej",
            "Wymuszenie logowania przez fałszywą bramkę bankowości internetowej"
        ],
        "advice_seniors": "Nigdy nie płać przez linki w internecie! Prawdziwe MPWiK nigdy nie pobiera opłat BLIKiem za 'dezynfekcję'. Zadzwoń pod bezpłatny numer pogotowia wodociągowego 994.",
        "advice_kids": "Zawsze patrz na adres strony (pasek adresu). Prawdziwy adres wrocławskich wodociągów to mpwik.wroc.pl. Pokaż ten link rodzicom lub nauczycielowi.",
        "advice_professional": "Zweryfikuj rekordy DNS i certyfikat SSL. Certyfikaty domen spoofingowych często pochodzą z bezpłatnych CA (Let's Encrypt / ZeroSSL) z rejestracją kilka godzin wcześniej."
    },
    "wroclaw.pl": {
        "brand_name": "Oficjalny Portal Wrocławia (wroclaw.pl)",
        "short_title": "Urząd Miejski Wrocławia",
        "primary_color": "#dc2626",
        "secondary_color": "#991b1b",
        "accent_color": "#f59e0b",
        "real_domain": "wroclaw.pl",
        "spoofed_domain": "portal-wroclaw.pl.miejski-alert.info",
        "spoofed_url": "https://portal-wroclaw.pl.miejski-alert.info/doplata-senior-2026",
        "logo_text": "WROCŁAW.PL",
        "nav_links": ["Wiadomości", "Komunikacja", "Dla Mieszkańca", "Biznes", "Kultura"],
        "official_hotline": "+48 71 777 77 77 (Centrum Informacji Miasta)",
        "scenario_title_pl": "Podrobiony portal Wrocław.pl: Nadzwyczajny dodatek osłonowy 800+",
        "scenario_title_en": "Spoofed Wroclaw.pl Portal: Emergency Municipal Subsidy",
        "phishing_alert_title": "DECYZJA PREZYDENTA MIASTA: Jednorazowa rekompensata komunalna 850 zł",
        "phishing_body": (
            "Dla wszystkich wrocławian: Urząd Miejski uruchomił fundusz wsparcia kosztów energii. "
            "Wypłata środków odbywa się bezpośrednio na rachunek bankowy po zweryfikowaniu profilu mieszkańca."
        ),
        "cta_label": "Zaloguj się przez Bank aby odebrać 850 zł",
        "red_flags": [
            "Nieoficjalna domena (miejski-alert.info zamiast wroclaw.pl)",
            "Próba wyłudzenia danych logowania do bankowości (phishing credentials)",
            "Obietnica darmowych pieniędzy wymagająca 'natychmiastowej weryfikacji'",
            "Brak danych teleadresowych Urzędu Miejskiego w stopce"
        ],
        "advice_seniors": "Urząd Miejski Wrocławia ani prezydent nigdy nie wysyłają linków do logowania do banku! Wnioski składa się osobiście lub przez mObywatel.",
        "advice_kids": "Nikt w internecie nie rozdaje darmowych pieniędzy. Jeśli strona prosi o logowanie do banku rodziców, to na 100% oszustwo.",
        "advice_professional": "Klasyczny phishing targetowany geolokalizacyjnie (credential harvesting). Należy zgłosić domenę do CERT Polska (incydent.cert.pl)."
    },
    "tauron.pl": {
        "brand_name": "TAURON Dystrybucja S.A.",
        "short_title": "Operator Sieci Dystrybucyjnej",
        "primary_color": "#e1007a",
        "secondary_color": "#830047",
        "accent_color": "#dc2626",
        "real_domain": "tauron-dystrybucja.pl",
        "spoofed_domain": "tauron-windykacja.pl.rachunki-online.net",
        "spoofed_url": "https://tauron-windykacja.pl.rachunki-online.net/sprawdz-zadluzenie",
        "logo_text": "TAURON",
        "nav_links": ["Prąd", "Awarie", "Strefa Klienta", "E-Faktura", "Dla Domu"],
        "official_hotline": "991 (Pogotowie Energetyczne)",
        "scenario_title_pl": "Klon e-BOK Tauron: Wezwanie do zapłaty zaległości pod groźbą wyłączenia",
        "scenario_title_en": "Spoofed Tauron e-BOK: Fake Disconnection Demand",
        "phishing_alert_title": "OSTATECZNE WEZWANIE: Nieuregulowana faktura za prąd (kwota: 12.35 zł)",
        "phishing_body": (
            "Informujemy, że w dniu jutrzejszym planowane jest odłączenie zasilania lokalu z powodu "
            "niedopłaty w wysokości 12.35 zł. Aby wstrzymać zlecenie monterskie, ureguluj należność online."
        ),
        "cta_label": "Opłać zadłużenie 12.35 zł teraz",
        "red_flags": [
            "Zastraszanie natychmiastowym odłączeniem prądu",
            "Niewielka kwota mająca uśpić czujność ofiary (12.35 zł)",
            "Fałszywy panel logowania do e-BOK",
            "Domena rachunki-online.net zarejestrowana anonimowo"
        ],
        "advice_seniors": "Tauron wysyła monity tradycyjną pocztą lub na oficjalnym koncie e-BOK. Nie płać przez link z SMS ani nieznanej strony.",
        "advice_kids": "Oszuści wykorzystują strach przed brakiem prądu i internetu. Zawsze przekaż takie wezwanie dorosłym.",
        "advice_professional": "Powszechny wektor wyłudzeń SMS / Smishing prowadzący do fałszywej bramki płatniczej kopiującej szatę graficzną dostawcy mediów."
    },
    "librus.pl": {
        "brand_name": "Librus Synergia",
        "short_title": "Dziennik Elektroniczny dla Szkół",
        "primary_color": "#1e3a8a",
        "secondary_color": "#172554",
        "accent_color": "#0284c7",
        "real_domain": "portal.librus.pl",
        "spoofed_domain": "synergia-librus.pl.szkolny-portal.cc",
        "spoofed_url": "https://synergia-librus.pl.szkolny-portal.cc/loguj/wroclaw-lo",
        "logo_text": "LIBRUS Synergia",
        "nav_links": ["Wiadomości", "Oceny", "Plan Lekcji", "Zadania Domowe", "Ustawienia"],
        "official_hotline": "Wychowawca klasy / Administrator szkolny",
        "scenario_title_pl": "Fałszywy panel Librus: Wyciek pytań ze sprawdzianu we wrocławskich szkołach",
        "scenario_title_en": "Fake Librus Portal: Leaked Exam Answers Phishing",
        "phishing_alert_title": "UWAGA UCZNIOWIE: Zmiana systemu logowania i baza pytań z egzaminu",
        "phishing_body": (
            "W związku z awarią centralnego serwera Librus, zaloguj się ponownie swoim loginem i hasłem, "
            "aby zweryfikować obecność na liście uczniów oraz odblokować dostęp do oficjalnych arkuszy próbnych."
        ),
        "cta_label": "Zaloguj się kontem ucznia / rodzica",
        "red_flags": [
            "Nieprawidłowy adres www (szkolny-portal.cc)",
            "Wyłudzanie haseł uczniów i rodziców",
            "Obejściowy mechanizm podszywający się pod oficjalną platformę Synergia",
            "Brak dwuskładnikowego uwierzytelniania"
        ],
        "advice_seniors": "Gdy wnuki proszą o dane logowania do dziennika, upewnij się, że korzystają z oficjalnej aplikacji w telefonie.",
        "advice_kids": "Nigdy nie wpisuj hasła do Librusa na stronach z TikToka, Discorda czy linków od znajomych. Adres szkolnego dziennika to portal.librus.pl.",
        "advice_professional": "Kampania ukierunkowana na przejmowanie kont w placówkach edukacyjnych do późniejszego rozsyłania złośliwych linków lub fałszywych alarmów bombowych."
    }
}


class WebsiteClonerService:
    """
    Analyzes real-world websites and creates authentic-looking spoofed copies
    designed for cognitive disinformation and phishing resilience training.
    """

    _instance = None

    @classmethod
    def get_instance(cls) -> "WebsiteClonerService":
        if cls._instance is None:
            cls._instance = WebsiteClonerService()
        return cls._instance

    def inspect_real_website(self, raw_url: str) -> Dict[str, Any]:
        """
        Inspects a real website URL, extracting structural metadata (domain, title, description, colors).
        Gracefully falls back to curated institutional profiles if the network is restricted.
        """
        clean_url = raw_url.strip()
        if not clean_url.startswith(("http://", "https://")):
            clean_url = f"https://{clean_url}"

        parsed = urllib.parse.urlparse(clean_url)
        hostname = (parsed.hostname or "").lower()

        # Match against known local institutional profiles
        matched_key = None
        for key in KNOWN_PROFILES:
            if key in hostname:
                matched_key = key
                break

        profile = KNOWN_PROFILES.get(matched_key) if matched_key else None

        # Fetch live HTML if possible
        live_fetched = False
        extracted_title = ""
        extracted_desc = ""

        try:
            import httpx
            with httpx.Client(timeout=3.0, follow_redirects=True) as client:
                resp = client.get(
                    clean_url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                )
                if resp.status_code == 200:
                    html = resp.text
                    live_fetched = True
                    # Extract title
                    title_m = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
                    if title_m:
                        extracted_title = title_m.group(1).strip()
                    # Extract meta description
                    desc_m = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']', html, re.IGNORECASE)
                    if desc_m:
                        extracted_desc = desc_m.group(1).strip()
        except Exception as exc:
            logger.info("Live network inspect for %s skipped/unavailable: %s", clean_url, exc)

        if profile:
            return {
                "url": clean_url,
                "domain": hostname,
                "brand_name": profile["brand_name"],
                "title": extracted_title or profile["short_title"],
                "description": extracted_desc or profile["phishing_body"][:120],
                "primary_color": profile["primary_color"],
                "nav_links": profile["nav_links"],
                "status": "LIVE_FETCHED" if live_fetched else "PROFILE_MATCHED",
                "known_profile": True,
            }

        # Generic domain synthesis
        domain_parts = hostname.split(".")
        brand_guess = domain_parts[-2].capitalize() if len(domain_parts) >= 2 else hostname

        return {
            "url": clean_url,
            "domain": hostname,
            "brand_name": brand_guess,
            "title": extracted_title or f"{brand_guess} - Oficjalny Serwis Internetowy",
            "description": extracted_desc or f"Informacje, aktualności i usługi serwisu {brand_guess}.",
            "primary_color": "#1e40af",
            "nav_links": ["Strona Główna", "Aktualności", "Usługi", "O nas", "Kontakt"],
            "status": "LIVE_FETCHED" if live_fetched else "GENERIC_SYNTHESIZED",
            "known_profile": False,
        }

    def clone_and_spoof_website(
        self,
        url: str,
        audience_mode: str = "seniors",
        language: str = "pl",
        threat_type: str = "PHISHING",
        custom_scenario_title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates an educational cloned copy of a real website with explicit red flags,
        side-by-side comparison metadata, and audience-tailored pedagogic advice.
        """
        inspect_data = self.inspect_real_website(url)
        hostname = inspect_data["domain"]

        # Check if matched profile exists
        matched_key = None
        for key in KNOWN_PROFILES:
            if key in hostname:
                matched_key = key
                break

        profile = KNOWN_PROFILES.get(matched_key)

        if profile:
            spoofed_url = profile["spoofed_url"]
            spoofed_domain = profile["spoofed_domain"]
            primary_color = profile["primary_color"]
            accent_color = profile["accent_color"]
            brand_name = profile["brand_name"]
            logo_text = profile["logo_text"]
            nav_links = profile["nav_links"]
            alert_title = profile["phishing_alert_title"]
            alert_body = profile["phishing_body"]
            cta_label = profile["cta_label"]
            red_flags = list(profile["red_flags"])
            
            if audience_mode == "kids":
                advice = profile["advice_kids"]
                scenario_title = f"[Dla Młodzieży] {profile['scenario_title_pl'] if language == 'pl' else profile['scenario_title_en']}"
            elif audience_mode == "professional":
                advice = profile["advice_professional"]
                scenario_title = f"[Specjaliści] {profile['scenario_title_pl'] if language == 'pl' else profile['scenario_title_en']}"
            else:
                advice = profile["advice_seniors"]
                scenario_title = profile["scenario_title_pl"] if language == "pl" else profile["scenario_title_en"]

        else:
            # Generate realistic spoofed site for arbitrary target
            brand = inspect_data["brand_name"]
            spoofed_domain = f"{hostname.replace('.', '-')}.weryfikacja-alert.cc"
            spoofed_url = f"https://{spoofed_domain}/komunikat-pilny"
            primary_color = inspect_data.get("primary_color", "#1e3a8a")
            accent_color = "#dc2626"
            brand_name = brand
            logo_text = brand.upper()
            nav_links = inspect_data.get("nav_links", ["Aktualności", "Usługi", "Kontakt"])
            alert_title = f"PILNE OSTRZEŻENIE DLA UŻYTKOWNIKÓW: {brand}"
            alert_body = (
                f"Wykryto nieautoryzowaną próbę dostępu do infrastruktury powiązanej z {brand}. "
                "Aby zapobiec zablokowaniu konta, zweryfikuj tożsamość w ciągu 15 minut."
            )
            cta_label = "Zweryfikuj tożsamość i uniknij blokady"
            red_flags = [
                f"Fałszywa domena '.cc' podszywająca się pod {hostname}",
                "Agresywny limit czasu zmuszający do nieprzemyślanego kliknięcia",
                "Formularz wyłudzający dane wrażliwe lub hasła",
                "Niezgodność certyfikatu SSL z oficjalną organizacją"
            ]
            advice = (
                f"Nigdy nie loguj się przez linki otrzymane w niespodziewanych wiadomościach. "
                f"Wpisz oficjalny adres {hostname} ręcznie w oknie przeglądarki."
            )
            scenario_title = custom_scenario_title or f"Podrobiona strona {brand}: Kampania phishingowa"

        scenario_id = f"cloned-site-{uuid.uuid4().hex[:8]}"

        cloned_payload = {
            "scenario_id": scenario_id,
            "platform_mock": "BROWSER",
            "threat_category": threat_type,
            "author": brand_name,
            "author_handle": spoofed_url,
            "author_avatar": "/assets/avatars/browser_shield.png",
            "verified": False,
            "title": custom_scenario_title or scenario_title,
            "content": f"{alert_title}\n\n{alert_body}",
            "media_url": None,
            "media_type": "URL",
            "red_flags": red_flags,
            "safe_action_advice": advice,
            "is_authentic": False,
            "cloned_website": {
                "original_url": inspect_data["url"],
                "real_domain": inspect_data["domain"],
                "spoofed_url": spoofed_url,
                "spoofed_domain": spoofed_domain,
                "brand_name": brand_name,
                "logo_text": logo_text,
                "primary_color": primary_color,
                "accent_color": accent_color,
                "nav_links": nav_links,
                "alert_title": alert_title,
                "alert_body": alert_body,
                "cta_label": cta_label,
                "countdown_seconds": 900,
                "ssl_details": {
                    "issuer": "Free Automated Cert Authority (30-day trial)",
                    "valid": False,
                    "reason": "Nazwa domeny w certyfikacie nie zgadza się z oficjalnym właścicielem instytucji"
                },
                "comparison": {
                    "real_domain": inspect_data["domain"],
                    "fake_domain": spoofed_domain,
                    "real_features": "Oficjalny certyfikat EV / OV na nazwę podmiotu, brak żądania natychmiastowych opłat, oficjalne numery telefonów.",
                    "fake_features": "Darmowy certyfikat DV, agresywny licznik odliczający czas, żądanie danych autoryzacyjnych lub kodu BLIK."
                }
            }
        }

        return cloned_payload
