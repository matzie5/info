"""
High-Fidelity Offline Seed Library for zero-cost, instant simulation.
Contains pre-generated scenarios, headlines, comments, and persona responses in Polish and English.
"""

import random
import uuid
import time
from typing import Dict, List, Optional
from app.ai.schemas import AgentCommentary, SpoofedArticle, CrisisInjectPayload
from app.models.feed import FeedItem, Comment

SCENARIOS_DATA = {
    "poland-grid-panic-2026": {
        "id": "poland-grid-panic-2026",
        "title_pl": "Awaria Krajowej Sieci Elektroenergetycznej (PSE)",
        "title_en": "Poland Critical Power Grid Crisis 2026",
        "description_pl": "Skoordynowana operacja dezinformacyjna uderzająca w operatora PSE z fałszywymi alertami o blackoutach, wyłączeniach prądu i deficycie węgla.",
        "description_en": "Hostile cyber and disinformation campaign targeting national grid operator PSE with false blackout alerts and fuel reserve rumors.",
        "default_ticks": 40,
        "starter_post": {
            "pl": {
                "author_name": "Alert Informacyjny PL",
                "author_handle": "@AlertInfoPL",
                "author_avatar": "",
                "headline": "Niepotwierdzone doniesienia o zakłóceniach w stacji przesyłowej Kozienice",
                "content": "Mieszkańcy okolicznych powiatów donoszą o spadkach napięcia w godzinach wieczornych. Służby techniczne badają sprawę.",
                "outrage_score": 0.65,
                "bias_score": 0.40,
                "virality_velocity": 1.0,
                "shares_count": 14,
                "likes_count": 38,
                "target_cluster": "Hyper-Partisan A"
            },
            "en": {
                "author_name": "Central Grid Alerts",
                "author_handle": "@GridAlertsEU",
                "author_avatar": "",
                "headline": "Unconfirmed Reports of Frequency Drops at Kozienice Transmission Hub",
                "content": "Residents across central provinces report voltage fluctuations. Power dispatchers are verifying regional grid balance.",
                "outrage_score": 0.65,
                "bias_score": 0.35,
                "virality_velocity": 1.0,
                "shares_count": 14,
                "likes_count": 38,
                "target_cluster": "Hyper-Partisan A"
            }
        },
        "crisis_inject": {
            "pl": CrisisInjectPayload(
                title="KOMUNIKAT RZĄDOWEGO CENTRUM BEZPIECZEŃSTWA (RCB)",
                official_statement=(
                    "Krajowy System Elektroenergetyczny pracuje w sposób w pełni stabilny i bezpieczny. "
                    "Wszelkie doniesienia o planowanych blackoutach lub brakach w dostawach energii stanowią "
                    "celową wrogą operację dezinformacyjną mającą na celu wywołanie paniki społecznej. "
                    "Apelujemy o czerpanie informacji wyłącznie z oficjalnych kanałów PSE oraz RCB."
                ),
                institution="Rządowe Centrum Bezpieczeństwa (RCB)",
                severity="HIGH",
                trust_impact=0.10
            ),
            "en": CrisisInjectPayload(
                title="GOVERNMENT SECURITY CENTRE (RCB) OFFICIAL ADVISORY",
                official_statement=(
                    "The Polish National Power Grid is operating with full stability and substantial generation reserves. "
                    "Viral claims predicting widespread blackouts or generation shortfalls are entirely fabricated components "
                    "of a coordinated hostile disinformation campaign designed to provoke panic. "
                    "Please rely exclusively on verified updates from PSE and government authorities."
                ),
                institution="Government Security Centre (RCB)",
                severity="HIGH",
                trust_impact=0.10
            )
        },
        "articles": {
            "pl": [
                SpoofedArticle(
                    headline="PILNE: Operator PSE potwierdza awarię i plan rotacyjnych wyłączeń prądu od 2:00 w nocy!",
                    body_text="Nieoficjalny wyciek z PSE ujawnia krytyczny deficyt mocy w 5 województwach. Rezerwy węgla brunatnego w Bełchatowie spadły poniżej normy bezpieczeństwa.",
                    author_name="Wiadomości Polska 24 [PILNE]",
                    author_handle="@WiadomosciPolska24",
                    media_url="/assets/images/pse_leak.jpg",
                    outrage_score=0.92,
                    bias_score=0.85,
                    target_cluster="Hyper-Partisan A"
                ),
                SpoofedArticle(
                    headline="SKANDAL: Rząd potajemnie eksportuje prąd do Niemiec, podczas gdy polskie szpitale zagrożone!",
                    body_text="Dokumenty z Ministerstwa Klimatu dowodzą, że w godzinach szczytowego zapotrzebowania energia płynęła na zachód. Polacy zapłacą podwójne rachunki.",
                    author_name="Głos Suwerenny",
                    author_handle="@GlosSuwerennyPL",
                    media_url="/assets/images/export_leak.jpg",
                    outrage_score=0.89,
                    bias_score=-0.80,
                    target_cluster="Hyper-Partisan B"
                ),
                SpoofedArticle(
                    headline="Alarm ekologiczny: Awaria filtrów w elektrowni Kozienice zatuszowana przez zarząd?",
                    body_text="Mieszkańcy Mazowsza zgłaszają gęsty dym i duszący zapach siarki. Pomiary jakości powietrza zostały wyłączone z serwerów GIOŚ.",
                    author_name="Zielony Front Informacji",
                    author_handle="@ZielonyFront",
                    media_url="/assets/images/smog_kozienice.jpg",
                    outrage_score=0.78,
                    bias_score=-0.45,
                    target_cluster="Institutional Skeptics"
                ),
                SpoofedArticle(
                    headline="Porażające podwyżki: Rachunki za prąd w górę o 180% od przyszłego miesiąca. Koniec tarcz!",
                    body_text="Tajna notatka Urzędu Regulacji Energetyki wskazuje na drastyczne cięcia osłon socjalnych dla gospodarstw domowych.",
                    author_name="Finanse Obywatelskie",
                    author_handle="@FinanseObywatelskie",
                    media_url="/assets/images/bill_spike.jpg",
                    outrage_score=0.86,
                    bias_score=0.20,
                    target_cluster="Susceptible Neutrals"
                ),
                SpoofedArticle(
                    headline="Wyciek bazy danych odbiorców energii! Numery PESEL i adresy milionów Polaków w sieci Darknet",
                    body_text="Hakerzy powiązani z wschodnią grupą cyberprzestępczą twierdzą, że przejęli pełną bazę rozliczeniową PGE i Tauronu.",
                    author_name="CyberAlert PL",
                    author_handle="@CyberAlertPL",
                    media_url="/assets/images/darknet_leak.jpg",
                    outrage_score=0.90,
                    bias_score=0.0,
                    target_cluster="Apolitical Youth"
                ),
                SpoofedArticle(
                    headline="Sensacyjne doniesienia: Sabotaż na stacji transformatorowej pod Warszawą! Drony bez oznaczeń",
                    body_text="Służby badają incydent w pobliżu kluczowego węzła przesyłowego. Świadkowie słyszeli serię eksplozji tuż przed północą.",
                    author_name="Raport Frontowy",
                    author_handle="@RaportFrontowy",
                    media_url="/assets/images/substation_fire.jpg",
                    outrage_score=0.95,
                    bias_score=0.70,
                    target_cluster="Hyper-Partisan A"
                ),
            ],
            "en": [
                SpoofedArticle(
                    headline="BREAKING: Polish Grid Operator Confirms Imminent Rolling Blackouts Across 5 Provinces!",
                    body_text="Leaked contingency memo from PSE reveals critical generation deficit. Coal stockpiles at Belchatow power complex fall below emergency thresholds.",
                    author_name="Central Europe Dispatch",
                    author_handle="@CEDispatchAlert",
                    media_url="/assets/images/pse_leak.jpg",
                    outrage_score=0.92,
                    bias_score=0.80,
                    target_cluster="Hyper-Partisan A"
                ),
                SpoofedArticle(
                    headline="SCANDAL: Power Secretly Diverted Abroad While Domestic Hospitals Face Winter Rationing!",
                    body_text="Internal energy ministry correspondence confirms massive cross-border power flows prioritized over regional backup reserves.",
                    author_name="Energy Whistleblower",
                    author_handle="@EnergyLeaksGlobal",
                    media_url="/assets/images/export_leak.jpg",
                    outrage_score=0.88,
                    bias_score=-0.75,
                    target_cluster="Hyper-Partisan B"
                ),
                SpoofedArticle(
                    headline="Unexplained Explosions at Primary High-Voltage Transformer Station Near Warsaw",
                    body_text="Local residents report heavy smoke and power flickers. Officials refuse to comment on suspected drone interference.",
                    author_name="Warsaw Eye News",
                    author_handle="@WarsawEye",
                    media_url="/assets/images/substation_fire.jpg",
                    outrage_score=0.94,
                    bias_score=0.60,
                    target_cluster="Hyper-Partisan A"
                ),
                SpoofedArticle(
                    headline="Utility Billing Hack: 12 Million Consumer IDs Leaked Following Coordinated Cyber Attack",
                    body_text="Compromised utility databases uploaded to dark web breach forums. Customers advised to freeze credit lines immediately.",
                    author_name="Grid Defense Monitor",
                    author_handle="@GridDefenseEU",
                    media_url="/assets/images/darknet_leak.jpg",
                    outrage_score=0.87,
                    bias_score=0.10,
                    target_cluster="Apolitical Youth"
                ),
            ]
        }
    },
    "financial-panic-2026": {
        "id": "financial-panic-2026",
        "title_pl": "Panika Sektora Bankowego i Run na Gotówkę 2026",
        "title_en": "Banking Liquidity Panic & Cash Run 2026",
        "description_pl": "Wirusowe plotki o blokadzie kart płatniczych, limitach wypłat z bankomatów i rzekomej niewypłacalności czołowych banków komercyjnych.",
        "description_en": "Targeted rumors of digital banking liquidity freezes, ATM daily withdrawal quotas, and commercial bank insolvencies.",
        "default_ticks": 40,
        "starter_post": {
            "pl": {
                "author_name": "Finanse i Rynek PL",
                "author_handle": "@FinanseIRynekPL",
                "author_avatar": "",
                "headline": "Przejściowe opóźnienia w systemach rozliczeń międzybankowych Elixir",
                "content": "Krajowa Izba Rozliczeniowa informuje o rutynowej aktualizacji węzłów clearingowych. Transakcje kartowe są realizowane z nieznacznym opóźnieniem.",
                "outrage_score": 0.50,
                "bias_score": 0.10,
                "virality_velocity": 1.0,
                "shares_count": 18,
                "likes_count": 42,
                "target_cluster": "Susceptible Neutrals"
            },
            "en": {
                "author_name": "Financial Markets Wire",
                "author_handle": "@FinMarketsWire",
                "author_avatar": "",
                "headline": "Intermittent Latency Detected in National Interbank Clearing Settlement Systems",
                "content": "National clearing agency reports technical maintenance windows. Card authorizations and wire transfers operate within acceptable retry tolerances.",
                "outrage_score": 0.50,
                "bias_score": 0.10,
                "virality_velocity": 1.0,
                "shares_count": 18,
                "likes_count": 42,
                "target_cluster": "Susceptible Neutrals"
            }
        },
        "crisis_inject": {
            "pl": CrisisInjectPayload(
                title="WSPÓLNY KOMUNIKAT KNF I NARODOWEGO BANKU POLSKIEGO",
                official_statement=(
                    "Polski system bankowy posiada pełną płynność finansową i najwyższe wskaźniki wypłacalności. "
                    "Wszystkie środki depozytowe są w 100% gwarantowane przez Bankowy Fundusz Gwarancyjny. "
                    "Rozpowszechniane informacje o blokadach kont lub limitach wypłat stanowią wrogą operację dezinformacyjną."
                ),
                institution="Komisja Nadzoru Finansowego (KNF)",
                severity="HIGH",
                trust_impact=0.10
            ),
            "en": CrisisInjectPayload(
                title="JOINT STATEMENT: FINANCIAL SUPERVISION AUTHORITY & CENTRAL BANK",
                official_statement=(
                    "The national commercial banking sector maintains complete liquidity and surplus capital buffers. "
                    "All citizen deposits are fully protected by statutory deposit guarantee funds. "
                    "Viral rumors claiming mandatory cash withdrawal caps or bank holidays are hostile fabrications."
                ),
                institution="Financial Supervision Authority (KNF)",
                severity="HIGH",
                trust_impact=0.10
            )
        },
        "articles": {
            "pl": [
                SpoofedArticle(
                    headline="PILNE: Tajne memorandum KNF! Limit wypłat z bankomatów obniżony do 200 zł dziennie od jutra!",
                    body_text="Wewnętrzny dokument nadzoru bankowego nakazuje bankom natychmiastowe zablokowanie wypłat gotówki. System kartowy Visa/Mastercard zagrożony paraliżem.",
                    author_name="Głos Rynku Niezależnego",
                    author_handle="@GlosRynkuPL",
                    media_url="/assets/images/bank_panic.jpg",
                    outrage_score=0.94,
                    bias_score=0.80,
                    target_cluster="Hyper-Partisan A"
                ),
                SpoofedArticle(
                    headline="Czołowy bank komercyjny traci płynność! Kolejki pod oddziałami w Warszawie i Krakowie",
                    body_text="Klienci nie mogą zalogować się do bankowości elektronicznej. Pracownicy oddziałów odsyłają ludzi z kwitkiem, brak gotówki w skarbcach.",
                    author_name="Raport Gotówkowy",
                    author_handle="@RaportGotowkowy",
                    media_url="/assets/images/bank_queue.jpg",
                    outrage_score=0.91,
                    bias_score=0.40,
                    target_cluster="Susceptible Neutrals"
                ),
                SpoofedArticle(
                    headline="Wycofanie gotówki z obiegu przyspieszone o 3 lata! Rząd planuje pełną blokadę transakcji papierowych",
                    body_text="Oficjalny projekt ustawy trafił do komisji sejmowej pod osłoną nocy. Każda transakcja powyżej 50 zł będzie raportowana do Urzędu Skarbowego.",
                    author_name="Wolny Obywatel",
                    author_handle="@WolnyObywatelPL",
                    media_url="/assets/images/cashless_memo.jpg",
                    outrage_score=0.88,
                    bias_score=-0.85,
                    target_cluster="Hyper-Partisan B"
                ),
                SpoofedArticle(
                    headline="Wyciek baz danych 5 banków w Darknecie! Numery kont, salda i hasła milionów obywateli",
                    body_text="Międzynarodowa grupa hakerów wystawiła na sprzedaż 400 GB danych polskich kredytobiorców. System BLIK rzekomo skompromitowany.",
                    author_name="CyberBezpieczeństwo News",
                    author_handle="@CyberNewsPL",
                    media_url="/assets/images/darknet_leak.jpg",
                    outrage_score=0.89,
                    bias_score=0.10,
                    target_cluster="Apolitical Youth"
                )
            ],
            "en": [
                SpoofedArticle(
                    headline="BREAKING: Leaked Central Bank Memo Caps Daily ATM Withdrawals to 50 EUR Across Nation!",
                    body_text="Emergency liquidity rationing triggered across tier-1 retail banks. Financial supervision mandates electronic-only payment limits.",
                    author_name="Financial Insider EU",
                    author_handle="@FinInsiderEU",
                    media_url="/assets/images/bank_panic.jpg",
                    outrage_score=0.93,
                    bias_score=0.75,
                    target_cluster="Hyper-Partisan A"
                ),
                SpoofedArticle(
                    headline="Major Commercial Bank Halts Digital Transfers as Liquidity Drain Accelerates",
                    body_text="Mobile banking applications go dark across metropolitan hubs. Bank branches run out of physical reserve currency amidst growing queues.",
                    author_name="Banking Telemetry Watch",
                    author_handle="@BankTelemetry",
                    media_url="/assets/images/bank_queue.jpg",
                    outrage_score=0.90,
                    bias_score=0.35,
                    target_cluster="Susceptible Neutrals"
                )
            ]
        }
    },
    "water-contamination-2026": {
        "id": "water-contamination-2026",
        "title_pl": "Kryzys Skażenia Wodociągów Miejskich 2026",
        "title_en": "Municipal Water Supply Crisis 2026",
        "description_pl": "Skoordynowane plotki o skażeniu chemicznym ujęć wody pitnej wywołujące paniczne wykupywanie zapasów wody butelkowanej.",
        "description_en": "Targeted rumors alleging toxic chemical contamination in metropolitan water treatment reservoirs, causing supermarket runs.",
        "default_ticks": 40,
        "starter_post": {
            "pl": {
                "author_name": "Wodociągi Miejskie Alert",
                "author_handle": "@WodociagiAlert",
                "author_avatar": "",
                "headline": "Rutynowe prace konserwacyjne stacji uzdatniania wody w ujęciu północnym",
                "content": "W związku z przeglądem pomp ciśnieniowych w godzinach nocnych możliwe chwilowe wahania ciśnienia w sieci. Woda spełnia wszystkie normy sanitarno-epidemiologiczne.",
                "outrage_score": 0.45,
                "bias_score": 0.10,
                "virality_velocity": 1.0,
                "shares_count": 12,
                "likes_count": 30,
                "target_cluster": "Institutional Skeptics"
            },
            "en": {
                "author_name": "Municipal Water Authority",
                "author_handle": "@WaterAuthAlert",
                "author_avatar": "",
                "headline": "Scheduled Filtration Maintenance at Northern Water Purification Facility",
                "content": "Pressure balancing across main distribution pipes may result in momentary flow variance. Drinking water parameters remain 100% compliant with sanitary codes.",
                "outrage_score": 0.45,
                "bias_score": 0.10,
                "virality_velocity": 1.0,
                "shares_count": 12,
                "likes_count": 30,
                "target_cluster": "Institutional Skeptics"
            }
        },
        "crisis_inject": {
            "pl": CrisisInjectPayload(
                title="OFICJALNY KOMUNIKAT GŁÓWNEGO INSPEKTORATU SANITARNEGO (GIS)",
                official_statement=(
                    "Woda dostarczana przez miejskie sieci wodociągowe jest w pełni bezpieczna i zdatna do bezpośredniego spożycia. "
                    "Ciągły monitoring laboratoryjny nie wykazuje żadnych przekroczeń norm bakteriologicznych ani chemicznych. "
                    "Informacje o rzekomym skażeniu są celowym fake newsem mającym zdestabilizować porządek publiczny."
                ),
                institution="Główny Inspektorat Sanitarny (GIS)",
                severity="HIGH",
                trust_impact=0.10
            ),
            "en": CrisisInjectPayload(
                title="OFFICIAL COMMUNIQUE: CHIEF SANITARY INSPECTORATE (GIS)",
                official_statement=(
                    "Municipal tap water supply remains completely safe, potable, and continuously laboratory-verified. "
                    "Multi-stage sensor telemetry indicates zero chemical or biological contamination across all treatment plants. "
                    "Circulating toxic contamination alerts are malicious hoaxes engineered to disrupt municipal operations."
                ),
                institution="Chief Sanitary Inspectorate (GIS)",
                severity="HIGH",
                trust_impact=0.10
            )
        },
        "articles": {
            "pl": [
                SpoofedArticle(
                    headline="ALARM SANITARNY: Wyciek toksycznych substancji do głównego ujęcia wody pitnej! Nie pijcie kranówki!",
                    body_text="Pracownik laboratorium miejskiego anonimowo udostępnił wyniki próbek. Wykryto 500-krotne przekroczenie norm toksyn. Władze milczą!",
                    author_name="Alarm Ekologiczny PL",
                    author_handle="@EkoAlarmPL",
                    media_url="/assets/images/water_leak.jpg",
                    outrage_score=0.96,
                    bias_score=0.85,
                    target_cluster="Institutional Skeptics"
                ),
                SpoofedArticle(
                    headline="Puste półki w marketach! Masowy wykup wody butelkowanej po plotkach o zatruciu wodociągów",
                    body_text="W całym mieście brakuje wody mineralnej. Ceny 5-litrowych baniaków wzrosły na portalach ogłoszeniowych do 60 zł za sztukę.",
                    author_name="Wiadomości Miejskie",
                    author_handle="@WiadomosciMiejskie",
                    media_url="/assets/images/store_rush.jpg",
                    outrage_score=0.87,
                    bias_score=0.20,
                    target_cluster="Susceptible Neutrals"
                )
            ],
            "en": [
                SpoofedArticle(
                    headline="CRITICAL SANITARY ALERT: Toxic Industrial Solvent Spill Enters Metropolitan Water Reservoir!",
                    body_text="Anonymous laboratory technicians leak internal sensor readings showing extreme chemical saturation. Municipal leadership refuses press briefing.",
                    author_name="Environmental Watchdog",
                    author_handle="@EcoWatchEU",
                    media_url="/assets/images/water_leak.jpg",
                    outrage_score=0.95,
                    bias_score=0.80,
                    target_cluster="Institutional Skeptics"
                )
            ]
        }
    },
    "border-security-2026": {
        "id": "border-security-2026",
        "title_pl": "Incydent Hybrydowy na Granicy Wschodniej 2026",
        "title_en": "Eastern Border Hybrid Incident 2026",
        "description_pl": "Fałszywe doniesienia o niezidentyfikowanych dronach, zakłóceniach GPS i ewakuacji miejscowości przygranicznych.",
        "description_en": "Coordinated rumors of hostile drone intrusions, military GPS jamming, and border village evacuations.",
        "default_ticks": 40,
        "starter_post": {
            "pl": {
                "author_name": "Raport Bezpieczeństwa",
                "author_handle": "@RaportGranica",
                "author_avatar": "",
                "headline": "Rutynowe ćwiczenia łączności i monitoringu radarowego w strefie przygranicznej",
                "content": "Straż Graniczna i wojskowe pododdziały walki radioelektronicznej prowadzą planowe testy systemów interoperacyjności. Sytuacja na granicy stabilna.",
                "outrage_score": 0.40,
                "bias_score": 0.15,
                "virality_velocity": 1.0,
                "shares_count": 15,
                "likes_count": 35,
                "target_cluster": "Hyper-Partisan A"
            },
            "en": {
                "author_name": "Border Security Dispatch",
                "author_handle": "@BorderDispatchEU",
                "author_avatar": "",
                "headline": "Scheduled Joint Radar & Telecommunications Drills Along Eastern Transit Corridor",
                "content": "Border Guard formations and civilian aviation authorities conduct planned electronic calibration tests. Border traffic remains fully normal.",
                "outrage_score": 0.40,
                "bias_score": 0.15,
                "virality_velocity": 1.0,
                "shares_count": 15,
                "likes_count": 35,
                "target_cluster": "Hyper-Partisan A"
            }
        },
        "crisis_inject": {
            "pl": CrisisInjectPayload(
                title="OŚWIADCZENIE MINISTERSTWA OBRONY NARODOWEJ I STRAŻY GRANICZNEJ",
                official_statement=(
                    "Granica państwowa oraz przestrzeń powietrzna Rzeczypospolitej Polskiej pozostają pod stałą, nieprzerwaną ochroną. "
                    "Nie odnotowano żadnych naruszeń suwerenności ani bezprawnych wtargnięć. "
                    "Zdjęcia i nagrania rzekomej ewakuacji mieszkańców są zmanipulowanym materiałem archiwalnym."
                ),
                institution="Ministerstwo Obrony Narodowej (MON)",
                severity="HIGH",
                trust_impact=0.10
            ),
            "en": CrisisInjectPayload(
                title="DEFENSE MINISTRY & BORDER GUARD JOINT COMMUNIQUE",
                official_statement=(
                    "National sovereign airspace and state border sectors remain under continuous multi-layered sensor surveillance. "
                    "No unauthorized intrusions, airspace breaches, or evacuation orders have taken place. "
                    "Circulating viral footage claiming hostile incursions consists of repurposed foreign footage designed to create hysteria."
                ),
                institution="Ministry of National Defense (MON)",
                severity="HIGH",
                trust_impact=0.10
            )
        },
        "articles": {
            "pl": [
                SpoofedArticle(
                    headline="PILNE: Niezidentyfikowany rój dronów wojskowych nad Suwalszczyzną! Systemy GPS sparaliżowane",
                    body_text="Mieszkańcy powiatu sejneńskiego relacjonują przeloty maszyn bez oznaczeń na niskiej wysokości. Lotnictwo cywilne przekierowywane z korytarza.",
                    author_name="Front Wschodni Alert",
                    author_handle="@FrontWschodniPL",
                    media_url="/assets/images/drone_swarm.jpg",
                    outrage_score=0.97,
                    bias_score=0.88,
                    target_cluster="Hyper-Partisan A"
                ),
                SpoofedArticle(
                    headline="Mieszkańcy 3 gmin wezwani do natychmiastowej ewakuacji! Chaos komunikacyjny na drogach krajowych",
                    body_text="Nieoficjalne wiadomości SMS rozsyłane rzekomo przez alerty kryzysowe wywołały masowy wyjazd mieszkańców w głąb kraju.",
                    author_name="Polska Na Żywo",
                    author_handle="@PolskaNaZywo24",
                    media_url="/assets/images/traffic_jam.jpg",
                    outrage_score=0.93,
                    bias_score=0.30,
                    target_cluster="Susceptible Neutrals"
                )
            ],
            "en": [
                SpoofedArticle(
                    headline="BREAKING: Unidentified Military Drone Swarms Penetrate Eastern Air Defense Corridor!",
                    body_text="Commercial GPS navigation down across regional transit axes. Witnesses film low-flying stealth platforms moving west.",
                    author_name="Eastern Flank Intel",
                    author_handle="@FlankIntelEU",
                    media_url="/assets/images/drone_swarm.jpg",
                    outrage_score=0.96,
                    bias_score=0.85,
                    target_cluster="Hyper-Partisan A"
                )
            ]
        }
    }
}

