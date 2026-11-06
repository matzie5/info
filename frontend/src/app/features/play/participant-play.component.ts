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
      class="min-h-screen transition-colors duration-300 font-sans"
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
              Nie daj się nabrać botom, deepfake'om i fałszywym konkursom!
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

      <!-- LIVE TRAINER BROADCAST BANNER (if any) -->
      <div *ngIf="latestBroadcast()" class="max-w-4xl mx-auto px-4 mt-4">
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

      <!-- MAIN SCENARIO INTERFACE -->
      <main *ngIf="currentUser && currentScenario()" class="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">

        <!-- SCENARIO BRIEFING CARD -->
        <div
          class="p-5 rounded-2xl border transition-all"
          [ngClass]="{
            'bg-amber-50/70 border-amber-300 shadow-sm': isSenior(),
            'bg-slate-900/90 border-indigo-500/40 shadow-xl': isKids(),
            'bg-slate-800 border-slate-700': !isSenior() && !isKids()
          }">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xl">{{ isSenior() ? '🔎' : '⚡' }}</span>
              <h2
                class="font-black tracking-tight"
                [ngClass]="isSenior() ? 'text-xl text-stone-900' : 'text-lg text-white'">
                {{ currentScenario()!.title }}
              </h2>
            </div>
            <span
              class="px-3 py-1 rounded-full text-xs font-mono font-bold"
              [ngClass]="isSenior() ? 'bg-amber-200 text-stone-800' : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700'">
              Platforma: {{ currentScenario()!.platform_mock | uppercase }}
            </span>
          </div>

          <p class="mt-2 text-sm" [ngClass]="isSenior() ? 'text-stone-700 text-base leading-relaxed' : 'text-slate-300'">
            {{ isSenior()
              ? 'Przeanalizuj poniższą wiadomość. Czy uważasz, że jest to autentyczna informacja, czy próba manipulacji lub oszustwa?'
              : 'Sprawdź ten wpis! Czy to legitna wiadomość z Wrocławia, czy scam / fake zrobiony przez oszustów?'
            }}
          </p>
        </div>

        <!-- AUTHENTIC PLATFORM MOCK CONTAINER -->
        <div class="flex justify-center">
          <div class="w-full max-w-2xl" [ngSwitch]="currentScenario()!.platform_mock">
            <!-- WHATSAPP MOCK -->
            <app-whatsapp-mock
              *ngSwitchCase="'whatsapp'"
              [author]="currentScenario()!.author"
              [authorAvatar]="currentScenario()!.author_avatar || ''"
              [verified]="currentScenario()!.verified"
              [content]="currentScenario()!.content"
              [mediaUrl]="currentScenario()!.media_url || ''"
              [redFlags]="currentScenario()!.red_flags"
              (flagSelected)="onFlagsChanged($event)">
            </app-whatsapp-mock>

            <!-- TIKTOK MOCK -->
            <app-tiktok-mock
              *ngSwitchCase="'tiktok'"
              [author]="currentScenario()!.author"
              [authorHandle]="currentScenario()!.author_handle || ''"
              [authorAvatar]="currentScenario()!.author_avatar || ''"
              [verified]="currentScenario()!.verified"
              [title]="currentScenario()!.title"
              [content]="currentScenario()!.content"
              [mediaUrl]="currentScenario()!.media_url || ''"
              [redFlags]="currentScenario()!.red_flags"
              (flagSelected)="onFlagsChanged($event)">
            </app-tiktok-mock>

            <!-- FACEBOOK MOCK -->
            <app-facebook-mock
              *ngSwitchCase="'facebook'"
              [author]="currentScenario()!.author"
              [authorAvatar]="currentScenario()!.author_avatar || ''"
              [title]="currentScenario()!.title"
              [content]="currentScenario()!.content"
              [redFlags]="currentScenario()!.red_flags"
              (flagSelected)="onFlagsChanged($event)">
            </app-facebook-mock>

            <!-- YOUTUBE MOCK -->
            <app-youtube-mock
              *ngSwitchCase="'youtube'"
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
              [content]="currentScenario()!.content"
              [redFlags]="currentScenario()!.red_flags"
              (flagSelected)="onFlagsChanged($event)">
            </app-browser-mock>
          </div>
        </div>

        <!-- VERDICT ACTION CARD -->
        <div
          *ngIf="!submittedFeedback()"
          class="p-6 rounded-3xl border-2 transition-all"
          [ngClass]="{
            'bg-white border-[#2D4A43]/30 shadow-xl': isSenior(),
            'bg-slate-900 border-indigo-500/50 shadow-2xl': isKids(),
            'bg-slate-800 border-slate-700': !isSenior() && !isKids()
          }">
          <h3
            class="text-center font-black mb-4"
            [ngClass]="isSenior() ? 'text-2xl text-stone-900' : 'text-xl text-white'">
            {{ isSenior() ? 'Jaka jest Twoja decyzja?' : 'Twój Werdykt Detektywa:' }}
          </h3>

          <!-- Big Buttons for Decision -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- FAKE / SCAM / THREAT BUTTON -->
            <button
              type="button"
              (click)="submitVerdict('threat')"
              [disabled]="isSubmitting()"
              class="p-5 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition transform active:scale-95 shadow-md"
              [ngClass]="{
                'bg-rose-50 hover:bg-rose-100 border-rose-500 text-rose-950 font-bold text-lg': isSenior(),
                'bg-rose-900/50 hover:bg-rose-900/80 border-rose-500 text-white font-black text-xl': isKids(),
                'bg-rose-950/60 hover:bg-rose-900/70 border-rose-500 text-rose-200': !isSenior() && !isKids()
              }">
              <span class="text-4xl">🚨</span>
              <span>{{ isSenior() ? 'To jest oszustwo / manipulacja' : '❌ FAKE / ŚCIEMA!' }}</span>
              <span class="text-xs font-normal opacity-80">
                {{ isSenior() ? 'Nie ufam tej wiadomości, widzę podejrzane elementy' : 'Wykryto kłamstwo, bot lub deepfake' }}
              </span>
            </button>

            <!-- AUTHENTIC / LEGIT BUTTON -->
            <button
              type="button"
              (click)="submitVerdict('authentic')"
              [disabled]="isSubmitting()"
              class="p-5 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition transform active:scale-95 shadow-md"
              [ngClass]="{
                'bg-emerald-50 hover:bg-emerald-100 border-emerald-600 text-emerald-950 font-bold text-lg': isSenior(),
                'bg-emerald-900/50 hover:bg-emerald-900/80 border-emerald-500 text-white font-black text-xl': isKids(),
                'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-500 text-emerald-200': !isSenior() && !isKids()
              }">
              <span class="text-4xl">✅</span>
              <span>{{ isSenior() ? 'To jest prawdziwa informacja' : '✨ LEGIT / PRAWDZIWE!' }}</span>
              <span class="text-xs font-normal opacity-80">
                {{ isSenior() ? 'Wiadomość pochodzi z wiarygodnego źródła' : 'Wszystko sprawdzone, brak czerwonych flag' }}
              </span>
            </button>
          </div>
        </div>

        <!-- POST-SUBMISSION EDUCATIONAL FEEDBACK CARD -->
        <div
          *ngIf="submittedFeedback()"
          class="p-6 rounded-3xl border-3 shadow-2xl transition-all"
          [ngClass]="{
            'bg-emerald-50 border-emerald-600 text-emerald-950': submittedFeedback()!.isCorrect && isSenior(),
            'bg-amber-50 border-amber-600 text-amber-950': !submittedFeedback()!.isCorrect && isSenior(),
            'bg-slate-900 border-emerald-500 text-white': submittedFeedback()!.isCorrect && isKids(),
            'bg-slate-900 border-rose-500 text-white': !submittedFeedback()!.isCorrect && isKids(),
            'bg-slate-800 border-cyan-500 text-white': !isSenior() && !isKids()
          }">
          <div class="flex items-center gap-4 mb-4">
            <span class="text-5xl">
              {{ submittedFeedback()!.isCorrect ? '🎉' : '⚠️' }}
            </span>
            <div>
              <h3 class="text-2xl font-black">
                {{ submittedFeedback()!.isCorrect
                  ? (isSenior() ? 'Doskonale! Prawidłowa ocena sytuacji!' : 'Brawo Detektywie! Punkt dla Ciebie!')
                  : (isSenior() ? 'Uwaga na to zagrożenie!' : 'Ups! Nie daj się zmylić!')
                }}
              </h3>
              <p class="text-sm font-semibold opacity-90">
                Zdobyte punkty: <span class="font-mono text-base font-black">+{{ submittedFeedback()!.scoreAwarded }} pkt</span>
              </p>
            </div>
          </div>

          <!-- Analysis of clues -->
          <div class="space-y-3 pt-3 border-t border-black/15 dark:border-white/15">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider block mb-1">
                Kluczowe czerwone flagi i elementy:
              </span>
              <ul class="list-disc list-inside text-sm space-y-1">
                <li *ngFor="let flag of currentScenario()!.red_flags">
                  <span class="font-semibold">{{ flag }}</span>
                </li>
              </ul>
            </div>

            <div class="p-4 rounded-xl bg-black/5 dark:bg-white/10 mt-3">
              <span class="text-xs font-bold uppercase tracking-wider block mb-1">
                🛡️ Jak bezpiecznie postąpić w prawdziwym życiu:
              </span>
              <p class="text-sm font-medium leading-relaxed">
                {{ currentScenario()!.safe_action_advice }}
              </p>
            </div>
          </div>

          <!-- Stepper to Next Scenario -->
          <div class="mt-6 flex justify-end">
            <button
              type="button"
              (click)="goToNextScenario()"
              class="px-6 py-3 rounded-2xl font-bold text-base transition shadow-lg flex items-center gap-2"
              [ngClass]="isSenior() ? 'bg-[#2D4A43] hover:bg-[#233b35] text-white' : 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-black'">
              <span>{{ hasMoreScenarios() ? 'Przejdź do następnego zadania ▶' : 'Zobacz podsumowanie warsztatu 🏆' }}</span>
            </button>
          </div>
        </div>

      </main>

      <!-- COMPLETION SCREEN -->
      <div *ngIf="isCompleted()" class="max-w-2xl mx-auto my-12 p-8 rounded-3xl text-center shadow-2xl border"
        [ngClass]="isSenior() ? 'bg-white border-stone-300' : 'bg-slate-900 border-slate-800'">
        <span class="text-6xl block mb-4">🏆</span>
        <h2 class="text-3xl font-black mb-2" [ngClass]="isSenior() ? 'text-stone-900' : 'text-white'">
          {{ isSenior() ? 'Gratulacje! Warsztat zakończony pomyślnie!' : 'Misja Wykonana! Jesteś Mistrzem Fact-Checkingu!' }}
        </h2>
        <p class="text-base mb-6" [ngClass]="isSenior() ? 'text-stone-600' : 'text-slate-300'">
          Poznałeś techniki dezinformacji i oszustw we Wrocławiu. Zdobyte umiejętności pozwolą Ci bezpiecznie korzystać z Internetu i komunikatorów!
        </p>

        <div class="inline-block px-8 py-4 rounded-2xl mb-6 font-mono text-3xl font-black"
          [ngClass]="isSenior() ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-indigo-900 text-amber-300 border border-amber-400'">
          Twój wynik: {{ userScore() }} pkt
        </div>

        <div>
          <button
            type="button"
            (click)="resetToFirst()"
            class="px-6 py-3 rounded-xl font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white transition">
            Zacznij od nowa
          </button>
        </div>
      </div>

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

  isSenior(): boolean {
    return this.session()?.audience_mode === 'seniors';
  }

  isKids(): boolean {
    return this.session()?.audience_mode === 'kids';
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

  goToNextScenario(): void {
    this.audioService.stop();
    this.submittedFeedback.set(null);
    this.selectedFlags.set([]);

    if (this.hasMoreScenarios()) {
      this.currentIndex.set(this.currentIndex() + 1);
    } else {
      this.isCompleted.set(true);
    }
  }

  resetToFirst(): void {
    this.currentIndex.set(0);
    this.submittedFeedback.set(null);
    this.selectedFlags.set([]);
    this.isCompleted.set(false);
  }
}
