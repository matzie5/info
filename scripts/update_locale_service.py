#!/usr/bin/env python3
import json
import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
i18n_dir = os.path.join(base_dir, "frontend", "public", "assets", "i18n")

with open(os.path.join(i18n_dir, "en.json"), encoding="utf-8") as f:
    en = json.load(f)
with open(os.path.join(i18n_dir, "pl.json"), encoding="utf-8") as f:
    pl = json.load(f)
with open(os.path.join(i18n_dir, "de.json"), encoding="utf-8") as f:
    de = json.load(f)
with open(os.path.join(i18n_dir, "uk.json"), encoding="utf-8") as f:
    uk = json.load(f)

locale_ts_path = os.path.join(base_dir, "frontend", "src", "app", "core", "i18n", "locale.service.ts")

content = f"""import {{ Injectable, signal, computed, Pipe, PipeTransform, inject, ApplicationRef }} from '@angular/core';

export type LanguageCode = string;

export interface LanguageOption {{
  code: string;
  label: string;
  flag: string;
  nativeName: string;
}}

export const DEFAULT_LANGUAGES: LanguageOption[] = [
  {{ code: 'pl', label: 'Polski', flag: '🇵🇱', nativeName: 'Polski' }},
  {{ code: 'en', label: 'English', flag: '🇬🇧', nativeName: 'English' }},
  {{ code: 'de', label: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' }},
  {{ code: 'uk', label: 'Українська', flag: '🇺🇦', nativeName: 'Українська' }}
];

export const CORE_DICTIONARY_EN: Record<string, any> = {json.dumps(en, indent=2, ensure_ascii=False)};

export const CORE_DICTIONARY_PL: Record<string, any> = {json.dumps(pl, indent=2, ensure_ascii=False)};

export const CORE_DICTIONARY_DE: Record<string, any> = {json.dumps(de, indent=2, ensure_ascii=False)};

export const CORE_DICTIONARY_UK: Record<string, any> = {json.dumps(uk, indent=2, ensure_ascii=False)};

@Injectable({{
  providedIn: 'root'
}})
export class LocaleService {{
  private appRef = inject(ApplicationRef);
  private registeredLanguages = signal<LanguageOption[]>(DEFAULT_LANGUAGES);
  private currentLangCode = signal<string>('pl');
  private translationsMap = signal<Record<string, Record<string, any>>>({{
    en: CORE_DICTIONARY_EN,
    pl: CORE_DICTIONARY_PL,
    de: CORE_DICTIONARY_DE,
    uk: CORE_DICTIONARY_UK
  }});

  public readonly language = computed(() => this.currentLangCode());
  public readonly languages = computed(() => this.registeredLanguages());

  constructor() {{
    this.initLanguage();
  }}

  private initLanguage(): void {{
    if (typeof window === 'undefined') return;

    try {{
      const saved = localStorage.getItem('infosphere_lang');
      if (saved && this.registeredLanguages().some(l => l.code === saved)) {{
        this.currentLangCode.set(saved);
      }} else {{
        const browserLang = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').toLowerCase().split('-')[0];
        const match = this.registeredLanguages().find(l => l.code === browserLang);
        this.currentLangCode.set(match ? match.code : 'en');
      }}
    }} catch (e) {{
      this.currentLangCode.set('en');
    }}

    this.loadExternalDictionary(this.currentLangCode());
  }}

  public registerLanguage(lang: LanguageOption, dictionary?: Record<string, any>): void {{
    const current = this.registeredLanguages();
    if (!current.some(l => l.code === lang.code)) {{
      this.registeredLanguages.set([...current, lang]);
    }}
    if (dictionary) {{
      const currentMap = this.translationsMap();
      this.translationsMap.set({{
        ...currentMap,
        [lang.code]: this.deepMerge(currentMap[lang.code] || {{}}, dictionary)
      }});
    }}
  }}

  public setLanguage(code: string): void {{
    this.currentLangCode.set(code);
    if (typeof window !== 'undefined') {{
      try {{
        localStorage.setItem('infosphere_lang', code);
      }} catch (e) {{
        console.warn('LocalStorage unavailable for language persistence', e);
      }}
    }}
    this.loadExternalDictionary(code);
    try {{
      this.appRef.tick();
    }} catch (e) {{
      // Ignore tick error in background/test scenarios
    }}
  }}

  private async loadExternalDictionary(code: string): Promise<void> {{
    if (typeof window === 'undefined') return;

    try {{
      const resp = await fetch(`/assets/i18n/${{code}}.json`);
      if (resp.ok) {{
        const data = await resp.json();
        const currentMap = this.translationsMap();
        this.translationsMap.set({{
          ...currentMap,
          [code]: this.deepMerge(currentMap[code] || {{}}, data)
        }});
        try {{
          this.appRef.tick();
        }} catch (e) {{}}
      }}
    }} catch (e) {{
      // Embedded dictionary is already complete
    }}
  }}

  private deepMerge(target: any, source: any): any {{
    const output = {{ ...target }};
    if (source && typeof source === 'object') {{
      for (const key of Object.keys(source)) {{
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {{
          output[key] = this.deepMerge(output[key] || {{}}, source[key]);
        }} else {{
          output[key] = source[key];
        }}
      }}
    }}
    return output;
  }}

  public t(path: string, params?: Record<string, string | number>): string {{
    const lang = this.currentLangCode();
    const map = this.translationsMap();
    const dict = map[lang] || map['en'] || CORE_DICTIONARY_EN;

    let val = this.resolvePath(dict, path);

    // Fallback to English if not found in current dictionary
    if (val === undefined && lang !== 'en') {{
      val = this.resolvePath(map['en'] || CORE_DICTIONARY_EN, path);
    }}

    if (val === undefined) {{
      return path;
    }}

    let result = typeof val === 'string' ? val : String(val);

    if (params) {{
      for (const [k, v] of Object.entries(params)) {{
        result = result.replace(new RegExp(`{{\\\\s*${{k}}\\\\s*}}`, 'g'), String(v));
      }}
    }}

    return result;
  }}

  private resolvePath(dict: Record<string, any>, path: string): any {{
    if (!dict) return undefined;
    const parts = path.split('.');
    let curr: any = dict;
    for (const p of parts) {{
      if (curr && typeof curr === 'object' && p in curr) {{
        curr = curr[p];
      }} else {{
        return undefined;
      }}
    }}
    return curr;
  }}
}}

@Pipe({{
  name: 'translate',
  standalone: true,
  pure: false
}})
export class TranslatePipe implements PipeTransform {{
  private locale = inject(LocaleService);

  transform(key: string, params?: Record<string, string | number>): string {{
    return this.locale.t(key, params);
  }}
}}
"""

with open(locale_ts_path, "w", encoding="utf-8") as f:
    f.write(content)
print(f"Wrote {locale_ts_path} ({len(content)} bytes)")
