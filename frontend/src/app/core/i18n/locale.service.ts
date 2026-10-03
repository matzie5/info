import { Injectable, signal, computed, Pipe, PipeTransform, inject } from '@angular/core';

export type LanguageCode = string;

export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
  nativeName: string;
}

export const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: 'pl', label: 'Polski', flag: '🇵🇱', nativeName: 'Polski' },
  { code: 'en', label: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', nativeName: 'Українська' }
];

export const CORE_DICTIONARY_EN: Record<string, any> = {
  app: {
    title: 'Infosphere Lab',
    subtitle: 'Digital Hygiene & Cognitive Defense Platform',
    version_tag: 'INFOSPHERE v3.0',
    classroom_view: 'Classroom View',
    arena_view: 'Arena View',
    admin_view: 'Facilitator HUD',
    debrief_view: 'Debrief'
  },
  theme: {
    toggle: 'Toggle Theme',
    dark: 'Dark Mode',
    light: 'Light Mode',
    switch_to_light: 'Switch to Light Theme',
    switch_to_dark: 'Switch to Dark Theme'
  },
  lang: {
    select: 'Select Language',
    current: 'Language'
  },
  nav: {
    m1_disinfo: 'M1: Disinfo ABM',
    m2_scam: 'M2: Scam Lab (Vertex + DeepSeek)',
    m3_deepfake: 'M3: Deepfake Forensics',
    m4_osint: 'M4: OSINT & DLP',
    m5_echo: 'M5: Echo Chamber',
    passport_label: 'Hygiene Passport',
    arena: 'Arena',
    pulse: 'Pulse Feed',
    radar: 'Contagion Radar',
    hud: 'Master HUD',
    debrief: 'Debrief',
    classroom: 'Classroom',
    language: 'Language',
    tutorial: 'Field Manual'
  },
  passport: {
    title: 'Digital Hygiene Passport',
    overall_index: 'Overall Hygiene Index',
    maturity_tier: 'Maturity Tier',
    export_stix: 'Export STIX 2.1 Bundle',
    tier_NOVICE_TARGET: 'Novice Target',
    tier_AWARE_OPERATOR: 'Aware Operator',
    tier_RESILIENT_DEFENDER: 'Resilient Defender',
    tier_STRATEGIC_ANALYST: 'Strategic Analyst',
    tier_ADAPTIVE_SENTINEL: 'Adaptive Sentinel'
  },
  m2: {
    title: 'Generative Social Engineering & Scam Resilience Lab',
    subtitle: 'Interactive multi-turn attack simulation using Google ADK & Pluggable LLMs (Vertex AI Gemini & DeepSeek)',
    model_selector: 'Adversary Model',
    scenario_label: 'Attack Scenario',
    scenario_bec: 'CEO Urgent Wire Transfer (BEC)',
    scenario_aitm: 'Adversary-in-the-Middle (AiTM) M365 Login',
    start_drill: 'Start New Drill',
    initializing: 'Initializing Drill Session...',
    turn: 'Turn',
    escalation_level: 'Escalation Level',
    telemetry_tools: 'ADK Forensic Countermeasure Tools',
    tool_inspect_headers: 'Inspect Email Headers',
    tool_lookup_whois: 'Lookup Domain WHOIS',
    tool_out_of_band: 'Verify Out-of-Band Callback',
    your_response: 'Your Tactical Response / Action',
    response_placeholder: 'Type your response to the attacker or describe verification actions taken...',
    submit_turn: 'Submit Turn',
    submitting: 'Processing Turn with Multi-Agent Evaluation...',
    telemetry_evidence: 'Forensic Telemetry Evidence Cards',
    coach_evaluation: 'AI Coach Tactical Resilience Evaluation',
    resilience_score: 'Resilience Score',
    tactical_flaws: 'Identified Vulnerabilities & Mistakes',
    recommended_actions: 'Recommended Next Actions',
    grounding_citations: 'Authoritative Cybersecurity Grounding Citations',
    empty_dialogue: 'Start a drill session to begin interactive multi-turn defense against advanced phishing personas.'
  },
  m3: {
    title: 'Deepfake & Synthetic Media Literacy Lab',
    subtitle: 'Multimodal forensic workbench: C2PA manifests, Google SynthID, and ADK sequential agents',
    catalog_title: 'Forensic Media Sample Catalog',
    inspect_sample: 'Inspect Sample',
    inspecting: 'Executing 3-Stage SequentialAgent Pipeline...',
    c2pa_status: 'C2PA Cryptographic Provenance Manifest',
    synthid_status: 'Google SynthID Imperceptible Watermark',
    synthid_detected: 'Google SynthID Watermark Detected',
    synthid_none: 'No SynthID Watermark Found',
    stage1_visual: 'Stage 1: Visual Artifact Inspection',
    stage2_audio: 'Stage 2: Audio Clone & Spectrogram Analysis',
    stage3_explainer: 'Stage 3: Forensic Summary & Explainer',
    confidence_gauge: 'Forensic Detection Confidence',
    observed_markers: 'Observed Anomaly Markers',
    sample_select_hint: 'Select a media sample from the catalog to run multi-agent forensic verification.'
  },
  m4: {
    title: 'OSINT & Exposure Management Lab',
    subtitle: 'Simulate adversary reconnaissance, detect leaked PII, and apply automated DLP redaction',
    presets_label: 'Profile Presets',
    preset_scada: 'Critical SCADA Grid Engineer',
    preset_cloud: 'Corporate Cloud Infrastructure Admin',
    preset_hardened: 'Hardened Persona',
    footprint_label: 'Public Digital Footprint / Bio',
    footprint_placeholder: 'Paste social media bio, resume snippets, public directory info...',
    analyze_btn: 'Analyze Exposure & Remediate',
    analyzing: 'Harvesting Profile & Running DLP Guardrail Pipeline...',
    discovered_pii: 'Discovered Sensitive PII Tokens',
    total_redactions: 'Total Redacted Fields',
    risk_score: 'Exposure Risk Score',
    resilience_score: 'Hygiene Resilience Score',
    pretext_warning: 'Simulated Attacker Spear-Phishing Pretext',
    sanitized_profile: 'DLP-Remediated Public Footprint',
    remediation_checklist: 'Remediation Action Checklist',
    citations: 'Authoritative Normative Citations'
  },
  m5: {
    title: 'Algorithmic Manipulation & Echo Chamber Lab',
    subtitle: 'Tune recommender hyperparameters, observe Shannon Entropy drift, and audit EU DSA Art. 27/38',
    presets_label: 'Algorithm Presets',
    preset_viral: 'Viral Outrage Trap',
    preset_bridge: 'Civic Bridge Recommender',
    preset_empirical: 'Empirical Focus',
    weight_outrage: 'Outrage Amplification Weight',
    weight_affinity: 'Ideological Affinity Weight',
    weight_diversity: 'Bridging Diversity Weight',
    simulate_btn: 'Re-Rank Feed & Simulate',
    simulating: 'Computing Vector Similarities & Viewpoint Entropy...',
    shannon_entropy: 'Shannon Viewpoint Entropy',
    echo_radius: 'Echo-Chamber Radius',
    autonomy_score: 'Cognitive Autonomy Score',
    polarization_alert: 'POLARIZATION DRIFT DETECTED',
    polarization_desc: 'Current parameters concentrate extreme ideological affinity, collapsing diversity below safety thresholds.',
    ranked_feed: 'Ranked Social Feed Preview',
    coach_commentary: 'ADK Depolarization Coach Commentary',
    dsa_compliance: 'EU Digital Services Act (DSA) Art. 27 & 38 Guidance'
  }
};

