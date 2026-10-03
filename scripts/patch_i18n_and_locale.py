#!/usr/bin/env python3
import json
import os
import re

base_dir = "/home/admin_/info"
gen_script_path = os.path.join(base_dir, "scripts", "generate_all_i18n.py")
locale_service_path = os.path.join(base_dir, "frontend", "src", "app", "core", "i18n", "locale.service.ts")
i18n_dir = os.path.join(base_dir, "frontend", "public", "assets", "i18n")

extra_keys = {
    "en": {
        "m2": {
            "preset_refusal_text": "Per corporate treasury security policy ISO-27001, I cannot release any funds without secondary out-of-band voice verification via extension 4401. I am escalating this to the SOC.",
            "preset_compliance_text": "Understood, sending the €48,500 wire confirmation code immediately to the requested protonmail address.",
            "initial_bec_msg": "URGENT [CONFIDENTIAL]: I am in a closed acquisition board meeting. We need an immediate €48,500 escrow transfer to close the vendor lock before 16:00 CET. Do NOT call my mobile—reply here with the payment release code immediately.",
            "initial_mfa_msg": "CRITICAL SOC ALERT: Unusual login detected from Klaipėda. Click https://login-micros0ft-support.com/mfa and enter your 6-digit authenticator code within 3 minutes or your corporate account will be suspended.",
            "no_evidence": "No tool evidence available. Enable tools below the dialogue and send a turn to inspect headers, WHOIS, or callback channels.",
            "points_awarded_banner": "🏆 Drill Passed! +150 Points awarded to your dashboard."
        },
        "m5": {
            "outrage_intensity": "Outrage Intensity",
            "bridging_novelty": "Bridging Novelty",
            "coach_title": "ADK Depolarization Coach Explanation",
            "simulated_stream": "Simulated Feed Stream",
            "dsa_art27": "Article 27: Risk Assessment on Algorithmic Amplification",
            "dsa_art38": "Article 38: Code of Conduct on Disinformation & Media Pluralism",
            "drift_critical": "CRITICAL DRIFT",
            "drift_balanced": "BALANCED MIX",
            "drift_critical_sub": "Viewpoint diversity collapse",
            "drift_balanced_sub": "Healthy civic distribution",
            "drift_warning_desc": "Outrage weighting exceeds bridging diversity threshold. Algorithmic ranking has concentrated feed items into a closed ideological cluster, suppressing empirical counter-evidence.",
            "post_score": "Score",
            "post_rank": "Post"
        }
    },
    "pl": {
        "m2": {
            "preset_refusal_text": "Zgodnie z procedurą bezpieczeństwa ISO-27001 i polityką finansową firmy, nie mogę zrealizować przelewu bez dodatkowej weryfikacji telefonicznej przez centralę (wewn. 4401). Sprawa zostaje przekazana do SOC.",
            "preset_compliance_text": "Zrozumiałem, przesyłam kod autoryzacji przelewu na kwotę 48 500 € niezwłocznie na wskazany adres protonmail.",
            "initial_bec_msg": "PILNE [POUFNE]: Jestem na zamkniętym posiedzeniu zarządu w sprawie przejęcia. Potrzebujemy natychmiastowego przelewu powierniczego na 48 500 € przed 16:00 CET. NIE dzwoń na moją komórkę — odpowiedz tutaj bezpośrednio z kodem autoryzacji płatności.",
            "initial_mfa_msg": "KRYTYCZNY ALERT SOC: Wykryto nietypowe logowanie z Kłajpedy. Wejdź na https://login-micros0ft-support.com/mfa i wprowadź 6-cyfrowy kod z aplikacji uwierzytelniającej w ciągu 3 minut, inaczej Twoje konto firmowe zostanie zawieszone.",
            "no_evidence": "Brak danych telemetrycznych. Aktywuj narzędzia poniżej czatu i wyślij odpowiedź, aby zbadać nagłówki, WHOIS lub kanał weryfikacji.",
            "points_awarded_banner": "🏆 Ćwiczenie zaliczone! +150 punktów dodano do Twojego profilu."
        },
        "m5": {
            "outrage_intensity": "Intensywność oburzenia",
            "bridging_novelty": "Mostkowanie społeczne",
            "coach_title": "Komentarz trenera depolaryzacji ADK",
            "simulated_stream": "Symulowany strumień feedu",
            "dsa_art27": "Artykuł 27: Ocena ryzyka amplifikacji algorytmicznej",
            "dsa_art38": "Artykuł 38: Kodeks postępowania w zakresie dezinformacji i pluralizmu mediów",
            "drift_critical": "KRYTYCZNY DRYF",
            "drift_balanced": "ZRÓWNOWAŻONY MIKS",
            "drift_critical_sub": "Załamanie różnorodności poglądów",
            "drift_balanced_sub": "Zdrowy profil obywatelski",
            "drift_warning_desc": "Waga oburzenia przekracza próg różnorodności mostkującej. Ranking algorytmiczny skoncentrował feed w zamkniętej bańce ideologicznej, tłumiąc dowody empiryczne.",
            "post_score": "Wynik",
            "post_rank": "Wpis"
        }
    },
    "de": {
        "m2": {
            "preset_refusal_text": "Gemäß der Richtlinie ISO-27001 kann ich keine Gelder ohne sekundäre Verifizierung über die Durchwahl 4401 freigeben. Ich leite diesen Vorgang an das SOC weiter.",
            "preset_compliance_text": "Verstanden, ich sende den Freigabecode für die 48.500 € Überweisung sofort an die angegebene Protonmail-Adresse.",
            "initial_bec_msg": "DRINGEND [VERTRAULICH]: Ich befinde mich in einer geschlossenen Vorstandssitzung zur Übernahme. Wir benötigen eine sofortige Treuhandüberweisung von 48.500 € vor 16:00 Uhr CET. Bitte NICHT auf dem Handy anrufen – antworten Sie hier direkt mit dem Freigabecode.",
            "initial_mfa_msg": "KRITISCHER SOC-ALARM: Ungewöhnliche Anmeldung aus Klaipėda festgestellt. Öffnen Sie https://login-micros0ft-support.com/mfa und geben Sie innerhalb von 3 Minuten Ihren 6-stelligen Authenticator-Code ein, andernfalls wird Ihr Firmenkonto gesperrt.",
            "no_evidence": "Keine forensischen Daten verfügbar. Aktivieren Sie die Werkzeuge unterhalb des Dialogs und senden Sie eine Antwort zur Prüfung.",
            "points_awarded_banner": "🏆 Übung bestanden! +150 Punkte für Ihr Dashboard gutgeschrieben."
        },
        "m5": {
            "outrage_intensity": "Empörungsintensität",
            "bridging_novelty": "Brückenbildungs-Neuheit",
            "coach_title": "Erklärung des ADK-Depolarisierungs-Coaches",
            "simulated_stream": "Simulierter Feed-Stream",
            "dsa_art27": "Artikel 27: Risikobewertung algorithmischer Verstärkung",
            "dsa_art38": "Artikel 38: Verhaltenskodex zu Desinformation und Medienpluralismus",
            "drift_critical": "KRITISCHE ABWEICHUNG",
            "drift_balanced": "AUSGEWOGENER MIX",
            "drift_critical_sub": "Zusammenbruch der Meinungsvielfalt",
            "drift_balanced_sub": "Gesunde bürgerliche Verteilung",
            "drift_warning_desc": "Das Empörungsgewicht überschreitet die Schwelle zur Brückenbildung. Das algorithmische Ranking hat Beiträge in einem geschlossenen ideologischen Cluster gebündelt und empirische Gegenbeweise unterdrückt.",
            "post_score": "Score",
            "post_rank": "Beitrag"
        }
    },
    "uk": {
        "m2": {
            "preset_refusal_text": "Згідно з політикою безпеки ISO-27001, я не можу переказати кошти без вторинної перевірки за внутрішнім номером 4401. Передаю запит до SOC.",
            "preset_compliance_text": "Зрозуміло, негайно надсилаю код підтвердження переказу на 48 500 € на вказану адресу protonmail.",
            "initial_bec_msg": "ТЕРМІНОВО [КОНФІДЕНЦІЙНО]: Я перебуваю на закритому засіданні ради директорів щодо поглинання компанії. Нам потрібен негайний переказ 48 500 € на ескроу-рахунок до 16:00 CET. НЕ телефонуйте мені на мобільний — надішліть код підтвердження платежу сюди негайно.",
            "initial_mfa_msg": "КРИТИЧНИЙ АЛЕРТ SOC: Виявлено підозрілий вхід із Клайпеди. Перейдіть за посиланням https://login-micros0ft-support.com/mfa та введіть 6-значний код автентифікатора протягом 3 хвилин, інакше корпоративний обліковий запис буде заблоковано.",
            "no_evidence": "Немає форензік-даних. Увімкніть інструменти під діалогом і надішліть відповідь для перевірки заголовків, WHOIS або дзвінка.",
            "points_awarded_banner": "🏆 Навчання пройдено! +150 балів нараховано на ваш дашборд."
        },
        "m5": {
            "outrage_intensity": "Рівень обурення",
            "bridging_novelty": "Міжгрупові мости",
            "coach_title": "Пояснення коуча з деполяризації ADK",
            "simulated_stream": "Симульований потік стрічки",
            "dsa_art27": "Стаття 27: Оцінка ризиків алгоритмічного посилення",
            "dsa_art38": "Стаття 38: Кодекс поведінки щодо дезінформації та плюралізму медіа",
            "drift_critical": "КРИТИЧНИЙ ДРЕЙФ",
            "drift_balanced": "ЗБАЛАНСОВАНИЙ МІКС",
            "drift_critical_sub": "Втрата різноманітності поглядів",
            "drift_balanced_sub": "Здоровий громадський розподіл",
            "drift_warning_desc": "Вага обурення перевищує поріг міжгрупових мостів. Алгоритмічне ранжування сконцентрувало дописи в закритій ідеологічній бульбашці, придушуючи емпіричні факти.",
            "post_score": "Оцінка",
            "post_rank": "Допис"
        }
    }
}

