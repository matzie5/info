// frontend/src/app/core/audience/audience.service.ts
import { Injectable, computed, signal } from '@angular/core';

export type AudienceMode = 'professional' | 'kids' | 'seniors';

export interface TailoredModuleContent {
  city_name: string;
  audience_mode: AudienceMode;
  language: string;
  local_mayor_or_leader: string;
  local_water_or_utility: string;
  local_official_portal: string;
  local_institution: string;
  m1_scenario_id: string;
  m1_title_en: string;
  m1_title_pl: string;
  m1_starter_headline_en: string;
  m1_starter_headline_pl: string;
  m1_spoofed_article_headline_en: string;
  m1_spoofed_article_headline_pl: string;
  m1_official_inject_en: string;
  m1_official_inject_pl: string;
  m2_scenario_id: string;
  m2_scam_title_en: string;
  m2_scam_title_pl: string;
  m2_initial_message_en: string;
  m2_initial_message_pl: string;
  m2_spoofed_sender: string;
  m2_verification_channel: string;
  m3_sample_id: string;
  m3_sample_title: string;
  m3_forensic_markers: string[];
  m4_preset_bio: string;
  m5_echo_headlines: string[];
  generated_at: number;
}

const MODE_KEY = 'infosphere_audience_mode';
const LOCATION_KEY = 'infosphere_location_name';
const PREP_SESSION_KEY = 'infosphere_prepared_session_id';
const TAILORED_ENV_KEY = 'infosphere_tailored_env';

@Injectable({
  providedIn: 'root',
})
export class AudienceService {
  readonly mode = signal<AudienceMode>(this.loadInitialMode());
  readonly locationName = signal<string | null>(this.loadString(LOCATION_KEY));
  readonly preparedSessionId = signal<string | null>(this.loadString(PREP_SESSION_KEY));
  readonly tailoredEnvironment = signal<TailoredModuleContent | null>(this.loadTailoredEnv());

  readonly isProfessional = computed(() => this.mode() === 'professional');
  readonly isKids = computed(() => this.mode() === 'kids');
  readonly isSeniors = computed(() => this.mode() === 'seniors');

  readonly activeLocationName = computed(
    () => this.locationName() || this.tailoredEnvironment()?.city_name || null
  );

  private loadInitialMode(): AudienceMode {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(MODE_KEY) as AudienceMode | null;
      if (saved === 'professional' || saved === 'kids' || saved === 'seniors') {
        return saved;
      }
    }
    return 'professional';
  }

  private loadString(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) || null;
    }
    return null;
  }

  private loadTailoredEnv(): TailoredModuleContent | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(TAILORED_ENV_KEY);
      if (raw) {
        try {
          return JSON.parse(raw) as TailoredModuleContent;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  setMode(newMode: AudienceMode): void {
    this.mode.set(newMode);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MODE_KEY, newMode);
    }
  }

  applyCohortEnvironment(cohort: any): void {
    if (!cohort) return;
    if (
      cohort.audience_mode === 'professional' ||
      cohort.audience_mode === 'kids' ||
      cohort.audience_mode === 'seniors'
    ) {
      this.setMode(cohort.audience_mode);
    }
    if (cohort.location_name !== undefined) {
      this.locationName.set(cohort.location_name || null);
      if (typeof window !== 'undefined' && window.localStorage) {
        if (cohort.location_name) {
          window.localStorage.setItem(LOCATION_KEY, cohort.location_name);
        } else {
          window.localStorage.removeItem(LOCATION_KEY);
        }
      }
    }
    if (cohort.prepared_session_id !== undefined) {
      this.preparedSessionId.set(cohort.prepared_session_id || null);
      if (typeof window !== 'undefined' && window.localStorage) {
        if (cohort.prepared_session_id) {
          window.localStorage.setItem(PREP_SESSION_KEY, cohort.prepared_session_id);
        } else {
          window.localStorage.removeItem(PREP_SESSION_KEY);
        }
      }
    }
    if (cohort.tailored_environment) {
      this.tailoredEnvironment.set(cohort.tailored_environment);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          TAILORED_ENV_KEY,
          JSON.stringify(cohort.tailored_environment)
        );
      }
    }
  }
}