PERSONAS = [
    {
        "role": "investigative_journalist",
        "name_pl": "Marek Wiśniewski (Śledczy)",
        "name_en": "Marcus Wisniewski (Investigative)",
        "handle": "@m_wisniewski_press",
        "avatar": ""
    },
    {
        "role": "populist_commentator",
        "name_pl": "Janusz Wolnościowy",
        "name_en": "Janusz Freedom Watch",
        "handle": "@janusz_wolny",
        "avatar": ""
    },
    {
        "role": "civic_activist",
        "name_pl": "Katarzyna Zając (Weryfikacja)",
        "name_en": "Kate Hare (FactCheck Action)",
        "handle": "@kasia_fakt",
        "avatar": ""
    },
    {
        "role": "energy_engineer",
        "name_pl": "dr inż. Piotr Kowalczyk",
        "name_en": "Dr. Peter Kowalczyk PE",
        "handle": "@dr_kowalczyk_tech",
        "avatar": ""
    }
]

INFLUENCER_RESPONSES = {
    "pl": {
        "investigative_journalist": [
            AgentCommentary(
                sentiment="SKEPTICAL",
                stance="ANTI_DISINFO",
                author_name="Marek Wiśniewski (Śledczy)",
                author_handle="@m_wisniewski_press",
                comment_text="Sprawdzam ten 'wyciek'. Służby nie opublikowały takiego dokumentu, a pieczęć w rogu pochodzi ze starego szablonu z 2018 roku. Proszę o powściągliwość przed udostępnieniem.",
                intent_to_amplify=False,
                outrage_score=0.20
            ),
            AgentCommentary(
                sentiment="NEUTRAL",
                stance="UNALIGNED",
                author_name="Marek Wiśniewski (Śledczy)",
                author_handle="@m_wisniewski_press",
                comment_text="Rozmawiam z rzecznikiem instytucji. Zapewniają, że system pracuje w normie, ale czekamy na oficjalny komunikat na konferencji.",
                intent_to_amplify=False,
                outrage_score=0.30
            )
        ],
        "populist_commentator": [
            AgentCommentary(
                sentiment="OUTRAGED",
                stance="PRO_DISINFO",
                author_name="Janusz Wolnościowy",
                author_handle="@janusz_wolny",
                comment_text="Mówiłem wam od miesięcy! Rząd ukrywa prawdę przed obywatelami! Przygotujcie się, bo od tych kłamców prawdy się nie dowiecie!",
                intent_to_amplify=True,
                outrage_score=0.95
            ),
            AgentCommentary(
                sentiment="OUTRAGED",
                stance="PRO_DISINFO",
                author_name="Janusz Wolnościowy",
                author_handle="@janusz_wolny",
                comment_text="Cenzura już próbuje to kasować z internetu! Podawajcie dalej zanim zablokują cały profil!",
                intent_to_amplify=True,
                outrage_score=0.90
            )
        ],
        "civic_activist": [
            AgentCommentary(
                sentiment="SUPPORTIVE",
                stance="ANTI_DISINFO",
                author_name="Katarzyna Zając (Weryfikacja)",
                author_handle="@kasia_fakt",
                comment_text="⚠️ FAKE NEWS: Wpis jest elementem skoordynowanej kampanii dezinformacyjnej. Wszystkie parametry są w normie.",
                intent_to_amplify=False,
                outrage_score=0.15
            )
        ],
        "energy_engineer": [
            AgentCommentary(
                sentiment="NEUTRAL",
                stance="ANTI_DISINFO",
                author_name="dr inż. Piotr Kowalczyk",
                author_handle="@dr_kowalczyk_tech",
                comment_text="Jako inżynier weryfikujący telemetrię: systemy kontrolne pracują w normie. Twierdzenia o awarii nie pokrywają się z odczytami stacji.",
                intent_to_amplify=False,
                outrage_score=0.10
            )
        ]
    },
    "en": {
        "investigative_journalist": [
            AgentCommentary(
                sentiment="SKEPTICAL",
                stance="ANTI_DISINFO",
                author_name="Marcus Wisniewski (Investigative)",
                author_handle="@m_wisniewski_press",
                comment_text="Investigating this alleged memo. Source documents show clear signs of digital manipulation. Authorities deny any emergency protocol.",
                intent_to_amplify=False,
                outrage_score=0.25
            )
        ],
        "populist_commentator": [
            AgentCommentary(
                sentiment="OUTRAGED",
                stance="PRO_DISINFO",
                author_name="Janusz Freedom Watch",
                author_handle="@janusz_wolny",
                comment_text="They are lying to protect themselves while regular citizens suffer! Prepare yourselves right now before it is too late!",
                intent_to_amplify=True,
                outrage_score=0.95
            )
        ],
        "civic_activist": [
            AgentCommentary(
                sentiment="SUPPORTIVE",
                stance="ANTI_DISINFO",
                author_name="Kate Hare (FactCheck Action)",
                author_handle="@kasia_fakt",
                comment_text="⚠️ VERIFIED DISINFORMATION: This alert is completely fabricated. Official monitoring systems show 100% stability.",
                intent_to_amplify=False,
                outrage_score=0.10
            )
        ],
        "energy_engineer": [
            AgentCommentary(
                sentiment="NEUTRAL",
                stance="ANTI_DISINFO",
                author_name="Dr. Peter Kowalczyk PE",
                author_handle="@dr_kowalczyk_tech",
                comment_text="System telemetry and baseline monitoring show nominal readings. The circulating alarmist claims contradict live field telemetry.",
                intent_to_amplify=False,
                outrage_score=0.10
            )
        ]
    }
}