# Update json files
for code in ["en", "pl", "de", "uk"]:
    json_path = os.path.join(i18n_dir, f"{code}.json")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for section, keys in extra_keys[code].items():
        if section not in data:
            data[section] = {}
        for k, v in keys.items():
            data[section][k] = v
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Updated {json_path}")

# Now update locale.service.ts embedded dictionaries
with open(locale_service_path, "r", encoding="utf-8") as f:
    ts_code = f.read()

# Load all 4 json files to embed
with open(os.path.join(i18n_dir, "en.json"), "r", encoding="utf-8") as f:
    en_dict = json.load(f)
with open(os.path.join(i18n_dir, "pl.json"), "r", encoding="utf-8") as f:
    pl_dict = json.load(f)
with open(os.path.join(i18n_dir, "de.json"), "r", encoding="utf-8") as f:
    de_dict = json.load(f)
with open(os.path.join(i18n_dir, "uk.json"), "r", encoding="utf-8") as f:
    uk_dict = json.load(f)

# Find where CORE_DICTIONARY_EN starts and where CORE_DICTIONARY_UK ends
header = ts_code[:ts_code.index("export const CORE_DICTIONARY_EN: Record<string, any> = ")]
footer = ts_code[ts_code.index("@Injectable({"):]

new_ts = header + f"""export const CORE_DICTIONARY_EN: Record<string, any> = {json.dumps(en_dict, indent=2, ensure_ascii=False)};

export const CORE_DICTIONARY_PL: Record<string, any> = {json.dumps(pl_dict, indent=2, ensure_ascii=False)};

export const CORE_DICTIONARY_DE: Record<string, any> = {json.dumps(de_dict, indent=2, ensure_ascii=False)};

export const CORE_DICTIONARY_UK: Record<string, any> = {json.dumps(uk_dict, indent=2, ensure_ascii=False)};

""" + footer

with open(locale_service_path, "w", encoding="utf-8") as f:
    f.write(new_ts)
print(f"Updated {locale_service_path}")
