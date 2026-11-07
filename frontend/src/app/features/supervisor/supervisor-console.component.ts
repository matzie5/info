import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LocaleService } from '../../core/i18n/locale.service';
import { AuthService } from '../../core/auth/auth.service';

export interface StudioScenario {
  id: string;
  platform_mock: string;
  threat_category: string;
  author: string;
  author_handle?: string;
  author_avatar?: string;
  verified: boolean;
  title: string;
  content: string;
  media_url?: string;
  media_type?: string;
  red_flags: string[];
  safe_action_advice: string;
  is_authentic: boolean;
  cloned_website?: any;
}

export interface YouTubeSuggestion {
  id: string;
  video_id: string;
  url: string;
  embed_url: string;
  title: string;
  channel_title: string;
  channel_handle?: string;
  channel_avatar?: string;
  subscriber_count?: string;
  views_count?: string;
  is_authentic: boolean;
  threat_category: string;
  summary: string;
  red_flags: string[];
  safe_action_advice: string;
  pedagogical_relevance: string;
}

export interface SuggestYouTubeVideosResponse {
  topic: string;
  audience_mode: string;
  location_name: string;
  language: string;
  suggestions: YouTubeSuggestion[];
}

export interface StudioParticipant {
  username: string;
  display_name?: string;
  password?: string;
  ui_language_override?: string;
  score?: number;
  completed_scenarios?: string[];
  connected?: boolean;
}

export interface SessionData {
  id: string;
  title: string;
  audience_mode: string;
  location_name: string;
  language: string;
  status: string;
  current_tick: number;
  max_ticks: number;
  trainer_token?: string;
  scenarios: StudioScenario[];
  roster: Record<string, StudioParticipant>;
}