BOT_COMMENTS = {
    "pl": [
        "Potwierdzam, u nas w okolicy już są zakłócenia!",
        "Rząd znowu kłamie! Próbują zatuszować prawdę!",
        "Udostępniajcie póki nie skasowali! #AlertObywatelski",
        "Wypłacajcie gotówkę z bankomatów i róbcie zapasy!",
        "To celowe działanie, chcą nas zmusić do posłuszeństwa!",
        "Mój znajomy pracuje w instytucji i potwierdził, że sytuacja jest krytyczna!",
        "Wszyscy na ulice! Dość kłamstw mediów głównego nurtu!",
        "Władze ukrywają prawdę przed opinią publiczną!",
        "Zróbcie zapasy wody i jedzenia, to potrwa co najmniej tydzień!",
        "Kolejny dowód na nieudolność służb! Czas rozliczyć winnych!",
    ],
    "en": [
        "Can confirm, power and signals are already flickering in our area!",
        "The government is covering this up! Share before they take this post down!",
        "Withdraw cash and stock up on essentials immediately!",
        "My relative works at the central facility and confirmed the crisis is real!",
        "Mainstream media is completely silent as usual! Wake up people!",
        "Stock up on emergency supplies right now!",
        "Deliberate manipulation by the authorities!",
        "Don't trust the official statements, prepare your families!",
    ]
}


