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
  current_tick: number;
  max_ticks: number;
  scenarios: StudioScenario[];
  roster: Record<string, any>;
  broadcast_hints?: TrainerBroadcast[];
}

export interface ScenarioVerdictResult {
  verdict: 'threat' | 'authentic';
  isCorrect: boolean;
  scoreAwarded: number;
  flags: string[];
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
              Warsztat ochrony przed fałszywymi telefonami, wiadomościami i oszustwami
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="bg-black/20 px-4 py-2 rounded-xl border border-white/20 text-center">
            <span class="text-xs uppercase text-emerald-200 block">Twój Wynik</span>
            <span class="text-2xl font-black text-[#FFE29A]">{{ userScore() }} pkt</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-emerald-200 block">Zadanie</span>
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

      <!-- PERSISTENT SCENARIO & SUMMARY NAVIGATION BAR -->
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
            class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition whitespace-nowrap">
            <span>{{ getPlatformIcon(sc.platform_mock) }}</span>
            <span>{{ idx + 1 }}. {{ sc.author }}</span>
            <span *ngIf="scenarioResults()[sc.id]" class="font-bold text-[11px]" [ngClass]="scenarioResults()[sc.id].isCorrect ? 'text-emerald-400' : 'text-amber-400'">✓</span>
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
          <span>Podsumowanie</span>
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
            class="text-xs font-bold px-2 py-1 rounded bg-black/10 hover:bg-black/20">
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
                class="px-3 py-1.5 rounded-lg text-xs font-medium border"
                [ngClass]="isSenior() ? 'bg-stone-100 hover:bg-stone-200 border-stone-300' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'">
                {{ p.display_name || p.username }}
              </button>
            </div>
          </div>

          <button
            type="button"
            (click)="confirmLogin()"
            [disabled]="!loginInput.trim()"
            class="w-full py-3 rounded-xl font-bold text-base transition shadow-md"
            [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
            {{ isSenior() ? 'Rozpocznij ćwiczenie ▶' : 'Wchodzę do gry! 🚀' }}
          </button>
        </div>
      </div>

      <!-- MAIN SCENARIO WORKBENCH (TWO COLUMN LAYOUT) -->
      <!-- Only rendered when active scenario exists AND not in summary mode -->
      <main *ngIf="currentUser && currentScenario() && !isCompleted()" class="max-w-7xl mx-auto px-4 py-5">

        <!-- MOBILE TAB SWITCHER (visible only on small screens) -->
        <div class="flex lg:hidden mb-4 p-1 rounded-xl bg-slate-200 dark:bg-slate-800">
          <button
            type="button"
            (click)="activeMobileTab.set('evidence')"
            [ngClass]="activeMobileTab() === 'evidence' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'"
            class="flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
            <span>📱</span>
            <span>Dowód (Symulator)</span>
          </button>
          <button
            type="button"
            (click)="activeMobileTab.set('analysis')"
            [ngClass]="activeMobileTab() === 'analysis' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'"
            class="flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
            <span>🕵️</span>
            <span>Panel Analizy & Decyzji</span>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          <!-- LEFT COLUMN: AUTHENTIC PLATFORM SIMULATOR (EVIDENCE) -->
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
                <span>Wskazówka: Zbadaj nadawcę, adres strony lub treść nagrania, a następnie wybierz odpowiedź w panelu po prawej.</span>
              </span>
              <button
                type="button"
                (click)="activeMobileTab.set('analysis')"
                class="lg:hidden text-indigo-600 font-bold hover:underline">
                Przejdź do oceny →
              </button>
            </div>
          </section>

          <!-- RIGHT COLUMN: DETECTIVE WORKBENCH (ANALYSIS & DECISION) -->
          <section
            class="lg:col-span-5 xl:col-span-5 flex flex-col gap-5 lg:sticky lg:top-6"
            [ngClass]="{'hidden lg:flex': activeMobileTab() === 'evidence'}">

            <!-- WORKBENCH HEADER & SUMMARY JUMP -->
            <div class="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Zadanie {{ currentIndex() + 1 }} z {{ scenarios().length }}
                </span>
                <span *ngIf="scenarioResults()[currentScenario()!.id]" class="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  Rozwiązane ✓
                </span>
              </div>
              <button
                type="button"
                (click)="showSummary()"
                class="text-xs font-bold px-3 py-1 rounded-lg border flex items-center gap-1.5 transition"
                [ngClass]="isSenior() ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'">
                <span>🏆</span>
                <span>Podsumowanie</span>
              </button>
            </div>

            <!-- STAGE 1: ACTIVE CLUE CHECKLIST -->
            <div
              class="p-5 rounded-2xl border transition-all shadow-md"
              [ngClass]="{
                'bg-white border-amber-300': isSenior(),
                'bg-slate-900 border-indigo-500/40': isKids(),
                'bg-slate-800 border-slate-700': !isSenior() && !isKids()
              }">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ currentScenario()!.is_authentic ? '🛡️' : '🚩' }}</span>
                  <h3 class="font-bold text-sm uppercase tracking-wider" [ngClass]="isSenior() ? 'text-stone-900' : 'text-slate-100'">
                    {{ currentScenario()!.is_authentic ? 'Krok 1: Wskaż cechy wiarygodności' : 'Krok 1: Wskaż podejrzane sygnały' }}
                  </h3>
                </div>
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                  [ngClass]="selectedFlags().length > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'">
                  {{ selectedFlags().length }}/{{ currentScenario()!.red_flags.length }}
                </span>
              </div>

