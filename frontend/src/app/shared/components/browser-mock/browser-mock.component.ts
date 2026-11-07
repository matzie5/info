import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
        <div class="flex items-center gap-1 overflow-x-auto max-w-[75%] sm:max-w-[85%]">
          <div class="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-t-lg border-t border-x border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 shadow-2xs">
            <span>{{ isAuthentic ? '🏛️' : '🌐' }}</span>
            <span class="truncate max-w-[220px]">{{ pageTitle }}</span>
            <span *ngIf="isAuthentic" class="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">Oficjalna</span>
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
      <div class="px-3 py-2 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-2">
        <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm">
          <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800" title="Wstecz">‹</button>
          <button class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800" title="Dalej">›</button>
          <button (click)="reloadIframe()" class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800" title="Odśwież">⟳</button>
        </div>

        <!-- URL Address Bar with Security Inspector -->
        <div class="flex-1 min-w-[200px] relative">
          <div
            (click)="showCertInspector.set(!showCertInspector())"
            class="flex items-center gap-2 bg-white dark:bg-slate-950 border rounded-full px-3 py-1.5 text-xs font-mono cursor-pointer transition shadow-2xs"
            [ngClass]="isAuthentic ? 'border-emerald-500 hover:border-emerald-600' : (showCertInspector() ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400')">
            <!-- Padlock / Warning icon -->
            <span *ngIf="isAuthentic" class="text-emerald-600 font-bold" title="Zweryfikowane bezpieczne połączenie">🔒</span>
            <span *ngIf="!isAuthentic" class="text-amber-500 font-bold" title="Kliknij aby zbadać certyfikat i domenę">⚠️</span>
            <span class="text-slate-400 select-none">https://</span>
            <span [ngClass]="isAuthentic ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'">
              {{ isAuthentic ? officialDomain : spoofedSubdomain }}
            </span>
            <span class="text-slate-500 truncate max-w-[140px]">{{ urlPath }}</span>
          </div>

          <!-- Certificate & Domain Inspector Dropdown -->
          <div
            *ngIf="showCertInspector()"
            class="absolute left-0 top-full mt-1.5 w-96 max-w-[90vw] p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-40 text-xs">
            <div class="flex items-center justify-between font-bold pb-2 border-b border-slate-100 dark:border-slate-800"
              [ngClass]="isAuthentic ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
              <span class="flex items-center gap-1.5">
                <span>{{ isAuthentic ? '🔒' : '🛡️' }}</span>
                <span>{{ isAuthentic ? 'Certyfikat SSL Bezpieczny i Zweryfikowany' : 'Analiza Certyfikatu i Prawdziwej Domeny' }}</span>
              </span>
              <button type="button" class="cursor-pointer text-slate-400 hover:text-slate-600" (click)="showCertInspector.set(false)">✕</button>
            </div>
            <div class="py-2.5 flex flex-col gap-2 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              <div class="p-2 rounded border"
                [ngClass]="isAuthentic ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'">
                <div class="font-bold mb-1" [ngClass]="isAuthentic ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'">
                  {{ isAuthentic ? '✅ Domena oficjalna:' : '🚨 Prawdziwa domena docelowa:' }}
                </div>
                <div class="font-bold text-xs" [ngClass]="isAuthentic ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-white'">
                  {{ isAuthentic ? officialDomain : rootDomain }}
                </div>
                <div class="text-slate-500 text-[10px] mt-0.5">
                  {{ isAuthentic ? 'Oficjalny, zweryfikowany serwer instytucji publicznej.' : 'To nie jest oficjalny serwer instytucji!' }}
                </div>
              </div>
              <div><strong>Podmiot:</strong> {{ brandName }}</div>
              <div><strong>Oficjalny adres instytucji:</strong> <span class="text-emerald-600 font-bold">{{ officialDomain }}</span></div>
              <div><strong>Wystawca certyfikatu:</strong> {{ certIssuer }}</div>
              <div><strong>Status weryfikacji:</strong> {{ certReason }}</div>
            </div>
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span class="text-[10px] font-semibold" [ngClass]="isAuthentic ? 'text-emerald-600' : 'text-red-500'">
                {{ isAuthentic ? 'Bezpieczeństwo: Zweryfikowane' : 'Zagrożenie: Podszywanie / Phishing' }}
              </span>
              <button
                *ngIf="!isAuthentic"
                type="button"
                (click)="toggleComparison()"
                class="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800 transition">
                Porównaj z oryginałem →
              </button>
            </div>
          </div>
        </div>

        <!-- Mode Toggle: Live Iframe vs Template Inspection -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            (click)="setViewMode('IFRAME')"
            [ngClass]="viewMode() === 'IFRAME' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'"
            class="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition"
            title="Podgląd strony w bezpiecznej ramce iframe">
            <span>🏛️</span>
            <span class="hidden sm:inline">Na żywo (Iframe)</span>
          </button>
          <button
            type="button"
            (click)="setViewMode('CLONE')"
            [ngClass]="viewMode() === 'CLONE' ? (isAuthentic ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white') + ' shadow-xs font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'"
            class="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition"
            title="Szczegółowy widok edukacyjny z analizą elementów">
            <span>{{ isAuthentic ? '📄' : '⚠️' }}</span>
            <span class="hidden sm:inline">{{ isAuthentic ? 'Karta artykułu' : 'Klon do analizy' }}</span>
          </button>
          <button
            *ngIf="!isAuthentic"
            type="button"
            (click)="toggleComparison()"
            [ngClass]="showComparison() ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'"
            class="px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            title="Porównaj fałszywą kopię z oficjalną stroną">
            <span>⚖️</span>
            <span class="hidden sm:inline">Porównaj</span>
          </button>
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
              {{ comparisonData?.real_features || 'Oficjalna domena samorządowa lub instytucjonalna. Ważny certyfikat SSL wystawiony dla podmiotu. Brak agresywnego odliczania czasu i żądania natychmiastowych płatności BLIK.' }}
            </p>
          </div>
          <!-- Fake Cloned Profile -->
          <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800/50 shadow-2xs">
            <div class="flex items-center gap-2 text-rose-600 font-bold mb-1.5">
              <span>⚠️</span>
              <span>Klon oszustów: {{ spoofedSubdomain }}</span>
            </div>
            <p class="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {{ comparisonData?.fake_features || 'Podrobiony szablon w fałszywej subdomenie. Presja czasu, żądanie kodów BLIK lub danych logowania pod pretekstem awarii.' }}
            </p>
          </div>
        </div>
      </div>

      <!-- VIEW 1: LIVE PROXIED IFRAME VIEW -->
      <div *ngIf="viewMode() === 'IFRAME'" class="relative bg-white dark:bg-slate-950">
        <div class="bg-slate-100 dark:bg-slate-800/60 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Bezpieczny podgląd witryny przez proxy edukacyjne:</span>
            <strong class="font-mono">{{ proxyTargetUrl }}</strong>
          </div>
          <a [href]="proxyTargetUrl" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold">
            <span>Otwórz w nowej karcie</span>
            <span>↗</span>
          </a>
        </div>
        <iframe
          *ngIf="iframeUrl"
          [src]="iframeUrl"
          class="w-full h-[580px] border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms">
        </iframe>
      </div>

      <!-- VIEW 2: HIGH-FIDELITY INSTITUTIONAL TEMPLATES -->
      <div *ngIf="viewMode() === 'CLONE'" class="bg-white dark:bg-slate-950 min-h-[480px]">

        <!-- A. MPWiK WROCŁAW DEDICATED INSTITUTIONAL LAYOUT -->
        <div *ngIf="siteType === 'mpwik'" class="flex flex-col">
          <!-- Top Utility Bar -->
          <div class="bg-[#00264d] text-white px-4 py-1.5 flex items-center justify-between text-xs">
            <div class="flex items-center gap-3">
              <span class="font-bold flex items-center gap-1 text-amber-300">
                <span>🚨</span>
                <span>Pogotowie Wodno-Kanalizacyjne: 994 (całodobowo)</span>
              </span>
              <span class="hidden md:inline text-slate-300">•</span>
              <span class="hidden md:inline text-slate-300">BOK: +48 71 340 95 00</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="bg-blue-600 px-2.5 py-0.5 rounded text-[11px] font-bold">e-BOK Logowanie</span>
              <span class="text-slate-300 text-[11px]">BIP</span>
            </div>
          </div>

          <!-- Main MPWiK Brand Header -->
          <div class="bg-[#003366] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#00a0e3]">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-white text-[#003366] flex items-center justify-center text-2xl font-black shadow">
                💧
              </div>
              <div>
                <div class="font-black text-lg tracking-wide uppercase">MPWiK Wrocław S.A.</div>
                <div class="text-xs text-cyan-200">Miejskie Przedsiębiorstwo Wodociągów i Kanalizacji</div>
              </div>
            </div>
            <div class="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-100">
              <span class="hover:text-cyan-300 cursor-pointer">Dla Domu</span>
              <span class="hover:text-cyan-300 cursor-pointer">Dla Biznesu</span>
              <span class="hover:text-cyan-300 cursor-pointer">Jakość Wody</span>
              <span class="hover:text-cyan-300 cursor-pointer text-amber-300 font-bold">Awarie i Wyłączenia</span>
              <span class="hover:text-cyan-300 cursor-pointer">Kontakt</span>
            </div>
          </div>

          <!-- Breadcrumb & Outage Status -->
          <div class="bg-slate-100 dark:bg-slate-900 px-6 py-2 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <div>Strona główna &gt; Komunikaty i Awarie &gt; Obszar Wrocław</div>
            <div class="flex items-center gap-1.5 font-bold" [ngClass]="isAuthentic ? 'text-emerald-600' : 'text-red-600'">
              <span class="w-2 h-2 rounded-full" [ngClass]="isAuthentic ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'"></span>
              <span>{{ isAuthentic ? 'Stan sieci: Stabilny (Brak awarii masowych)' : 'Stan sieci: Zgłoszenie awarii krytycznej' }}</span>
            </div>
          </div>

          <!-- MPWiK Body Content -->
          <div class="p-6 space-y-4">
            <h1 class="text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {{ pageHeadline }}
            </h1>
            <div class="text-xs text-slate-500 font-mono">
              Identyfikator komunikatu: MPWIK/WROC/2026/04 • Dział Dyspozycji Mocy
            </div>

            <!-- Threat banner or Authentic Info banner -->
            <div class="p-4 rounded-xl border flex items-start gap-4"
              [ngClass]="isAuthentic ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900' : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900'">
              <span class="text-3xl shrink-0">{{ isAuthentic ? 'ℹ️' : '🚨' }}</span>
              <div>
                <h3 class="font-bold text-sm uppercase" [ngClass]="isAuthentic ? 'text-blue-900 dark:text-blue-200' : 'text-red-800 dark:text-red-300'">
                  {{ bannerAlertTitle }}
                </h3>
                <p class="text-xs mt-1 leading-relaxed" [ngClass]="isAuthentic ? 'text-blue-800 dark:text-blue-300' : 'text-red-700 dark:text-red-300'">
                  {{ bannerAlertBody }}
                </p>
              </div>
            </div>

            <p class="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed" [ngClass]="{'text-lg': isSenior}">
              {{ content }}
            </p>

            <!-- Suspicious Form if Cloned / Phishing -->
            <div *ngIf="!isAuthentic" class="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
              <div>
                <div class="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <span>⏱️</span>
                  <span>Wymagana natychmiastowa autoryzacja dekontaminacji</span>
                </div>
                <div class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Czas na zatwierdzenie procedury: <span class="font-mono font-bold text-rose-600">14:52</span>
                </div>
              </div>
              <button
                type="button"
                class="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md">
                {{ ctaButtonLabel }}
              </button>
            </div>

            <!-- Authentic Water Quality Meter -->
            <div *ngIf="isAuthentic" class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">💧</span>
                <div>
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Wrocławska Kranówka: Zdatna do picia bez przegotowania</div>
                  <div class="text-[11px] text-slate-500">Pomiary laboratoryjne ujęć Mokry Dwór i Czechnica zgodne z normami UE.</div>
                </div>
              </div>
              <span class="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-300">
                Jakość: 100% Norma
              </span>
            </div>
          </div>
        </div>

        <!-- B. WROCŁAW.PL DEDICATED INSTITUTIONAL LAYOUT -->
        <div *ngIf="siteType === 'wroclaw'" class="flex flex-col">
          <!-- Municipal Crimson Header -->
          <div class="bg-[#c5192d] text-white px-6 py-4 flex items-center justify-between shadow-md">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-white text-[#c5192d] flex items-center justify-center text-3xl font-black shadow border border-red-200">
                W
              </div>
              <div>
                <div class="font-black text-xl tracking-tight">wroclaw.pl</div>
                <div class="text-xs text-red-100 font-medium">Oficjalny portal internetowy Wrocławia</div>
              </div>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full cursor-pointer font-bold">Dla Mieszkańca</span>
              <span class="hidden md:inline bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full cursor-pointer font-bold">Seniorzy</span>
              <span class="bg-yellow-400 text-slate-950 px-3 py-1.5 rounded-full font-black">BIP Urząd</span>
            </div>
          </div>

          <!-- Navigation Categories -->
          <div class="bg-slate-800 text-slate-200 px-6 py-2 text-xs flex items-center gap-6 overflow-x-auto">
            <span class="font-bold text-amber-400 hover:text-white cursor-pointer">Wiadomości</span>
            <span class="hover:text-white cursor-pointer">Komunikacja MPK</span>
            <span class="hover:text-white cursor-pointer">Zdrowie i Seniorzy</span>
            <span class="hover:text-white cursor-pointer">Kultura i Turystyka</span>
            <span class="hover:text-white cursor-pointer">Prezydent Wrocławia</span>
          </div>

          <!-- Content Section -->
          <div class="p-6 space-y-4">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-red-100 text-[#c5192d]">
                Portal Samorządowy
              </span>
              <span class="text-xs text-slate-500 font-mono">Wrocławskie Centrum Rozwoju Społecznego</span>
            </div>

            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
              {{ pageHeadline }}
            </h1>

            <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-start gap-4">
              <span class="text-3xl shrink-0">🏛️</span>
              <div>
                <h3 class="font-bold text-sm text-emerald-900 dark:text-emerald-200 uppercase">
                  {{ bannerAlertTitle }}
                </h3>
                <p class="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                  {{ bannerAlertBody }}
                </p>
              </div>
            </div>

            <p class="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed" [ngClass]="{'text-lg': isSenior}">
              {{ content }}
            </p>

            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xl">📍</span>
                <span>Punkt Informacyjny: pl. Dominikański 6, Wrocław • Tel: 71 772 49 38</span>
              </div>
              <span class="text-emerald-600 font-bold">Oficjalny kanał Urzędu Miejskiego Wrocławia</span>
            </div>
          </div>
        </div>

        <!-- C. LIBRUS SYNERGIA DEDICATED INSTITUTIONAL LAYOUT -->
        <div *ngIf="siteType === 'librus'" class="flex flex-col">
          <!-- Top Librus Bar -->
          <div class="bg-[#1e293b] text-white px-4 py-2 flex items-center justify-between text-xs border-b border-slate-700">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow">
                📚
              </div>
              <div>
                <span class="font-black text-sm tracking-wider">LIBRUS Synergia</span>
                <span class="text-slate-400 text-[11px] ml-2">Dziennik Elektroniczny</span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="bg-slate-800 px-3 py-1 rounded-full text-slate-300 border border-slate-700 text-[11px]">
                Uczeń: SP nr 71 Wrocław
              </span>
              <span class="text-slate-400 text-xs cursor-pointer">Wyloguj</span>
            </div>
          </div>

          <!-- Synergia Navigation Tabs -->
          <div class="bg-[#0f172a] text-slate-300 px-4 py-2 flex items-center gap-4 text-xs overflow-x-auto border-b border-slate-800">
            <span class="hover:text-white cursor-pointer">Oceny</span>
            <span class="hover:text-white cursor-pointer">Frekwencja</span>
            <span class="font-bold text-amber-400 border-b-2 border-amber-400 pb-1 cursor-pointer">Wiadomości (1)</span>
            <span class="hover:text-white cursor-pointer">Plan lekcji</span>
            <span class="hover:text-white cursor-pointer">Zadania domowe</span>
            <span class="hover:text-white cursor-pointer">Ogłoszenia</span>
          </div>

          <!-- Librus Content Section -->
          <div class="p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Skrzynka odbiorcza:</span>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ pageHeadline }}</h1>
              </div>
              <span class="text-xs px-2.5 py-1 rounded-full font-bold"
                [ngClass]="isAuthentic ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'">
                {{ isAuthentic ? 'Oficjalny komunikat' : 'Wymagana akcja' }}
              </span>
            </div>

            <!-- Threat or Official Card -->
            <div class="p-4 rounded-xl border flex items-start gap-4"
              [ngClass]="isAuthentic ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900'">
              <span class="text-3xl shrink-0">{{ isAuthentic ? '🎓' : '⚠️' }}</span>
              <div>
                <h3 class="font-bold text-sm" [ngClass]="isAuthentic ? 'text-indigo-900 dark:text-indigo-200' : 'text-rose-800 dark:text-rose-300'">
                  {{ bannerAlertTitle }}
                </h3>
                <p class="text-xs mt-1 leading-relaxed" [ngClass]="isAuthentic ? 'text-indigo-800 dark:text-indigo-300' : 'text-rose-700 dark:text-rose-300'">
                  {{ bannerAlertBody }}
                </p>
              </div>
            </div>

            <p class="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed">
              {{ content }}
            </p>

            <!-- Suspicious login prompt if Phishing -->
            <div *ngIf="!isAuthentic" class="p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
              <div>
                <div class="text-sm font-bold text-red-900 dark:text-red-200 flex items-center gap-2">
                  <span>🔒</span>
                  <span>Weryfikacja logowania do bazy pytań</span>
                </div>
                <div class="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Podaj login i hasło konta ucznia/rodzica w zewnętrznym formularzu.
                </div>
              </div>
              <button
                type="button"
                class="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md">
                {{ ctaButtonLabel }}
              </button>
            </div>
          </div>
        </div>

        <!-- D. GENERIC PORTAL LAYOUT (FALLBACK) -->
        <div *ngIf="siteType === 'generic'" class="p-6 flex flex-col gap-4">
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
            <span class="text-xs font-bold px-2.5 py-1 rounded-full uppercase"
              [ngClass]="isAuthentic ? 'bg-emerald-100 text-emerald-800' : 'bg-red-600 text-white animate-pulse'">
              {{ isAuthentic ? 'Oficjalna Wiadomość' : 'Pilny Komunikat' }}
            </span>
          </div>

          <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {{ pageHeadline }}
          </h1>

          <p class="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed" [ngClass]="{'text-lg font-medium': isSenior}">
            {{ content || bannerAlertBody }}
          </p>
        </div>

      </div>

      <!-- Red Flags Tagging Bar -->
      <div *ngIf="redFlags && redFlags.length > 0" class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <span>{{ isAuthentic ? '🛡️' : '🚩' }}</span>
            <span>{{ isAuthentic ? 'Kluczowe wskaźniki wiarygodności (cechy bezpiecznej witryny):' : 'Wskaż podejrzane elementy (znaki ostrzegawcze klonu):' }}</span>
          </span>
          <span class="text-emerald-600 font-mono font-bold">{{ selectedFlags.size }}/{{ redFlags.length }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let flag of redFlags"
            type="button"
            (click)="toggleFlag(flag)"
            [ngClass]="selectedFlags.has(flag) ? (isAuthentic ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-amber-600 text-white border-amber-700') : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'"
            class="text-xs px-2.5 py-1.5 rounded-lg border font-medium transition text-left flex items-center gap-1.5 shadow-2xs">
            <span>{{ selectedFlags.has(flag) ? '✓' : (isAuthentic ? '🔒' : '⚠') }}</span>
            <span>{{ flag }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class BrowserMockComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);

  @Input() author: string = 'MPWiK Wrocław';
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() redFlags: string[] = [];
  @Input() isSenior: boolean = false;
  @Input() clonedWebsite?: ClonedWebsiteData | null = null;
  @Input() authorHandle?: string;
  @Input() isAuthentic: boolean = false;
  @Input() mediaUrl?: string;

  @Output() flagSelected = new EventEmitter<string[]>();

  viewMode = signal<'IFRAME' | 'CLONE'>('IFRAME');
  showCertInspector = signal<boolean>(false);
  showComparison = signal<boolean>(false);
  selectedFlags = new Set<string>();

  ngOnInit(): void {
    // If authentic, default to live iframe to show the real official page!
    // If fake phishing clone, default to template inspection so students see the educational cloned markers.
    if (this.isAuthentic) {
      this.viewMode.set('IFRAME');
    } else {
      this.viewMode.set('CLONE');
    }
  }

  setViewMode(mode: 'IFRAME' | 'CLONE'): void {
    this.viewMode.set(mode);
  }

  get siteType(): 'mpwik' | 'wroclaw' | 'librus' | 'generic' {
    const combined = `${this.brandName} ${this.officialDomain} ${this.author} ${this.title}`.toLowerCase();
    if (combined.includes('mpwik') || combined.includes('wodociąg')) {
      return 'mpwik';
    }
    if (combined.includes('wroclaw.pl') || combined.includes('karta seniora') || combined.includes('urząd miejski')) {
      return 'wroclaw';
    }
    if (combined.includes('librus') || combined.includes('synergia') || combined.includes('dziennik')) {
      return 'librus';
    }
    return 'generic';
  }

  get proxyTargetUrl(): string {
    if (this.clonedWebsite?.original_url) return this.clonedWebsite.original_url;
    if (this.mediaUrl && this.mediaUrl.startsWith('http')) return this.mediaUrl;
    if (this.authorHandle && this.authorHandle.startsWith('http')) {
      if (this.isAuthentic) return this.authorHandle;
    }
    if (this.officialDomain.startsWith('http')) return this.officialDomain;
    return `https://${this.officialDomain}`;
  }

  get iframeUrl(): SafeResourceUrl {
    const encoded = encodeURIComponent(this.proxyTargetUrl);
    return this.sanitizer.bypassSecurityTrustResourceUrl(`/api/v1/studio/proxy-page?url=${encoded}`);
  }

  reloadIframe(): void {
    const current = this.viewMode();
    this.viewMode.set('CLONE');
    setTimeout(() => this.viewMode.set(current), 50);
  }

  get pageTitle(): string {
    if (this.clonedWebsite?.brand_name) {
      return `${this.clonedWebsite.brand_name} - ${this.isAuthentic ? 'Serwis Oficjalny' : 'Komunikat'}`;
    }
    return this.title || (this.isAuthentic ? 'Portal Oficjalny Wrocław' : 'Alert Miejski - Komunikat');
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
    return this.clonedWebsite?.primary_color || (this.isAuthentic ? '#059669' : '#0072ce');
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
    return this.clonedWebsite?.real_domain || this.clonedWebsite?.comparison?.real_domain || (this.siteType === 'wroclaw' ? 'www.wroclaw.pl' : (this.siteType === 'librus' ? 'portal.librus.pl' : 'mpwik.wroc.pl'));
  }

  get urlPath(): string {
    if (this.isAuthentic) {
      return '/dla-mieszkanca/aktualnosci';
    }
    return '/komunikat-alarmowy';
  }

  get certIssuer(): string {
    if (this.isAuthentic) {
      return this.clonedWebsite?.ssl_details?.issuer || 'DigiCert Global Root CA (Urząd Miejski / Instytucja)';
    }
    return this.clonedWebsite?.ssl_details?.issuer || 'Free Automated Cert Authority (30-dniowa anonimowa rejestracja)';
  }

  get certReason(): string {
    if (this.isAuthentic) {
      return this.clonedWebsite?.ssl_details?.reason || 'Certyfikat OV zweryfikowany notarialnie dla oficjalnego podmiotu.';
    }
    return this.clonedWebsite?.ssl_details?.reason || 'Nazwa podmiotu w certyfikacie nie zgadza się z oficjalnym właścicielem instytucji';
  }

  get comparisonData() {
    return this.clonedWebsite?.comparison;
  }

  get pageHeadline(): string {
    return this.clonedWebsite?.alert_title || this.title || (this.isAuthentic ? 'Oficjalny Komunikat Miejski' : 'Awaria sieci i komunikat kryzysowy');
  }

  get bannerAlertTitle(): string {
    return this.clonedWebsite?.alert_title || (this.isAuthentic ? 'Informacja dla mieszkańców' : 'Pilny Komunikat o Skażeniu Sieci');
  }

  get bannerAlertBody(): string {
    return this.clonedWebsite?.alert_body || this.content || (this.isAuthentic ? 'Oficjalne powiadomienie Urzędu Miejskiego.' : 'Zalecenie natychmiastowej dekontaminacji instalacji domowej.');
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