class SeedLibrary:
    @staticmethod
    def get_scenarios() -> List[Dict]:
        res = []
        for s_id, s in SCENARIOS_DATA.items():
            res.append({
                "id": s["id"],
                "title_pl": s["title_pl"],
                "title_en": s["title_en"],
                "description_pl": s["description_pl"],
                "description_en": s["description_en"],
                "default_ticks": s.get("default_ticks", 40)
            })
        return res

    @staticmethod
    def get_scenario(scenario_id: str) -> Dict:
        return SCENARIOS_DATA.get(scenario_id, SCENARIOS_DATA["poland-grid-panic-2026"])

    @staticmethod
    def get_scenario_starter_post(scenario_id: str, language: str = "en", session_id: str = "") -> FeedItem:
        lang = "pl" if language.lower() == "pl" else "en"
        scen = SCENARIOS_DATA.get(scenario_id, SCENARIOS_DATA["poland-grid-panic-2026"])
        starter_dict = scen["starter_post"].get(lang, scen["starter_post"]["en"])

        return FeedItem(
            id=f"post_{uuid.uuid4().hex[:6]}",
            session_id=session_id,
            author_name=starter_dict["author_name"],
            author_handle=starter_dict["author_handle"],
            author_avatar=starter_dict.get("author_avatar", ""),
            is_verified=True,
            headline=starter_dict["headline"],
            content=starter_dict["content"],
            created_at_tick=0,
            timestamp=time.time(),
            outrage_score=starter_dict.get("outrage_score", 0.5),
            bias_score=starter_dict.get("bias_score", 0.0),
            virality_velocity=starter_dict.get("virality_velocity", 1.0),
            shares_count=starter_dict.get("shares_count", 15),
            likes_count=starter_dict.get("likes_count", 40),
            comments_count=0,
            targeted_clusters=[starter_dict["target_cluster"]] if starter_dict.get("target_cluster") else []
        )

    @staticmethod
    def get_scenario_articles(scenario_id: str, language: str = "en") -> List[SpoofedArticle]:
        lang = "pl" if language.lower() == "pl" else "en"
        scen = SCENARIOS_DATA.get(scenario_id, SCENARIOS_DATA["poland-grid-panic-2026"])
        return scen["articles"].get(lang, scen["articles"].get("en", []))

    @staticmethod
    def get_article(scenario_id: Optional[str] = None, language: str = "en", cluster: Optional[str] = None) -> SpoofedArticle:
        lang = "pl" if language.lower() == "pl" else "en"
        scen_id = scenario_id or "poland-grid-panic-2026"
        scen = SCENARIOS_DATA.get(scen_id, SCENARIOS_DATA["poland-grid-panic-2026"])
        articles = scen["articles"].get(lang, scen["articles"].get("en", []))
        if not articles:
            articles = SCENARIOS_DATA["poland-grid-panic-2026"]["articles"]["en"]
        if cluster:
            filtered = [a for a in articles if a.target_cluster == cluster]
            if filtered:
                return random.choice(filtered)
        return random.choice(articles)

    @staticmethod
    def get_influencer_comment(language: str = "en", persona_role: Optional[str] = None) -> AgentCommentary:
        lang = "pl" if language.lower() == "pl" else "en"
        resp_dict = INFLUENCER_RESPONSES.get(lang, INFLUENCER_RESPONSES["en"])
        if persona_role and persona_role in resp_dict:
            comments = resp_dict[persona_role]
        else:
            all_comments = []
            for role_comments in resp_dict.values():
                all_comments.extend(role_comments)
            comments = all_comments
        return random.choice(comments)

    @staticmethod
    def get_bot_comments(language: str = "en", count: int = 3) -> List[str]:
        lang = "pl" if language.lower() == "pl" else "en"
        pool = BOT_COMMENTS.get(lang, BOT_COMMENTS["en"])
        k = min(count, len(pool))
        return random.sample(pool, k)

    @staticmethod
    def get_crisis_inject(scenario_id: Optional[str] = None, language: str = "en") -> CrisisInjectPayload:
        lang = "pl" if language.lower() == "pl" else "en"
        scen_id = scenario_id or "poland-grid-panic-2026"
        scen = SCENARIOS_DATA.get(scen_id, SCENARIOS_DATA["poland-grid-panic-2026"])
        inject = scen.get("crisis_inject", {}).get(lang)
        if not inject:
            inject = SCENARIOS_DATA["poland-grid-panic-2026"]["crisis_inject"][lang]
        return inject
