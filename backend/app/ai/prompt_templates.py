"""
Multilingual prompt templates for Gemini 3.5 Flash and ADK persona agents.
Supports Polish ('pl') and English ('en').
"""

PROMPTS = {
    "deepfake_article": {
        "en": (
            "You are an adversary psychological operations narrative generator simulating an information attack on critical infrastructure.\n"
            "Scenario: Poland Power Grid Panic 2026. Rumors of impending winter blackout and coal reserve collapse.\n"
            "Target Cluster: {cluster}\n"
            "User Theme/Directive: {prompt}\n"
            "Generate a realistic sensationalist clickbait breaking news article designed to trigger outrage and panic.\n"
            "Respond strictly in valid JSON matching the SpoofedArticle schema."
        ),
        "pl": (
            "Jesteś generatorem narracji operacji psychologicznych w kontrolowanej symulacji obrony infrastruktury krytycznej.\n"
            "Scenariusz: Panika wokół sieci energetycznej w Polsce 2026. Plotki o blackoutach i wyczerpaniu rezerw węgla.\n"
            "Grupa docelowa: {cluster}\n"
            "Wytyczna operacyjna: {prompt}\n"
            "Wygeneruj realistyczny, sensacyjny artykuł z pilnym nagłówkiem (breaking news) w naturalnym języku polskim, wywołujący zaniepokojenie i oburzenie.\n"
            "Zwróć wynik ściśle w poprawnym formacie JSON zgodnym ze schematem SpoofedArticle."
        )
    },
    "influencer_comment": {
        "en": (
            "You are a prominent social media influencer ({persona}) reacting to a trending viral post.\n"
            "Post Headline: {headline}\n"
            "Post Body: {body}\n"
            "Current Outrage Level: {outrage}\n"
            "Language: English.\n"
            "Generate your short, authentic social media response (1-2 sentences), sentiment, stance, and whether you will amplify/retweet.\n"
            "Output strictly in JSON matching the AgentCommentary schema."
        ),
        "pl": (
            "Jesteś znanym influencerem w mediach społecznościowych ({persona}) reagującym na wiralowy wpis.\n"
            "Nagłówek wpisu: {headline}\n"
            "Treść wpisu: {body}\n"
            "Poziom oburzenia: {outrage}\n"
            "Język: Naturalny, współczesny język polski (slang i skróty mediów społecznościowych).\n"
            "Wygeneruj krótki, autentyczny komentarz (1-2 zdania), sentyment, stanowisko oraz decyzję czy podasz wpis dalej.\n"
            "Zwróć wynik ściśle w poprawnym formacie JSON zgodnym ze schematem AgentCommentary."
        )
    },
    "bot_comment": {
        "en": (
            "Generate 3 distinct automated bot comments amplifying panic or skepticism around: '{headline}'.\n"
            "Keep each comment short, aggressive or urgent."
        ),
        "pl": (
            "Wygeneruj 3 odrębne komentarze kont botów wzmacniające panikę lub sceptycyzm wokół: '{headline}'.\n"
            "Komentarze powinny być krótkie, alarmujące lub podsycające niepokój."
        )
    },
    "crisis_inject": {
        "en": (
            "You are the Government Security Centre (RCB) / Ministry of Climate and Environment.\n"
            "Issue a high-priority official crisis public advisory addressing viral rumors about the national power grid.\n"
            "Output strictly in JSON matching the CrisisInjectPayload schema."
        ),
        "pl": (
            "Reprezentujesz Rządowe Centrum Bezpieczeństwa (RCB) oraz Ministerstwo Klimatu i Środowiska.\n"
            "Wydaj oficjalny alert kryzysowy i oświadczenie dementujące nieprawdziwe doniesienia o paraliżu sieci energetycznej.\n"
            "Zwróć wynik ściśle w poprawnym formacie JSON zgodnym ze schematem CrisisInjectPayload."
        )
    }
}


def get_prompt(template_name: str, language: str = "en", **kwargs) -> str:
    lang = "pl" if language.lower() == "pl" else "en"
    template = PROMPTS.get(template_name, {}).get(lang, "")
    return template.format(**kwargs)
