import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { WhatsAppMockComponent } from '../../shared/components/whatsapp-mock/whatsapp-mock.component';
import { TikTokMockComponent } from '../../shared/components/tiktok-mock/tiktok-mock.component';
import { FacebookMockComponent } from '../../shared/components/facebook-mock/facebook-mock.component';
import { YouTubeMockComponent } from '../../shared/components/youtube-mock/youtube-mock.component';
import { BrowserMockComponent, ClonedWebsiteData } from '../../shared/components/browser-mock/browser-mock.component';
import { AudioPlaybackService } from '../../core/audio/audio-playback.service';

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
  cloned_website?: ClonedWebsiteData;
}

export interface TrainerBroadcast {
  id: string;
  message?: string;
  text?: string;
  severity?: 'info' | 'warning' | 'hint' | string;
  urgency?: 'info' | 'warning' | 'hint' | string;
  timestamp: string | number;
}

export interface SessionData {
  id: string;
  title: string;
  audience_mode: 'seniors' | 'kids' | 'professional' | string;
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
  scenarios: StudioScenario[];
  roster: Record<string, any>;
  broadcast_hints?: TrainerBroadcast[];
}

export interface JustificationOption {
  id: string;
  text: string;
  isCorrectArgument: boolean;
}

export interface ScenarioVerdictResult {
  verdict: 'threat' | 'authentic';
  isCorrect: boolean;
  scoreAwarded: number;
  flags: string[];
  justifications?: string[];
  chosenAction?: string;
}

export interface SafeActionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

