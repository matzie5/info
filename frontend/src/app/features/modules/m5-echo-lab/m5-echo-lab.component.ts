import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LocaleService } from '../../../core/i18n/locale.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AudienceService } from '../../../core/audience/audience.service';
import { RouterModule } from '@angular/router';

export interface CandidateFeedPost {
  post_id: string;
  headline: string;
  cluster_stance: string; // ALARMIST | POLARIZING | BRIDGING_CIVIC | EMPIRICAL_TECHNICAL
  outrage_intensity: number;
  bridging_novelty: number;
  computed_rank_score: number;
}

export interface RecommenderSimulationResult {
  ranked_feed: CandidateFeedPost[];
  shannon_viewpoint_entropy: number;
  echo_chamber_radius: number;
  polarization_drift_alert: boolean;
  autonomy_resilience_score: number;
  adk_coach_explanation: string;
  dsa_compliance_citations: string[];
}

@Component({
  selector: 'app-m5-echo-lab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 p-6 flex flex-col gap-6 transition-colors duration-200">
      <!-- Header Banner -->
      <header class="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#84AA40]/20 text-[#84AA40] border border-[#84AA40]/40">
              MODULE 5
            </span>
            <span class="px-2 py-0.5 rounded text-[11px] font-bold border"
              [ngClass]="{
                'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30': audience.isProfessional(),
                'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30': audience.isKids(),
                'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30': audience.isSeniors()
              }">
              {{ locale.t('audience.' + audience.mode()) }}
            </span>
            <span *ngIf="audience.activeLocationName()" class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
              📍 {{ audience.activeLocationName() }}
            </span>
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400">Algorithmic Auditing & EU Digital Services Act (DSA) Sandbox</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            {{ locale.t('m5.title') }}
          </h1>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            {{ locale.t('m5.subtitle') }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-right shadow-sm">
            <div class="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">{{ locale.t('m5.autonomy_resilience') }}</div>
            <div class="text-xl font-mono font-bold" [ngClass]="getScoreColor(autonomyScore())">
              {{ autonomyScore() }} <span class="text-xs text-slate-500">/ 100</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Audience Golden Rule / Detective Tip Callout -->
      <div *ngIf="!audience.isProfessional()" class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
        <span>{{ audience.isKids() ? locale.t('audience.kids_rule_m5') : locale.t('audience.golden_rule_m5') }}</span>
      </div>

      <!-- Main Grid (2 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Recommender Weight Controls (5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-4">
          <div class="glass-panel p-5 bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-5 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {{ locale.t('m5.recommender_controls') }}
              </span>
              <span class="text-[10px] font-mono text-emerald-600 dark:text-[#84AA40]">Active Tuning</span>
            </div>

            <!-- Preset Buttons -->
            <div class="flex flex-col gap-1.5">
              <span class="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
                {{ locale.t('m5.presets_label') }}:
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  (click)="setPreset('trap')"
                  class="p-2 rounded text-[11px] font-mono text-left border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 hover:border-red-500 transition">
                  <div class="font-bold">{{ locale.t('m5.preset_viral') }}</div>
                  <div class="text-[9px] text-slate-500 dark:text-slate-400">High Outrage</div>
                </button>

                <button
                  type="button"
                  (click)="setPreset('balanced')"
                  class="p-2 rounded text-[11px] font-mono text-left border border-emerald-300 dark:border-[#84AA40]/30 bg-emerald-50 dark:bg-[#84AA40]/10 text-emerald-700 dark:text-emerald-300 hover:border-[#84AA40] transition">
                  <div class="font-bold">{{ locale.t('m5.preset_bridge') }}</div>
                  <div class="text-[9px] text-slate-500 dark:text-slate-400">High Diversity</div>
                </button>

                <button
                  type="button"
                  (click)="setPreset('empirical')"
                  class="p-2 rounded text-[11px] font-mono text-left border border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:border-blue-500 transition">
                  <div class="font-bold">{{ locale.t('m5.preset_empirical') }}</div>
                  <div class="text-[9px] text-slate-500 dark:text-slate-400">Technical Rigor</div>
                </button>
              </div>
            </div>

            <!-- Target User Interest Query -->
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
                {{ locale.t('m5.interest_query') }}
              </label>
              <input
                type="text"
                [(ngModel)]="interestQuery"
                class="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:border-[#84AA40] outline-none" />
            </div>

            <!-- Sliders -->
            <div class="flex flex-col gap-4 pt-1">
              <!-- Slider 1: Outrage Weight -->
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
                    <span>⚡ {{ locale.t('m5.slider_outrage') }}</span>
                  </span>
                  <span class="text-red-700 dark:text-red-300 font-bold">{{ wOutrage.toFixed(2) }}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  [(ngModel)]="wOutrage"
                  (ngModelChange)="onSliderChange()"
                  class="w-full accent-red-500 bg-slate-200 dark:bg-slate-900 cursor-pointer" />
                <div class="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  <span>0.00 (Calm)</span>
                  <span>1.00 (Maximum Provocation)</span>
                </div>
              </div>

              <!-- Slider 2: Affinity Weight -->
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                    <span>🎯 {{ locale.t('m5.slider_affinity') }}</span>
                  </span>
                  <span class="text-blue-700 dark:text-blue-300 font-bold">{{ wAffinity.toFixed(2) }}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  [(ngModel)]="wAffinity"
                  (ngModelChange)="onSliderChange()"
                  class="w-full accent-blue-500 bg-slate-200 dark:bg-slate-900 cursor-pointer" />
                <div class="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  <span>0.00 (Neutral)</span>
                  <span>1.00 (Narrow Confirmation)</span>
                </div>
              </div>

              <!-- Slider 3: Bridging Diversity Weight -->
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-emerald-600 dark:text-[#84AA40] font-semibold flex items-center gap-1.5">
                    <span>🌱 {{ locale.t('m5.slider_bridging') }}</span>
                  </span>
                  <span class="text-emerald-700 dark:text-emerald-300 font-bold">{{ wBridging.toFixed(2) }}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  [(ngModel)]="wBridging"
                  (ngModelChange)="onSliderChange()"
                  class="w-full accent-[#84AA40] bg-slate-200 dark:bg-slate-900 cursor-pointer" />
                <div class="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  <span>0.00 (Silo Isolation)</span>
                  <span>1.00 (Cross-Cutting Civic)</span>
                </div>
              </div>
            </div>

            <!-- Run Simulation Button -->
            <button
              (click)="simulateFeed()"
              [disabled]="isSimulating()"
              class="btn-primary text-xs font-mono py-2.5 px-4 rounded bg-[#84AA40] text-slate-950 dark:text-[#0B0F17] hover:bg-[#84AA40]/90 font-bold transition flex items-center justify-center gap-2">
              <span *ngIf="isSimulating()" class="animate-spin">⚙</span>
              <span>{{ isSimulating() ? locale.t('m5.recomputing') : locale.t('m5.recompute_btn') }}</span>
            </button>
          </div>
        </div>

        <!-- Right: Telemetry, Entropy & Ranked Feed (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-4">
          <!-- Live Telemetry Card -->
          <div class="glass-panel p-5 bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {{ locale.t('m5.telemetry_title') }}
              </span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                Live Recommender Audit
              </span>
            </div>

            <!-- Points Awarded Gamification Banner -->
            <div *ngIf="pointsAwarded()" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold animate-fadeIn flex items-center justify-between">
              <span>{{ locale.t('m5.points_awarded_banner') }}</span>
              <a routerLink="/dashboard" class="underline hover:text-amber-400">Dashboard →</a>
            </div>

            <!-- Telemetry Metrics Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <!-- Shannon Viewpoint Entropy -->
              <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{{ locale.t('m5.shannon_entropy') }}</span>
                  <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">Max: 2.0</span>
                </div>
                <div class="text-xl font-mono font-bold" [ngClass]="getEntropyColor(entropy())">
                  {{ entropy().toFixed(3) }} <span class="text-xs text-slate-400">bits</span>
                </div>
                <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    class="h-full transition-all duration-300"
                    [style.width.%]="(entropy() / 2.0) * 100"
                    [ngClass]="entropy() > 1.2 ? 'bg-[#84AA40]' : (entropy() > 0.8 ? 'bg-[#F9A81C]' : 'bg-red-500')"></div>
                </div>
              </div>

              <!-- Echo-Chamber Radius -->
              <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{{ locale.t('m5.echo_radius') }}</span>
                  <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">0.0 – 1.0</span>
                </div>
                <div class="text-xl font-mono font-bold" [ngClass]="getRadiusColor(echoRadius())">
                  {{ echoRadius().toFixed(3) }}
                </div>
                <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    class="h-full transition-all duration-300"
                    [style.width.%]="echoRadius() * 100"
                    [ngClass]="echoRadius() < 0.4 ? 'bg-[#84AA40]' : (echoRadius() < 0.7 ? 'bg-[#F9A81C]' : 'bg-red-500')"></div>
                </div>
              </div>

              <!-- Polarization Drift Status -->
              <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{{ locale.t('m5.polarization_alert') }}</span>
                <div class="text-xs font-mono font-bold mt-1" [ngClass]="polarizationAlert() ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'">
                  {{ polarizationAlert() ? locale.t('m5.drift_critical') : locale.t('m5.drift_balanced') }}
                </div>
                <div class="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {{ polarizationAlert() ? locale.t('m5.drift_critical_sub') : locale.t('m5.drift_balanced_sub') }}
                </div>
              </div>
            </div>

            <!-- Polarization Drift Warning Alert -->
            <div
              *ngIf="polarizationAlert()"
              class="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/50 flex items-start gap-2.5 text-xs text-red-800 dark:text-red-200">
              <span class="text-red-500 dark:text-red-400 font-mono text-sm">⚠</span>
              <div class="flex flex-col gap-0.5">
                <span class="font-bold font-mono uppercase text-red-700 dark:text-red-300 tracking-wide">
                  {{ locale.t('m5.polarization_alert') }} (EU DSA Art. 38 Systemic Risk)
                </span>
                <span class="font-sans leading-relaxed text-[11px] text-red-700/90 dark:text-red-200/90">
                  {{ locale.t('m5.drift_warning_desc') }}
                </span>
              </div>
            </div>

            <!-- ADK Depolarization Coach Commentary -->
            <div *ngIf="coachExplanation()" class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed flex flex-col gap-1">
              <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">{{ locale.t('m5.coach_title') }}</span>
              <p>{{ coachExplanation() }}</p>
            </div>

            <!-- Ranked Feed Output -->
            <div class="flex flex-col gap-2 pt-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
                  {{ locale.t('m5.feed_title') }} (Top {{ feedItems().length }} Posts)
                </span>
                <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">{{ locale.t('m5.simulated_stream') }}</span>
              </div>

              <div class="space-y-2">
                <div
                  *ngFor="let post of feedItems(); let i = index"
                  class="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-2 transition hover:border-slate-300 dark:hover:border-slate-700">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">#{{ i + 1 }}</span>
                      <span
                        class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
                        [ngClass]="getStanceBadgeClass(post.cluster_stance)">
                        {{ post.cluster_stance }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      <span>{{ locale.t('m5.post_score') }}: <b class="text-slate-900 dark:text-white">{{ post.computed_rank_score.toFixed(3) }}</b></span>
                    </div>
                  </div>

                  <p class="text-xs font-sans text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {{ post.headline }}
                  </p>

                  <div class="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                    <span class="text-red-600/90 dark:text-red-400/80">{{ locale.t('m5.outrage_intensity') }}: {{ (post.outrage_intensity * 100).toFixed(0) }}%</span>
                    <span class="text-emerald-600/90 dark:text-emerald-400/80">{{ locale.t('m5.bridging_novelty') }}: {{ (post.bridging_novelty * 100).toFixed(0) }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- EU DSA Regulatory Compliance Guidance Card -->
            <div class="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 mt-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase font-bold flex items-center gap-1.5">
                  <span>⚖️ {{ locale.t('m5.dsa_compliance') }} (Regulation 2022/2065)</span>
                </span>
                <span class="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">Articles 27 & 38</span>
              </div>
              <ul class="text-[11px] font-sans text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                <li>
                  <b class="text-slate-800 dark:text-slate-300 font-mono text-[10px]">Art. 27 (Recommender Transparency):</b> Platforms must clearly disclose the main parameters used in recommender systems and provide non-profiling algorithmic alternatives.
                </li>
                <li>
                  <b class="text-slate-800 dark:text-slate-300 font-mono text-[10px]">Art. 38 (Systemic Risk Mitigation):</b> Requires mitigation of negative effects on civic discourse, electoral processes, and public security stemming from engagement-only algorithmic optimization.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class M5EchoLabComponent implements OnInit {
  private http = inject(HttpClient);
  public auth = inject(AuthService);
  public locale = inject(LocaleService);
  public theme = inject(ThemeService);
  public audience = inject(AudienceService);

  wOutrage = 0.85;
  wAffinity = 0.75;
  wBridging = 0.10;
  interestQuery = 'grid blackout outrage sabotage';

  feedItems = signal<CandidateFeedPost[]>([]);
  entropy = signal<number>(0.811);
  echoRadius = signal<number>(0.594);
  polarizationAlert = signal<boolean>(true);
  autonomyScore = signal<number>(45.0);
  coachExplanation = signal<string>('');
  isSimulating = signal<boolean>(false);
  pointsAwarded = signal<boolean>(false);

  constructor() {
    effect(() => {
      const mode = this.audience.mode();
      const loc = this.audience.activeLocationName();
      if (mode === 'kids') {
        this.interestQuery = 'school gaming cup & snowday rumors';
      } else if (mode === 'seniors') {
        this.interestQuery = loc ? `${loc} municipal alerts & senior center news` : 'pension payouts & local clinic news';
      } else {
        this.interestQuery = 'grid blackout outrage sabotage';
      }
      this.simulateFeed();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.simulateFeed();
  }

  setPreset(type: 'trap' | 'balanced' | 'empirical'): void {
    if (type === 'trap') {
      this.wOutrage = 0.95;
      this.wAffinity = 0.85;
      this.wBridging = 0.05;
    } else if (type === 'balanced') {
      this.wOutrage = 0.15;
      this.wAffinity = 0.50;
      this.wBridging = 0.90;
    } else {
      this.wOutrage = 0.05;
      this.wAffinity = 0.70;
      this.wBridging = 0.80;
    }
    this.simulateFeed();
  }

  onSliderChange(): void {
    this.simulateFeed();
  }

  simulateFeed(): void {
    this.isSimulating.set(true);
    this.pointsAwarded.set(false);
    const lang = this.locale.language();
    const body = {
      user_id: this.auth.currentUser()?.id || 'demo_user',
      user_interest_query: this.interestQuery,
      w_outrage: this.wOutrage,
      w_affinity: this.wAffinity,
      w_bridging_diversity: this.wBridging,
      language: lang,
      top_k: 4,
      audience_mode: this.audience.mode(),
      city_name: this.audience.activeLocationName() || undefined
    };

    this.http.post<RecommenderSimulationResult>('/api/v1/modules/m5-echo/simulate-feed', body).subscribe({
      next: (res) => {
        this.feedItems.set(res.ranked_feed);
        this.entropy.set(res.shannon_viewpoint_entropy);
        this.echoRadius.set(res.echo_chamber_radius);
        this.polarizationAlert.set(res.polarization_drift_alert);
        this.autonomyScore.set(res.autonomy_resilience_score);
        this.coachExplanation.set(res.adk_coach_explanation);
        this.isSimulating.set(false);

        const user = this.auth.currentUser();
        if (user && res.autonomy_resilience_score >= 70) {
          this.http.post(`/api/v1/users/${user.id}/modules/m5_algo_echo/complete`, {
            module_id: 'm5_algo_echo',
            score: res.autonomy_resilience_score,
            takeaway: 'Maximized Shannon viewpoint entropy and collapsed algorithmic echo chamber.'
          }).subscribe({
            next: () => this.pointsAwarded.set(true),
            error: () => {}
          });
        }
      },
      error: (err) => {
        console.warn('Backend simulate-feed error, executing dynamic client-side simulation:', err);
        // Multilingual candidate headlines catalog
        const localizedHeadlines: Record<string, Record<string, string>> = {
          'p-alarm-1': {
            en: 'THEY ARE HIDING THE TRUTH: Secret Grid Rationing List Leaked!',
            pl: 'UKRYWAJĄ PRAWDĘ: Wyciekła tajna lista stopni zasilania i odłączeń prądu!',
            de: 'SIE VERHEIMLICHEN DIE WAHRHEIT: Geheime Stromrationierungsliste durchgesickert!',
            uk: 'ВОНИ ПРИХОВУЮТЬ ПРАВДУ: Злито таємний графік аварійних відключень електроенергії!'
          },
          'p-alarm-2': {
            en: 'Outrage grows as insiders claim transformers were sabotaged!',
            pl: 'Oburzenie rośnie po doniesieniach informatorów o celowym sabotażu transformatorów!',
            de: 'Empörung wächst nach Hinweisen auf gezielte Sabotage an Transformatoren!',
            uk: 'Обурення зростає: інсайдери заявляють про диверсію на підстанціях!'
          },
          'p-polar-1': {
            en: 'Why District B Always Gets Priority Power While Our Neighborhoods Pay!',
            pl: 'Dlaczego Dzielnica B ma zawsze prąd priorytetowo, podczas gdy nasze osiedla płacą rachunki!',
            de: 'Warum Bezirk B immer Vorrang bei Strom bekommt, während unsere Viertel zahlen!',
            uk: 'Чому Район Б завжди зі світлом, тоді як наші квартали сидять у темряві!'
          },
          'p-bridge-1': {
            en: 'Cross-Party Municipal Audit Explains How Grid Load-Balancing Protects Hospitals',
            pl: 'Niezależny audyt międzypartyjny wyjaśnia, jak bilansowanie mocy chroni szpitale i infrastrukturę krytyczną',
            de: 'Überparteilicher Prüfbericht erläutert, wie Netzlastverteilung Krankenhäuser schützt',
            uk: 'Міжпартійний муніципальний аудит пояснює, як балансування мережі захищає лікарні'
          },
          'p-tech-1': {
            en: 'PSE Open Telemetry Dashboard: Live 50.00 Hz Frequency & HVDC Reserve Data',
            pl: 'Oficjalny monitoring PSE: Bieżąca częstotliwość 50,00 Hz i dane rezerw interkonektorów HVDC',
            de: 'Offizielles PSE-Netzmonitoring: Live 50,00 Hz Frequenz- und HVDC-Reservedaten',
            uk: 'Офіційний дашборд PSE: Поточна частота 50,00 Гц та дані резервів HVDC'
          },
          'p-bridge-2': {
            en: 'Community Workshop: How Neighboring Districts Coordinate Emergency Microgrids',
            pl: 'Warsztaty społeczne: Jak sąsiednie dzielnice koordynują awaryjne mikrosieci energetyczne',
            de: 'Bürger-Workshop: Wie benachbarte Bezirke Notfall-Mikronetze koordinieren',
            uk: 'Громадський семінар: Як сусідні райони координують аварійні мікромережі'
          }
        };

        const candidatePool: CandidateFeedPost[] = [
          {
            post_id: 'p-alarm-1',
            headline: localizedHeadlines['p-alarm-1'][lang] || localizedHeadlines['p-alarm-1']['en'],
            cluster_stance: 'ALARMIST',
            outrage_intensity: 0.96,
            bridging_novelty: 0.10,
            computed_rank_score: 0.0
          },
          {
            post_id: 'p-alarm-2',
            headline: localizedHeadlines['p-alarm-2'][lang] || localizedHeadlines['p-alarm-2']['en'],
            cluster_stance: 'ALARMIST',
            outrage_intensity: 0.91,
            bridging_novelty: 0.15,
            computed_rank_score: 0.0
          },
          {
            post_id: 'p-polar-1',
            headline: localizedHeadlines['p-polar-1'][lang] || localizedHeadlines['p-polar-1']['en'],
            cluster_stance: 'POLARIZING',
            outrage_intensity: 0.88,
            bridging_novelty: 0.20,
            computed_rank_score: 0.0
          },
          {
            post_id: 'p-bridge-1',
            headline: localizedHeadlines['p-bridge-1'][lang] || localizedHeadlines['p-bridge-1']['en'],
            cluster_stance: 'BRIDGING_CIVIC',
            outrage_intensity: 0.18,
            bridging_novelty: 0.92,
            computed_rank_score: 0.0
          },
          {
            post_id: 'p-tech-1',
            headline: localizedHeadlines['p-tech-1'][lang] || localizedHeadlines['p-tech-1']['en'],
            cluster_stance: 'EMPIRICAL_TECHNICAL',
            outrage_intensity: 0.08,
            bridging_novelty: 0.95,
            computed_rank_score: 0.0
          },
          {
            post_id: 'p-bridge-2',
            headline: localizedHeadlines['p-bridge-2'][lang] || localizedHeadlines['p-bridge-2']['en'],
            cluster_stance: 'BRIDGING_CIVIC',
            outrage_intensity: 0.14,
            bridging_novelty: 0.89,
            computed_rank_score: 0.0
          }
        ];

        // Score posts using recommender hyperparameters
        for (const post of candidatePool) {
          const affinitySim = post.cluster_stance === 'ALARMIST' || post.cluster_stance === 'POLARIZING' ? 0.85 : 0.35;
          post.computed_rank_score = (this.wOutrage * post.outrage_intensity) + (this.wAffinity * affinitySim) + (this.wBridging * post.bridging_novelty);
        }
        candidatePool.sort((a, b) => b.computed_rank_score - a.computed_rank_score);
        const top = candidatePool.slice(0, 4);

        // Compute Shannon Viewpoint Entropy
        const counts: { [key: string]: number } = {};
        for (const p of top) {
          counts[p.cluster_stance] = (counts[p.cluster_stance] || 0) + 1;
        }
        let ent = 0;
        for (const count of Object.values(counts)) {
          const prob = count / top.length;
          ent -= prob * Math.log2(prob);
        }
        const avgOutrage = top.reduce((acc, p) => acc + p.outrage_intensity, 0) / top.length;
        const radius = Math.max(0.05, 1.0 - (ent / 2.0));
        const alert = avgOutrage > 0.65 || ent < 1.1;
        const autonomy = Math.round(Math.min(100.0, Math.max(15.0, (ent / 1.58) * 60.0 + (1.0 - avgOutrage) * 40.0)));

        this.feedItems.set(top);
        this.entropy.set(ent);
        this.echoRadius.set(radius);
        this.polarizationAlert.set(alert);
        this.autonomyScore.set(autonomy);

        // Localized ADK Depolarization Coach Explanation
        let coachMsg = '';
        switch (lang) {
          case 'pl':
            coachMsg = `[depolarization_coach_agent] Zgodnie z [EU-DSA-ART-27]: Przy w_oburzenia=${this.wOutrage.toFixed(2)} i w_mostkowania=${this.wBridging.toFixed(2)}, entropia wynosi ${ent.toFixed(2)} bitów (Promień bańki=${radius.toFixed(2)}). ${alert ? 'KRYTYCZNY DRYF POLARYZACYJNY: Zwiększ wagę mostkowania, aby przywrócić pluralizm informacyjny.' : 'ZDROWY PROFIL INFORMACYJNY: Wpisy mostkujące i empiryczne neutralizują polaryzujący clickbait.'}`;
            break;
          case 'de':
            coachMsg = `[depolarization_coach_agent] Gemäß [EU-DSA-ART-27]: Bei w_Empörung=${this.wOutrage.toFixed(2)} und w_Brückenbildung=${this.wBridging.toFixed(2)} beträgt die Entropie ${ent.toFixed(2)} Bits (Echo-Radius=${radius.toFixed(2)}). ${alert ? 'HOHE POLARISIERUNG: Erhöhen Sie das Gewicht für Brückenbildung zur Wiederherstellung der Ausgewogenheit.' : 'AUSGEWOGENE INFORMATIONSUMGEBUNG: Ausgleichende und faktenbasierte Beiträge neutralisieren Empörungsbeiträge.'}`;
            break;
          case 'uk':
            coachMsg = `[depolarization_coach_agent] За стандартом [EU-DSA-ART-27]: За w_обурення=${this.wOutrage.toFixed(2)} та w_мостів=${this.wBridging.toFixed(2)}, ентропія становить ${ent.toFixed(2)} біт (Радіус бульбашки=${radius.toFixed(2)}). ${alert ? 'КРИТИЧНИЙ ДРЕЙФ ПОЛЯРИЗАЦІЇ: Збільште вагу міжгрупових мостів для відновлення плюралізму.' : 'ЗБАЛАНСОВАНА СТРІЧКА: Об\'єднуючі та емпіричні дописи нейтралізують токсичний клікбейт.'}`;
            break;
          default:
            coachMsg = `[depolarization_coach_agent] Grounded in [EU-DSA-ART-27]: With w_outrage=${this.wOutrage.toFixed(2)} and w_bridging=${this.wBridging.toFixed(2)}, feed Shannon entropy is ${ent.toFixed(2)} bits (Echo-Chamber Radius=${radius.toFixed(2)}). ${alert ? 'HIGH POLARIZATION DRIFT: Increase bridging diversity weight to restore viewpoint balance.' : 'HEALTHY INFORMATION DIET: Bridging & empirical posts are counter-balancing outrage bait.'}`;
        }

        this.coachExplanation.set(coachMsg);
        this.isSimulating.set(false);

        const user = this.auth.currentUser();
        if (user && autonomy >= 70) {
          this.http.post(`/api/v1/users/${user.id}/modules/m5_algo_echo/complete`, {
            module_id: 'm5_algo_echo',
            score: autonomy,
            takeaway: 'Maximized Shannon viewpoint entropy and collapsed algorithmic echo chamber.'
          }).subscribe({
            next: () => this.pointsAwarded.set(true),
            error: () => this.pointsAwarded.set(true)
          });
        }
      }
    });
  }

  getStanceBadgeClass(stance: string): string {
    switch (stance) {
      case 'ALARMIST':
        return 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-500/40';
      case 'POLARIZING':
        return 'bg-amber-100 dark:bg-[#F9A81C]/20 text-amber-800 dark:text-[#F9A81C] border border-amber-300 dark:border-[#F9A81C]/40';
      case 'BRIDGING_CIVIC':
        return 'bg-emerald-100 dark:bg-[#84AA40]/20 text-emerald-800 dark:text-[#84AA40] border border-emerald-300 dark:border-[#84AA40]/40';
      case 'EMPIRICAL_TECHNICAL':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  }

  getEntropyColor(entropy: number): string {
    if (entropy >= 1.2) return 'text-emerald-600 dark:text-[#84AA40]';
    if (entropy >= 0.8) return 'text-amber-600 dark:text-[#F9A81C]';
    return 'text-red-500 dark:text-red-400';
  }

  getRadiusColor(radius: number): string {
    if (radius <= 0.4) return 'text-emerald-600 dark:text-[#84AA40]';
    if (radius <= 0.7) return 'text-amber-600 dark:text-[#F9A81C]';
    return 'text-red-500 dark:text-red-400';
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-600 dark:text-[#84AA40]';
    if (score >= 50) return 'text-amber-600 dark:text-[#F9A81C]';
    return 'text-red-500 dark:text-red-400';
  }
}
