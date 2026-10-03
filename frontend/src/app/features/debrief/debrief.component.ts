import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LabApiService } from '../../core/services/lab-api.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Session } from '../../core/models/session.model';

@Component({
  selector: 'app-debrief',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 p-6">
      <div class="max-w-5xl mx-auto w-full space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10 flex-wrap gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#84AA40]/10 border border-[#84AA40]/30 text-[#84AA40] text-xs font-bold tracking-widest uppercase mb-2">
              {{ locale.t('debrief.title') }}
            </div>
            <h1 class="text-3xl font-black text-white">
              {{ session()?.title || 'Operational Scenario Debrief' }}
            </h1>
            <p class="text-xs text-slate-400 font-mono mt-1">Session ID: {{ sessionId }}</p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <!-- Language Switcher -->
            <div class="flex items-center gap-1 border border-white/10 rounded px-2 py-1 bg-black/40 mr-1">
              <button
                *ngFor="let lang of locale.availableLanguages()"
                type="button"
                (click)="locale.setLanguage(lang.code)"
                [class.text-[#84AA40]]="locale.language() === lang.code"
                [class.font-bold]="locale.language() === lang.code"
                class="text-xs px-1 text-slate-400 hover:text-white transition-colors"
                [attr.title]="lang.nativeName">
                {{ lang.code.toUpperCase() }}
              </button>
            </div>

            <!-- Classroom Link -->
            <a [routerLink]="['/classroom', sessionId]" class="btn-secondary text-xs border-purple-500/30 text-purple-300">
              📺 {{ locale.t('classroom.title') }}
            </a>

            <a [routerLink]="['/arena', sessionId]" class="btn-secondary text-xs">
              {{ locale.t('debrief.return_arena') }}
            </a>
            <a routerLink="/" class="btn-secondary text-xs">
              {{ locale.t('debrief.lobby') }}
            </a>
          </div>
        </div>

        <!-- Outcome Banner -->
        <div
          class="p-6 rounded-xl border glass-panel"
          [class.glass-panel-glow-red]="winner() === 'RED_TEAM'"
          [class.glass-panel-glow-green]="winner() === 'BLUE_TEAM'"
          [class.glass-panel-glow-amber]="winner() === 'DRAW'">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-3xl">
              {{ winner() === 'RED_TEAM' ? '🚨' : (winner() === 'BLUE_TEAM' ? '🛡️' : '⚖️') }}
            </span>
            <div>
              <h2 class="text-xl font-black text-white">
                {{ victoryTitle() }}
              </h2>
              <span class="text-xs font-mono" [class.text-red-400]="winner() === 'RED_TEAM'" [class.text-green-400]="winner() === 'BLUE_TEAM'">
                {{ victorySubtitle() }}
              </span>
            </div>
          </div>
          <p class="text-sm text-slate-300 mt-2 leading-relaxed">
            {{ victoryMessage() }}
          </p>
        </div>

        <!-- Timeline Scrubber -->
        <div class="glass-panel p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white uppercase tracking-wider">
              {{ locale.t('debrief.timeline') }} (T+0h to T+{{ maxScrubberTick() }}h)
            </h3>
            <div class="flex items-center gap-2">
              <button
                (click)="togglePlayback()"
                class="btn-secondary text-xs py-1 px-3">
                {{ isPlaying() ? '⏸ Pause' : '▶ Playback' }}
              </button>
              <span class="badge badge-blue font-mono">T+{{ currentScrubberTick }}h</span>
            </div>
          </div>

          <!-- Slider -->
          <input
            type="range"
            min="0"
            [max]="maxScrubberTick()"
            [(ngModel)]="currentScrubberTick"
            (input)="onScrub()"
            class="w-full accent-[#84AA40] cursor-pointer" />

          <!-- Telemetry at Scrubbed Tick -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4">
            <div class="p-3 rounded bg-black/40 border border-white/5 font-mono">
              <span class="text-[10px] text-slate-400 uppercase block">{{ locale.t('metrics.trust') }}</span>
              <span class="text-xl font-bold text-[#A3E635]">
                {{ ((scrubbedMetrics()?.institutional_trust || 0) * 100).toFixed(1) }}%
              </span>
            </div>
            <div class="p-3 rounded bg-black/40 border border-white/5 font-mono">
              <span class="text-[10px] text-slate-400 uppercase block">{{ locale.t('metrics.polarization') }}</span>
              <span class="text-xl font-bold text-amber-400">
                {{ ((scrubbedMetrics()?.polarization_score || 0) * 100).toFixed(1) }}%
              </span>
            </div>
            <div class="p-3 rounded bg-black/40 border border-white/5 font-mono">
              <span class="text-[10px] text-slate-400 uppercase block">{{ locale.t('metrics.virality') }}</span>
              <span class="text-xl font-bold text-red-400">
                {{ (scrubbedMetrics()?.virality_index || 0).toFixed(1) }}x
              </span>
            </div>
            <div class="p-3 rounded bg-black/40 border border-white/5 font-mono">
              <span class="text-[10px] text-slate-400 uppercase block">{{ locale.t('metrics.reach') }}</span>
              <span class="text-xl font-bold text-slate-200">
                {{ (scrubbedMetrics()?.disinformation_reach || 0).toFixed(1) }}%
              </span>
            </div>
            <div class="p-3 rounded bg-black/40 border border-white/5 font-mono">
              <span class="text-[10px] text-slate-400 uppercase block">{{ locale.t('metrics.debunk_rate') }}</span>
              <span class="text-xl font-bold text-blue-400">
                {{ (scrubbedMetrics()?.debunk_effectiveness || 0).toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DebriefComponent implements OnInit {
  public locale = inject(LocaleService);
  private api = inject(LabApiService);
  private route = inject(ActivatedRoute);

  public sessionId = '';
  public session = signal<Session | null>(null);
  public currentScrubberTick = 0;
  public isPlaying = signal<boolean>(false);
  private playInterval: any = null;

  ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (this.sessionId) {
      this.loadSession();
    }
  }

  async loadSession() {
    try {
      const data = await this.api.getSession(this.sessionId);
      this.session.set(data);
      this.currentScrubberTick = data.current_tick;
    } catch (e) {
      console.warn('Could not load session for debrief:', e);
    }
  }

  maxScrubberTick(): number {
    return this.session()?.current_tick || 40;
  }

  scrubbedMetrics(): any {
    const s = this.session();
    if (!s) return null;
    const history = s.history_metrics || [];
    const entry = history.find((h: any) => h.tick === this.currentScrubberTick);
    if (entry) return entry;
    return s.metrics;
  }

  onScrub() {
    if (this.isPlaying()) {
      this.togglePlayback();
    }
  }

  togglePlayback() {
    if (this.isPlaying()) {
      clearInterval(this.playInterval);
      this.isPlaying.set(false);
    } else {
      this.isPlaying.set(true);
      this.currentScrubberTick = 0;
      this.playInterval = setInterval(() => {
        if (this.currentScrubberTick >= this.maxScrubberTick()) {
          this.togglePlayback();
        } else {
          this.currentScrubberTick += 1;
        }
      }, 800);
    }
  }

  winner(): string {
    const s = this.session();
    if (!s) return 'DRAW';
    const last = s.history_metrics?.find((h: any) => h.victory_details);
    if (last && last.victory_details) {
      return last.victory_details.winner;
    }
    if ((s.metrics?.institutional_trust ?? 0.8) < 0.20 || (s.metrics?.polarization_score ?? 0.2) > 0.85) return 'RED_TEAM';
    if ((s.metrics?.institutional_trust ?? 0.8) >= 0.60) return 'BLUE_TEAM';
    return 'DRAW';
  }

  victoryTitle(): string {
    const w = this.winner();
    if (w === 'RED_TEAM') return this.locale.t('debrief.victory_red');
    if (w === 'BLUE_TEAM') return this.locale.t('debrief.victory_blue');
    return this.locale.t('debrief.victory_draw');
  }

  victorySubtitle(): string {
    const w = this.winner();
    if (w === 'RED_TEAM') return this.locale.t('debrief.sub_red');
    if (w === 'BLUE_TEAM') return this.locale.t('debrief.sub_blue');
    return this.locale.t('debrief.sub_draw');
  }

  victoryMessage(): string {
    const s = this.session();
    const last = s?.history_metrics?.find((h: any) => h.victory_details);
    if (last && last.victory_details) {
      return last.victory_details.message;
    }
    if (this.winner() === 'RED_TEAM') {
      return this.locale.language() === 'pl'
        ? 'Przeciwnik skutecznie wykorzystał napięcia społeczne i obniżył zaufanie do instytucji poniżej progu krytycznego. Plotki i kaskady paniki wyparły oficjalne komunikaty.'
        : 'The adversary successfully exploited social friction and compromised institutional trust below critical thresholds. Rumors and panic cascades overtook verified facts.';
    }
    if (this.winner() === 'BLUE_TEAM') {
      return this.locale.language() === 'pl'
        ? 'Aktywne kampanie prebunkingowe i szybkie tarcia algorytmiczne skutecznie odizolowały kaskady wrogiej dezinformacji, zachowując zaufanie obywateli do infrastruktury krytycznej.'
        : 'Proactive prebunking campaigns and rapid algorithmic friction effectively quarantined hostile disinfo cascades, preserving public trust in critical infrastructure.';
    }
    return this.locale.language() === 'pl'
      ? 'Żadna ze stron nie doprowadziła do decydującego załamania poznawczego. Społeczność zachowała umiarkowaną odporność informacyjną.'
      : 'Neither team secured a decisive cognitive collapse. The platform maintained moderate resilience across contested demographic clusters.';
  }
}