export const CORE_DICTIONARY_PL: Record<string, any> = {
  app: {
    title: 'Infosphere Lab',
    subtitle: 'Platforma Higieny Cyfrowej i Obrony Poznawczej',
    version_tag: 'INFOSPHERE v3.0',
    classroom_view: 'Widok Sali',
    arena_view: 'Widok Areny',
    admin_view: 'Panel Moderatora',
    debrief_view: 'Podsumowanie'
  },
  theme: {
    toggle: 'Przełącz Motyw',
    dark: 'Tryb Ciemny',
    light: 'Tryb Jasny',
    switch_to_light: 'Przełącz na Jasny Motyw',
    switch_to_dark: 'Przełącz na Ciemny Motyw'
  },
  lang: {
    select: 'Wybierz Język',
    current: 'Język'
  },
  nav: {
    m1_disinfo: 'M1: Dezinformacja ABM',
    m2_scam: 'M2: Laboratorium Socjotechniki (Vertex + DeepSeek)',
    m3_deepfake: 'M3: Forensyka Deepfake',
    m4_osint: 'M4: OSINT i Ochrona Danych',
    m5_echo: 'M5: Bańki Informacyjne',
    passport_label: 'Paszport Higieny',
    arena: 'Arena',
    pulse: 'Feed Społecznościowy Pulse',
    radar: 'Radar Zarażania',
    hud: 'Konsola Główna (HUD)',
    debrief: 'Podsumowanie',
    classroom: 'Widok Sali',
    language: 'Język',
    tutorial: 'Instrukcja Operacyjna'
  },
  passport: {
    title: 'Paszport Higieny Cyfrowej',
    overall_index: 'Ogólny Wskaźnik Higieny',
    maturity_tier: 'Poziom Dojrzałości',
    export_stix: 'Eksportuj Pakiet STIX 2.1',
    tier_NOVICE_TARGET: 'Początkujący Cel',
    tier_AWARE_OPERATOR: 'Świadomy Operator',
    tier_RESILIENT_DEFENDER: 'Odporny Obrońca',
    tier_STRATEGIC_ANALYST: 'Strategiczny Analityk',
    tier_ADAPTIVE_SENTINEL: 'Adaptacyjny Strażnik'
  },
  m2: {
    title: 'Laboratorium Socjotechniki i Odporności na Phishing',
    subtitle: 'Interaktywna symulacja ataków wieloturowych z użyciem Google ADK i modeli LLM (Vertex AI Gemini & DeepSeek)',
    model_selector: 'Model Przeciwnika',
    scenario_label: 'Scenariusz Ataku',
    scenario_bec: 'Pilny Przelew od Prezesa (BEC)',
    scenario_aitm: 'Przechwycenie Sesji M365 (AiTM)',
    start_drill: 'Rozpocznij Nowe Ćwiczenie',
    initializing: 'Inicjalizacja Sesji Ćwiczeniowej...',
    turn: 'Tura',
    escalation_level: 'Poziom Eskalacji',
    telemetry_tools: 'Narzędzia Śledcze ADK',
    tool_inspect_headers: 'Analiza Nagłówków Email',
    tool_lookup_whois: 'Weryfikacja Domeny WHOIS',
    tool_out_of_band: 'Weryfikacja Pozakanałowa (Telefon)',
    your_response: 'Twoja Odpowiedź Taktyczna / Działanie',
    response_placeholder: 'Wpisz swoją odpowiedź do napastnika lub opisz podjęte działania weryfikacyjne...',
    submit_turn: 'Wykonaj Ruch',
    submitting: 'Przetwarzanie Ruchu przez Zespół Agentów Oceniających...',
    telemetry_evidence: 'Dowody Śledcze Telemetrii',
    coach_evaluation: 'Ocena Taktyczna Trenera AI',
    resilience_score: 'Wskaźnik Odporności',
    tactical_flaws: 'Zidentyfikowane Podatności i Błędy',
    recommended_actions: 'Rekomendowane Dalsze Działania',
    grounding_citations: 'Zweryfikowane Źródła Normatywne i Standardy Bezpieczeństwa',
    empty_dialogue: 'Rozpocznij ćwiczenie, aby przejść przez interaktywny trening obrony przed zaawansowaną socjotechniką.'
  },
  m3: {
    title: 'Laboratorium Rozpoznawania Deepfake i Mediów Syntetycznych',
    subtitle: 'Multimodalna stacja forensyki: manifesty C2PA, Google SynthID i sekwencyjni agenci ADK',
    catalog_title: 'Katalog Próbek Śledczych',
    inspect_sample: 'Zbadaj Próbkę',
    inspecting: 'Uruchamianie 3-Etapowej Analizy SequentialAgent...',
    c2pa_status: 'Kryptograficzny Manifest Pochodzenia C2PA',
    synthid_status: 'Niewidoczny Znak Wodny Google SynthID',
    synthid_detected: 'Wykryto Znak Wodny Google SynthID',
    synthid_none: 'Brak Znaku Wodnego SynthID',
    stage1_visual: 'Krok 1: Analiza Artefaktów Wizualnych',
    stage2_audio: 'Krok 2: Analiza Klonowania Głosu i Spektrogramu',
    stage3_explainer: 'Krok 3: Ekspertyza Śledcza i Wnioski Obronne',
    confidence_gauge: 'Pewność Oceny Śledczej',
    observed_markers: 'Zidentyfikowane Znaczniki Anomalii',
    sample_select_hint: 'Wybierz próbkę z katalogu, aby uruchomić wieloagentową analizę śledczą.'
  },
  m4: {
    title: 'Laboratorium Zarządzania Ekspozycją OSINT i Ochrony Danych',
    subtitle: 'Symuluj rekonesans przeciwnika, wykrywaj wycieki PII i stosuj automatyczną redakcję DLP',
    presets_label: 'Profile Wzorcowe',
    preset_scada: 'Inżynier Krytycznej Sieci SCADA',
    preset_cloud: 'Administrator Chmury Korporacyjnej',
    preset_hardened: 'Wzmocniona Tożsamość Cyfrowa',
    footprint_label: 'Publiczny Ślad Cyfrowy / Biogram',
    footprint_placeholder: 'Wklej biogram z mediów społecznościowych, fragment CV lub profil zawodowy...',
    analyze_btn: 'Analizuj Ekspozycję i Zastosuj DLP',
    analyzing: 'Trwa Analiza OSINT i Redakcja DLP...',
    discovered_pii: 'Zidentyfikowane Dane Wrażliwe (PII)',
    total_redactions: 'Łączna Liczba Zredagowanych Pól',
    risk_score: 'Wskaźnik Ryzyka Ekspozycji',
    resilience_score: 'Wskaźnik Odporności Higieny',
    pretext_warning: 'Symulowany Pretekst Ataku Spear-Phishingowego',
    sanitized_profile: 'Profil Publiczny po Redakcji DLP',
    remediation_checklist: 'Lista Zadań Naprawczych',
    citations: 'Zweryfikowane Źródła Normatywne (NIST / ENISA)'
  },
  m5: {
    title: 'Laboratorium Manipulacji Algorytmicznej i Baniek Informacyjnych',
    subtitle: 'Dostrajaj wagi algorytmu, obserwuj dryf entropii Shannona i audytuj zgodność z Aktem o Usługach Cyfrowych (DSA)',
    presets_label: 'Profile Konfiguracyjne Algorytmu',
    preset_viral: 'Pułapka Wiralowa (Maksymalizacja Oburzenia)',
    preset_bridge: 'Rekomendacja Mostów Społecznych',
    preset_empirical: 'Fokus Empiryczno-Techniczny',
    weight_outrage: 'Waga Wzmacniania Oburzenia',
    weight_affinity: 'Waga Afiliacji Ideologicznej',
    weight_diversity: 'Waga Różnorodności Mostów',
    simulate_btn: 'Przelicz Ranking i Symuluj Feed',
    simulating: 'Obliczanie Podobieństw Wektorowych i Entropii Shannona...',
    shannon_entropy: 'Entropia Punktów Widzenia Shannona',
    echo_radius: 'Promień Bańki Informacyjnej',
    autonomy_score: 'Wskaźnik Autonomii Poznawczej',
    polarization_alert: 'WYKRYTO NIEBEZPIECZNY DRYF POLARYZACJI',
    polarization_desc: 'Obecna konfiguracja koncentruje skrajne powinowactwo ideologiczne, obniżając różnorodność poniżej bezpiecznych progów.',
    ranked_feed: 'Wynikowy Feed po Przeliczeniu Wag',
    coach_commentary: 'Komentarz Trenera Depolaryzacji ADK',
    dsa_compliance: 'Zgodność z Aktem o Usługach Cyfrowych (EU DSA Art. 27 & 38)'
  }
};

