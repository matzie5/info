"""
High-Fidelity Offline Seed Library for zero-cost, instant fallback.
Contains pre-generated scenarios, headlines, comments, and persona responses in Polish and English.
"""

import random
from typing import Dict, List, Optional
from app.ai.schemas import AgentCommentary, SpoofedArticle, CrisisInjectPayload

SEED_ARTICLES = {
    "pl": [
        SpoofedArticle(
            headline="PILNE: Operator PSE potwierdza awarię i plan rotacyjnych wyłączeń prądu od 2:00 w nocy!",
            body_text="Nieoficjalny wyciek z PSE ujawnia krytyczny deficyt mocy w 5 województwach. Rezerwy węgla brunatnego w Bełchatowie spadły poniżej normy bezpieczeństwa.",
            author_name="Wiadomości Polska 24 [PILNE]",
            author_handle="@WiadomosciPolska24",
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/pse_leak.jpg",
            outrage_score=0.92,
            bias_score=0.85,
            target_cluster="Hyper-Partisan A"
        ),
        SpoofedArticle(
            headline="SKANDAL: Rząd potajemnie eksportuje prąd do Niemiec, podczas gdy polskie szpitale zagrożone!",
            body_text="Dokumenty z Ministerstwa Klimatu dowodzą, że w godzinach szczytowego zapotrzebowania energia płynęła na zachód. Polacy zapłacą podwójne rachunki.",
            author_name="Głos Suwerenny",
            author_handle="@GlosSuwerennyPL",
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/export_leak.jpg",
            outrage_score=0.89,
            bias_score=-0.80,
            target_cluster="Hyper-Partisan B"
        ),
        SpoofedArticle(
            headline="Alarm ekologiczny: Awaria filtrów w elektrowni Kozienice zatuszowana przez zarząd?",
            body_text="Mieszkańcy Mazowsza zgłaszają gęsty dym i duszący zapach siarki. Pomiary jakości powietrza zostały wyłączone z serwerów GIOŚ.",
            author_name="Zielony Front Informacji",
            author_handle="@ZielonyFront",
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/smog_kozienice.jpg",
            outrage_score=0.78,
            bias_score=-0.45,
            target_cluster="Institutional Skeptics"
        ),
        SpoofedArticle(
            headline="Porażające podwyżki: Rachunki za prąd w górę o 180% od przyszłego miesiąca. Koniec tarcz!",
            body_text="Tajna notatka Urzędu Regulacji Energetyki wskazuje na drastyczne cięcia osłon socjalnych dla gospodarstw domowych.",
            author_name="Finanse Obywatelskie",
            author_handle="@FinanseObywatelskie",
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/bill_spike.jpg",
            outrage_score=0.86,
            bias_score=0.20,
            target_cluster="Susceptible Neutrals"
        ),
        SpoofedArticle(
            headline="Wyciek bazy danych odbiorców energii! Numery PESEL i adresy milionów Polaków w sieci Darknet",
            body_text="Hakerzy powiązani z wschodnią grupą cyberprzestępczą twierdzą, że przejęli pełną bazę rozliczeniową PGE i Tauronu.",
            author_name="CyberAlert PL",
            author_handle="@CyberAlertPL",
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/darknet_leak.jpg",
            outrage_score=0.90,
            bias_score=0.0,
            target_cluster="Apolitical Youth"
        ),
        SpoofedArticle(
            headline="Sensacyjne doniesienia: Sabotaż na stacji transformatorowej pod Warszawą! Drony bez oznaczeń",
            body_text="Służby badają incydent w pobliżu kluczowego węzła przesyłowego. Świadkowie słyszeli serię eksplozji tuż przed północą.",
            author_name="Raport Frontowy",
            author_handle="@RaportFrontowy",
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/substation_fire.jpg",
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
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/pse_leak.jpg",
            outrage_score=0.92,
            bias_score=0.80,
            target_cluster="Hyper-Partisan A"
        ),
        SpoofedArticle(
            headline="SCANDAL: Power Secretly Diverted Abroad While Domestic Hospitals Face Winter Rationing!",
            body_text="Internal energy ministry correspondence confirms massive cross-border power flows prioritized over regional backup reserves.",
            author_name="Energy Whistleblower",
            author_handle="@EnergyLeaksGlobal",
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/export_leak.jpg",
            outrage_score=0.88,
            bias_score=-0.75,
            target_cluster="Hyper-Partisan B"
        ),
        SpoofedArticle(
            headline="Unexplained Explosions at Primary High-Voltage Transformer Station Near Warsaw",
            body_text="Local residents report heavy smoke and power flickers. Officials refuse to comment on suspected drone interference.",
            author_name="Warsaw Eye News",
            author_handle="@WarsawEye",
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/substation_fire.jpg",
            outrage_score=0.94,
            bias_score=0.60,
            target_cluster="Hyper-Partisan A"
        ),
        SpoofedArticle(
            headline="Utility Billing Hack: 12 Million Consumer IDs Leaked Following Coordinated Cyber Attack",
            body_text="Compromised utility databases uploaded to dark web breach forums. Customers advised to freeze credit lines immediately.",
            author_name="Grid Defense Monitor",
            author_handle="@GridDefenseEU",
            media_url="https://storage.googleapis.com/infosphere-lab-assets/spoofed/darknet_leak.jpg",
            outrage_score=0.87,
            bias_score=0.10,
            target_cluster="Apolitical Youth"
        ),
    ]
}