              <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {{ currentScenario()!.is_authentic
                  ? 'Zaznacz elementy potwierdzające, że materiał pochodzi z oficjalnego i bezpiecznego źródła:'
                  : 'Zaznacz elementy, które wzbudzają Twoje wątpliwości lub zdradzają próbę manipulacji:'
                }}
              </p>

              <div class="flex flex-col gap-2">
                <button
                  *ngFor="let flag of currentScenario()!.red_flags"
                  type="button"
                  (click)="onFlagToggled(flag)"
                  [ngClass]="selectedFlags().includes(flag)
                    ? (isSenior() ? 'bg-amber-100 border-amber-600 text-stone-950 font-bold' : 'bg-indigo-950 border-amber-400 text-amber-200 font-bold')
                    : (isSenior() ? 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100' : 'bg-slate-950/60 border-slate-700 text-slate-300 hover:border-slate-500')"
                  class="p-2.5 rounded-xl border text-xs text-left transition flex items-start gap-2.5 shadow-2xs">
                  <span class="text-sm mt-[-1px]">{{ selectedFlags().includes(flag) ? '✅' : '⚪' }}</span>
                  <span class="flex-1 leading-snug">{{ flag }}</span>
                </button>
              </div>
            </div>

            <!-- STAGE 2: VERDICT ACTION CARD (BEFORE SUBMIT) -->
            <div
              *ngIf="!submittedFeedback()"
              class="p-6 rounded-2xl border-2 transition-all shadow-xl"
              [ngClass]="{
                'bg-white border-[#2D4A43]/40': isSenior(),
                'bg-slate-900 border-indigo-500/60': isKids(),
                'bg-slate-800 border-slate-700': !isSenior() && !isKids()
              }">
              <div class="text-center mb-4">
                <span class="text-xs font-bold uppercase tracking-wider block text-slate-400 mb-1">
                  Krok 2: Ostateczna Decyzja
                </span>
                <h3
                  class="font-black"
                  [ngClass]="isSenior() ? 'text-xl text-stone-900' : 'text-lg text-white'">
                  {{ isSenior() ? 'Czy ta wiadomość jest bezpieczna?' : 'Jaki jest Twój werdykt detektywie?' }}
                </h3>
              </div>