@Component({
  selector: 'app-supervisor-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-100 dark:bg-[#0c111d] text-slate-900 dark:text-slate-100 font-sans p-6">
      <div class="max-w-7xl mx-auto flex flex-col gap-6">
        <!-- Top Navigation & Supervisor Header -->
        <header class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-lg">
              👑
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Panel Nadzorcy (Supervisor Studio)
                </h1>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  Rola: Supervisor
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Projektuj warsztaty, konfiguruj scenariusze dla miast, zarządzaj uczestnikami i generuj kody dostępowe.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="activeTab.set('sessions')"
              [ngClass]="activeTab() === 'sessions' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'"
              class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2">
              <span>📋 Lista Sesji</span>
              <span class="px-1.5 py-0.2 bg-black/20 rounded-full font-mono">{{ sessions().length }}</span>
            </button>
            <button
              type="button"
              (click)="startWizard()"
              [ngClass]="activeTab() === 'wizard' ? 'bg-indigo-600 text-white shadow-md' : 'bg-emerald-600 hover:bg-emerald-700 text-white'"
              class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm">
              <span>✨ Nowy Warsztat (Kreator)</span>
            </button>
            <a
              routerLink="/login"
              class="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800">
              Wyloguj
            </a>
          </div>
        </header>

        <!-- SESSIONS OVERVIEW TAB -->
        <section *ngIf="activeTab() === 'sessions'" class="flex flex-col gap-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-bold">
                🏛️
              </div>
              <div>
                <div class="text-xs uppercase font-mono tracking-wider text-slate-400">Aktywne Sesje</div>
                <div class="text-2xl font-bold mt-0.5">{{ sessions().length }}</div>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl font-bold">
                👵
              </div>
              <div>
                <div class="text-xs uppercase font-mono tracking-wider text-slate-400">Sesje Seniorów</div>
                <div class="text-2xl font-bold mt-0.5">{{ countAudience('seniors') }}</div>
              </div>
            </div>

            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center text-2xl font-bold">
                🧒
              </div>
              <div>
                <div class="text-xs uppercase font-mono tracking-wider text-slate-400">Sesje Młodzieży & Dzieci</div>
                <div class="text-2xl font-bold mt-0.5">{{ countAudience('kids') }}</div>
              </div>
            </div>
          </div>

          <!-- Sessions Table -->
          <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 class="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Wszystkie Utworzone Sesje Treningowe
              </h2>
              <span class="text-xs font-mono text-slate-400">Gotowe do natychmiastowego uruchomienia</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-mono border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th class="p-4">Kod Sesji & Nazwa</th>
                    <th class="p-4">Grupa Odbiorców</th>
                    <th class="p-4">Lokalizacja</th>
                    <th class="p-4">Język</th>
                    <th class="p-4">Scenariusze</th>
                    <th class="p-4">Uczestnicy</th>
                    <th class="p-4 text-right">Dostęp Trenerski & Uczestnika</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  <tr *ngFor="let s of sessions()" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="p-4">
                      <div class="font-bold text-sm text-slate-900 dark:text-white">{{ s.title }}</div>
                      <div class="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">ID: {{ s.id }}</div>
                    </td>
                    <td class="p-4">
                      <span
                        class="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                        [ngClass]="{
                          'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30': s.audience_mode === 'seniors',
                          'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30': s.audience_mode === 'kids',
                          'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30': s.audience_mode === 'professional'
                        }">
                        {{ s.audience_mode === 'seniors' ? '👵 Seniorzy' : (s.audience_mode === 'kids' ? '🧒 Dzieci' : '🛡️ Pro') }}
                      </span>
                    </td>
                    <td class="p-4">
                      <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold">
                        📍 {{ s.location_name || 'Ogólna' }}
                      </span>
                    </td>
                    <td class="p-4 font-mono uppercase text-slate-600 dark:text-slate-400">
                      {{ s.language }}
                    </td>
                    <td class="p-4">
                      <span class="font-semibold">{{ s.scenarios.length || 0 }} scenariuszy</span>
                      <div class="text-[10px] text-slate-400">
                        {{ getPlatformsList(s.scenarios) }}
                      </div>
                    </td>
                    <td class="p-4 font-mono">
                      {{ getRosterCount(s.roster) }} osób
                    </td>
                    <td class="p-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <a
                          [routerLink]="['/trainer', s.id]"
                          class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1">
                          <span>🎯 Kokpit Trenera</span>
                        </a>
                        <a
                          [routerLink]="['/play', s.id]"
                          class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1">
                          <span>🎓 Widok Ucznia</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- GUIDED WIZARD & STUDIO TAB -->
        <section *ngIf="activeTab() === 'wizard'" class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl flex flex-col gap-8">
          <!-- Wizard Progress Bar -->
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
              <div class="text-xs font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
                Krok {{ wizardStep() }} z 4
              </div>
              <h2 class="text-xl font-bold mt-1 text-slate-900 dark:text-white">
                {{ getStepTitle(wizardStep()) }}
              </h2>
            </div>
            <div class="flex items-center gap-2">
              <span
                *ngFor="let step of [1, 2, 3, 4]"
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition"
                [ngClass]="wizardStep() >= step ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'">
                {{ step }}
              </span>
            </div>
          </div>

          <!-- STEP 1: Workshop Scope, Audience & Location -->
          <div *ngIf="wizardStep() === 1" class="flex flex-col gap-6 max-w-2xl">
            <div class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-900 dark:text-indigo-200 text-xs leading-relaxed">
              <strong>Jak działa kreator:</strong> Wprowadź nazwę miasta (np. <em>Wrocław</em>). System automatycznie przeprowadzi badanie i zaproponuje realistyczne, lokalne scenariusze (np. MPWiK, Plac Grunwaldzki, Magnolia Park, szkolne plotki).
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Tytuł Warsztatu
              </label>
              <input
                type="text"
                [(ngModel)]="newSession.title"
                placeholder="np. Cyber-Obrona Seniorów we Wrocławiu 2026"
                class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Lokalizacja (Miasto / Region)
                </label>
                <input
                  type="text"
                  [(ngModel)]="newSession.location_name"
                  placeholder="np. Wrocław"
                  class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Główny Język Scenariuszy
                </label>
                <select
                  [(ngModel)]="newSession.language"
                  class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="pl">Polski (pl-PL)</option>
                  <option value="en">English (en-US)</option>
                  <option value="de">Deutsch (de-DE)</option>
                  <option value="uk">Українська (uk-UA)</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Grupa Docelowa (Audience Persona)
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  (click)="newSession.audience_mode = 'seniors'"
                  [ngClass]="newSession.audience_mode === 'seniors' ? 'ring-2 ring-amber-500 bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-bold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'"
                  class="p-4 rounded-xl border text-center flex flex-col items-center gap-1.5 transition">
                  <span class="text-2xl">👵</span>
                  <span class="text-xs">Seniorzy</span>
                  <span class="text-[10px] font-normal opacity-80">Duże litery, WhatsApp, SMS, wnuczek</span>
                </button>

                <button
                  type="button"
                  (click)="newSession.audience_mode = 'kids'"
                  [ngClass]="newSession.audience_mode === 'kids' ? 'ring-2 ring-sky-500 bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300 font-bold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'"
                  class="p-4 rounded-xl border text-center flex flex-col items-center gap-1.5 transition">
                  <span class="text-2xl">🧒</span>
                  <span class="text-xs">Dzieci & Młodzież</span>
                  <span class="text-[10px] font-normal opacity-80">TikTok, gry, YouTube, odznaki</span>
                </button>

                <button
                  type="button"
                  (click)="newSession.audience_mode = 'professional'"
                  [ngClass]="newSession.audience_mode === 'professional' ? 'ring-2 ring-indigo-500 bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'"
                  class="p-4 rounded-xl border text-center flex flex-col items-center gap-1.5 transition">
                  <span class="text-2xl">🛡️</span>
                  <span class="text-xs">Profesjonaliści</span>
                  <span class="text-[10px] font-normal opacity-80">SOC cyber range, C2PA, analizy</span>
                </button>
              </div>
            </div>

            <div class="flex justify-end pt-4">
              <button
                type="button"
                (click)="fetchProposedScenarios()"
                [disabled]="isResearching()"
                class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2">
                <span *ngIf="isResearching()" class="animate-spin">🔄</span>
                <span>{{ isResearching() ? 'Badanie lokalnych zagrożeń dla ' + newSession.location_name + '...' : 'Dalej: Zaproponuj Scenariusze →' }}</span>
              </button>
            </div>
          </div>

          <!-- STEP 2: Scenarios Selection & Research Grounding -->
          <div *ngIf="wizardStep() === 2" class="flex flex-col gap-6">
            <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>Lokalne badanie dla: {{ newSession.location_name }} ({{ newSession.audience_mode }}):</strong>
                Zaproponowano {{ proposedScenarios().length }} autentycznych scenariuszy osadzonych w realiach miasta z obsługą Google Media.
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="showWebsiteClonerForm.set(!showWebsiteClonerForm())"
                  class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5">
                  <span>🌐</span>
                  <span>{{ showWebsiteClonerForm() ? '✕ Ukryj Klonera' : 'Agent Klonowania Stron WWW' }}</span>
                </button>
                <button
                  type="button"
                  (click)="showYouTubeAgentForm.set(!showYouTubeAgentForm())"
                  class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5">
                  <span>📺</span>
                  <span>{{ showYouTubeAgentForm() ? '✕ Ukryj Agenta YouTube' : 'Agent YouTube (Rekomendacje & Embed)' }}</span>
                </button>
                <button
                  type="button"
                  (click)="showCustomScenarioForm.set(!showCustomScenarioForm())"
                  class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition">
                  {{ showCustomScenarioForm() ? '✕ Ukryj formularz' : '✨ Utwórz Własny Scenariusz' }}
                </button>
              </div>
            </div>

            <!-- Custom Scenario Creation Form (Studio) -->
            <div *ngIf="showCustomScenarioForm()" class="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 space-y-4 animate-fade-in">
              <div class="flex items-center justify-between border-b border-indigo-200/60 dark:border-indigo-800/60 pb-3">
                <h3 class="font-bold text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <span>🎨</span>
                  <span>Studio Scenariusza: Dodaj Własne Zagrożenie / Treść</span>
                </h3>
                <span class="text-[11px] font-mono text-indigo-500">Zintegrowane z Google Cloud TTS & Imagen 3</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Platforma (Mock)</label>
                  <select [(ngModel)]="customScenario.platform_mock" class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold">
                    <option value="sms">📱 SMS Alert</option>
                    <option value="whatsapp">💬 WhatsApp / Messenger</option>
                    <option value="tiktok">🎵 TikTok Mock</option>
                    <option value="instagram">📸 Instagram Post</option>
                    <option value="youtube">📺 YouTube Mock</option>
                    <option value="facebook">👥 Facebook Feed</option>
                    <option value="news">🌐 Portal Informacyjny / Browser</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Kategoria Zagrożenia</label>
                  <select [(ngModel)]="customScenario.threat_category" class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold">
                    <option value="audio_spoof">🎙️ Audio Deepfake / Klonowanie Głosu</option>
                    <option value="video_deepfake">🎬 Wideo Deepfake / Manipulacja</option>
                    <option value="phishing">🎣 Phishing / Wyłudzenie Danych</option>
                    <option value="fake_news">📰 Fake News / Dezinformacja Lokalna</option>
                    <option value="impersonation">🎭 Podszywanie się pod Instytucję</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Tytuł Scenariusza</label>
                  <input type="text" [(ngModel)]="customScenario.title" placeholder="np. Pilny telefon od wnuczka z komisariatu" class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold" />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Autor / Źródło Wiadomości</label>
                  <input type="text" [(ngModel)]="customScenario.author" placeholder="np. Nieznany Numer (+48 ...)" class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Ostrzeżenia (Czerwone Flagi - po przecinku)</label>
                  <input type="text" [(ngModel)]="customScenarioRedFlagsInput" placeholder="Presja czasu, żądanie kodu BLIK, nienaturalny głos" class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold" />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Treść Scenariusza (Tekst Posta / Transkrypcja Dźwięku)</label>
                <textarea [(ngModel)]="customScenario.content" rows="3" placeholder="Wpisz treść wiadomości lub dialogu..." class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"></textarea>
              </div>

              <!-- Media Generation for Custom Scenario -->
              <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="generateMediaForCustomScenario('AUDIO')"
                    [disabled]="isGeneratingCustomMedia() || !customScenario.content.trim()"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition">
                    <span *ngIf="isGeneratingCustomMedia() && customMediaGenType === 'AUDIO'" class="animate-spin">🔄</span>
                    <span *ngIf="!(isGeneratingCustomMedia() && customMediaGenType === 'AUDIO')">🎙️</span>
                    <span>Generuj Głos (Google Cloud TTS)</span>
                  </button>
                  <button
                    type="button"
                    (click)="generateMediaForCustomScenario('IMAGE')"
                    [disabled]="isGeneratingCustomMedia() || !customScenario.content.trim()"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition">
                    <span *ngIf="isGeneratingCustomMedia() && customMediaGenType === 'IMAGE'" class="animate-spin">🔄</span>
                    <span *ngIf="!(isGeneratingCustomMedia() && customMediaGenType === 'IMAGE')">🖼️</span>
                    <span>Generuj Obraz (Google Imagen 3)</span>
                  </button>
                </div>

                <div *ngIf="customScenario.media_url" class="text-xs font-mono text-emerald-500 truncate max-w-sm">
                  Media: {{ customScenario.media_url }}
                </div>
              </div>

              <!-- Media Preview for Custom Scenario -->
              <div *ngIf="customScenario.media_url" class="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div *ngIf="customScenario.media_type === 'audio' || customScenario.media_url.endsWith('.wav') || customScenario.media_url.endsWith('.mp3')">
                  <audio [src]="customScenario.media_url" controls class="w-full h-9"></audio>
                </div>
                <div *ngIf="customScenario.media_type === 'image' || customScenario.media_url.endsWith('.png') || customScenario.media_url.endsWith('.jpg') || customScenario.media_url.endsWith('.svg')" class="flex justify-center">
                  <img [src]="customScenario.media_url" alt="Custom Scenario Media" class="max-h-36 rounded-lg object-contain" />
                </div>
              </div>

              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  (click)="showCustomScenarioForm.set(false)"
                  class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                  Anuluj
                </button>
                <button
                  type="button"
                  (click)="addCustomScenarioToStudio()"
                  [disabled]="!customScenario.title.trim() || !customScenario.content.trim()"
                  class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition">
                  ✓ Dodaj Scenariusz do Listy
                </button>
              </div>
            </div>

            <!-- Website Cloner Agent Form (Studio) -->
            <div *ngIf="showWebsiteClonerForm()" class="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 space-y-4 animate-fade-in">
              <div class="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xl">🌐</span>
                  <div>
                    <h3 class="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                      Autonomiczny Agent Klonowania Stron (Real-to-Spoof Website Cloner)
                    </h3>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">
                      Podaj prawdziwy adres www instytucji — agent przeanalizuje strukturę, wyodrębni tożsamość wizualną i wygeneruje realistyczną kopię phishingową z czerwonymi flagami.
                    </p>
                  </div>
                </div>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold">
                  Phishing Simulator Engine
                </span>
              </div>

              <!-- Preset chips for fast selection -->
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Wybierz popularny cel we Wrocławiu lub wpisz dowolny URL:
                </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    (click)="setClonerPreset('https://www.mpwik.wroc.pl')"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-emerald-500 flex items-center gap-1">
                    <span>💧</span>
                    <span>MPWiK Wrocław (Wodociągi)</span>
                  </button>
                  <button
                    type="button"
                    (click)="setClonerPreset('https://www.wroclaw.pl')"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-emerald-500 flex items-center gap-1">
                    <span>🏛️</span>
                    <span>Wrocław.pl (Portal Miasta)</span>
                  </button>
                  <button
                    type="button"
                    (click)="setClonerPreset('https://tauron-dystrybucja.pl')"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-emerald-500 flex items-center gap-1">
                    <span>⚡</span>
                    <span>TAURON Dystrybucja</span>
                  </button>
                  <button
                    type="button"
                    (click)="setClonerPreset('https://portal.librus.pl')"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-emerald-500 flex items-center gap-1">
                    <span>📚</span>
                    <span>Librus Synergia (E-Dziennik)</span>
                  </button>
                </div>
              </div>

              <!-- URL input and Clone action -->
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  [(ngModel)]="clonerTargetUrl"
                  placeholder="https://www.mpwik.wroc.pl"
                  class="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold outline-none focus:ring-2 focus:ring-emerald-500" />
                <button
                  type="button"
                  (click)="cloneWebsite()"
                  [disabled]="isCloningWebsite() || !clonerTargetUrl.trim()"
                  class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2">
                  <span *ngIf="isCloningWebsite()" class="animate-spin">🔄</span>
                  <span>{{ isCloningWebsite() ? 'Analizowanie i klonowanie...' : '🔍 Sklonuj Stronę' }}</span>
                </button>
              </div>

              <!-- Preview of Generated Cloned Scenario -->
              <div *ngIf="clonedScenarioPreview()" class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 shadow-sm space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">✅</span>
                    <div>
                      <h4 class="font-bold text-xs text-slate-900 dark:text-white">
                        {{ clonedScenarioPreview()!.title }}
                      </h4>
                      <p class="text-[11px] font-mono text-rose-500">
                        Fałszywy adres: {{ clonedScenarioPreview()!.cloned_website?.spoofed_domain }}
                      </p>
                    </div>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Gotowy do dodania
                  </span>
                </div>

                <div class="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div class="font-semibold text-slate-800 dark:text-slate-200 mb-1">Czerwone flagi wygenerowane przez agenta:</div>
                  <ul class="list-disc list-inside space-y-0.5 text-[11px]">
                    <li *ngFor="let rf of clonedScenarioPreview()!.red_flags">{{ rf }}</li>
                  </ul>
                </div>

                <div class="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    (click)="clonedScenarioPreview.set(null)"
                    class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                    Odrzuć
                  </button>
                  <button
                    type="button"
                    (click)="addClonedScenarioToStudio()"
                    class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition">
                    ✓ Dodaj Sklonowaną Witrynę do Scenariuszy
                  </button>
                </div>
              </div>
            </div>

            <!-- YouTube Agent Assistant Card (Studio) -->
            <div *ngIf="showYouTubeAgentForm()" class="p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-300 dark:border-red-800 space-y-4 animate-fade-in">
              <div class="flex items-center justify-between border-b border-red-200/60 dark:border-red-800/60 pb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xl">📺</span>
                  <div>
                    <h3 class="font-bold text-sm text-red-950 dark:text-red-200">
                      Autonomiczny Agent YouTube (Google ADK & Embed)
                    </h3>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">
                      Inteligentny agent ADK wyszukuje autentyczne materiały instruktażowe oraz zmanipulowane filmy (deepfake / oszustwa) dla wybranego tematu i grupy odbiorców.
                    </p>
                  </div>
                </div>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 font-bold">
                  Google ADK Video Grounding
                </span>
              </div>

              <!-- Topic presets -->
              <div>
                <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Wybierz popularny temat edukacyjny lub wpisz własne zagadnienie:
                </label>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    (click)="setYouTubeTopicPreset('Oszustwa na wnuczka i fałszywego policjanta')"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-red-500 flex items-center gap-1">
                    <span>👮</span>
                    <span>Policja & Oszustwa na wnuczka</span>
                  </button>
                  <button
                    type="button"
                    (click)="setYouTubeTopicPreset('Gwarantowane 4500 zł miesięcznie dla seniora z Wrocławia')"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-red-500 flex items-center gap-1">
                    <span>💰</span>
                    <span>Deepfake: Emerytura 4500 zł</span>
                  </button>
                  <button
                    type="button"
                    (click)="setYouTubeTopicPreset('CERT Polska Bezpieczny Senior')"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-red-500 flex items-center gap-1">
                    <span>🛡️</span>
                    <span>CERT Polska (NASK)</span>
                  </button>
                  <button
                    type="button"
                    (click)="setYouTubeTopicPreset('Darmowe Robuxy i kody Brawl Stars glitch')"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-red-500 flex items-center gap-1">
                    <span>🎮</span>
                    <span>Robux Scam & Glitch (Dla Młodzieży)</span>
                  </button>
                  <button
                    type="button"
                    (click)="setYouTubeTopicPreset('Jak powstał Wrocław WCDN')"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-red-500 flex items-center gap-1">
                    <span>🏛️</span>
                    <span>Wrocław WCDN Edukacja</span>
                  </button>
                </div>
              </div>

              <!-- Topic search input -->
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  [(ngModel)]="youtubeTopicInput"
                  placeholder="Wpisz temat wideo, np. Deepfake w inwestycjach lub Bezpieczeństwo seniora"
                  class="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100" />
                <button
                  type="button"
                  (click)="searchYouTubeVideos()"
                  [disabled]="isSearchingYouTube() || !youtubeTopicInput.trim()"
                  class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2">
                  <span *ngIf="isSearchingYouTube()" class="animate-spin">🔄</span>
                  <span>{{ isSearchingYouTube() ? 'Agent ADK przeszukuje...' : '🔍 Zaproponuj Filmy (ADK Agent)' }}</span>
                </button>
              </div>

              <!-- Suggestions List -->
              <div *ngIf="youtubeSuggestions().length > 0" class="space-y-3 pt-2">
                <div class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Rekomendowane filmy dla grupy: <strong>{{ newSession.audience_mode }}</strong> ({{ youtubeSuggestions().length }} wyników)</span>
                  <span class="text-[11px] text-slate-500">Kliknij "Dodaj do Lekcji" aby natychmiast osadzić wideo</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    *ngFor="let sug of youtubeSuggestions()"
                    class="p-4 rounded-xl border bg-white dark:bg-slate-900 flex flex-col justify-between gap-3 shadow-xs"
                    [ngClass]="sug.is_authentic ? 'border-emerald-300 dark:border-emerald-800/80' : 'border-red-300 dark:border-red-800/80'">
                    <div>
                      <div class="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          [ngClass]="sug.is_authentic ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'"
                          class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          {{ sug.is_authentic ? '✓ Autentyczny Instruktaż' : '⚠️ Deepfake / Oszustwo' }}
                        </span>
                        <span class="text-[10px] font-mono text-slate-500">{{ sug.threat_category }}</span>
                      </div>

                      <h4 class="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                        {{ sug.title }}
                      </h4>

                      <div class="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <span class="font-semibold">{{ sug.channel_title }}</span>
                        <span>•</span>
                        <span class="font-mono">{{ sug.video_id }}</span>
                      </div>

                      <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                        {{ sug.summary }}
                      </p>

                      <div class="mt-2 text-[10px] bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <strong>Cel dydaktyczny:</strong> {{ sug.pedagogical_relevance }}
                      </div>
                    </div>

                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <a
                        [href]="sug.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                        <span>▶ Podgląd</span>
                        <span>↗</span>
                      </a>
                      <button
                        type="button"
                        (click)="addYouTubeSuggestionToStudio(sug)"
                        [disabled]="isCreatingYouTubeScenario()"
                        class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1">
                        <span>➕ Dodaj do Scenariuszy Lekcji</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Manual Custom YouTube URL Embed Section -->
              <div class="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 mt-2">
                <div class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>🔗</span>
                  <span>Osadź Dowolny Film z YouTube (Wklej URL lub ID)</span>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    [(ngModel)]="customYouTubeUrlInput"
                    placeholder="np. https://www.youtube.com/watch?v=8aQ6JpW9p10 lub samo ID wideo"
                    class="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono" />
                  
                  <div class="flex items-center gap-2">
                    <label class="flex items-center gap-1 text-xs cursor-pointer select-none">
                      <input type="checkbox" [(ngModel)]="customYouTubeAuthentic" class="rounded text-red-600 focus:ring-0" />
                      <span>Autentyczny</span>
                    </label>
                    <button
                      type="button"
                      (click)="createCustomYouTubeScenario()"
                      [disabled]="isCreatingYouTubeScenario() || !customYouTubeUrlInput.trim()"
                      class="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition">
                      Osadź Wideo
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Scenarios Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                *ngFor="let sc of proposedScenarios()"
                class="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-950 flex flex-col justify-between gap-3 shadow-sm"
                [ngClass]="isScenarioSelected(sc.id) ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-200 dark:border-slate-800'">
                <div>
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ sc.platform_mock }}
                    </span>
                    <span class="text-[10px] font-mono text-indigo-500 font-bold">
                      {{ sc.threat_category }}
                    </span>
                  </div>

                  <h3 class="font-bold text-sm text-slate-900 dark:text-white">{{ sc.title }}</h3>
                  <div class="text-xs text-slate-500 font-semibold mt-0.5">Autor: {{ sc.author }}</div>
                  <p class="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                    {{ sc.content }}
                  </p>

                  <div class="mt-3 flex flex-wrap gap-1">
                    <span *ngFor="let rf of sc.red_flags" class="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20">
                      🚩 {{ rf }}
                    </span>
                  </div>

                  <!-- Google Media Player / Preview if attached -->
                  <div *ngIf="sc.media_url" class="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div class="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-mono">
                      <span class="text-indigo-500 font-semibold">✨ Google Media ({{ sc.media_type || 'asset' }}):</span>
                      <span class="truncate max-w-[160px]">{{ sc.media_url }}</span>
                    </div>
                    <div *ngIf="sc.media_type === 'audio' || sc.media_url.endsWith('.wav') || sc.media_url.endsWith('.mp3')">
                      <audio [src]="sc.media_url" controls class="w-full h-8 mt-1"></audio>
                    </div>
                    <div *ngIf="sc.media_type === 'image' || sc.media_url.endsWith('.png') || sc.media_url.endsWith('.jpg') || sc.media_url.endsWith('.svg')" class="flex justify-center mt-1">
                      <img [src]="sc.media_url" alt="Visual asset" class="max-h-24 rounded object-contain" />
                    </div>
                    <div *ngIf="sc.platform_mock === 'YOUTUBE' || (sc.media_url && (sc.media_url.includes('youtube') || sc.media_url.includes('youtu.be')))" class="mt-1 flex items-center justify-between text-xs bg-red-50 dark:bg-red-950/40 p-2 rounded-lg text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                      <span class="flex items-center gap-1 font-semibold">
                        <span>▶</span>
                        <span>Wideo YouTube osadzone w scenariuszu</span>
                      </span>
                      <a [href]="sc.media_url" target="_blank" rel="noopener noreferrer" class="font-bold underline text-[11px]">
                        Otwórz ↗
                      </a>
                    </div>
                  </div>

                  <!-- Google Cloud Media Generation Buttons on each card -->
                  <div class="mt-3 flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      (click)="generateMediaForScenario(sc, 'AUDIO')"
                      [disabled]="generatingScenarioMedia()[sc.id]"
                      class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1 transition">
                      <span *ngIf="generatingScenarioMedia()[sc.id] === 'AUDIO'" class="animate-spin">🔄</span>
                      <span *ngIf="generatingScenarioMedia()[sc.id] !== 'AUDIO'">🎙️</span>
                      <span>{{ generatingScenarioMedia()[sc.id] === 'AUDIO' ? 'Generowanie TTS...' : 'Google TTS (Głos)' }}</span>
                    </button>
                    <button
                      type="button"
                      (click)="generateMediaForScenario(sc, 'IMAGE')"
                      [disabled]="generatingScenarioMedia()[sc.id]"
                      class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition">
                      <span *ngIf="generatingScenarioMedia()[sc.id] === 'IMAGE'" class="animate-spin">🔄</span>
                      <span *ngIf="generatingScenarioMedia()[sc.id] !== 'IMAGE'">🖼️</span>
                      <span>{{ generatingScenarioMedia()[sc.id] === 'IMAGE' ? 'Generowanie...' : 'Google Imagen 3' }}</span>
                    </button>
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span class="text-[11px] font-mono text-slate-400">ID: {{ sc.id }}</span>
                  <button
                    type="button"
                    (click)="toggleScenarioSelection(sc)"
                    [ngClass]="isScenarioSelected(sc.id) ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition">
                    {{ isScenarioSelected(sc.id) ? '✓ Wybrany' : '+ Dodaj do warsztatu' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                (click)="wizardStep.set(1)"
                class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                ← Wstecz
              </button>
              <button
                type="button"
                (click)="wizardStep.set(3)"
                [disabled]="selectedScenarios.length === 0"
                class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition">
                Dalej: Zarządzanie Uczestnikami ({{ selectedScenarios.length }} scenariuszy) →
              </button>
            </div>
          </div>

          <!-- STEP 3: Participant Roster & Credentials Management -->
          <div *ngIf="wizardStep() === 3" class="flex flex-col gap-6 max-w-3xl">
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <strong>Zarządzanie uczestnikami:</strong> Dodaj uczestników. Hasło jest opcjonalne (wystarczy nazwa użytkownika). Możesz również ustawić indywidualne nadpisanie języka interfejsu (np. uczeń z Ukrainy w polskiej sesji ma interfejs po ukraińsku, a scenariusz pozostaje w języku sesji).
            </div>

            <!-- Add Participant Form -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
              <div class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                + Dodaj Nowego Uczestnika
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  [(ngModel)]="newParticipant.username"
                  placeholder="Nazwa (np. Senior_Jan)"
                  class="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold outline-none" />
                <input
                  type="text"
                  [(ngModel)]="newParticipant.display_name"
                  placeholder="Imię i nazwisko / opis"
                  class="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold outline-none" />
                <input
                  type="password"
                  [(ngModel)]="newParticipant.password"
                  placeholder="Hasło (opcjonalne)"
                  class="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold outline-none" />
                <select
                  [(ngModel)]="newParticipant.ui_language_override"
                  class="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold outline-none">
                  <option [ngValue]="null">Język sesji ({{ newSession.language }})</option>
                  <option value="pl">Polski (PL)</option>
                  <option value="en">English (EN)</option>
                  <option value="uk">Українська (UK)</option>
                  <option value="de">Deutsch (DE)</option>
                </select>
              </div>
              <div class="flex justify-end">
                <button
                  type="button"
                  (click)="addParticipantToRoster()"
                  [disabled]="!newParticipant.username"
                  class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition">
                  Dodaj do Listy
                </button>
              </div>
            </div>

            <!-- Participants Roster Table -->
            <div class="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 dark:bg-slate-950 font-mono uppercase text-slate-500">
                  <tr>
                    <th class="p-3">Login (Username)</th>
                    <th class="p-3">Wyświetlana Nazwa</th>
                    <th class="p-3">Hasło</th>
                    <th class="p-3">Nadpisanie Języka UI</th>
                    <th class="p-3 text-right">Usuń</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr *ngFor="let p of rosterList">
                    <td class="p-3 font-mono font-bold text-slate-900 dark:text-white">{{ p.username }}</td>
                    <td class="p-3">{{ p.display_name || '—' }}</td>
                    <td class="p-3 text-slate-400 font-mono">{{ p.password ? '••••••••' : '(Bez hasła - token)' }}</td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-200 dark:bg-slate-800">
                        {{ p.ui_language_override || newSession.language }}
                      </span>
                    </td>
                    <td class="p-3 text-right">
                      <button (click)="removeParticipant(p.username)" class="text-red-500 font-bold hover:underline">
                        Usuń
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="rosterList.length === 0">
                    <td colspan="5" class="p-4 text-center text-slate-400 italic">
                      Brak uczestników na liście. Dodaj powyżej lub zezwól na dołączanie kodem otwartym.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                (click)="wizardStep.set(2)"
                class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                ← Wstecz do Scenariuszy
              </button>
              <button
                type="button"
                (click)="wizardStep.set(4)"
                class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition">
                Dalej: Podsumowanie i Publikacja →
              </button>
            </div>
          </div>

          <!-- STEP 4: Review & Publish Workshop -->
          <div *ngIf="wizardStep() === 4" class="flex flex-col gap-6 max-w-2xl">
            <div class="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col gap-3">
              <h3 class="font-bold text-sm text-indigo-900 dark:text-indigo-200">
                Podsumowanie Konfiguracji Warsztatu
              </h3>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div><strong>Tytuł:</strong> {{ newSession.title }}</div>
                <div><strong>Grupa docelowa:</strong> {{ newSession.audience_mode }}</div>
                <div><strong>Lokalizacja:</strong> 📍 {{ newSession.location_name }}</div>
                <div><strong>Język sesji:</strong> {{ newSession.language }}</div>
                <div><strong>Wybrane scenariusze:</strong> {{ selectedScenarios.length }} szt.</div>
                <div><strong>Zdefiniowani uczestnicy:</strong> {{ rosterList.length }} osób</div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                (click)="wizardStep.set(3)"
                class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                ← Wstecz
              </button>
              <button
                type="button"
                (click)="publishSession()"
                [disabled]="isPublishing()"
                class="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xl transition flex items-center gap-2">
                <span *ngIf="isPublishing()" class="animate-spin">🔄</span>
                <span>{{ isPublishing() ? 'Publikowanie...' : '🚀 Opublikuj Sesję Warsztatową' }}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `
})
export class SupervisorConsoleComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  public locale = inject(LocaleService);
  public auth = inject(AuthService);

  activeTab = signal<'sessions' | 'wizard'>('sessions');
  wizardStep = signal<number>(1);
  sessions = signal<SessionData[]>([]);

  isResearching = signal<boolean>(false);
  isPublishing = signal<boolean>(false);

  newSession = {
    title: 'Cyber-Obrona Seniorów we Wrocławiu 2026',
    location_name: 'Wrocław',
    language: 'pl',
    audience_mode: 'seniors',
    max_ticks: 40
  };

  proposedScenarios = signal<StudioScenario[]>([]);
  selectedScenarios: StudioScenario[] = [];

  // Studio Custom Scenario & Google Media Generation State
  showCustomScenarioForm = signal<boolean>(false);
  showWebsiteClonerForm = signal<boolean>(false);
  showYouTubeAgentForm = signal<boolean>(false);
  clonerTargetUrl = 'https://www.mpwik.wroc.pl';
  isCloningWebsite = signal<boolean>(false);
  clonedScenarioPreview = signal<StudioScenario | null>(null);

  // YouTube Agent Assistant State
  isSearchingYouTube = signal<boolean>(false);
  isCreatingYouTubeScenario = signal<boolean>(false);
  youtubeTopicInput = 'Oszustwa na wnuczka i fałszywe inwestycje';
  customYouTubeUrlInput = '';
  customYouTubeAuthentic = false;
  youtubeSuggestions = signal<YouTubeSuggestion[]>([]);
  generatingScenarioMedia = signal<Record<string, string>>({});
  isGeneratingCustomMedia = signal<boolean>(false);
  customMediaGenType: 'AUDIO' | 'IMAGE' = 'AUDIO';
  customScenarioRedFlagsInput = '';
  customScenario: StudioScenario = {
    id: '',
    platform_mock: 'whatsapp',
    threat_category: 'audio_spoof',
    author: 'Nieznany Numer (+48 ...)',
    author_handle: '@unknown',
    author_avatar: '💬',
    verified: false,
    title: '',
    content: '',
    media_url: '',
    media_type: 'audio',
    red_flags: ['Presja czasu', 'Nietypowe żądanie pieniędzy'],
    safe_action_advice: 'Zadzwoń do osoby bezpośrednio na jej znany, stały numer telefonu.',
    is_authentic: false
  };

  newParticipant: { username: string; display_name: string; password?: string; ui_language_override?: string | null } = {
    username: '',
    display_name: '',
    password: '',
    ui_language_override: null
  };
  rosterList: StudioParticipant[] = [];

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.http.get<SessionData[]>('/api/v1/sessions').subscribe({
      next: (res) => this.sessions.set(res),
      error: (err) => console.error('Failed to load sessions:', err)
    });
  }

  startWizard(): void {
    this.activeTab.set('wizard');
    this.wizardStep.set(1);
    this.fetchProposedScenarios();
  }

  getStepTitle(step: number): string {
    switch (step) {
      case 1: return '1. Zdefiniuj Cel, Lokalizację i Grupę Docelową';
      case 2: return '2. Wybierz Scenariusze (Badanie Zagrożeń dla ' + this.newSession.location_name + ')';
      case 3: return '3. Lista Uczestników i Nadpisania Językowe';
      case 4: return '4. Weryfikacja i Publikacja Warsztatu';
      default: return '';
    }
  }

  fetchProposedScenarios(): void {
    this.isResearching.set(true);
    this.http.post<{ scenarios: StudioScenario[] }>('/api/v1/studio/propose-scenarios', {
      location_name: this.newSession.location_name,
      audience_mode: this.newSession.audience_mode,
      language: this.newSession.language
    }).subscribe({
      next: (res) => {
        this.proposedScenarios.set(res.scenarios);
        this.selectedScenarios = [...res.scenarios];
        this.isResearching.set(false);
        this.wizardStep.set(2);
      },
      error: (err) => {
        console.error('Failed to propose scenarios:', err);
        this.isResearching.set(false);
        this.wizardStep.set(2);
      }
    });
  }

  isScenarioSelected(id: string): boolean {
    return this.selectedScenarios.some((s) => s.id === id);
  }

  toggleScenarioSelection(sc: StudioScenario): void {
    if (this.isScenarioSelected(sc.id)) {
      this.selectedScenarios = this.selectedScenarios.filter((s) => s.id !== sc.id);
    } else {
      this.selectedScenarios.push(sc);
    }
  }

  generateMediaForScenario(sc: StudioScenario, mediaType: 'AUDIO' | 'IMAGE'): void {
    const current = { ...this.generatingScenarioMedia() };
    current[sc.id] = mediaType;
    this.generatingScenarioMedia.set(current);

    const voicePersona = this.newSession.audience_mode === 'seniors'
      ? (sc.threat_category === 'audio_spoof' ? 'grandchild_distress' : 'authority_mayor')
      : (this.newSession.audience_mode === 'kids' ? 'youtuber_gamer' : 'authority_mayor');

    this.http.post<any>('/api/v1/studio/generate-media', {
      media_type: mediaType,
      prompt_or_text: sc.content || sc.title,
      language: this.newSession.language,
      voice_persona: voicePersona,
      scenario_title: sc.title
    }).subscribe({
      next: (res) => {
        sc.media_url = res.media_url;
        sc.media_type = res.media_type.toLowerCase();
        // Update selected scenario copy if it exists
        const match = this.selectedScenarios.find((s) => s.id === sc.id);
        if (match) {
          match.media_url = res.media_url;
          match.media_type = res.media_type.toLowerCase();
        }
        const updated = { ...this.generatingScenarioMedia() };
        delete updated[sc.id];
        this.generatingScenarioMedia.set(updated);
      },
      error: (err) => {
        console.error('Failed to generate media for scenario:', err);
        const updated = { ...this.generatingScenarioMedia() };
        delete updated[sc.id];
        this.generatingScenarioMedia.set(updated);
        alert('Błąd generowania multimediów przez Google Cloud: ' + (err.error?.detail || err.message));
      }
    });
  }

  generateMediaForCustomScenario(mediaType: 'AUDIO' | 'IMAGE'): void {
    this.isGeneratingCustomMedia.set(true);
    this.customMediaGenType = mediaType;

    const voicePersona = this.newSession.audience_mode === 'seniors'
      ? 'grandchild_distress'
      : (this.newSession.audience_mode === 'kids' ? 'youtuber_gamer' : 'authority_mayor');

    this.http.post<any>('/api/v1/studio/generate-media', {
      media_type: mediaType,
      prompt_or_text: this.customScenario.content || this.customScenario.title,
      language: this.newSession.language,
      voice_persona: voicePersona,
      scenario_title: this.customScenario.title
    }).subscribe({
      next: (res) => {
        this.customScenario.media_url = res.media_url;
        this.customScenario.media_type = res.media_type.toLowerCase();
        this.isGeneratingCustomMedia.set(false);
      },
      error: (err) => {
        console.error('Failed to generate media for custom scenario:', err);
        this.isGeneratingCustomMedia.set(false);
        alert('Błąd generowania multimediów: ' + (err.error?.detail || err.message));
      }
    });
  }

  addCustomScenarioToStudio(): void {
    if (!this.customScenario.title.trim() || !this.customScenario.content.trim()) return;

    const redFlags = this.customScenarioRedFlagsInput
      ? this.customScenarioRedFlagsInput.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Weryfikacja tożsamości', 'Podejrzany kontakt'];

    const newSc: StudioScenario = {
      ...this.customScenario,
      id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      red_flags: redFlags
    };

    const currentProposed = [...this.proposedScenarios()];
    currentProposed.unshift(newSc);
    this.proposedScenarios.set(currentProposed);
    this.selectedScenarios.unshift(newSc);

    this.showCustomScenarioForm.set(false);
    this.customScenario = {
      id: '',
      platform_mock: 'whatsapp',
      threat_category: 'audio_spoof',
      author: 'Nieznany Numer (+48 ...)',
      author_handle: '@unknown',
      author_avatar: '💬',
      verified: false,
      title: '',
      content: '',
      media_url: '',
      media_type: 'audio',
      red_flags: ['Presja czasu', 'Nietypowe żądanie pieniędzy'],
      safe_action_advice: 'Zadzwoń do osoby bezpośrednio na jej znany, stały numer telefonu.',
      is_authentic: false
    };
    this.customScenarioRedFlagsInput = '';
  }

  setClonerPreset(url: string): void {
    this.clonerTargetUrl = url;
    this.cloneWebsite();
  }

  cloneWebsite(): void {
    if (!this.clonerTargetUrl.trim()) return;
    this.isCloningWebsite.set(true);

    this.http.post<StudioScenario>('/api/v1/studio/clone-website', {
      url: this.clonerTargetUrl.trim(),
      audience_mode: this.newSession.audience_mode,
      language: this.newSession.language,
      threat_type: 'PHISHING'
    }).subscribe({
      next: (res) => {
        this.isCloningWebsite.set(false);
        this.clonedScenarioPreview.set(res);
      },
      error: (err) => {
        this.isCloningWebsite.set(false);
        console.error('Failed to clone website:', err);
        alert('Błąd klonowania strony: ' + (err.error?.detail || err.message));
      }
    });
  }

  addClonedScenarioToStudio(): void {
    const sc = this.clonedScenarioPreview();
    if (!sc) return;

    const currentProposed = [...this.proposedScenarios()];
    currentProposed.unshift(sc);
    this.proposedScenarios.set(currentProposed);
    this.selectedScenarios.unshift(sc);

    this.clonedScenarioPreview.set(null);
    this.showWebsiteClonerForm.set(false);
  }

  setYouTubeTopicPreset(topic: string): void {
    this.youtubeTopicInput = topic;
    this.searchYouTubeVideos();
  }

  searchYouTubeVideos(): void {
    if (!this.youtubeTopicInput.trim()) return;
    this.isSearchingYouTube.set(true);

    this.http.post<SuggestYouTubeVideosResponse>('/api/v1/studio/suggest-youtube-videos', {
      topic: this.youtubeTopicInput.trim(),
      audience_mode: this.newSession.audience_mode,
      location_name: this.newSession.location_name,
      language: this.newSession.language,
      count: 4
    }).subscribe({
      next: (res) => {
        this.isSearchingYouTube.set(false);
        this.youtubeSuggestions.set(res.suggestions || []);
      },
      error: (err) => {
        this.isSearchingYouTube.set(false);
        console.error('Failed to search YouTube videos:', err);
        alert('Błąd wyszukiwania YouTube Agent: ' + (err.error?.detail || err.message));
      }
    });
  }

  addYouTubeSuggestionToStudio(suggestion: YouTubeSuggestion): void {
    this.isCreatingYouTubeScenario.set(true);
    this.http.post<StudioScenario>('/api/v1/studio/create-youtube-scenario', {
      youtube_url_or_id: suggestion.embed_url || suggestion.video_id,
      title: suggestion.title,
      channel_title: suggestion.channel_title,
      is_authentic: suggestion.is_authentic,
      audience_mode: this.newSession.audience_mode,
      location_name: this.newSession.location_name,
      language: this.newSession.language
    }).subscribe({
      next: (scenario) => {
        this.isCreatingYouTubeScenario.set(false);
        const current = [...this.proposedScenarios()];
        current.unshift(scenario);
        this.proposedScenarios.set(current);
        this.selectedScenarios.unshift(scenario);
        this.showYouTubeAgentForm.set(false);
      },
      error: (err) => {
        this.isCreatingYouTubeScenario.set(false);
        console.error('Failed to create YouTube scenario:', err);
        alert('Błąd tworzenia scenariusza: ' + (err.error?.detail || err.message));
      }
    });
  }

  createCustomYouTubeScenario(): void {
    if (!this.customYouTubeUrlInput.trim()) return;
    this.isCreatingYouTubeScenario.set(true);
    this.http.post<StudioScenario>('/api/v1/studio/create-youtube-scenario', {
      youtube_url_or_id: this.customYouTubeUrlInput.trim(),
      is_authentic: this.customYouTubeAuthentic,
      audience_mode: this.newSession.audience_mode,
      location_name: this.newSession.location_name,
      language: this.newSession.language
    }).subscribe({
      next: (scenario) => {
        this.isCreatingYouTubeScenario.set(false);
        const current = [...this.proposedScenarios()];
        current.unshift(scenario);
        this.proposedScenarios.set(current);
        this.selectedScenarios.unshift(scenario);
        this.customYouTubeUrlInput = '';
        this.showYouTubeAgentForm.set(false);
      },
      error: (err) => {
        this.isCreatingYouTubeScenario.set(false);
        console.error('Failed to create custom YouTube scenario:', err);
        alert('Błąd osadzania wideo YouTube: ' + (err.error?.detail || err.message));
      }
    });
  }

  addParticipantToRoster(): void {
    if (!this.newParticipant.username.trim()) return;
    this.rosterList.push({
      username: this.newParticipant.username.trim(),
      display_name: this.newParticipant.display_name.trim() || this.newParticipant.username.trim(),
      password: this.newParticipant.password?.trim() || '',
      ui_language_override: this.newParticipant.ui_language_override || undefined
    });
    this.newParticipant = { username: '', display_name: '', password: '', ui_language_override: null };
  }

  removeParticipant(username: string): void {
    this.rosterList = this.rosterList.filter((p) => p.username !== username);
  }

  publishSession(): void {
    this.isPublishing.set(true);
    const rosterMap: Record<string, StudioParticipant> = {};
    for (const p of this.rosterList) {
      rosterMap[p.username] = p;
    }

    const payload = {
      title: this.newSession.title,
      audience_mode: this.newSession.audience_mode,
      location_name: this.newSession.location_name,
      language: this.newSession.language,
      max_ticks: this.newSession.max_ticks,
      scenarios: this.selectedScenarios,
      roster: rosterMap
    };

    this.http.post<SessionData>('/api/v1/sessions', payload).subscribe({
      next: (sess) => {
        this.isPublishing.set(false);
        this.loadSessions();
        this.activeTab.set('sessions');
      },
      error: (err) => {
        console.error('Failed to publish session:', err);
        this.isPublishing.set(false);
      }
    });
  }

  countAudience(mode: string): number {
    return this.sessions().filter((s) => s.audience_mode === mode).length;
  }

  getPlatformsList(scenarios?: StudioScenario[]): string {
    if (!scenarios || scenarios.length === 0) return '';
    const platforms = Array.from(new Set(scenarios.map((s) => s.platform_mock)));
    return platforms.join(', ');
  }

  getRosterCount(roster?: Record<string, StudioParticipant>): number {
    return roster ? Object.keys(roster).length : 0;
  }
}