PERSONAS = [
    {
        "role": "investigative_journalist",
        "name_pl": "Marek Wiśniewski (Śledczy)",
        "name_en": "Marcus Wisniewski (Investigative)",
        "handle": "@m_wisniewski_press",
        "avatar": "https://storage.googleapis.com/infosphere-lab-assets/avatars/journalist.png"
    },
    {
        "role": "populist_commentator",
        "name_pl": "Janusz Wolnościowy",
        "name_en": "Janusz Freedom Watch",
        "handle": "@janusz_wolny",
        "avatar": "https://storage.googleapis.com/infosphere-lab-assets/avatars/populist.png"
    },
    {
        "role": "civic_activist",
        "name_pl": "Katarzyna Zając (Weryfikacja)",
        "name_en": "Kate Hare (FactCheck Action)",
        "handle": "@kasia_fakt",
        "avatar": "https://storage.googleapis.com/infosphere-lab-assets/avatars/activist.png"
    },
    {
        "role": "energy_engineer",
        "name_pl": "dr inż. Piotr Kowalczyk",
        "name_en": "Dr. Peter Kowalczyk PE",
        "handle": "@dr_kowalczyk_grid",
        "avatar": "https://storage.googleapis.com/infosphere-lab-assets/avatars/engineer.png"
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
                comment_text="Sprawdzam ten 'wyciek'. PSE nie opublikowało takiego dokumentu, a pieczęć w prawym rogu pochodzi ze starego szablonu z 2018 roku. Proszę o powściągliwość przed udostępnieniem.",
                intent_to_amplify=False,
                outrage_score=0.20
            ),
            AgentCommentary(
                sentiment="NEUTRAL",
                stance="UNALIGNED",
                author_name="Marek Wiśniewski (Śledczy)",
                author_handle="@m_wisniewski_press",
                comment_text="Rozmawiam z rzecznikiem Ministerstwa. Zapewniają, że system pracuje w normie, ale czekamy na oficjalny komunikat na konferencji o 11:00.",
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
                comment_text="Mówiłem wam od miesięcy! Zamykają kopalnie, a teraz będą nam wyłączać prąd po nocy! Kupujcie agregaty i świece, bo od tych kłamców nic prawdy się nie dowiecie!",
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
                comment_text="⚠️ FAKE NEWS: Wpis jest elementem skoordynowanej kampanii dezinformacyjnej. PSE nie planuje żadnych rotacyjnych wyłączeń zasilania.",
                intent_to_amplify=False,
                outrage_score=0.15
            )
        ],
        "energy_engineer": [
            AgentCommentary(
                sentiment="NEUTRAL",
                stance="ANTI_DISINFO",
                author_name="dr inż. Piotr Kowalczyk",
                author_handle="@dr_kowalczyk_grid",
                comment_text="Jako inżynier elektroenergetyk: rezerwy wirujące w KSE wynoszą obecnie ponad 2800 MW. Nie ma żadnego zagrożenia stopniami zasilania.",
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
                comment_text="Investigating this alleged memo. Source documents show signs of synthetic formatting. Grid operators deny any pending emergency protocol.",
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
                comment_text="They are lying to protect themselves while freezing regular citizens! Stock up on batteries and fuel right now before it is too late!",
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
                comment_text="⚠️ VERIFIED DISINFORMATION: This alert is completely fabricated. Official monitoring systems show 100% stable frequency and reserves.",
                intent_to_amplify=False,
                outrage_score=0.10
            )
        ],
        "energy_engineer": [
            AgentCommentary(
                sentiment="NEUTRAL",
                stance="ANTI_DISINFO",
                author_name="Dr. Peter Kowalczyk PE",
                author_handle="@dr_kowalczyk_grid",
                comment_text="Grid frequency is holding steady at 50.00 Hz. The claims of impending blackout do not match telemetry from the transmission operator.",
                intent_to_amplify=False,
                outrage_score=0.10
            )
        ]
    }
}

BOT_COMMENTS = {
    "pl": [
        "Potwierdzam, u nas w Radomiu już migają światła!",
        "Rząd znowu kłamie! Wyłączają prąd żeby zatuszować podwyżki!",
        "Udostępniajcie póki nie skasowali! #BlackoutPolska",
        "Wypłacajcie gotówkę z bankomatów, terminale padną za godzinę!",
        "To celowe działanie, chcą nas zmusić do posłuszeństwa!",
        "Moja ciotka pracuje w elektrowni i mówi, że węgiel skończy się do jutra!",
        "Wszyscy na ulice! Dość kłamstw mediów głównego nurtu!",
        "PSE ukrywa prawdę! W Warszawie już gasną latarnie!",
        "Zróbcie zapasy wody i jedzenia, to potrwa co najmniej tydzień!",
        "Kolejny dowód na nieudolność władz! Czas rozliczyć winnych!",
    ],
    "en": [
        "Can confirm, our streetlights in Warsaw suburbs are already flickering!",
        "The government is covering this up! Share before they take this post down! #BlackoutPoland",
        "Withdraw cash from ATMs now before the banking grid goes dark!",
        "My cousin works at the dispatch station and confirmed the coal shortage is real!",
        "Mainstream media is silent as usual! Wake up people!",
        "Stock up on emergency drinking water and canned food immediately!",
        "Deliberate power cuts to force green transition agendas!",
        "Don't trust the official statements, prepare your families!",
    ]
}

CRISIS_INJECTS = {
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
}


class SeedLibrary:
    @staticmethod
    def get_article(language: str = "en", cluster: Optional[str] = None) -> SpoofedArticle:
        lang = "pl" if language.lower() == "pl" else "en"
        articles = SEED_ARTICLES.get(lang, SEED_ARTICLES["en"])
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
    def get_crisis_inject(language: str = "en") -> CrisisInjectPayload:
        lang = "pl" if language.lower() == "pl" else "en"
        return CRISIS_INJECTS.get(lang, CRISIS_INJECTS["en"])
