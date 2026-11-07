import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { WhatsAppMockComponent } from '../../shared/components/whatsapp-mock/whatsapp-mock.component';
import { TikTokMockComponent } from '../../shared/components/tiktok-mock/tiktok-mock.component';
import { FacebookMockComponent } from '../../shared/components/facebook-mock/facebook-mock.component';
import { YouTubeMockComponent } from '../../shared/components/youtube-mock/youtube-mock.component';
import { BrowserMockComponent } from '../../shared/components/browser-mock/browser-mock.component';

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
  educational_goal?: string;
  manipulation_technique?: string;
  learning_points?: string[];
  cloned_website?: any;
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

export interface TrainerBroadcast {
  id: string;
  message?: string;
  text?: string;
  severity?: 'info' | 'warning' | 'hint' | string;
  urgency?: 'info' | 'warning' | 'hint' | string;
  timestamp: string | number;
  target_audience?: string;
}

export interface ParticipantSubmission {
  id: string;
  participant_id?: string;
  username?: string;
  scenario_id: string;
  verdict: 'authentic' | 'threat' | 'suspicious' | 'SCAM' | 'AUTHENTIC' | string;
  is_correct?: boolean;
  score_awarded?: number;
  selected_flags?: string[];
  flagged_elements?: string[];
  safe_action_chosen?: string;
  timestamp: string | number;
}

export interface SessionDetails {
  id: string;
  title: string;
  audience_mode: string;
  location_name: string;
  language: string;
  status: string;
  phase?: 'LEARNING' | 'TESTING' | 'COMPLETED';
  phase_timer_seconds?: number;
  phase_timer_running?: boolean;
  learning_duration_minutes?: number;
  testing_duration_minutes?: number;
  current_tick: number;
  max_ticks: number;
  trainer_token?: string;
  scenarios: StudioScenario[];
  roster: Record<string, StudioParticipant>;
  broadcast_hints: TrainerBroadcast[];
  submissions: ParticipantSubmission[];
}