@Component({
  selector: 'app-participant-play',
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
    <!-- Top-level wrapper with audience-specific styling -->
    <div
      class="min-h-screen transition-colors duration-300 font-sans pb-16"
      [ngClass]="{
        'bg-[#FDFBF7] text-stone-900 text-lg': isSenior(),
        'bg-slate-950 text-slate-100': isKids(),
        'bg-slate-900 text-slate-100': !isSenior() && !isKids()
      }">

      <!-- SENIOR-FRIENDLY HEADER -->
      <header
        *ngIf="isSenior()"
        class="bg-[#2D4A43] text-white px-6 py-4 shadow-md border-b-4 border-[#E2B771] flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-[#E2B771] text-stone-900 flex items-center justify-center text-2xl font-black shadow">
            👵👴
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight">
              Bezpieczny Senior • {{ session()?.location_name || 'Wrocław' }}
            </h1>
            <p class="text-sm text-emerald-100">
              Warsztat ochrony przed manipulacją, fałszywymi telefonami i oszustwami internetowymi
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="bg-black/20 px-4 py-2 rounded-xl border border-white/20 text-center">
            <span class="text-xs uppercase text-emerald-200 block">Twój Wynik</span>
            <span class="text-2xl font-black text-[#FFE29A]">{{ userScore() }} pkt</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-emerald-200 block">Materiał</span>
            <span class="text-lg font-bold">
              {{ currentIndex() + 1 }} z {{ scenarios().length }}
            </span>
          </div>
        </div>
      </header>

      <!-- KIDS-FRIENDLY HEADER -->
      <header
        *ngIf="isKids()"
        class="bg-gradient-to-r from-purple-900 via-indigo-900 to-pink-900 text-white px-6 py-4 shadow-xl border-b-4 border-amber-400 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-3xl font-black shadow-lg transform -rotate-3">
            🕵️‍♂️
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-black tracking-wider uppercase text-amber-300">
                Cyber Detektywi • {{ session()?.location_name || 'Wrocław' }}
              </h1>
              <span class="px-2 py-0.5 rounded-full text-xs font-black bg-pink-500 text-white uppercase animate-pulse">
                Misja Aktywna
              </span>
            </div>
            <p class="text-xs text-indigo-200">
              Nie daj się nabrać botom, deepfake'om i fałszywym stronom!
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="bg-indigo-950/80 px-4 py-2 rounded-2xl border-2 border-amber-400 text-center shadow-lg">
            <span class="text-xs uppercase font-black text-amber-300 block">Monety Detektywa</span>
            <span class="text-2xl font-black text-yellow-300">⭐ {{ userScore() }}</span>
          </div>
          <div class="text-right">
            <span class="text-xs uppercase font-bold text-indigo-300 block">Poziom</span>
            <span class="text-xl font-black text-pink-400">
              {{ currentIndex() + 1 }} / {{ scenarios().length }}
            </span>
          </div>
        </div>
      </header>

      <!-- PROFESSIONAL / DEFAULT HEADER -->
      <header
        *ngIf="!isSenior() && !isKids()"
        class="bg-slate-800 text-white px-6 py-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center text-xl font-bold">
            🛡️
          </div>
          <div>
            <h1 class="text-lg font-bold">Symulacja Zagrożeń • {{ session()?.title }}</h1>
            <p class="text-xs text-slate-400">Lokalizacja: {{ session()?.location_name }}</p>
          </div>
        </div>
        <div class="flex items-center gap-4 text-xs font-mono">
          <span class="px-3 py-1 rounded bg-slate-900 border border-slate-700">Scenariusz: {{ currentIndex() + 1 }}/{{ scenarios().length }}</span>
          <span class="px-3 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">Wynik: {{ userScore() }} pkt</span>
        </div>
      </header>

      <!-- 20-MIN LEARNING vs 10-MIN TESTING PHASE CONTROLLER BANNER -->
      <div *ngIf="currentUser && scenarios().length > 0" class="max-w-7xl mx-auto px-4 mt-3">
        <div
          class="p-4 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-4 shadow-md transition-all"
          [ngClass]="{
            'bg-[#2D4A43]/10 border-[#2D4A43] text-stone-900': isSenior() && activePhase() === 'LEARNING',
            'bg-amber-50 border-amber-500 text-amber-950': isSenior() && activePhase() === 'TESTING',
            'bg-indigo-950/70 border-indigo-500 text-indigo-100': isKids() && activePhase() === 'LEARNING',
            'bg-purple-950/80 border-pink-500 text-pink-100': isKids() && activePhase() === 'TESTING',
            'bg-slate-800 border-cyan-500 text-white': !isSenior() && !isKids() && activePhase() === 'LEARNING',
            'bg-slate-800 border-amber-500 text-white': !isSenior() && !isKids() && activePhase() === 'TESTING'
          }">

          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
              [ngClass]="activePhase() === 'LEARNING' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'">
              {{ activePhase() === 'LEARNING' ? '📖' : '⏱️' }}
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider"
                  [ngClass]="activePhase() === 'LEARNING' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'">
                  {{ activePhase() === 'LEARNING' ? 'Faza 1: Nauka & Analiza (20 min)' : 'Faza 2: Test Wiedzy (10 min)' }}
                </span>
                <span class="text-xs font-bold opacity-80">
                  {{ activePhase() === 'LEARNING' ? 'Spokojna eksploracja i poznawanie cech manipulacji' : 'Sprawdzenie zdobytych umiejętności w praktyce' }}
                </span>
              </div>
              <p class="text-xs mt-1 font-medium max-w-2xl leading-relaxed">
                {{ activePhase() === 'LEARNING'
                  ? (isSenior()
                      ? 'Zapoznaj się z poniższymi przykładami z Wrocławia. Przesłuchaj nagrania, zbadaj strony i poszlaki. Masz na to 20 minut, po czym rozpocznie się 10-minutowy sprawdzian.'
                      : 'Eksploruj dowody, odtwarzaj dźwięki i odkrywaj triki oszustów bez presji punktowej! Za chwilę czeka Cię 10-minutowy wielki test wiedzy!')
                  : (isSenior()
                      ? 'Trwa 10-minutowy test wiedzy! Wybierz czy treść jest autentyczna czy zmanipulowana oraz wskaż najbezpieczniejszą reakcję.'
                      : 'Czas na egzamin cyber-detektywa! Zbadaj każdy przypadek i zatwierdź swój werdykt przed upływem czasu.')
                }}
              </p>
            </div>
          </div>

          <!-- Timer & Manual Phase Controls -->
          <div class="flex items-center gap-3 ml-auto">
            <!-- TIMER DISPLAY -->
            <div
              class="px-4 py-2 rounded-xl font-mono text-center border shadow-inner flex items-center gap-2"
              [ngClass]="activePhase() === 'LEARNING'
                ? 'bg-black/10 border-black/20 text-stone-900 dark:text-white'
                : 'bg-rose-600 text-white border-rose-700 shadow-rose-900/50'">
              <span class="text-[11px] uppercase font-bold opacity-80">
                {{ activePhase() === 'LEARNING' ? 'Nauka:' : 'Test:' }}
              </span>
              <span class="text-2xl font-black tracking-tight">{{ formattedTime() }}</span>
            </div>

            <!-- BUTTON: SWITCH TO TESTING -->
            <button
              *ngIf="activePhase() === 'LEARNING'"
              type="button"
              (click)="startTestingPhase()"
              class="px-4 py-2.5 rounded-xl text-xs font-black transition shadow-lg flex items-center gap-2 cursor-pointer transform hover:scale-102 active:scale-98"
              [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-white border-2 border-[#E2B771]' : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-300'">
              <span>⚡</span>
              <span>Rozpocznij Test Wiedzy (10 min)</span>
            </button>

            <!-- BUTTON: SWITCH BACK TO LEARNING -->
            <button
              *ngIf="activePhase() === 'TESTING'"
              type="button"
              (click)="returnToLearningPhase()"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition opacity-80 hover:opacity-100 cursor-pointer flex items-center gap-1.5"
              [ngClass]="isSenior() ? 'bg-white text-stone-800 border-stone-300 hover:bg-stone-100' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'">
              <span>↩</span>
              <span>Wróć do Fazy Nauki</span>
            </button>
          </div>

        </div>
      </div>

      <!-- PERSISTENT SCENARIO NAVIGATION BAR -->
      <nav *ngIf="currentUser && scenarios().length > 0" class="max-w-7xl mx-auto px-4 mt-3 flex items-center justify-between gap-2 overflow-x-auto pb-1 select-none">
        <div class="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            *ngFor="let sc of scenarios(); let idx = index"
            type="button"
            (click)="goToScenario(idx)"
            [ngClass]="{
              'bg-[#2D4A43] text-white ring-2 ring-[#E2B771] font-bold shadow-sm': isSenior() && currentIndex() === idx && !isCompleted(),
              'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100': isSenior() && (currentIndex() !== idx || isCompleted()),
              'bg-indigo-600 text-white ring-2 ring-amber-400 font-bold shadow-md': !isSenior() && currentIndex() === idx && !isCompleted(),
              'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700': !isSenior() && (currentIndex() !== idx || isCompleted())
            }"
            class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer">
            <span>{{ getPlatformIcon(sc.platform_mock) }}</span>
            <span>{{ idx + 1 }}. {{ sc.author }}</span>
            <span *ngIf="activePhase() === 'LEARNING' && isScenarioExplored(sc.id)" class="text-emerald-500 font-bold text-xs" title="Przeanalizowano">✓</span>
            <span *ngIf="activePhase() === 'TESTING' && scenarioResults()[sc.id]" class="font-bold text-xs" [ngClass]="scenarioResults()[sc.id].isCorrect ? 'text-emerald-400' : 'text-amber-400'">✓</span>
          </button>
        </div>

        <!-- SUMMARY SHORTCUT BUTTON -->
        <button
          type="button"
          (click)="showSummary()"
          [ngClass]="{
            'bg-[#E2B771] text-stone-900 font-black shadow-md ring-2 ring-[#2D4A43]': isSenior() && isCompleted(),
            'bg-[#2D4A43]/15 hover:bg-[#2D4A43]/25 text-stone-800 font-bold border border-stone-300': isSenior() && !isCompleted(),
            'bg-amber-400 text-slate-950 font-black shadow-lg ring-2 ring-pink-500': !isSenior() && isCompleted(),
            'bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-slate-700': !isSenior() && !isCompleted()
          }"
          class="px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer">
          <span>🏆</span>
          <span>Podsumowanie & Certyfikat</span>
        </button>
      </nav>

      <!-- LIVE TRAINER BROADCAST BANNER (if any) -->
      <div *ngIf="latestBroadcast()" class="max-w-7xl mx-auto px-4 mt-3">
        <div
          class="p-4 rounded-2xl border-2 shadow-lg flex items-start gap-3 transition-all animate-bounce"
          [ngClass]="{
            'bg-amber-100 border-amber-500 text-amber-950': isSenior() && ((latestBroadcast()?.severity || latestBroadcast()?.urgency)?.toLowerCase() === 'warning' || (latestBroadcast()?.severity || latestBroadcast()?.urgency)?.toLowerCase() === 'alert'),
            'bg-emerald-100 border-emerald-600 text-emerald-950': isSenior() && (latestBroadcast()?.severity || latestBroadcast()?.urgency)?.toLowerCase() !== 'warning' && (latestBroadcast()?.severity || latestBroadcast()?.urgency)?.toLowerCase() !== 'alert',
            'bg-purple-950/90 border-amber-400 text-amber-200': isKids(),
            'bg-blue-950/80 border-blue-500 text-blue-200': !isSenior() && !isKids()
          }">
          <span class="text-2xl">📢</span>
          <div class="flex-1">
            <span class="font-bold text-xs uppercase tracking-wider block opacity-80">
              Wiadomość od Trenera (Sali):
            </span>
            <p class="font-medium text-sm sm:text-base mt-0.5">
              {{ latestBroadcast()?.message || latestBroadcast()?.text }}
            </p>
          </div>
          <button
            type="button"
            (click)="dismissBroadcast()"
            class="text-xs font-bold px-2 py-1 rounded bg-black/10 hover:bg-black/20 cursor-pointer">
            ✕ Zamknij
          </button>
        </div>
      </div>

      <!-- PARTICIPANT LOGIN SELECTION (If username not established) -->
      <div *ngIf="!currentUser" class="max-w-md mx-auto my-12 p-6 rounded-3xl shadow-2xl border"
        [ngClass]="isSenior() ? 'bg-white border-stone-300' : 'bg-slate-900 border-slate-800'">
        <div class="text-center mb-6">
          <span class="text-4xl block mb-2">{{ isSenior() ? '👋' : '🎮' }}</span>
          <h2 class="text-2xl font-bold">
            {{ isSenior() ? 'Witaj na warsztatach!' : 'Dołącz do misji!' }}
          </h2>
          <p class="text-sm mt-1" [ngClass]="isSenior() ? 'text-stone-600' : 'text-slate-400'">
            Wybierz swoje imię z listy lub wpisz nazwę uczestnika:
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase mb-1">Twoje Imię / Identyfikator:</label>
            <input
              type="text"
              [(ngModel)]="loginInput"
              placeholder="np. Danuta lub Uczeń_1"
              class="w-full px-4 py-3 rounded-xl border text-base"
              [ngClass]="isSenior() ? 'border-stone-400 bg-stone-50 text-stone-900' : 'border-slate-700 bg-slate-800 text-white'" />
          </div>

          <div *ngIf="rosterList().length > 0">
            <span class="block text-xs font-semibold mb-2" [ngClass]="isSenior() ? 'text-stone-500' : 'text-slate-400'">
              Szybki wybór z listy zarejestrowanych:
            </span>
            <div class="flex flex-wrap gap-2">
              <button
                *ngFor="let p of rosterList()"
                type="button"
                (click)="loginInput = p.username"
                class="px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer"
                [ngClass]="isSenior() ? 'bg-stone-100 hover:bg-stone-200 border-stone-300' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'">
                {{ p.display_name || p.username }}
              </button>
            </div>
          </div>

          <button
            type="button"
            (click)="confirmLogin()"
            [disabled]="!loginInput.trim()"
            class="w-full py-3 rounded-xl font-bold text-base transition shadow-md cursor-pointer disabled:opacity-50"
            [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
            {{ isSenior() ? 'Rozpocznij Faza 1: Nauka (20 min) ▶' : 'Rozpocznij Trening Detektywa! 🚀' }}
          </button>
        </div>
      </div>

      <!-- MAIN SCENARIO WORKBENCH (TWO COLUMN LAYOUT) -->
      <main *ngIf="currentUser && currentScenario() && !isCompleted()" class="max-w-7xl mx-auto px-4 py-5">

        <!-- MOBILE TAB SWITCHER (small screens) -->
        <div class="flex lg:hidden mb-4 p-1 rounded-xl bg-slate-200 dark:bg-slate-800">
          <button
            type="button"
            (click)="activeMobileTab.set('evidence')"
            [ngClass]="activeMobileTab() === 'evidence' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400'"
            class="flex-1 py-2 rounded-lg text-xs transition flex items-center justify-center gap-2">
            <span>📱</span>
            <span>Materiał (Symulator)</span>
          </button>
          <button
            type="button"
            (click)="activeMobileTab.set('analysis')"
            [ngClass]="activeMobileTab() === 'analysis' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400'"
            class="flex-1 py-2 rounded-lg text-xs transition flex items-center justify-center gap-2">
            <span>{{ activePhase() === 'LEARNING' ? '📖 Panel Nauki' : '⏱️ Panel Testu' }}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          <!-- LEFT COLUMN: AUTHENTIC PLATFORM SIMULATOR (EVIDENCE & MEDIA) -->
          <section
            class="lg:col-span-7 xl:col-span-7 flex flex-col gap-4"
            [ngClass]="{'hidden lg:flex': activeMobileTab() === 'analysis'}">

            <!-- Dynamic Platform Mock Dispatcher -->
            <div [ngSwitch]="currentScenario()!.platform_mock">

              <!-- WHATSAPP MOCK -->
              <app-whatsapp-mock
                *ngSwitchCase="'WHATSAPP'"
                [title]="currentScenario()!.title"
                [author]="currentScenario()!.author"
                [authorHandle]="currentScenario()!.author_handle || ''"
                [content]="currentScenario()!.content"
                [mediaUrl]="currentScenario()!.media_url || ''"
                [mediaType]="currentScenario()!.media_type || 'TEXT'"
                [redFlags]="currentScenario()!.red_flags"
                [isSenior]="isSenior()"
                (flagSelected)="onFlagsChanged($event)">
              </app-whatsapp-mock>

              <!-- TIKTOK MOCK -->
              <app-tiktok-mock
                *ngSwitchCase="'TIKTOK'"
                [author]="currentScenario()!.author"
                [authorHandle]="currentScenario()!.author_handle || ''"
                [title]="currentScenario()!.title"
                [content]="currentScenario()!.content"
                [mediaUrl]="currentScenario()!.media_url || ''"
                [redFlags]="currentScenario()!.red_flags"
                (flagSelected)="onFlagsChanged($event)">
              </app-tiktok-mock>

              <!-- FACEBOOK MOCK -->
              <app-facebook-mock
                *ngSwitchCase="'FACEBOOK'"
                [author]="currentScenario()!.author"
                [title]="currentScenario()!.title"
                [content]="currentScenario()!.content"
                [mediaUrl]="currentScenario()!.media_url || ''"
                [redFlags]="currentScenario()!.red_flags"
                [isSenior]="isSenior()"
                (flagSelected)="onFlagsChanged($event)">
              </app-facebook-mock>

              <!-- YOUTUBE MOCK -->
              <app-youtube-mock
                *ngSwitchCase="'YOUTUBE'"
                [author]="currentScenario()!.author"
                [title]="currentScenario()!.title"
                [content]="currentScenario()!.content"
                [mediaUrl]="currentScenario()!.media_url || ''"
                [redFlags]="currentScenario()!.red_flags"
                (flagSelected)="onFlagsChanged($event)">
              </app-youtube-mock>

              <!-- BROWSER MOCK (DEFAULT) -->
              <app-browser-mock
                *ngSwitchDefault
                [title]="currentScenario()!.title"
                [author]="currentScenario()!.author"
                [authorHandle]="currentScenario()!.author_handle"
                [content]="currentScenario()!.content"
                [clonedWebsite]="currentScenario()!.cloned_website"
                [redFlags]="currentScenario()!.red_flags"
                [isSenior]="isSenior()"
                [isAuthentic]="currentScenario()!.is_authentic"
                [mediaUrl]="currentScenario()!.media_url"
                (flagSelected)="onFlagsChanged($event)">
              </app-browser-mock>
            </div>

            <!-- SIMULATOR HELPER FOOTER -->
            <div class="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  {{ activePhase() === 'LEARNING'
                    ? 'Odsłuchaj nagranie lub zbadaj stronę, a następnie przeanalizuj poszlaki w panelu edukacyjnym po prawej.'
                    : 'Zbadaj materiał i wybierz odpowiedź w teście wiedzy po prawej stronie.'
                  }}
                </span>
              </span>
              <button
                type="button"
                (click)="activeMobileTab.set('analysis')"
                class="lg:hidden text-indigo-600 font-bold hover:underline cursor-pointer">
                {{ activePhase() === 'LEARNING' ? 'Zobacz analizę →' : 'Przejdź do testu →' }}
              </button>
            </div>
          </section>

          <!-- RIGHT COLUMN: ADAPTS DYNAMICALLY BY PHASE -->

          <!-- ========================================================= -->
          <!-- 1. RIGHT COLUMN IN LEARNING PHASE (20 MIN STUDY WORKBENCH) -->
          <!-- ========================================================= -->
          <section
            *ngIf="activePhase() === 'LEARNING'"
            class="lg:col-span-5 xl:col-span-5 flex flex-col gap-4 lg:sticky lg:top-6"
            [ngClass]="{'hidden lg:flex': activeMobileTab() === 'evidence'}">

            <!-- LEARNING HEADER -->
            <div class="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>📖</span>
                  <span>Moduł Nauki: {{ currentIndex() + 1 }} z {{ scenarios().length }}</span>
                </span>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Spokojna eksploracja
              </span>
            </div>

            <!-- EDUCATIONAL GOAL CARD -->
            <div
              class="p-5 rounded-2xl border-2 transition-all shadow-md"
              [ngClass]="isSenior() ? 'bg-white border-[#2D4A43]/30 text-stone-900' : 'bg-slate-900 border-indigo-500/50 text-white'">
              <div class="flex items-center gap-2.5 mb-2">
                <span class="text-xl">🎯</span>
                <h3 class="font-bold text-sm uppercase tracking-wider">
                  Cel Lekcji: {{ getCategoryTitle(currentScenario()!.threat_category) }}
                </h3>
              </div>
              <p class="text-xs sm:text-sm font-medium leading-relaxed opacity-90 mb-3">
                {{ getEducationalGoalText(currentScenario()!) }}
              </p>

              <!-- HOW MANIPULATION WORKS -->
              <div class="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs space-y-1">
                <span class="font-bold text-amber-700 dark:text-amber-300 block flex items-center gap-1">
                  <span>⚙️</span>
                  <span>Mechanizm manipulacji / Autentyczność:</span>
                </span>
                <p class="opacity-90 leading-relaxed">
                  {{ getManipulationExplanation(currentScenario()!) }}
                </p>
              </div>
            </div>

            <!-- INTERACTIVE CLUE DISCOVERY EXPLORER -->
            <div
              class="p-5 rounded-2xl border transition-all shadow-md"
              [ngClass]="isSenior() ? 'bg-white border-amber-300' : 'bg-slate-900 border-slate-700'">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-xl">🔍</span>
                  <h3 class="font-bold text-sm uppercase tracking-wider">
                    {{ currentScenario()!.is_authentic ? 'Cechy potwierdzające autentyczność' : 'Kluczowe poszlaki manipulacji (Czerwone flagi)' }}
                  </h3>
                </div>
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {{ getExploredCluesCount(currentScenario()!.id) }} / {{ currentScenario()!.red_flags.length }} zbadano
                </span>
              </div>

              <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Kliknij poszczególne punkty, aby dowiedzieć się, jak rozpoznać je w praktyce:
              </p>

              <div class="flex flex-col gap-2.5">
                <div
                  *ngFor="let flag of currentScenario()!.red_flags; let fIdx = index"
                  (click)="toggleClueExploration(currentScenario()!.id, flag)"
                  class="p-3 rounded-xl border text-xs transition cursor-pointer select-none"
                  [ngClass]="isClueExplored(currentScenario()!.id, flag)
                    ? (isSenior() ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium' : 'bg-emerald-950/40 border-emerald-500 text-emerald-200')
                    : (isSenior() ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500')">
                  <div class="flex items-start gap-2.5">
                    <span class="text-sm mt-0.5">
                      {{ isClueExplored(currentScenario()!.id, flag) ? '✅' : '🔍' }}
                    </span>
                    <div class="flex-1">
                      <div class="font-bold text-xs">{{ flag }}</div>
                      <!-- Expanded Pedagogical Clue Hint -->
                      <p *ngIf="isClueExplored(currentScenario()!.id, flag)" class="text-[11px] mt-1.5 opacity-90 leading-relaxed border-t border-black/10 dark:border-white/10 pt-1.5">
                        {{ getCluePedagogicHint(flag, currentScenario()!) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PRACTICAL SAFE ACTION ADVICE -->
            <div
              class="p-4 rounded-2xl border shadow-sm"
              [ngClass]="isSenior() ? 'bg-[#2D4A43]/10 border-[#2D4A43]/30 text-stone-900' : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-100'">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg">🛡️</span>
                <span class="font-bold text-xs uppercase tracking-wider">Złota Zasada Bezpieczeństwa:</span>
              </div>
              <p class="text-xs sm:text-sm font-semibold leading-relaxed">
                {{ currentScenario()!.safe_action_advice }}
              </p>
            </div>

            <!-- LEARNING PHASE NAVIGATION & SWITCH TO TEST -->
            <div class="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                (click)="goToPrevScenario()"
                [disabled]="currentIndex() <= 0"
                class="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                [ngClass]="isSenior() ? 'bg-white text-stone-800 border-stone-300 hover:bg-stone-100' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'">
                ◀ Poprzedni materiał
              </button>

              <button
                type="button"
                (click)="goToNextScenario()"
                [disabled]="currentIndex() >= scenarios().length - 1"
                class="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                [ngClass]="isSenior() ? 'bg-white text-stone-800 border-stone-300 hover:bg-stone-100' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'">
                Następny materiał ▶
              </button>
            </div>

            <!-- PROMINENT CALL TO ACTION TO START TEST -->
            <button
              type="button"
              (click)="startTestingPhase()"
              class="w-full py-3.5 px-4 rounded-2xl font-black text-sm transition shadow-xl flex items-center justify-center gap-2 cursor-pointer transform hover:scale-101 active:scale-98"
              [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-[#FFE29A] border-2 border-[#E2B771]' : 'bg-amber-400 hover:bg-amber-300 text-slate-950'">
              <span>⚡</span>
              <span>Ukończyłem naukę • Przejdź do Testu Wiedzy (10 min)</span>
            </button>

          </section>

          <!-- ========================================================= -->
          <!-- 2. RIGHT COLUMN IN TESTING PHASE (10 MIN KNOWLEDGE QUIZ)   -->
          <!-- ========================================================= -->
          <section
            *ngIf="activePhase() === 'TESTING'"
            class="lg:col-span-5 xl:col-span-5 flex flex-col gap-5 lg:sticky lg:top-6"
            [ngClass]="{'hidden lg:flex': activeMobileTab() === 'evidence'}">

            <!-- TESTING WORKBENCH HEADER -->
            <div class="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span>Sprawdzian: Zadanie {{ currentIndex() + 1 }} z {{ scenarios().length }}</span>
                </span>
                <span *ngIf="scenarioResults()[currentScenario()!.id]" class="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  Oceniono ✓
                </span>
              </div>
              <div class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-600 border border-rose-500/30">
                Czas: {{ formattedTime() }}
              </div>
            </div>

            <!-- STEP 1: VERDICT SELECTION (REAL VS FAKE) -->
            <div
              *ngIf="!submittedFeedback()"
              class="p-5 rounded-2xl border-2 transition-all shadow-md"
              [ngClass]="isSenior() ? 'bg-white border-[#2D4A43]/40' : 'bg-slate-900 border-indigo-500/50'">
              <div class="text-center mb-3">
                <span class="text-xs font-bold uppercase tracking-wider block text-slate-500 mb-0.5">
                  Krok 1: Twój Werdykt
                </span>
                <h3 class="font-black" [ngClass]="isSenior() ? 'text-lg text-stone-900' : 'text-base text-white'">
                  Czy ta treść jest prawdziwa czy fałszywa?
                </h3>
              </div>

              <!-- Threat (Fake) vs Authentic (Real) buttons -->
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="selectVerdict('threat')"
                  [ngClass]="selectedVerdict() === 'threat'
                    ? 'ring-4 ring-rose-500 bg-rose-100 border-rose-600 text-rose-950 font-black shadow-md'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'"
                  class="p-3.5 rounded-xl border-2 text-center transition flex flex-col items-center gap-1 cursor-pointer">
                  <span class="text-2xl">🚨</span>
                  <span class="text-xs sm:text-sm font-bold">Fałszywa (Manipulacja / SCAM)</span>
                </button>

                <button
                  type="button"
                  (click)="selectVerdict('authentic')"
                  [ngClass]="selectedVerdict() === 'authentic'
                    ? 'ring-4 ring-emerald-500 bg-emerald-100 border-emerald-600 text-emerald-950 font-black shadow-md'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'"
                  class="p-3.5 rounded-xl border-2 text-center transition flex flex-col items-center gap-1 cursor-pointer">
                  <span class="text-2xl">✅</span>
                  <span class="text-xs sm:text-sm font-bold">Prawdziwa (Oficjalna / Bezpieczna)</span>
                </button>
              </div>
            </div>

            <!-- STEP 2: MULTIPLE-CHOICE JUSTIFICATION SELECTION -->
            <div
              *ngIf="!submittedFeedback() && selectedVerdict()"
              class="p-5 rounded-2xl border transition-all shadow-md animate-fadeIn"
              [ngClass]="isSenior() ? 'bg-white border-amber-300' : 'bg-slate-900 border-slate-700'">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Krok 2: Uzasadnij swój wybór (Wielokrotny wybór)
                  </span>
                  <p class="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Zaznacz argumenty, które zadecydowały o Twojej ocenie:
                  </p>
                </div>
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {{ selectedJustifications().length }} wybrano
                </span>
              </div>

              <div class="flex flex-col gap-2 mt-3">
                <button
                  *ngFor="let opt of activeJustificationOptions()"
                  type="button"
                  (click)="toggleJustification(opt.id)"
                  [ngClass]="selectedJustifications().includes(opt.id)
                    ? (isSenior() ? 'bg-amber-100 border-amber-600 text-stone-950 font-bold' : 'bg-indigo-950 border-amber-400 text-amber-200 font-bold')
                    : (isSenior() ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100' : 'bg-slate-950/60 border-slate-700 text-slate-300 hover:border-slate-500')"
                  class="p-3 rounded-xl border text-xs sm:text-sm text-left transition flex items-start gap-2.5 cursor-pointer">
                  <span class="text-base mt-[-2px]">{{ selectedJustifications().includes(opt.id) ? '☑️' : '◻️' }}</span>
                  <span class="flex-1 leading-snug">{{ opt.text }}</span>
                </button>
              </div>
            </div>

            <!-- STEP 3: SAFE ACTION MULTIPLE CHOICE -->
            <div
              *ngIf="!submittedFeedback() && selectedVerdict()"
              class="p-5 rounded-2xl border-2 transition-all shadow-md"
              [ngClass]="isSenior() ? 'bg-white border-[#2D4A43]/40' : 'bg-slate-900 border-slate-700'">
              <span class="text-xs font-bold uppercase tracking-wider block text-slate-500 mb-2">
                Krok 3: Prawidłowa reakcja (Złota Zasada)
              </span>

              <div class="space-y-2">
                <div
                  *ngFor="let opt of getSafeActionOptions(currentScenario()!)"
                  (click)="selectedActionId.set(opt.id)"
                  class="p-3 rounded-xl border text-xs sm:text-sm transition cursor-pointer flex items-start gap-2.5"
                  [ngClass]="selectedActionId() === opt.id
                    ? (isSenior() ? 'bg-[#2D4A43]/15 border-[#2D4A43] text-stone-950 font-bold' : 'bg-indigo-950 border-indigo-400 text-white font-bold')
                    : (isSenior() ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600')">
                  <span class="text-sm mt-[-1px]">{{ selectedActionId() === opt.id ? '🔘' : '⚪' }}</span>
                  <span class="flex-1 leading-snug">{{ opt.text }}</span>
                </div>
              </div>

              <!-- SUBMIT TEST QUESTION BUTTON -->
              <button
                type="button"
                (click)="submitTestAnswer()"
                [disabled]="!selectedVerdict() || selectedJustifications().length === 0 || isSubmitting()"
                class="w-full mt-4 py-3.5 rounded-xl font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
                <span>{{ isSubmitting() ? 'Zapisywanie...' : 'Zatwierdź odpowiedź w teście ▶' }}</span>
              </button>
            </div>

            <!-- STAGE 3: TEST FEEDBACK & ACCURACY REPORT (POST SUBMISSION) -->
            <div
              *ngIf="submittedFeedback()"
              class="p-6 rounded-2xl border-2 shadow-2xl transition-all"
              [ngClass]="{
                'bg-emerald-50 border-emerald-600 text-emerald-950': submittedFeedback()!.isCorrect && isSenior(),
                'bg-amber-50 border-amber-600 text-amber-950': !submittedFeedback()!.isCorrect && isSenior(),
                'bg-slate-900 border-emerald-500 text-white': submittedFeedback()!.isCorrect && !isSenior(),
                'bg-slate-900 border-rose-500 text-white': !submittedFeedback()!.isCorrect && !isSenior()
              }">
              <div class="flex items-center gap-3 mb-4">
                <span class="text-4xl">
                  {{ submittedFeedback()!.isCorrect ? '🎉' : '⚠️' }}
                </span>
                <div class="flex-1">
                  <h3 class="text-lg font-black">
                    {{ submittedFeedback()!.isCorrect
                      ? (isSenior() ? 'Doskonale! Prawidłowa ocena sytuacji!' : 'Brawo! Trafna ocena detektywie!')
                      : (currentScenario()!.is_authentic
                          ? 'Uwaga: Ta treść była w 100% autentyczna!'
                          : 'Uwaga: To była próba manipulacji / wyłudzenia!')
                    }}
                  </h3>
                  <div class="text-xs font-semibold opacity-90 mt-0.5">
                    Przyznane punkty: <span class="font-mono text-sm font-black">+{{ submittedFeedback()!.scoreAwarded }} pkt</span>
                  </div>
                </div>
              </div>

              <!-- PEDAGOGIC ACTION RECAP & JUSTIFICATION EVALUATION -->
              <div class="space-y-3 pt-3 border-t border-black/15 dark:border-white/15">
                <div *ngIf="submittedFeedback()?.validJustifications?.length" class="p-3.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs">
                  <span class="font-bold block mb-1">🎯 Trafne argumenty z Twojej odpowiedzi:</span>
                  <ul class="list-disc list-inside space-y-1">
                    <li *ngFor="let j of submittedFeedback()!.validJustifications">{{ j }}</li>
                  </ul>
                </div>
                <div class="p-3.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs">
                  <span class="font-bold block mb-1">🛡️ Wskazówka praktyczna:</span>
                  <p class="leading-relaxed">{{ currentScenario()!.safe_action_advice }}</p>
                </div>
              </div>

              <!-- NAVIGATION BUTTONS AFTER TEST QUESTION -->
              <div class="mt-5 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  (click)="showSummary()"
                  class="flex-1 py-3 px-4 rounded-xl font-bold text-xs border transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  [ngClass]="isSenior() ? 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300' : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-600'">
                  <span>🏆</span>
                  <span>Podsumowanie & Wyniki</span>
                </button>
                <button
                  type="button"
                  (click)="goToNextTestScenario()"
                  class="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-white' : 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black'">
                  <span>{{ hasMoreScenarios() ? 'Następne pytanie ▶' : 'Zakończ test i zobacz certyfikat 🏆' }}</span>
                </button>
              </div>
            </div>

          </section>

        </div>

      </main>

      <!-- COMPLETION & FINAL CERTIFICATE SUMMARY DEBRIEF SCREEN -->
      <section *ngIf="isCompleted()" class="max-w-4xl mx-auto my-8 px-4">
        <div class="p-8 rounded-3xl shadow-2xl border"
          [ngClass]="isSenior() ? 'bg-white border-stone-300 text-stone-900' : 'bg-slate-900 border-slate-800 text-white'">

          <!-- Top Banner -->
          <div class="text-center mb-8">
            <span class="text-6xl block mb-3">🎓</span>
            <h2 class="text-3xl font-black mb-2 tracking-tight">
              {{ isSenior() ? 'Gratulacje! Warsztat Ukończony Pomyślnie!' : 'Wielki Sukces! Certyfikat Cyber-Detektywa!' }}
            </h2>
            <p class="text-base max-w-2xl mx-auto leading-relaxed" [ngClass]="isSenior() ? 'text-stone-600' : 'text-slate-300'">
              Ukończyłeś 20 minut przygotowania i 10-minutowy test wiedzy na autentycznych przypadkach z Wrocławia.
            </p>

            <div class="inline-block mt-4 px-8 py-3 rounded-2xl font-mono text-3xl font-black shadow-inner"
              [ngClass]="isSenior() ? 'bg-amber-100 text-amber-900 border-2 border-amber-300' : 'bg-indigo-900 text-amber-300 border-2 border-amber-400'">
              Twój Wynik: {{ userScore() }} pkt
            </div>
          </div>

          <!-- SUMMARY STATS -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div class="p-4 rounded-2xl border text-center"
              [ngClass]="isSenior() ? 'bg-stone-50 border-stone-200' : 'bg-slate-800/80 border-slate-700'">
              <span class="text-xs uppercase font-bold text-slate-500 block mb-1">Faza 1: Nauka</span>
              <span class="text-xl font-bold text-emerald-600">20 minut ✓</span>
              <span class="text-[11px] block text-slate-400 mt-0.5">Ukończona eksploracja</span>
            </div>

            <div class="p-4 rounded-2xl border text-center"
              [ngClass]="isSenior() ? 'bg-stone-50 border-stone-200' : 'bg-slate-800/80 border-slate-700'">
              <span class="text-xs uppercase font-bold text-slate-500 block mb-1">Faza 2: Test Wiedzy</span>
              <span class="text-xl font-bold text-amber-500">{{ completedCount() }} / {{ scenarios().length }}</span>
              <span class="text-[11px] block text-slate-400 mt-0.5">Rozwiązane zadania</span>
            </div>

            <div class="p-4 rounded-2xl border text-center"
              [ngClass]="isSenior() ? 'bg-stone-50 border-stone-200' : 'bg-slate-800/80 border-slate-700'">
              <span class="text-xs uppercase font-bold text-slate-500 block mb-1">Tytuł Honorowy</span>
              <span class="text-base font-black text-indigo-600 dark:text-indigo-400">
                {{ isSenior() ? 'Świadomy Senior Wrocławia 🛡️' : 'Mistrz Cyber-Ochrony 🚀' }}
              </span>
              <span class="text-[11px] block text-slate-400 mt-0.5">Odznaka przyznana</span>
            </div>
          </div>

          <!-- SCENARIO DEBRIEF CARDS -->
          <div class="mb-8 space-y-3">
            <h3 class="font-bold text-sm uppercase tracking-wider text-slate-500 pb-2 border-b border-black/10 dark:border-white/10">
              Przegląd Zadań i Werdyktów:
            </h3>

            <div *ngFor="let sc of scenarios(); let idx = index"
              class="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              [ngClass]="isSenior() ? 'bg-stone-50 border-stone-200' : 'bg-slate-800/60 border-slate-700'">
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ getPlatformIcon(sc.platform_mock) }}</span>
                <div>
                  <div class="font-bold text-sm">{{ idx + 1 }}. {{ sc.title }}</div>
                  <div class="opacity-75">Platforma: {{ sc.platform_mock }} • Nadawca: {{ sc.author }}</div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span *ngIf="scenarioResults()[sc.id]"
                  class="px-3 py-1 rounded-full font-bold text-[11px]"
                  [ngClass]="scenarioResults()[sc.id].isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'">
                  {{ scenarioResults()[sc.id].isCorrect ? 'Poprawna ocena (+100)' : 'Błąd oceny (+25)' }}
                </span>
                <span *ngIf="!scenarioResults()[sc.id]"
                  class="px-3 py-1 rounded-full bg-slate-200 text-slate-600 font-medium text-[11px]">
                  Pominięte
                </span>
                <button
                  type="button"
                  (click)="goToScenario(idx)"
                  class="px-2.5 py-1 rounded-lg border text-[11px] font-bold hover:underline cursor-pointer">
                  Przejrzyj
                </button>
              </div>
            </div>
          </div>

          <!-- BOTTOM ACTIONS -->
          <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              (click)="resetToFirst()"
              class="flex-1 py-3 px-6 rounded-xl font-bold text-sm border transition flex items-center justify-center gap-2 cursor-pointer"
              [ngClass]="isSenior() ? 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'">
              <span>🔄 Przejdź do materiałów powtórkowych</span>
            </button>
            <a
              routerLink="/dashboard"
              class="flex-1 py-3 px-6 rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 text-center"
              [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
              <span>Wróć do Pulpitu Głównego ➔</span>
            </a>
          </div>

        </div>
      </section>

    </div>
  `,
})
export class ParticipantPlayComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private audioService = inject(AudioPlaybackService);

  sessionId = signal<string>('');
  session = signal<SessionData | null>(null);
  isLoading = signal<boolean>(true);

  currentUser: string | null = null;
  loginInput = '';
  userScore = signal<number>(0);

  // Phase & Timer Management (20m Learning + 10m Testing)
  activePhase = signal<'LEARNING' | 'TESTING' | 'COMPLETED'>('LEARNING');
  phaseTimeRemaining = signal<number>(1200); // 1200s (20 min) for LEARNING, 600s (10 min) for TESTING
  timerRunning = signal<boolean>(true);
  private timerIntervalId: any = null;

  currentIndex = signal<number>(0);
  selectedFlags = signal<string[]>([]);
  selectedJustifications = signal<string[]>([]);
  selectedVerdict = signal<'threat' | 'authentic' | null>(null);
  selectedActionId = signal<string>('opt_safe');
  isSubmitting = signal<boolean>(false);
  isCompleted = signal<boolean>(false);
  activeMobileTab = signal<'evidence' | 'analysis'>('evidence');

  // Track explored clues per scenario in Learning Phase
  exploredCluesMap = signal<Record<string, string[]>>({});

  scenarioResults = signal<Record<string, ScenarioVerdictResult>>({});

  submittedFeedback = signal<{
    isCorrect: boolean;
    scoreAwarded: number;
    validJustifications?: string[];
  } | null>(null);

  latestBroadcast = signal<TrainerBroadcast | null>(null);
  private pollIntervalId: any = null;

  readonly scenarios = computed<StudioScenario[]>(() => this.session()?.scenarios || []);
  readonly currentScenario = computed<StudioScenario | null>(() => {
    const list = this.scenarios();
    const idx = this.currentIndex();
    return list[idx] || null;
  });

  readonly activeJustificationOptions = computed<JustificationOption[]>(() => {
    const sc = this.currentScenario();
    const v = this.selectedVerdict();
    if (!sc || !v) return [];
    return this.getJustificationOptions(sc, v);
  });
  readonly rosterList = computed<any[]>(() => {
    const r = this.session()?.roster || {};
    return Object.values(r);
  });
  readonly completedCount = computed<number>(() => {
    return Object.keys(this.scenarioResults()).length;
  });

  readonly formattedTime = computed<string>(() => {
    const total = this.phaseTimeRemaining();
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  isSenior(): boolean {
    return this.session()?.audience_mode === 'seniors';
  }

  isKids(): boolean {
    return this.session()?.audience_mode === 'kids';
  }

  getPlatformIcon(mock: string): string {
    switch (mock?.toUpperCase()) {
      case 'WHATSAPP': return '💬';
      case 'TIKTOK': return '📱';
      case 'FACEBOOK': return '👥';
      case 'YOUTUBE': return '▶️';
      case 'BROWSER':
      default:
        return '🌐';
    }
  }

  getCategoryTitle(threat: string): string {
    switch (threat?.toUpperCase()) {
      case 'DEEPFAKE_AUDIO': return 'Syntetyczny Głos AI (Deepfake Audio)';
      case 'DEEPFAKE_VIDEO': return 'Syntetyczne Wideo / Cyfrowy Awatar';
      case 'PHISHING': return 'Fałszywa Strona / Wyłudzenie Logowania';
      case 'DISINFORMATION': return 'Dezinformacja i Panika Medialna';
      default: return 'Manipulacja Społeczna (Social Engineering)';
    }
  }

  getEducationalGoalText(sc: StudioScenario): string {
    if (sc.educational_goal) return sc.educational_goal;
    if (sc.is_authentic) {
      return 'Naucz się rozpoznawać cechy oficjalnych i zweryfikowanych komunikatów miejskich i instytucjonalnych.';
    }
    return `Zrozumienie, w jaki sposób przestępcy wykorzystują platformę ${sc.platform_mock} do wywołania pośpiechu i wyłudzenia danych lub pieniędzy.`;
  }

  getManipulationExplanation(sc: StudioScenario): string {
    if (sc.manipulation_technique) return sc.manipulation_technique;
    if (sc.is_authentic) {
      return 'Oficjalny profil z historią publikacji, spójny język instytucjonalny, brak presji na podawanie poufnych haseł czy szybkich płatności.';
    }
    switch (sc.threat_category?.toUpperCase()) {
      case 'DEEPFAKE_AUDIO':
        return 'Sklonowany głos bliskiej osoby lub autorytetu, odtwarzający nagłą dramatyczną sytuację (wypadek, aresztowanie), by wyłączyć racjonalną ocenę.';
      case 'PHISHING':
        return 'Podrobiona strona logowania lub formularza dotacyjnego – różni się subtelną literówką w adresie URL i żąda poufnych danych.';
      default:
        return 'Emocjonalny szantaż, presja czasu ("tylko dzisiaj!") oraz prośba o zachowanie tajemnicy przed rodziną lub przełożonymi.';
    }
  }

  getCluePedagogicHint(flag: string, sc: StudioScenario): string {
    const f = flag.toLowerCase();
    if (f.includes('głos') || f.includes('audio') || f.includes('brzmienie') || f.includes('oddech')) {
      return 'Syntetyzatory mowy TTS często generują metaliczny pogłos lub pomijają naturalne mikro-pauzy na oddech.';
    }
    if (f.includes('blik') || f.includes('przelew') || f.includes('pieniędz') || f.includes('kaucj')) {
      return 'Żądanie natychmiastowej wpłaty lub kodu BLIK przez telefon to klasyczny znak rozpoznawczy oszustwa.';
    }
    if (f.includes('url') || f.includes('adres') || f.includes('domena') || f.includes('kłódk')) {
      return 'Sprawdzaj dokładnie pasek adresu: oszuści rejestrują podobnie wyglądające domeny (np. librus-portal.pl zamiast portal.librus.pl).';
    }
    if (f.includes('pośpiech') || f.includes('tajemnic') || f.includes('presj')) {
      return 'Presja czasu ma uniemożliwić Ci kontakt z kimkolwiek z rodziny i spokojną weryfikację faktów.';
    }
    return 'Ten element pozwala odróżnić zweryfikowany przekaz od sfabrykowanej próby wyłudzenia.';
  }

  getSafeActionOptions(sc: StudioScenario): SafeActionOption[] {
    const correctAdvice = sc.safe_action_advice ||
      (sc.is_authentic
        ? 'Możesz bezpiecznie skorzystać z tej oficjalnej informacji lub zweryfikować szczegóły na infolinii urzędu.'
        : 'Rozłącz się lub zamknij stronę i natychmiast zweryfikuj sprawę znanym, oficjalnym kanałem.');

    if (sc.is_authentic) {
      return [
        { id: 'opt_safe', text: correctAdvice, isCorrect: true },
        { id: 'opt_danger', text: 'Zgłoś ten profil na policję i zażądaj natychmiastowej blokady strony.', isCorrect: false },
        { id: 'opt_share', text: 'Udostępnij ostrzeżenie na wszystkich grupach bez sprawdzania faktów.', isCorrect: false }
      ];
    } else {
      return [
        { id: 'opt_safe', text: correctAdvice, isCorrect: true },
        { id: 'opt_danger', text: 'Natychmiast zrób przelew BLIK lub kliknij link, aby uniknąć problemów.', isCorrect: false },
        { id: 'opt_share', text: 'Prześlij wiadomość do znajomych z prośbą, by oni sprawdzili czy to prawda.', isCorrect: false }
      ];
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') || 'WROC-SENIOR-2026';
    this.sessionId.set(id);
    this.loadSession();

    // 1-second countdown ticker
    this.timerIntervalId = setInterval(() => {
      if (this.timerRunning() && this.phaseTimeRemaining() > 0) {
        this.phaseTimeRemaining.update((t) => t - 1);
        if (this.phaseTimeRemaining() === 0) {
          this.handleTimerExpired();
        }
      }
    }, 1000);

    // Poll session updates every 4s for trainer broadcasts and phase changes
    this.pollIntervalId = setInterval(() => {
      this.pollBroadcasts();
    }, 4000);
  }

  ngOnDestroy(): void {
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
  }

  handleTimerExpired(): void {
    if (this.activePhase() === 'LEARNING') {
      // Auto-transition to Testing phase after 20 minutes
      this.startTestingPhase();
    } else if (this.activePhase() === 'TESTING') {
      // Auto-transition to Completed/Summary after 10 minutes
      this.showSummary();
    }
  }

  startTestingPhase(): void {
    this.audioService.stop();
    this.activePhase.set('TESTING');
    this.phaseTimeRemaining.set(600); // 10 minutes for testing
    this.currentIndex.set(0);
    this.selectedVerdict.set(null);
    this.selectedFlags.set([]);
    this.selectedJustifications.set([]);
    this.submittedFeedback.set(null);
    this.activeMobileTab.set('evidence');
  }

  returnToLearningPhase(): void {
    this.audioService.stop();
    this.activePhase.set('LEARNING');
    this.phaseTimeRemaining.set(1200); // 20 minutes for learning
    this.currentIndex.set(0);
    this.submittedFeedback.set(null);
    this.activeMobileTab.set('evidence');
  }

  loadSession(): void {
    this.isLoading.set(true);
    this.http.get<SessionData>(`/api/v1/sessions/${this.sessionId()}`).subscribe({
      next: (res) => {
        this.session.set(res);
        this.isLoading.set(false);

        if (res.phase) {
          this.activePhase.set(res.phase);
          if (res.phase_timer_seconds !== undefined && res.phase_timer_seconds !== null) {
            this.phaseTimeRemaining.set(res.phase_timer_seconds);
          }
        }

        // Pre-fill default participant if roster exists
        const rosterVals = Object.values(res.roster || {});
        if (rosterVals.length > 0 && !this.currentUser) {
          const first = rosterVals[0] as any;
          this.currentUser = first.username;
          this.userScore.set(first.score || 0);
        }

        if (res.broadcast_hints && res.broadcast_hints.length > 0) {
          this.latestBroadcast.set(res.broadcast_hints[0]);
        }
      },
      error: (err) => {
        console.error('Error loading session in participant play:', err);
        this.isLoading.set(false);
      },
    });
  }

  pollBroadcasts(): void {
    this.http.get<SessionData>(`/api/v1/sessions/${this.sessionId()}`).subscribe({
      next: (res) => {
        this.session.set(res);

        // Check if trainer changed the phase remotely
        if (res.phase && res.phase !== this.activePhase()) {
          this.activePhase.set(res.phase);
          if (res.phase === 'TESTING' && this.phaseTimeRemaining() > 600) {
            this.phaseTimeRemaining.set(600);
          }
        }

        if (res.broadcast_hints && res.broadcast_hints.length > 0) {
          const newest = res.broadcast_hints[0];
          if (!this.latestBroadcast() || this.latestBroadcast()!.id !== newest.id) {
            this.latestBroadcast.set(newest);
          }
        }
      },
      error: () => {},
    });
  }

  dismissBroadcast(): void {
    this.latestBroadcast.set(null);
  }

  confirmLogin(): void {
    if (!this.loginInput.trim()) return;
    this.currentUser = this.loginInput.trim();
  }

  onFlagsChanged(flags: string[]): void {
    this.selectedFlags.set(flags);
  }

  onFlagToggled(flag: string): void {
    const current = this.selectedFlags();
    if (current.includes(flag)) {
      this.selectedFlags.set(current.filter((f) => f !== flag));
    } else {
      this.selectedFlags.set([...current, flag]);
    }
  }

  toggleClueExploration(scenarioId: string, flag: string): void {
    const map = { ...this.exploredCluesMap() };
    const list = map[scenarioId] ? [...map[scenarioId]] : [];
    if (list.includes(flag)) {
      map[scenarioId] = list.filter((item) => item !== flag);
    } else {
      map[scenarioId] = [...list, flag];
    }
    this.exploredCluesMap.set(map);
  }

  isClueExplored(scenarioId: string, flag: string): boolean {
    const list = this.exploredCluesMap()[scenarioId] || [];
    return list.includes(flag);
  }

  getExploredCluesCount(scenarioId: string): number {
    return (this.exploredCluesMap()[scenarioId] || []).length;
  }

  isScenarioExplored(scenarioId: string): boolean {
    const count = this.getExploredCluesCount(scenarioId);
    return count > 0;
  }

  selectVerdict(v: 'threat' | 'authentic'): void {
    this.selectedVerdict.set(v);
    this.selectedJustifications.set([]);
  }

  toggleJustification(id: string): void {
    const current = this.selectedJustifications();
    if (current.includes(id)) {
      this.selectedJustifications.set(current.filter((item) => item !== id));
    } else {
      this.selectedJustifications.set([...current, id]);
    }
  }

  getJustificationOptions(sc: StudioScenario, verdict: 'threat' | 'authentic'): JustificationOption[] {
    const isAudio = sc.threat_category === 'DEEPFAKE_AUDIO' || sc.media_type === 'AUDIO';
    const isWeb = sc.platform_mock === 'BROWSER';

    if (verdict === 'threat') {
      if (!sc.is_authentic) {
        if (isWeb) {
          return [
            {
              id: 'just_fake_domain',
              text: 'Podejrzany adres domeny (.cc / obcy serwer) różniący się od oficjalnej witryny',
              isCorrectArgument: true,
            },
            {
              id: 'just_credential_harvest',
              text: 'Żądanie podania poufnych danych (hasło, login, PESEL) lub opłaty BLIK',
              isCorrectArgument: true,
            },
            {
              id: 'just_time_pressure',
              text: 'Sztuczna presja czasu (odliczający zegar, groźba natychmiastowego odcięcia wody/mediów)',
              isCorrectArgument: true,
            },
            {
              id: 'just_distractor_ssl',
              text: 'Brak certyfikatu SSL (obecność zielonej kłódki zawsze gwarantuje bezpieczeństwo)',
              isCorrectArgument: false,
            },
          ];
        } else if (isAudio) {
          return [
            {
              id: 'just_audio_artifact',
              text: 'Sztuczny, metaliczny tembr głosu i nienaturalny brak pauz na oddech (Deepfake AI)',
              isCorrectArgument: true,
            },
            {
              id: 'just_audio_urgency',
              text: 'Dramatyczna historia o nagłym wypadku/aresztowaniu i żądanie natychmiastowej kaucji',
              isCorrectArgument: true,
            },
            {
              id: 'just_audio_secrecy',
              text: 'Zakaz rozłączania się i polecenie zachowania tajemnicy przed rodziną i bankiem',
              isCorrectArgument: true,
            },
            {
              id: 'just_audio_distractor',
              text: 'Dzwoniący użył nieznanego numeru kierunkowego, więc to zawsze przestępca',
              isCorrectArgument: false,
            },
          ];
        } else {
          return [
            {
              id: 'just_social_urgency',
              text: 'Nagła prośba o szybką pożyczkę lub kod BLIK z nieznanego profilu',
              isCorrectArgument: true,
            },
            {
              id: 'just_social_link',
              text: 'Podejrzany skrócony link prowadzący do fałszywej bramki płatniczej',
              isCorrectArgument: true,
            },
            {
              id: 'just_social_emotion',
              text: 'Wymuszenie pośpiechu i emocjonalna presja uniemożliwiająca namysł',
              isCorrectArgument: true,
            },
            {
              id: 'just_social_distractor',
              text: 'Użycie młodzieżowego slangu jednoznacznie dowodzi próby przestępstwa',
              isCorrectArgument: false,
            },
          ];
        }
      } else {
        return [
          { id: 'just_fp_fear', text: 'Zasada ograniczonego zaufania do wszelkich ogłoszeń w sieci', isCorrectArgument: false },
          { id: 'just_fp_unknown', text: 'Nie słyszałem wcześniej o tym programie lub komunikacie', isCorrectArgument: false },
          { id: 'just_fp_layout', text: 'Układ graficzny strony wydał mi się nietypowy dla urzędu', isCorrectArgument: false },
          { id: 'just_fp_caution', text: 'Wolałem dmuchać na zimne i potraktować treść podejrzliwie', isCorrectArgument: false },
        ];
      }
    } else {
      if (sc.is_authentic) {
        return [
          {
            id: 'just_auth_domain',
            text: 'Oficjalna, bezpieczna domena instytucjonalna (wroclaw.pl, mpwik.wroc.pl, synergia.librus.pl)',
            isCorrectArgument: true,
          },
          {
            id: 'just_auth_no_creds',
            text: 'Brak żądań natychmiastowego logowania, haseł bankowych czy opłat BLIK',
            isCorrectArgument: true,
          },
          {
            id: 'just_auth_official_contacts',
            text: 'Podane oficjalne dane kontaktowe, infolinia i spójne informacje miejskie',
            isCorrectArgument: true,
          },
          {
            id: 'just_auth_distractor',
            text: 'Strona ma zieloną kłódkę w przeglądarce, więc na pewno nie może być fałszywa',
            isCorrectArgument: false,
          },
        ];
      } else {
        return [
          { id: 'just_fn_logo', text: 'Strona lub profil używa oficjalnego logo i kolorów instytucji', isCorrectArgument: false },
          { id: 'just_fn_urgency', text: 'Sprawa wydawała się pilna i ważna dla mojego bezpieczeństwa', isCorrectArgument: false },
          { id: 'just_fn_familiar', text: 'Treść lub głos brzmiały wiarygodnie i profesjonalnie', isCorrectArgument: false },
          { id: 'just_fn_lock', text: 'Adres internetowy wyglądał na pierwszy rzut oka podobnie do urzędowego', isCorrectArgument: false },
        ];
      }
    }
  }

  submitTestAnswer(): void {
    const sc = this.currentScenario();
    const verdict = this.selectedVerdict();
    if (!sc || !verdict) return;

    this.isSubmitting.set(true);
    const isActuallyAuthentic = sc.is_authentic;
    const isCorrect = (verdict === 'authentic' && isActuallyAuthentic) ||
                      (verdict === 'threat' && !isActuallyAuthentic);

    // Evaluate justifications
    const options = this.activeJustificationOptions();
    const chosenJustIds = this.selectedJustifications();
    const chosenOptions = options.filter(o => chosenJustIds.includes(o.id));
    const validChosen = chosenOptions.filter(o => o.isCorrectArgument);
    const hasValidJustification = validChosen.length > 0;

    // Calculate score
    let scoreAwarded = isCorrect ? 100 : 25;
    if (isCorrect && hasValidJustification) {
      scoreAwarded += 25;
    }
    if (this.selectedActionId() === 'opt_safe') {
      scoreAwarded += 50;
    }

    const validJustificationTexts = validChosen.map(o => o.text);

    // Save locally
    this.scenarioResults.update((prev) => ({
      ...prev,
      [sc.id]: {
        verdict,
        isCorrect,
        scoreAwarded,
        flags: this.selectedFlags(),
        justifications: chosenOptions.map(o => o.text),
        chosenAction: this.selectedActionId(),
      }
    }));

    const allElements = [
      ...this.selectedFlags(),
      ...chosenOptions.map(o => `[Uzasadnienie] ${o.text}`)
    ];

    const payload = {
      username: this.currentUser || 'anonymous',
      scenario_id: sc.id,
      flagged_elements: allElements,
      verdict: verdict === 'threat' ? 'SCAM' : 'AUTHENTIC',
      rationale: chosenOptions.map(o => o.text).join('; ') || this.selectedFlags().join(', '),
      is_correct: isCorrect,
      score_awarded: scoreAwarded,
      safe_action_chosen: this.selectedActionId(),
    };

    this.http.post(`/api/v1/sessions/${this.sessionId()}/submit-verdict`, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.userScore.set(this.userScore() + scoreAwarded);
        this.submittedFeedback.set({
          isCorrect,
          scoreAwarded,
          validJustifications: validJustificationTexts,
        });
      },
      error: () => {
        this.isSubmitting.set(false);
        this.userScore.set(this.userScore() + scoreAwarded);
        this.submittedFeedback.set({
          isCorrect,
          scoreAwarded,
          validJustifications: validJustificationTexts,
        });
      },
    });
  }

  hasMoreScenarios(): boolean {
    return this.currentIndex() < this.scenarios().length - 1;
  }

  goToScenario(idx: number): void {
    this.audioService.stop();
    this.currentIndex.set(idx);
    this.isCompleted.set(false);
    this.activeMobileTab.set('evidence');

    const sc = this.scenarios()[idx];
    const existing = sc ? this.scenarioResults()[sc.id] : null;
    if (existing) {
      this.selectedFlags.set(existing.flags || []);
      this.selectedJustifications.set(existing.justifications || []);
      this.selectedVerdict.set(existing.verdict);
      this.submittedFeedback.set({
        isCorrect: existing.isCorrect,
        scoreAwarded: existing.scoreAwarded,
        validJustifications: existing.justifications || [],
      });
    } else {
      this.selectedFlags.set([]);
      this.selectedJustifications.set([]);
      this.selectedVerdict.set(null);
      this.submittedFeedback.set(null);
    }
  }

  goToPrevScenario(): void {
    if (this.currentIndex() > 0) {
      this.goToScenario(this.currentIndex() - 1);
    }
  }

  goToNextScenario(): void {
    if (this.hasMoreScenarios()) {
      this.goToScenario(this.currentIndex() + 1);
    }
  }

  goToNextTestScenario(): void {
    this.audioService.stop();
    this.submittedFeedback.set(null);
    this.selectedFlags.set([]);
    this.selectedJustifications.set([]);
    this.selectedVerdict.set(null);
    this.selectedActionId.set('opt_safe');
    this.activeMobileTab.set('evidence');

    if (this.hasMoreScenarios()) {
      this.goToScenario(this.currentIndex() + 1);
    } else {
      this.showSummary();
    }
  }

  showSummary(): void {
    this.audioService.stop();
    this.isCompleted.set(true);
  }

  resetToFirst(): void {
    this.currentIndex.set(0);
    this.submittedFeedback.set(null);
    this.selectedFlags.set([]);
    this.selectedJustifications.set([]);
    this.selectedVerdict.set(null);
    this.isCompleted.set(false);
    this.activeMobileTab.set('evidence');
  }
}