              <!-- DECISION BUTTONS -->
              <div class="flex flex-col gap-3">
                <!-- THREAT BUTTON -->
                <button
                  type="button"
                  (click)="submitVerdict('threat')"
                  [disabled]="isSubmitting()"
                  class="p-4 rounded-xl flex items-center gap-3 border-2 transition transform active:scale-98 shadow-md text-left"
                  [ngClass]="{
                    'bg-rose-50 hover:bg-rose-100 border-rose-500 text-rose-950 font-bold': isSenior(),
                    'bg-rose-900/60 hover:bg-rose-900/90 border-rose-500 text-white font-black': isKids(),
                    'bg-rose-950/70 hover:bg-rose-900/80 border-rose-500 text-rose-200': !isSenior() && !isKids()
                  }">
                  <span class="text-3xl shrink-0">🚨</span>
                  <div class="flex-1">
                    <span class="block text-sm sm:text-base font-bold">
                      {{ isSenior() ? 'To jest oszustwo / manipulacja' : '❌ FAKE / SCAM!' }}
                    </span>
                    <span class="block text-[11px] opacity-80 mt-0.5">
                      {{ isSenior() ? 'Wykryto cechy przestępstwa lub sztuczny materiał' : 'Nie ufam tej treści, to próba manipulacji' }}
                    </span>
                  </div>
                </button>

                <!-- AUTHENTIC BUTTON -->
                <button
                  type="button"
                  (click)="submitVerdict('authentic')"
                  [disabled]="isSubmitting()"
                  class="p-4 rounded-xl flex items-center gap-3 border-2 transition transform active:scale-98 shadow-md text-left"
                  [ngClass]="{
                    'bg-emerald-50 hover:bg-emerald-100 border-emerald-600 text-emerald-950 font-bold': isSenior(),
                    'bg-emerald-900/60 hover:bg-emerald-900/90 border-emerald-500 text-white font-black': isKids(),
                    'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-500 text-emerald-200': !isSenior() && !isKids()
                  }">
                  <span class="text-3xl shrink-0">✅</span>
                  <div class="flex-1">
                    <span class="block text-sm sm:text-base font-bold">
                      {{ isSenior() ? 'To autentyczna, prawdziwa informacja' : '✨ LEGIT / BEZPIECZNE!' }}
                    </span>
                    <span class="block text-[11px] opacity-80 mt-0.5">
                      {{ isSenior() ? 'Wiarygodne źródło, brak oznak wyłudzenia' : 'Brak złośliwych elementów, treść potwierdzona' }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <!-- STAGE 3: EDUCATIONAL FEEDBACK & ACTION PLAN (POST SUBMISSION) -->
            <div
              *ngIf="submittedFeedback()"
              class="p-6 rounded-2xl border-2 shadow-2xl transition-all"
              [ngClass]="{
                'bg-emerald-50 border-emerald-600 text-emerald-950': submittedFeedback()!.isCorrect && isSenior(),
                'bg-amber-50 border-amber-600 text-amber-950': !submittedFeedback()!.isCorrect && isSenior(),
                'bg-slate-900 border-emerald-500 text-white': submittedFeedback()!.isCorrect && isKids(),
                'bg-slate-900 border-rose-500 text-white': !submittedFeedback()!.isCorrect && isKids(),
                'bg-slate-800 border-cyan-500 text-white': !isSenior() && !isKids()
              }">
              <div class="flex items-center gap-3 mb-4">
                <span class="text-4xl">
                  {{ submittedFeedback()!.isCorrect ? '🎉' : '⚠️' }}
                </span>
                <div class="flex-1">
                  <h3 class="text-lg sm:text-xl font-black">
                    {{ submittedFeedback()!.isCorrect
                      ? (isSenior() ? 'Doskonale! Prawidłowa ocena sytuacji!' : 'Brawo Detektywie! Punkt dla Ciebie!')
                      : (currentScenario()!.is_authentic
                          ? (isSenior() ? 'Uwaga: ta informacja była w 100% autentyczna!' : 'Spokojnie! Ta treść była prawdziwa!')
                          : (isSenior() ? 'Uwaga na to zagrożenie!' : 'Ups! Nie daj się zmylić!')
                        )
                    }}
                  </h3>
                  <div class="text-xs font-semibold opacity-90 mt-0.5">
                    Zdobyte punkty: <span class="font-mono text-sm font-black">+{{ submittedFeedback()!.scoreAwarded }} pkt</span>
                  </div>
                </div>
              </div>

              <!-- PEDAGOGIC ACTION PLAN -->
              <div class="space-y-3 pt-3 border-t border-black/15 dark:border-white/15">
                <!-- Actionable real life advice -->
                <div class="p-3.5 rounded-xl bg-black/5 dark:bg-white/10">
                  <span class="text-xs font-bold uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Wskazówka w życiu codziennym:</span>
                  </span>
                  <p class="text-xs sm:text-sm font-medium leading-relaxed">
                    {{ currentScenario()!.safe_action_advice }}
                  </p>
                </div>

                <!-- Clues recap -->
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider block mb-1">
                    {{ currentScenario()!.is_authentic ? 'Elementy potwierdzające autentyczność:' : 'Elementy zdradzające próbę manipulacji:' }}
                  </span>
                  <ul class="list-disc list-inside text-xs space-y-1">
                    <li *ngFor="let flag of currentScenario()!.red_flags">
                      <span class="font-medium">{{ flag }}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- NAVIGATION BUTTONS AFTER VERDICT -->
              <div class="mt-5 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  (click)="showSummary()"
                  class="flex-1 py-3 px-4 rounded-xl font-bold text-xs border transition shadow-sm flex items-center justify-center gap-1.5"
                  [ngClass]="isSenior() ? 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300' : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-600'">
                  <span>🏆</span>
                  <span>Wróć do Podsumowania</span>
                </button>
                <button
                  type="button"
                  (click)="goToNextScenario()"
                  class="flex-1 py-3 px-4 rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
                  [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-white' : 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black'">
                  <span>{{ hasMoreScenarios() ? 'Następne zadanie ▶' : 'Zobacz wyniki 🏆' }}</span>
                </button>
              </div>
            </div>

          </section>

        </div>

      </main>

      <!-- COMPLETION & SUMMARY DEBRIEF SCREEN -->
      <section *ngIf="isCompleted()" class="max-w-4xl mx-auto my-8 px-4">
        <div class="p-8 rounded-3xl shadow-2xl border"
          [ngClass]="isSenior() ? 'bg-white border-stone-300 text-stone-900' : 'bg-slate-900 border-slate-800 text-white'">

          <!-- Top Banner -->
          <div class="text-center mb-8">
            <span class="text-6xl block mb-3">🏆</span>
            <h2 class="text-3xl font-black mb-2 tracking-tight">
              {{ isSenior() ? 'Podsumowanie Warsztatu: Bezpieczny Senior we Wrocławiu' : 'Finał Misji Cyber Detektywów!' }}
            </h2>
            <p class="text-base max-w-2xl mx-auto leading-relaxed" [ngClass]="isSenior() ? 'text-stone-600' : 'text-slate-300'">
              Przeanalizowałeś {{ scenarios().length }} scenariuszy opartych na autentycznych i manipulowanych komunikatach we Wrocławiu.
            </p>

            <div class="inline-block mt-4 px-8 py-3 rounded-2xl font-mono text-3xl font-black shadow-inner"
              [ngClass]="isSenior() ? 'bg-amber-100 text-amber-900 border-2 border-amber-300' : 'bg-indigo-900 text-amber-300 border-2 border-amber-400'">
              Twój Wynik: {{ userScore() }} pkt
            </div>
          </div>

          <!-- SCENARIO DEBRIEF CARDS -->
          <div class="mb-8 space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <h3 class="font-bold text-sm uppercase tracking-wider text-slate-500">
                Przegląd Rozwiązanych Zadań:
              </h3>
              <span class="text-xs font-mono font-bold text-emerald-600">
                {{ completedCount() }} / {{ scenarios().length }} ukończono
              </span>
            </div>

            <div
              *ngFor="let sc of scenarios(); let i = index"
              class="p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              [ngClass]="isSenior() ? 'bg-stone-50 border-stone-200 hover:border-stone-400' : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'">
              <div class="flex items-start gap-3 flex-1">
                <span class="text-2xl mt-0.5">{{ getPlatformIcon(sc.platform_mock) }}</span>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-sm">{{ i + 1 }}. {{ sc.author }}</span>
                    <!-- Authentic vs Scam Tag -->
                    <span class="text-[11px] px-2 py-0.5 rounded-full font-bold"
                      [ngClass]="sc.is_authentic ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'">
                      {{ sc.is_authentic ? '✅ Prawdziwa / Oficjalna' : '🚨 Klon / Manipulacja' }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {{ sc.title }}
                  </p>
                </div>
              </div>

              <!-- Participant Verdict & Action Button -->
              <div class="flex items-center gap-3 self-end sm:self-center">
                <div *ngIf="scenarioResults()[sc.id]" class="text-right">
                  <span class="text-xs font-bold block" [ngClass]="scenarioResults()[sc.id].isCorrect ? 'text-emerald-600' : 'text-amber-500'">
                    {{ scenarioResults()[sc.id].isCorrect ? 'Poprawnie (+100)' : 'Pomyłka (+25)' }}
                  </span>
                </div>
                <button
                  type="button"
                  (click)="goToScenario(i)"
                  class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
                  <span>🔍</span>
                  <span>Przejrzyj materiał</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              (click)="goToScenario(0)"
              class="px-6 py-3 rounded-xl font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white transition flex items-center gap-2">
              <span>←</span>
              <span>Wróć do zadań (Przeglądaj od zadania 1)</span>
            </button>
            <button
              type="button"
              (click)="resetToFirst()"
              class="px-6 py-3 rounded-xl font-bold text-sm transition border flex items-center gap-2"
              [ngClass]="isSenior() ? 'border-stone-400 hover:bg-stone-100 text-stone-800' : 'border-slate-600 hover:bg-slate-800 text-slate-300'">
              <span>🔄</span>
              <span>Zacznij warsztat od nowa</span>
            </button>
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

  currentIndex = signal<number>(0);
  selectedFlags = signal<string[]>([]);
  isSubmitting = signal<boolean>(false);
  isCompleted = signal<boolean>(false);
  activeMobileTab = signal<'evidence' | 'analysis'>('evidence');

  scenarioResults = signal<Record<string, ScenarioVerdictResult>>({});

  submittedFeedback = signal<{
    isCorrect: boolean;
    scoreAwarded: number;
  } | null>(null);

  latestBroadcast = signal<TrainerBroadcast | null>(null);
  private pollIntervalId: any = null;

  readonly scenarios = computed<StudioScenario[]>(() => this.session()?.scenarios || []);
  readonly currentScenario = computed<StudioScenario | null>(() => {
    const list = this.scenarios();
    const idx = this.currentIndex();
    return list[idx] || null;
  });
  readonly rosterList = computed<any[]>(() => {
    const r = this.session()?.roster || {};
    return Object.values(r);
  });
  readonly completedCount = computed<number>(() => {
    return Object.keys(this.scenarioResults()).length;
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') || 'WROC-SENIOR-2026';
    this.sessionId.set(id);
    this.loadSession();

    // Poll session updates every 4s for trainer broadcasts and tick advances
    this.pollIntervalId = setInterval(() => {
      this.pollBroadcasts();
    }, 4000);
  }

  ngOnDestroy(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
  }

  loadSession(): void {
    this.isLoading.set(true);
    this.http.get<SessionData>(`/api/v1/sessions/${this.sessionId()}`).subscribe({
      next: (res) => {
        this.session.set(res);
        this.isLoading.set(false);

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

  submitVerdict(verdict: 'threat' | 'authentic'): void {
    const sc = this.currentScenario();
    if (!sc) return;

    this.isSubmitting.set(true);
    const isActuallyAuthentic = sc.is_authentic;
    const isCorrect = (verdict === 'authentic' && isActuallyAuthentic) ||
                      (verdict === 'threat' && !isActuallyAuthentic);
    const scoreAwarded = isCorrect ? 100 : 25;

    // Record verdict locally in scenario results
    this.scenarioResults.update((prev) => ({
      ...prev,
      [sc.id]: {
        verdict,
        isCorrect,
        scoreAwarded,
        flags: this.selectedFlags(),
      }
    }));

    const payload = {
      username: this.currentUser || 'anonymous',
      scenario_id: sc.id,
      flagged_elements: this.selectedFlags(),
      verdict: verdict === 'threat' ? 'SCAM' : 'AUTHENTIC',
      rationale: this.selectedFlags().join(', '),
    };

    this.http.post(`/api/v1/sessions/${this.sessionId()}/submit-verdict`, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.userScore.set(this.userScore() + scoreAwarded);
        this.submittedFeedback.set({
          isCorrect,
          scoreAwarded,
        });
      },
      error: () => {
        // Fallback local update
        this.isSubmitting.set(false);
        this.userScore.set(this.userScore() + scoreAwarded);
        this.submittedFeedback.set({
          isCorrect,
          scoreAwarded,
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
      this.submittedFeedback.set({
        isCorrect: existing.isCorrect,
        scoreAwarded: existing.scoreAwarded,
      });
    } else {
      this.selectedFlags.set([]);
      this.submittedFeedback.set(null);
    }
  }

  showSummary(): void {
    this.audioService.stop();
    this.isCompleted.set(true);
  }

  goToNextScenario(): void {
    this.audioService.stop();
    this.submittedFeedback.set(null);
    this.selectedFlags.set([]);
    this.activeMobileTab.set('evidence');

    if (this.hasMoreScenarios()) {
      const nextIdx = this.currentIndex() + 1;
      this.currentIndex.set(nextIdx);
      const sc = this.scenarios()[nextIdx];
      const existing = sc ? this.scenarioResults()[sc.id] : null;
      if (existing) {
        this.selectedFlags.set(existing.flags || []);
        this.submittedFeedback.set({
          isCorrect: existing.isCorrect,
          scoreAwarded: existing.scoreAwarded,
        });
      }
    } else {
      this.isCompleted.set(true);
    }
  }

  resetToFirst(): void {
    this.currentIndex.set(0);
    this.submittedFeedback.set(null);
    this.selectedFlags.set([]);
    this.scenarioResults.set({});
    this.isCompleted.set(false);
    this.activeMobileTab.set('evidence');
  }
}
