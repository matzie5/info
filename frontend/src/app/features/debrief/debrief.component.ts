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
        <div class="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#84AA40]/10 border border-[#84AA40]/30 text-[#84AA40] text-xs font-bold tracking-widest uppercase mb-2">
              POST-EXERCISE ANALYTICAL DEBRIEF
            </div>
            <h1 class="text-3xl font-black text-white">Poland Power Grid Crisis 2026</h1>
            <p class="text-xs text-slate-400 font-mono mt-1">Session ID: {{ sessionId }}</p>
          </div>

          <div class="flex gap-3">
            <a [routerLink]="['/arena', sessionId]" class="btn-secondary text-xs">Return to Arena</a>
            <a routerLink="/" class="btn-secondary text-xs">Lobby</a>
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
              Timeline Playback Scrubber (T+0h to T+{{ maxScrubberTick() }}h)
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
              <span class="text-[10px] text-slate-400 uppercase block">Platform Trust</span>
              <span class="text-xl font-bold text-[#A3E635]">
                {{ (scrubbedMetrics()?.institutional_trust || 0).toFixed(1) }}%
              </span>
            </div>
            <div class="p-3 rounded bg-black/40 border border-white/5 font-mono">
              <span class="text-[10px] text-slate-400 uppercase block">Polarization</span>
              <span class="text-xl font-bold text-amber-400">
                {{ (scrubbedMetrics()?.polarization_score || 0).toFixed(1) }}%
              </span>
            </div>
            <div class="p-3 rounded bg-black/40 border border-white/5 font-mono">
              <span class="text-[10px] text-slate-400 uppercase block">Virality Index</span>
              <span class="text-xl font-bold text-red-400">
                {{ (scrubbedMetrics()?.virality_index || 0).toFixed(1) }}
              </span>
            </div>
            <div class="p-3 rounded bg-black/40 border border-white/5 font-mono">
              <span class="text-[10px] text-slate-400 uppercase block">Disinfo Reach</span>
              <span class="text-xl font-bold text-red-300">
                {{ (scrubbedMetrics()?.disinformation_reach || 0).toFixed(1) }}%
              </span>
            </div>
            <div class="p-3 rounded bg-black/40 border border-white/5 font-mono">
              <span class="text-[10px] text-slate-400 uppercase block">Debunk Efficacy</span>
              <span class="text-xl font-bold text-[#84AA40]">
                {{ (scrubbedMetrics()?.debunk_effectiveness || 0).toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Telemetry History Table -->
        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white uppercase tracking-wider">
            Tick History Log
          </h3>
          <div class="overflow-x-auto max-h-72">
            <table class="w-full text-left text-xs font-mono">
              <thead>
                <tr class="border-b border-white/10 text-slate-400 sticky top-0 bg-[#131B2A]">
                  <th class="py-2 px-3">Tick</th>
                  <th class="py-2 px-3">Trust</th>
                  <th class="py-2 px-3">Polarization</th>
                  <th class="py-2 px-3">Virality</th>
                  <th class="py-2 px-3">Disinfo Reach</th>
                  <th class="py-2 px-3">Debunk Rate</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr *ngFor="let h of historyList()" [class.bg-slate-800]="h.tick === currentScrubberTick">
                  <td class="py-2 px-3 text-white font-bold">T+{{ h.tick }}h</td>
                  <td class="py-2 px-3 text-[#A3E635]">{{ (h.institutional_trust || 0).toFixed(1) }}%</td>
                  <td class="py-2 px-3 text-amber-400">{{ (h.polarization_score || 0).toFixed(1) }}%</td>
                  <td class="py-2 px-3 text-red-400">{{ (h.virality_index || 0).toFixed(1) }}</td>
                  <td class="py-2 px-3 text-red-300">{{ (h.disinformation_reach || 0).toFixed(1) }}%</td>
                  <td class="py-2 px-3 text-[#84AA40]">{{ (h.debunk_effectiveness || 0).toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DebriefComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(LabApiService);
  public locale = inject(LocaleService);

  public sessionId = '';
  public session = signal<Session | null>(null);

  public currentScrubberTick = 0;
  public isPlaying = signal<boolean>(false);
  private playInterval: any = null;

  async ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (this.sessionId) {
      try {
        const sess = await this.api.getSession(this.sessionId);
        this.session.set(sess);
        this.currentScrubberTick = sess.current_tick;
      } catch (e) {
        console.warn('Could not load session for debrief:', e);
      }
    }
  }

  historyList(): any[] {
    const s = this.session();
    if (!s || !s.history_metrics) return [];
    return s.history_metrics.filter(h => h.tick !== undefined);
  }

  maxScrubberTick(): number {
    const list = this.historyList();
    if (list.length === 0) return this.session()?.current_tick || 0;
    return list[list.length - 1].tick || 0;
  }

  scrubbedMetrics(): any {
    const list = this.historyList();
    const entry = list.find(h => h.tick === Number(this.currentScrubberTick));
    if (entry) return entry;
    return this.session()?.metrics || null;
  }

  onScrub() {
    // User scrubbed slider
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
    if (s.metrics.institutional_trust < 20.0 || s.metrics.polarization_score > 85.0) return 'RED_TEAM';
    if (s.metrics.institutional_trust >= 60.0) return 'BLUE_TEAM';
    return 'DRAW';
  }

  victoryTitle(): string {
    const w = this.winner();
    if (w === 'RED_TEAM') return 'ADVERSARY DECISIVE VICTORY';
    if (w === 'BLUE_TEAM') return 'DEFENSE DECISIVE VICTORY';
    return 'CONTESTED STALEMATE';
  }

  victorySubtitle(): string {
    const w = this.winner();
    if (w === 'RED_TEAM') return 'COGNITIVE DEFENSES BREACHED';
    if (w === 'BLUE_TEAM') return 'INFORMATION DEFENSES HELD';
    return 'MISSION CONCLUDED AT MAX TICKS';
  }

  victoryMessage(): string {
    const s = this.session();
    const last = s?.history_metrics?.find((h: any) => h.victory_details);
    if (last && last.victory_details) {
      return last.victory_details.message;
    }
    if (this.winner() === 'RED_TEAM') {
      return 'The adversary successfully exploited social friction and compromised institutional trust below critical thresholds. Rumors and panic cascades overtook verified facts.';
    }
    if (this.winner() === 'BLUE_TEAM') {
      return 'Proactive prebunking campaigns and rapid algorithmic friction effectively quarantined hostile disinfo cascades, preserving public trust in critical energy infrastructure.';
    }
    return 'Neither team secured a decisive cognitive collapse. The platform maintained moderate resilience across contested demographic clusters.';
  }
}
