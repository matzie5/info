import { Injectable, signal, computed } from '@angular/core';

export type LanguageCode = 'en' | 'pl';

@Injectable({
  providedIn: 'root'
})
export class LocaleService {
  private currentLang = signal<LanguageCode>('pl');
  private translations = signal<Record<string, any>>({});

  public readonly language = computed(() => this.currentLang());

  constructor() {
    const saved = localStorage.getItem('infosphere_lang') as LanguageCode;
    if (saved === 'en' || saved === 'pl') {
      this.currentLang.set(saved);
    }
    this.loadDictionary(this.currentLang());
  }

  public setLanguage(lang: LanguageCode) {
    this.currentLang.set(lang);
    localStorage.setItem('infosphere_lang', lang);
    this.loadDictionary(lang);
  }

  private async loadDictionary(lang: LanguageCode) {
    try {
      const resp = await fetch(`/assets/i18n/${lang}.json`);
      if (resp.ok) {
        const data = await resp.json();
        this.translations.set(data);
      }
    } catch (e) {
      console.warn(`Could not load translations for ${lang}, using fallback`, e);
    }
  }

  public t(path: string): string {
    const dict = this.translations();
    const parts = path.split('.');
    let curr: any = dict;
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        return path; // Fallback to key
      }
    }
    return typeof curr === 'string' ? curr : path;
  }
}