@Injectable({
  providedIn: 'root'
})
export class LocaleService {
  private registeredLanguages = signal<LanguageOption[]>(DEFAULT_LANGUAGES);
  private currentLangCode = signal<string>('pl');
  private translationsMap = signal<Record<string, Record<string, any>>>({
    en: CORE_DICTIONARY_EN,
    pl: CORE_DICTIONARY_PL
  });

  public readonly language = computed(() => this.currentLangCode());
  public readonly availableLanguages = computed(() => this.registeredLanguages());
  public readonly currentLanguageOption = computed(() => {
    const code = this.currentLangCode();
    return this.registeredLanguages().find(l => l.code === code) || this.registeredLanguages()[0];
  });

  constructor() {
    this.initLanguage();
  }

  private initLanguage(): void {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('infosphere_lang');
      if (saved) {
        this.currentLangCode.set(saved);
      } else {
        // Detect browser language, default to en for broad compatibility
        const browserLang = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').toLowerCase().split('-')[0];
        const match = this.registeredLanguages().find(l => l.code === browserLang);
        this.currentLangCode.set(match ? match.code : 'en');
      }
    } catch (e) {
      this.currentLangCode.set('en');
    }

    // Attempt to load external JSON files asynchronously to augment embedded dictionary
    this.loadExternalDictionary(this.currentLangCode());
  }

  public registerLanguage(lang: LanguageOption, dictionary?: Record<string, any>): void {
    const existing = this.registeredLanguages();
    if (!existing.some(l => l.code === lang.code)) {
      this.registeredLanguages.set([...existing, lang]);
    }
    if (dictionary) {
      const currentMap = this.translationsMap();
      this.translationsMap.set({
        ...currentMap,
        [lang.code]: { ...(currentMap[lang.code] || {}), ...dictionary }
      });
    }
  }

  public setLanguage(code: string): void {
    this.currentLangCode.set(code);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('infosphere_lang', code);
      } catch (e) {
        console.warn('LocalStorage unavailable for language persistence', e);
      }
    }
    this.loadExternalDictionary(code);
  }

  private async loadExternalDictionary(code: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const resp = await fetch(`/assets/i18n/${code}.json`);
      if (resp.ok) {
        const data = await resp.json();
        const currentMap = this.translationsMap();
        this.translationsMap.set({
          ...currentMap,
          [code]: this.deepMerge(currentMap[code] || {}, data)
        });
      }
    } catch (e) {
      // Quietly continue with embedded dictionary
    }
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (source && typeof source === 'object') {
      for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          output[key] = this.deepMerge(output[key] || {}, source[key]);
        } else {
          output[key] = source[key];
        }
      }
    }
    return output;
  }

  public t(path: string, params?: Record<string, string | number>): string {
    const lang = this.currentLangCode();
    const map = this.translationsMap();
    const dict = map[lang] || map['en'] || CORE_DICTIONARY_EN;

    let val = this.resolvePath(dict, path);

    // Fallback to English if not found in current dictionary
    if (val === undefined && lang !== 'en') {
      val = this.resolvePath(map['en'] || CORE_DICTIONARY_EN, path);
    }

    if (val === undefined) {
      return path;
    }

    let result = typeof val === 'string' ? val : String(val);

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
      }
    }

    return result;
  }

  private resolvePath(dict: Record<string, any>, path: string): any {
    if (!dict) return undefined;
    const parts = path.split('.');
    let curr: any = dict;
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        return undefined;
      }
    }
    return curr;
  }
}

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private locale = inject(LocaleService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.locale.t(key, params);
  }
}
