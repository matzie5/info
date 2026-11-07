import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ClonedWebsiteData {
  original_url?: string;
  real_domain?: string;
  spoofed_url?: string;
  spoofed_domain?: string;
  brand_name?: string;
  logo_text?: string;
  primary_color?: string;
  accent_color?: string;
  nav_links?: string[];
  alert_title?: string;
  alert_body?: string;
  cta_label?: string;
  countdown_seconds?: number;
  ssl_details?: {
    issuer?: string;
    valid?: boolean;
    reason?: string;
  };
  comparison?: {
    real_domain?: string;
    fake_domain?: string;
    real_features?: string;
    fake_features?: string;
  };
}

@Component({
  selector: 'app-browser-mock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 font-sans transition-all">
      <!-- Chrome / Edge Window Frame Top -->
      <div class="bg-slate-200 dark:bg-slate-950 px-3 pt-2 pb-1 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
        <!-- Tab Strip -->
        <div class="flex items-center gap-1 overflow-x-auto max-w-[85%]">
          <div class="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-t-lg border-t border-x border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 shadow-2xs">
            <span>🌐</span>
            <span class="truncate max-w-[200px]">{{ pageTitle }}</span>
            <span class="text-slate-400 hover:text-slate-600 text-xs cursor-pointer ml-1">✕</span>
          </div>
          <div class="px-2 py-1 text-slate-400 hover:text-slate-600 text-sm cursor-pointer">+</div>
        </div>

        <!-- Window Controls -->
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <span>—</span>
          <span>▢</span>
          <span class="text-rose-500">✕</span>
        </div>
      </div>

      <!-- Browser Address Bar & Actions Bar -->
      <div class="px-3 py-2 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm">
          <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">‹</button>
          <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">›</button>
          <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">⟳</button>
        </div>

        <!-- URL Address Bar with Security Inspector -->
        <div class="flex-1 relative">
          <div
            (click)="showCertInspector.set(!showCertInspector())"
            class="flex items-center gap-2 bg-white dark:bg-slate-950 border rounded-full px-3 py-1.5 text-xs font-mono cursor-pointer transition shadow-2xs"
            [ngClass]="showCertInspector() ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'">
            <!-- Padlock / Warning icon -->
            <span class="text-amber-500 font-bold" title="Kliknij aby zbadać certyfikat i domenę">⚠️</span>
            <span class="text-slate-400 select-none">https://</span>
            <span class="text-red-600 dark:text-red-400 font-bold">{{ spoofedSubdomain }}</span>
            <span class="text-slate-500">{{ urlPath }}</span>
          </div>

          <!-- Certificate & Domain Inspector Dropdown -->
          <div
            *ngIf="showCertInspector()"
            class="absolute left-0 top-full mt-1.5 w-96 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-40 text-xs">
            <div class="flex items-center justify-between font-bold text-amber-600 dark:text-amber-400 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span class="flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Analiza Certyfikatu i Prawdziwej Domeny</span>
              </span>
              <button type="button" class="cursor-pointer text-slate-400 hover:text-slate-600" (click)="showCertInspector.set(false)">✕</button>
            </div>
            <div class="py-2.5 flex flex-col gap-2 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              <div class="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                <div class="text-amber-800 dark:text-amber-300 font-bold mb-1">🚨 Prawdziwa domena docelowa:</div>
                <div class="text-slate-900 dark:text-white font-bold text-xs">{{ rootDomain }}</div>
                <div class="text-slate-500 text-[10px] mt-0.5">To nie jest oficjalny serwer instytucji!</div>
              </div>
              <div><strong>Podszywana marka:</strong> {{ brandName }}</div>
              <div><strong>Oficjalny adres instytucji:</strong> <span class="text-emerald-600 font-bold">{{ officialDomain }}</span></div>
              <div><strong>Wystawca certyfikatu:</strong> {{ certIssuer }}</div>
              <div><strong>Uwagi bezpieczeństwa:</strong> {{ certReason }}</div>
            </div>
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span class="text-[10px] text-red-500 font-semibold">Zagrożenie: Wyłudzanie danych / Phishing</span>
              <button
                type="button"
                (click)="toggleComparison()"
                class="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800 transition">
                Porównaj z oryginałem →
              </button>
            </div>
          </div>
        </div>

        <!-- Right actions -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="toggleComparison()"
            [ngClass]="showComparison() ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'"
            class="px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            title="Porównaj fałszywą kopię z oficjalną stroną">
            <span>⚖️</span>
            <span class="hidden sm:inline">Porównaj z oryginałem</span>
          </button>
          <span class="cursor-pointer text-slate-500 hover:text-slate-700">★</span>
          <span class="cursor-pointer text-slate-500 hover:text-slate-700">⋮</span>
        </div>
      </div>

      <!-- Side-by-Side Comparison Modal / Tray (When toggled) -->
      <div *ngIf="showComparison()" class="p-4 bg-indigo-50 dark:bg-indigo-950/70 border-b border-indigo-200 dark:border-indigo-800/60">
        <div class="flex items-center justify-between mb-3">
          <div class="font-bold text-xs uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
            <span>⚖️ Anatomia Phishingu: Różnice Strony Prawdziwej vs Klonu</span>
          </div>
          <button type="button" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline" (click)="showComparison.set(false)">
            Zamknij porównanie ✕
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <!-- Real Site Profile -->
          <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800/50 shadow-2xs">
            <div class="flex items-center gap-2 text-emerald-600 font-bold mb-1.5">
              <span>✅</span>
              <span>Oficjalna witryna: {{ officialDomain }}</span>
            </div>
            <p class="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {{ comparisonData?.real_features || 'Oficjalna domena samorządowa lub instytucjonalna. Brak agresywnego odliczania czasu, brak żądania natychmiastowych mikro-płatności BLIK za rzekome usuwanie awarii.' }}
            </p>
          </div>
          <!-- Fake Cloned Profile -->
          <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800/50 shadow-2xs">
            <div class="flex items-center gap-2 text-rose-600 font-bold mb-1.5">
              <span>⚠️</span>
              <span>Klon oszustów: {{ spoofedSubdomain }}</span>
            </div>
            <p class="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {{ comparisonData?.fake_features || 'Podrobiony szablon z fałszywą subdomeną. Wymuszenie pośpiechu i formularz wyłudzający dane bankowe lub kody autoryzacyjne.' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Portal Webpage Content -->
      <div class="p-6 bg-slate-50 dark:bg-slate-950 min-h-[380px] flex flex-col gap-4 select-text">
        <!-- Fake Portal Header with Dynamic Brand styling -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-lg shadow-md"
              [style.background-color]="brandColor">
              {{ brandLogoEmoji }}
            </div>
            <div>
              <div class="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {{ brandName }}
              </div>
              <div class="text-[11px] text-slate-500">
                {{ brandSubtitle }}
              </div>
            </div>
          </div>
          <span class="text-xs bg-red-600 text-white font-bold px-2.5 py-1 rounded-full uppercase animate-pulse">
            Pilny Komunikat
          </span>
        </div>

        <!-- Navigation bar mock -->
        <div class="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-2 overflow-x-auto">
          <span
            *ngFor="let link of navLinks"
            class="cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap">
            {{ link }}
          </span>
        </div>

        <!-- Headline -->
        <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
          {{ pageHeadline }}
        </h1>

        <div class="text-xs text-slate-500 font-mono">
          Opublikowano: dzisiaj, 14:15 • Dział Eksploatacji i Bezpieczeństwa
        </div>

        <!-- News Image or Alert Banner -->
        <div class="rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 flex items-start gap-4">
          <div class="text-3xl shrink-0">⚠️</div>
          <div>
            <div class="text-sm font-bold text-red-700 dark:text-red-300 uppercase">
              {{ bannerAlertTitle }}
            </div>
            <div class="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">
              {{ bannerAlertBody }}
            </div>
          </div>
        </div>

        <!-- Body Text -->
        <p class="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed" [ngClass]="{'text-lg font-medium': isSenior}">
          {{ content || bannerAlertBody }}
        </p>

        <!-- Fraudulent Urgent Action Form with Phishing CTA -->
        <div class="mt-2 p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
          <div>
            <div class="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <span>⏱️</span>
              <span>Wymagana natychmiastowa autoryzacja</span>
            </div>
            <div class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Pozostały czas na zatwierdzenie procedury: <span class="font-mono font-bold text-rose-600">14:52</span>
            </div>
          </div>
          <button
            type="button"
            class="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition">
            {{ ctaButtonLabel }}
          </button>
        </div>
      </div>

      <!-- Red Flags Tagging Bar -->
      <div *ngIf="redFlags && redFlags.length > 0" class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <span>🚩</span>
            <span>Wskaż podejrzane elementy (znaki ostrzegawcze klonu):</span>
          </span>
          <span class="text-emerald-600 font-mono font-bold">{{ selectedFlags.size }}/{{ redFlags.length }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let flag of redFlags"
            type="button"
            (click)="toggleFlag(flag)"
            [ngClass]="selectedFlags.has(flag) ? 'bg-amber-600 text-white border-amber-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'"
            class="text-xs px-2.5 py-1.5 rounded-lg border font-medium transition text-left flex items-center gap-1.5 shadow-2xs">
            <span>{{ selectedFlags.has(flag) ? '✓' : '⚠' }}</span>
            <span>{{ flag }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class BrowserMockComponent {
  @Input() author: string = 'MPWiK Wrocław';
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() redFlags: string[] = [];
  @Input() isSenior: boolean = false;
  @Input() clonedWebsite?: ClonedWebsiteData | null = null;
  @Input() authorHandle?: string;

  @Output() flagSelected = new EventEmitter<string[]>();

  showCertInspector = signal<boolean>(false);
  showComparison = signal<boolean>(false);
  selectedFlags = new Set<string>();

  get pageTitle(): string {
    if (this.clonedWebsite?.brand_name) {
      return `${this.clonedWebsite.brand_name} - Komunikat`;
    }
    return this.title || 'Alert Miejski - Portal Mieszkańca';
  }

  get brandName(): string {
    return this.clonedWebsite?.brand_name || this.author || 'Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji';
  }

  get brandSubtitle(): string {
    if (this.clonedWebsite?.real_domain) {
      return `Oficjalny serwis podmiotu • ${this.clonedWebsite.real_domain}`;
    }
    return 'Wrocław • Biuro Obsługi Mieszkańców';
  }

  get brandColor(): string {
    return this.clonedWebsite?.primary_color || '#0072ce';
  }

  get brandLogoEmoji(): string {
    const nameLower = (this.brandName || '').toLowerCase();
    if (nameLower.includes('wodociąg') || nameLower.includes('mpwik')) {
      return '💧';
    }
    if (nameLower.includes('librus') || nameLower.includes('szkoł')) {
      return '📚';
    }
    if (nameLower.includes('tauron') || nameLower.includes('prąd')) {
      return '⚡';
    }
    return '🏛️';
  }

  get navLinks(): string[] {
    if (this.clonedWebsite?.nav_links && this.clonedWebsite.nav_links.length > 0) {
      return this.clonedWebsite.nav_links;
    }
    return ['O nas', 'Strefa Klienta', 'Jakość Wody', 'Awarie', 'Kontakt'];
  }

  get spoofedSubdomain(): string {
    if (this.clonedWebsite?.spoofed_domain) {
      return this.clonedWebsite.spoofed_domain;
    }
    if (this.authorHandle && this.authorHandle.includes('//')) {
      const parts = this.authorHandle.replace('https://', '').replace('http://', '').split('/');
      return parts[0];
    }
    return 'mpwik-wroclaw.pl.awaria-wodociagi.cc';
  }

  get rootDomain(): string {
    const parts = this.spoofedSubdomain.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return this.spoofedSubdomain;
  }

  get officialDomain(): string {
    return this.clonedWebsite?.real_domain || this.clonedWebsite?.comparison?.real_domain || 'mpwik.wroc.pl';
  }

  get urlPath(): string {
    return '/komunikat-alarmowy';
  }

  get certIssuer(): string {
    return this.clonedWebsite?.ssl_details?.issuer || 'Free Automated Cert Authority (30-dniowa anonimowa rejestracja)';
  }

  get certReason(): string {
    return this.clonedWebsite?.ssl_details?.reason || 'Nazwa podmiotu w certyfikacie nie zgadza się z oficjalnym właścicielem instytucji';
  }

  get comparisonData() {
    return this.clonedWebsite?.comparison;
  }

  get pageHeadline(): string {
    return this.clonedWebsite?.alert_title || this.title || 'Awaria sieci i komunikat kryzysowy';
  }

  get bannerAlertTitle(): string {
    return this.clonedWebsite?.alert_title || 'Pilny Komunikat o Skażeniu Sieci';
  }

  get bannerAlertBody(): string {
    return this.clonedWebsite?.alert_body || this.content || 'Zalecenie natychmiastowej dekontaminacji instalacji domowej.';
  }

  get ctaButtonLabel(): string {
    return this.clonedWebsite?.cta_label || 'Zamów i Zapłać BLIK';
  }

  toggleComparison(): void {
    this.showComparison.set(!this.showComparison());
    this.showCertInspector.set(false);
  }

  toggleFlag(flag: string): void {
    if (this.selectedFlags.has(flag)) {
      this.selectedFlags.delete(flag);
    } else {
      this.selectedFlags.add(flag);
    }
    this.flagSelected.emit(Array.from(this.selectedFlags));
  }
}