@Component({
  selector: 'app-trainer-cockpit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    WhatsAppMockComponent,
    TikTokMockComponent,
    FacebookMockComponent,
    YouTubeMockComponent,
    BrowserMockComponent,
  ],
  template: `
    <div class="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-6 flex flex-col gap-6">
      <!-- Top Navigation Bar -->
      <header class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl shadow-inner">
            🎓
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-black tracking-tight text-white">
                Kokpit Trenera (Trainer Cockpit)
              </h1>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Prowadzący Warsztaty
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5" *ngIf="session()">
              Sesja: <span class="font-bold text-white">{{ session()?.title }}</span> (ID: <code class="text-amber-400 font-mono">{{ session()?.id }}</code>)
            </p>
          </div>
        </div>

        <!-- Mode Toggles & Action Controls -->
        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="toggleProjectorMode()"
            [ngClass]="projectorMode() ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'"
            class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer">
            <span>📽️</span>
            <span>{{ projectorMode() ? 'Zamknij Projektor' : 'Widok Projektora (Sala)' }}</span>
          </button>

          <a
            [routerLink]="['/play', sessionId()]"
            target="_blank"
            class="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 transition flex items-center gap-2"
            title="Otwórz widok uczestnika w nowej karcie">
            <span>🎮 Otwórz Widok Uczestnika ↗</span>
          </a>

          <a
            routerLink="/supervisor"
            class="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
            👑 Studio Nadzorcy
          </a>
        </div>
      </header>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="py-20 text-center text-slate-400">
        <div class="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-sm">Ładowanie sesji szkoleniowej...</p>
      </div>

      <div *ngIf="!isLoading() && session()" class="flex flex-col gap-6">

        <!-- ======================================================== -->
        <!-- CLASSROOM PEDAGOGIC PHASE & TIMER CONTROLLER BANNER     -->
        <!-- ======================================================== -->
        <div class="bg-gradient-to-r from-slate-800 via-indigo-950/70 to-slate-800 border-2 border-indigo-500/40 rounded-2xl p-5 shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-4">

            <!-- Phase Indicator -->
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border"
                [ngClass]="activePhase() === 'LEARNING' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'">
                {{ activePhase() === 'LEARNING' ? '🌱' : '⏱️' }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs uppercase font-bold tracking-widest text-indigo-300">Aktywny Etap Szkolenia:</span>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-black uppercase"
                    [ngClass]="activePhase() === 'LEARNING' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'">
                    {{ activePhase() === 'LEARNING' ? '1. NAUKA I ANALIZA (20 MIN)' : '2. TEST WIEDZY (10 MIN)' }}
                  </span>
                </div>
                <p class="text-xs text-slate-300 mt-1">
                  {{ activePhase() === 'LEARNING'
                    ? 'Uczestnicy spokojnie badają dowody, odsłuchują nagrania i analizują czerwone flagi (brak punktowania).'
                    : 'Uczestnicy wypełniają test sprawdzający wiedzę z limitem 10 minut (zbieranie punktów i ocena).'
                  }}
                </p>
              </div>
            </div>

            <!-- Central Countdown Timer & Controls -->
            <div class="flex items-center gap-3">
              <div class="bg-slate-950 border border-slate-700 px-5 py-2.5 rounded-2xl text-center shadow-inner">
                <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Czas dla Sali</span>
                <span class="text-3xl font-black font-mono tracking-tight"
                  [ngClass]="activePhase() === 'LEARNING' ? 'text-emerald-400' : 'text-rose-400 animate-pulse'">
                  {{ formattedTime() }}
                </span>
              </div>

              <div class="flex flex-col gap-1.5">
                <button
                  type="button"
                  (click)="toggleTimer()"
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  [ngClass]="timerRunning() ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'">
                  <span>{{ timerRunning() ? '⏸ Wstrzymaj' : '▶ Wznów Czas' }}</span>
                </button>
                <button
                  type="button"
                  (click)="addMinutes(2)"
                  class="px-3 py-1 rounded-xl text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer">
                  +2 minuty
                </button>
              </div>
            </div>

            <!-- Phase Switcher Buttons -->
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                (click)="setPhase('LEARNING')"
                [disabled]="activePhase() === 'LEARNING'"
                class="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                [ngClass]="activePhase() === 'LEARNING'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'">
                <span>📖</span>
                <span>Faza Nauki (20 min)</span>
              </button>

              <button
                type="button"
                (click)="setPhase('TESTING')"
                [disabled]="activePhase() === 'TESTING'"
                class="px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                [ngClass]="activePhase() === 'TESTING'
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'">
                <span>⚡</span>
                <span>Przełącz Salę na Test (10 min)</span>
              </button>
            </div>

          </div>
        </div>

        <!-- PROJECTOR VIEW (When active) -->
        <div *ngIf="projectorMode()" class="bg-slate-950 border-2 border-indigo-500/50 rounded-2xl p-6 shadow-2xl relative">
          <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div class="flex items-center gap-3">
              <span class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              <span class="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
                PROJEKTOR DLA SALI • {{ activePhase() === 'LEARNING' ? 'NAUKA' : 'TEST' }} • SCENARIUSZ {{ activeScenarioIndex() + 1 }} Z {{ scenarios().length }}
              </span>
              <span class="text-sm font-bold text-white ml-2">
                {{ activeScenario()?.title }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="revealTeacherFlags.set(!revealTeacherFlags())"
                [ngClass]="revealTeacherFlags() ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer">
                🔍 {{ revealTeacherFlags() ? 'Ukryj Odpowiedzi' : 'Pokaż Odpowiedzi i Wskazówki' }}
              </button>
              <button
                type="button"
                (click)="projectorMode.set(false)"
                class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                ✕ Zamknij
              </button>
            </div>
          </div>

          <!-- Active Platform Mock Rendered Large for the Classroom -->
          <div class="py-4 flex justify-center">
            <div class="w-full max-w-2xl" [ngSwitch]="activeScenario()?.platform_mock?.toLowerCase()">
              <app-whatsapp-mock
                *ngSwitchCase="'whatsapp'"
                [author]="activeScenario()!.author"
                [authorAvatar]="activeScenario()!.author_avatar || ''"
                [verified]="activeScenario()!.verified"
                [content]="activeScenario()!.content"
                [mediaUrl]="activeScenario()!.media_url || ''"
                [redFlags]="activeScenario()!.red_flags">
              </app-whatsapp-mock>

              <app-tiktok-mock
                *ngSwitchCase="'tiktok'"
                [author]="activeScenario()!.author"
                [authorHandle]="activeScenario()!.author_handle || ''"
                [authorAvatar]="activeScenario()!.author_avatar || ''"
                [verified]="activeScenario()!.verified"
                [title]="activeScenario()!.title"
                [content]="activeScenario()!.content"
                [mediaUrl]="activeScenario()!.media_url || ''"
                [redFlags]="activeScenario()!.red_flags">
              </app-tiktok-mock>

              <app-facebook-mock
                *ngSwitchCase="'facebook'"
                [author]="activeScenario()!.author"
                [authorAvatar]="activeScenario()!.author_avatar || ''"
                [title]="activeScenario()!.title"
                [content]="activeScenario()!.content"
                [mediaUrl]="activeScenario()!.media_url || ''"
                [redFlags]="activeScenario()!.red_flags">
              </app-facebook-mock>

              <app-youtube-mock
                *ngSwitchCase="'youtube'"
                [author]="activeScenario()!.author"
                [authorHandle]="activeScenario()!.author_handle || ''"
                [authorAvatar]="activeScenario()!.author_avatar || ''"
                [title]="activeScenario()!.title"
                [content]="activeScenario()!.content"
                [mediaUrl]="activeScenario()!.media_url || ''"
                [isAuthentic]="activeScenario()!.is_authentic"
                [redFlags]="activeScenario()!.red_flags">
              </app-youtube-mock>

              <app-browser-mock
                *ngSwitchDefault
                [title]="activeScenario()!.title"
                [author]="activeScenario()!.author"
                [content]="activeScenario()!.content"
                [clonedWebsite]="activeScenario()!.cloned_website"
                [isAuthentic]="activeScenario()!.is_authentic"
                [mediaUrl]="activeScenario()!.media_url"
                [redFlags]="activeScenario()!.red_flags">
              </app-browser-mock>
            </div>
          </div>

          <!-- Teacher Explanation Box -->
          <div *ngIf="revealTeacherFlags() && activeScenario()" class="mt-6 p-4 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200">
            <h3 class="font-bold text-sm text-amber-300 flex items-center gap-2 mb-2">
              <span>💡 Wskazówki dydaktyczne dla sali:</span>
            </h3>
            <ul class="list-disc list-inside space-y-1 text-xs text-amber-100">
              <li *ngFor="let flag of activeScenario()!.red_flags">
                <span class="font-semibold">{{ flag }}</span>
              </li>
            </ul>
            <div class="mt-3 pt-3 border-t border-amber-800/40 text-xs">
              <span class="font-bold text-amber-300">Bezpieczna reakcja:</span> {{ activeScenario()!.safe_action_advice }}
            </div>
          </div>
        </div>

        <!-- CONTROL PANEL & STATUS BAR -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Col 1: Stepper Controls -->
          <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h2 class="font-bold text-sm text-white flex items-center gap-2">
                <span>⏱️</span>
                <span>Nawigacja po Scenariuszach</span>
              </h2>
              <span
                class="px-2.5 py-1 rounded-full text-xs font-black uppercase"
                [ngClass]="{
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40': session()?.status === 'ACTIVE',
                  'bg-amber-500/20 text-amber-300 border border-amber-500/40': session()?.status === 'PAUSED',
                  'bg-blue-500/20 text-blue-300 border border-blue-500/40': session()?.status === 'LOBBY',
                  'bg-slate-700 text-slate-300': session()?.status === 'COMPLETED'
                }">
                Status: {{ session()?.status }}
              </span>
            </div>

            <!-- Audience & Location Badge -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="px-2.5 py-1 rounded-lg bg-indigo-900/40 border border-indigo-700 text-indigo-300 font-bold">
                👥 Grupa: {{ session()?.audience_mode | uppercase }}
              </span>
              <span class="px-2.5 py-1 rounded-lg bg-teal-900/40 border border-teal-700 text-teal-300 font-bold">
                📍 Lokalizacja: {{ session()?.location_name }}
              </span>
            </div>

            <!-- Stepper -->
            <div class="bg-slate-900/90 rounded-xl p-4 border border-slate-700/60">
              <div class="flex items-center justify-between text-xs mb-2">
                <span class="text-slate-400 font-medium">Aktywny scenariusz w kokpicie:</span>
                <span class="font-mono font-bold text-amber-400 text-sm">
                  {{ activeScenarioIndex() + 1 }} / {{ scenarios().length }}
                </span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                <div
                  class="bg-amber-500 h-full transition-all duration-300"
                  [style.width.%]="scenarios().length ? ((activeScenarioIndex() + 1) / scenarios().length) * 100 : 0">
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="prevScenario()"
                  [disabled]="activeScenarioIndex() <= 0"
                  class="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 transition cursor-pointer">
                  ◀ Poprzedni
                </button>
                <button
                  type="button"
                  (click)="nextScenario()"
                  [disabled]="activeScenarioIndex() >= scenarios().length - 1"
                  class="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-sm cursor-pointer">
                  Następny ▶
                </button>
              </div>
            </div>
          </div>

          <!-- Col 2: Broadcast Hints To Class -->
          <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h2 class="font-bold text-sm text-white flex items-center gap-2">
                <span>📢</span>
                <span>Rozsyłanie Podpowiedzi do Sali</span>
              </h2>
              <span class="text-xs text-slate-400">Pojawia się na ekranach graczy</span>
            </div>

            <form (submit)="sendBroadcast($event)" class="flex flex-col gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">
                  Treść komunikatu dla sali:
                </label>
                <textarea
                  [(ngModel)]="broadcastText"
                  name="broadcastText"
                  rows="2"
                  placeholder="np. Zwróćcie uwagę na nagranie audio: czy słychać tam naturalny oddech?"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500">
                </textarea>
              </div>

              <div class="flex items-center gap-2">
                <label class="text-xs text-slate-400 font-medium">Poziom:</label>
                <button
                  type="button"
                  (click)="broadcastSeverity = 'info'"
                  [ngClass]="broadcastSeverity === 'info' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer">
                  Info ℹ️
                </button>
                <button
                  type="button"
                  (click)="broadcastSeverity = 'hint'"
                  [ngClass]="broadcastSeverity === 'hint' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer">
                  Podpowiedź 💡
                </button>
                <button
                  type="button"
                  (click)="broadcastSeverity = 'warning'"
                  [ngClass]="broadcastSeverity === 'warning' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer">
                  Ostrzeżenie ⚠️
                </button>
              </div>

              <button
                type="submit"
                [disabled]="!broadcastText.trim() || isSendingBroadcast"
                class="w-full mt-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shadow cursor-pointer">
                {{ isSendingBroadcast ? 'Wysyłanie...' : 'Wyślij komunikat do sali' }}
              </button>
            </form>
          </div>

          <!-- Col 3: Live Statistics & Analytics -->
          <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col gap-4">
            <h2 class="font-bold text-sm text-white flex items-center gap-2">
              <span>📊</span>
              <span>Wyniki i Aktywność Sali</span>
            </h2>

            <div class="grid grid-cols-2 gap-3">
              <div class="bg-slate-900/90 p-3 rounded-xl border border-slate-700/60 text-center">
                <span class="text-[11px] text-slate-400 block mb-1">Zarejestrowani</span>
                <span class="text-2xl font-black text-white font-mono">{{ rosterParticipants().length }}</span>
              </div>
              <div class="bg-slate-900/90 p-3 rounded-xl border border-slate-700/60 text-center">
                <span class="text-[11px] text-slate-400 block mb-1">Ocenione odpowiedzi</span>
                <span class="text-2xl font-black text-amber-400 font-mono">{{ session()?.submissions?.length || 0 }}</span>
              </div>
            </div>

            <!-- Active Scenario Details -->
            <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-xs flex flex-col gap-1.5" *ngIf="activeScenario()">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white">{{ activeScenario()?.title }}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                  {{ activeScenario()?.platform_mock | uppercase }}
                </span>
              </div>
              <p class="text-slate-400 line-clamp-2">{{ activeScenario()?.content }}</p>
            </div>

            <button
              type="button"
              (click)="loadSession()"
              class="w-full mt-auto px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer">
              <span>🔄 Odśwież dane z serwera</span>
            </button>
          </div>
        </div>

        <!-- PARTICIPANT ROSTER & LIVE PERFORMANCE TABLE -->
        <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-bold text-base text-white flex items-center gap-2">
                <span>👥</span>
                <span>Lista Uczestników i Wyniki Egzaminu</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ activePhase() === 'LEARNING'
                  ? 'Faza Nauki (20 min): Uczestnicy zapoznają się ze scenariuszami bez presji punktowej.'
                  : 'Faza Testu Wiedzy (10 min): Sprawdzenie trafności werdyktów i wyborów bezpiecznych zachowań.'
                }}
              </p>
            </div>
            <span class="text-xs font-mono text-slate-400">
              Łącznie uczestników: {{ rosterParticipants().length }}
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700/60">
                <tr>
                  <th class="py-3 px-4">Uczestnik</th>
                  <th class="py-3 px-4">Język</th>
                  <th class="py-3 px-4">Wynik w Teście</th>
                  <th class="py-3 px-4">Ukończone Pytania</th>
                  <th class="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700/40">
                <tr *ngFor="let p of rosterParticipants()" class="hover:bg-slate-700/30 transition">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        {{ (p.display_name || p.username).charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <div class="font-bold text-white">{{ p.display_name || p.username }}</div>
                        <div class="text-[10px] font-mono text-slate-400">&#64;{{ p.username }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">
                      {{ p.ui_language_override || session()?.language || 'pl' }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="font-mono font-bold text-emerald-400 text-sm">
                      {{ p.score || 0 }} pkt
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="text-slate-300">
                      {{ (p.completed_scenarios?.length || 0) }} / {{ scenarios().length }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Aktywny
                    </span>
                  </td>
                </tr>
                <tr *ngIf="rosterParticipants().length === 0">
                  <td colspan="5" class="py-6 text-center text-slate-500">
                    Brak uczestników na liście.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class TrainerCockpitComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  sessionId = signal<string>('');
  session = signal<SessionDetails | null>(null);
  isLoading = signal<boolean>(true);
  projectorMode = signal<boolean>(false);
  revealTeacherFlags = signal<boolean>(false);

  // Phase & Timer Management (20m Learning + 10m Testing)
  activePhase = signal<'LEARNING' | 'TESTING' | 'COMPLETED'>('LEARNING');
  phaseTimeRemaining = signal<number>(1200);
  timerRunning = signal<boolean>(true);
  private timerIntervalId: any = null;

  activeScenarioIndex = signal<number>(0);
  broadcastText = '';
  broadcastSeverity: 'info' | 'warning' | 'hint' = 'hint';
  isSendingBroadcast = false;

  private pollIntervalId: any = null;

  readonly scenarios = computed<StudioScenario[]>(() => this.session()?.scenarios || []);
  readonly activeScenario = computed<StudioScenario | null>(() => {
    const list = this.scenarios();
    const idx = this.activeScenarioIndex();
    return list[idx] || null;
  });
  readonly rosterParticipants = computed<StudioParticipant[]>(() => {
    const roster = this.session()?.roster || {};
    return Object.values(roster);
  });

  readonly formattedTime = computed<string>(() => {
    const total = this.phaseTimeRemaining();
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') || 'WROC-SENIOR-2026';
    this.sessionId.set(id);
    this.loadSession();

    // 1-second countdown ticker for trainer
    this.timerIntervalId = setInterval(() => {
      if (this.timerRunning() && this.phaseTimeRemaining() > 0) {
        this.phaseTimeRemaining.update((t) => t - 1);
      }
    }, 1000);

    // Auto-refresh every 5s for live classroom submissions
    this.pollIntervalId = setInterval(() => {
      this.refreshQuietly();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
  }

  loadSession(): void {
    this.isLoading.set(true);
    this.http.get<SessionDetails>(`/api/v1/sessions/${this.sessionId()}`).subscribe({
      next: (res) => {
        this.session.set(res);
        this.activeScenarioIndex.set(res.current_tick || 0);

        if (res.phase) {
          this.activePhase.set(res.phase);
          if (res.phase_timer_seconds !== undefined && res.phase_timer_seconds !== null) {
            this.phaseTimeRemaining.set(res.phase_timer_seconds);
          }
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading session in trainer cockpit:', err);
        this.isLoading.set(false);
      },
    });
  }

  refreshQuietly(): void {
    this.http.get<SessionDetails>(`/api/v1/sessions/${this.sessionId()}`).subscribe({
      next: (res) => {
        this.session.set(res);
        if (res.phase && res.phase !== this.activePhase()) {
          this.activePhase.set(res.phase);
        }
      },
      error: () => {},
    });
  }

  setPhase(phase: 'LEARNING' | 'TESTING' | 'COMPLETED'): void {
    this.activePhase.set(phase);
    const seconds = phase === 'LEARNING' ? 1200 : (phase === 'TESTING' ? 600 : 0);
    this.phaseTimeRemaining.set(seconds);
    this.timerRunning.set(phase !== 'COMPLETED');

    const payload = {
      phase,
      timer_seconds: seconds,
      timer_running: phase !== 'COMPLETED',
    };

    this.http.post<SessionDetails>(`/api/v1/sessions/${this.sessionId()}/phase`, payload).subscribe({
      next: (sess) => {
        this.session.set(sess);

        // Broadcast notification to classroom
        const announcement = phase === 'TESTING'
          ? '📢 Uwaga Sala! Rozpoczynamy 10-minutowy Test Wiedzy! Sprawdźcie swoje odpowiedzi na ekranach.'
          : '📢 Przechodzimy do Fazy Nauki i Analizy (20 minut). Zapoznajcie się z materiałami dydaktycznymi.';

        this.http.post(`/api/v1/sessions/${this.sessionId()}/broadcast-hint`, {
          message: announcement,
          severity: phase === 'TESTING' ? 'warning' : 'info'
        }).subscribe();
      },
      error: (err) => console.error('Failed to update phase:', err),
    });
  }

  toggleTimer(): void {
    const newState = !this.timerRunning();
    this.timerRunning.set(newState);

    this.http.post(`/api/v1/sessions/${this.sessionId()}/timer`, {
      timer_running: newState,
      timer_seconds: this.phaseTimeRemaining(),
    }).subscribe();
  }

  addMinutes(mins: number): void {
    const newSeconds = this.phaseTimeRemaining() + mins * 60;
    this.phaseTimeRemaining.set(newSeconds);

    this.http.post(`/api/v1/sessions/${this.sessionId()}/timer`, {
      timer_seconds: newSeconds,
      timer_running: this.timerRunning(),
    }).subscribe();
  }

  toggleProjectorMode(): void {
    this.projectorMode.set(!this.projectorMode());
  }

  nextScenario(): void {
    if (this.activeScenarioIndex() < this.scenarios().length - 1) {
      this.activeScenarioIndex.set(this.activeScenarioIndex() + 1);
    }
  }

  prevScenario(): void {
    if (this.activeScenarioIndex() > 0) {
      this.activeScenarioIndex.set(this.activeScenarioIndex() - 1);
    }
  }

  updateStatus(status: string): void {
    if (!this.session()) return;
    this.session()!.status = status;
  }

  sendBroadcast(event: Event): void {
    event.preventDefault();
    if (!this.broadcastText.trim()) return;

    this.isSendingBroadcast = true;
    const payload = {
      message: this.broadcastText.trim(),
      severity: this.broadcastSeverity,
    };

    this.http.post<TrainerBroadcast>(`/api/v1/sessions/${this.sessionId()}/broadcast-hint`, payload).subscribe({
      next: (broadcast) => {
        this.isSendingBroadcast = false;
        this.broadcastText = '';
        if (this.session()) {
          const hints = this.session()!.broadcast_hints || [];
          this.session()!.broadcast_hints = [broadcast, ...hints];
        }
      },
      error: (err) => {
        console.error('Failed to send broadcast hint:', err),
        this.isSendingBroadcast = false;
      },
    });
  }
}
