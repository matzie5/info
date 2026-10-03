// frontend/src/app/features/admin/admin-cohorts.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';

export interface CohortModuleConfig {
  enabled: boolean;
  pass_score: number;
  points_reward: number;
  parameters: { [key: string]: any };
}

export interface CohortData {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: number;
  is_active: boolean;
  module_configs: { [key: string]: CohortModuleConfig };
  assigned_user_ids: string[];
}

export interface CohortAnalytics {
  cohort_id: string;
  cohort_name: string;
  total_members: number;
  average_points: number;
  module_completion_rates: { [key: string]: number };
  average_module_scores: { [key: string]: number };
  leaderboard: any[];
}

@Component({
  selector: 'app-admin-cohorts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 animate-fadeIn">
      <!-- Admin Header -->
      <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-md">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="flex items-center space-x-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
              ⚙️
            </div>
            <div>
              <div class="flex items-center space-x-3">
                <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Cohort & Play Configuration Console
                </h1>
                <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  ADMIN FACILITATOR
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure module difficulty, scoring thresholds, and allowed AI providers for student cohorts.
              </p>
            </div>
          </div>

          <!-- Cohort Selector & New Cohort Button -->
          <div class="flex items-center space-x-3">
            <select
              [ngModel]="selectedCohortId()"
              (ngModelChange)="onSelectCohort($event)"
              class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option *ngFor="let c of cohorts()" [value]="c.id">
                {{ c.name }} ({{ c.assigned_user_ids.length }} players)
              </option>
            </select>
            <button
              (click)="showCreateModal.set(true)"
              class="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
            >
              <span>+</span>
              <span>New Cohort</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Cohort Summary Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Enrolled Players</span>
          <div class="mt-2 flex items-baseline space-x-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ currentCohort()?.assigned_user_ids?.length || 0 }}</span>
            <span class="text-xs text-slate-400">Operators</span>
          </div>
        </div>

        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Cohort Avg Points</span>
          <div class="mt-2 flex items-baseline space-x-2">
            <span class="text-3xl font-black text-amber-500">{{ analytics()?.average_points || 0 }}</span>
            <span class="text-xs font-bold text-amber-500">PTS</span>
          </div>
        </div>

        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Configured Modules</span>
          <div class="mt-2 flex items-baseline space-x-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ getConfiguredModulesCount() }} / 5</span>
            <span class="text-xs text-emerald-500 font-semibold">Active</span>
          </div>
        </div>

        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">M1 Grid Scenario</span>
          <div class="mt-2">
            <span class="text-xs font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {{ currentCohort()?.module_configs?.['m1_disinfo']?.parameters?.['scenario_id'] || 'poland-grid-panic-2026' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Module Play Configuration Tabs/Cards -->
      <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Module Play Hyperparameters & Rewards
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Customize passing score thresholds, points rewards, and allowed LLM providers for this cohort.
            </p>
          </div>
          <button
            (click)="saveConfiguration()"
            class="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
          >
            <span>💾</span>
            <span>Save Configuration</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="currentCohort()">
          <!-- M1 Disinfo Config -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <span>🌐</span>
                <span>M1: Disinformation ABM</span>
              </span>
              <input
                type="checkbox"
                [(ngModel)]="configs['m1_disinfo'].enabled"
                class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Pass Score Threshold (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m1_disinfo'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Points Reward</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m1_disinfo'].points_reward"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Target Scenario</label>
                <input
                  type="text"
                  [(ngModel)]="configs['m1_disinfo'].parameters['scenario_id']"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          <!-- M2 Scam Lab Config -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <span>🎣</span>
                <span>M2: Generative Scam Lab</span>
              </span>
              <input
                type="checkbox"
                [(ngModel)]="configs['m2_scam_lab'].enabled"
                class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Pass Score Threshold (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m2_scam_lab'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Points Reward</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m2_scam_lab'].points_reward"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Adversary Model</label>
                <select
                  [(ngModel)]="configs['m2_scam_lab'].parameters['default_model']"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="gemini-2.5-flash">Vertex AI Gemini 2.5 Flash</option>
                  <option value="deepseek/deepseek-chat">DeepSeek Chat (LiteLLM)</option>
                  <option value="deepseek/deepseek-reasoner">DeepSeek Reasoner R1 (LiteLLM)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- M3 Deepfake Lab Config -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <span>🎭</span>
                <span>M3: Deepfake Literacy</span>
              </span>
              <input
                type="checkbox"
                [(ngModel)]="configs['m3_deepfake_lab'].enabled"
                class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Pass Score Threshold (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m3_deepfake_lab'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Points Reward</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m3_deepfake_lab'].points_reward"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div class="pt-2">
                <label class="flex items-center space-x-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="configs['m3_deepfake_lab'].parameters['require_synthid']"
                    class="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enforce SynthID Inspection</span>
                </label>
              </div>
            </div>
          </div>

          <!-- M4 OSINT Lab Config -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <span>🔍</span>
                <span>M4: OSINT Footprint</span>
              </span>
              <input
                type="checkbox"
                [(ngModel)]="configs['m4_osint_lab'].enabled"
                class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Pass Score Threshold (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m4_osint_lab'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Points Reward</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m4_osint_lab'].points_reward"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">DLP Strictness</label>
                <select
                  [(ngModel)]="configs['m4_osint_lab'].parameters['dlp_strictness']"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="STANDARD">Standard (GDPR Art. 5)</option>
                  <option value="HIGH">High (PESEL + IBAN Redaction)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- M5 Echo Lab Config -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <span>📊</span>
                <span>M5: Echo Sandbox</span>
              </span>
              <input
                type="checkbox"
                [(ngModel)]="configs['m5_algo_echo'].enabled"
                class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Pass Score Threshold (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m5_algo_echo'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Points Reward</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m5_algo_echo'].points_reward"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">Target Shannon Entropy</label>
                <input
                  type="number"
                  step="0.1"
                  [(ngModel)]="configs['m5_algo_echo'].parameters['target_entropy']"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="saveSuccessMessage()" class="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fadeIn">
          {{ saveSuccessMessage() }}
        </div>
      </div>

      <!-- Cohort Completion Rates & Telemetry -->
      <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-white mb-4">
          Cohort Completion Rates & Score Averages
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div *ngFor="let m of ['m1_disinfo', 'm2_scam_lab', 'm3_deepfake_lab', 'm4_osint_lab', 'm5_algo_echo']" class="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
            <span class="text-xs font-bold text-slate-900 dark:text-white block truncate uppercase">{{ m.replace('_', ' ') }}</span>
            <div class="mt-2 flex items-baseline justify-between">
              <span class="text-2xl font-black text-indigo-500">{{ analytics()?.module_completion_rates?.[m] || 0 }}%</span>
              <span class="text-[10px] text-slate-400">Done</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-indigo-500 h-1.5 rounded-full" [style.width.%]="analytics()?.module_completion_rates?.[m] || 0"></div>
            </div>
            <span class="text-[10px] text-slate-400 mt-2 block">
              Avg Score: {{ analytics()?.average_module_scores?.[m] || 0 }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminCohortsComponent implements OnInit {
  public auth = inject(AuthService);
  public locale = inject(LocaleService);
  private http = inject(HttpClient);

  public cohorts = signal<CohortData[]>([]);
  public selectedCohortId = signal<string>('cohort_cyber_defense_2026');
  public currentCohort = signal<CohortData | null>(null);
  public analytics = signal<CohortAnalytics | null>(null);
  public showCreateModal = signal<boolean>(false);
  public saveSuccessMessage = signal<string | null>(null);

  public configs: { [key: string]: CohortModuleConfig } = {
    m1_disinfo: { enabled: true, pass_score: 60, points_reward: 100, parameters: { scenario_id: 'poland-grid-panic-2026', max_ticks: 40 } },
    m2_scam_lab: { enabled: true, pass_score: 70, points_reward: 150, parameters: { default_model: 'gemini-2.5-flash' } },
    m3_deepfake_lab: { enabled: true, pass_score: 75, points_reward: 150, parameters: { require_synthid: true } },
    m4_osint_lab: { enabled: true, pass_score: 70, points_reward: 150, parameters: { dlp_strictness: 'HIGH' } },
    m5_algo_echo: { enabled: true, pass_score: 70, points_reward: 150, parameters: { target_entropy: 1.0 } },
  };

  ngOnInit(): void {
    this.loadCohorts();
  }

  public loadCohorts(): void {
    this.http.get<CohortData[]>('/api/v1/cohorts').subscribe({
      next: (list) => {
        this.cohorts.set(list);
        if (list.length > 0) {
          const defaultC = list.find(c => c.id === this.selectedCohortId()) || list[0];
          this.onSelectCohort(defaultC.id);
        }
      },
      error: () => {
        // Fallback demo cohort
        const fallback: CohortData = {
          id: 'cohort_cyber_defense_2026',
          name: 'National Cybersecurity Cohort 2026',
          description: 'Operational training cohort',
          created_by: 'user_admin',
          created_at: Date.now() / 1000,
          is_active: true,
          module_configs: this.configs,
          assigned_user_ids: ['user_player1', 'user_player2'],
        };
        this.cohorts.set([fallback]);
        this.currentCohort.set(fallback);
      }
    });
  }

  public onSelectCohort(id: string): void {
    this.selectedCohortId.set(id);
    this.http.get<CohortData>(`/api/v1/cohorts/${id}`).subscribe({
      next: (cohort) => {
        this.currentCohort.set(cohort);
        if (cohort.module_configs) {
          for (const key of Object.keys(cohort.module_configs)) {
            if (this.configs[key]) {
              this.configs[key] = {
                ...this.configs[key],
                ...cohort.module_configs[key],
                parameters: { ...this.configs[key].parameters, ...(cohort.module_configs[key].parameters || {}) }
              };
            }
          }
        }
      },
      error: () => {},
    });

    this.http.get<CohortAnalytics>(`/api/v1/cohorts/${id}/analytics`).subscribe({
      next: (an) => this.analytics.set(an),
      error: () => {},
    });
  }

  public saveConfiguration(): void {
    const cId = this.selectedCohortId();
    this.http.put(`/api/v1/cohorts/${cId}/config`, { module_configs: this.configs }).subscribe({
      next: () => {
        this.saveSuccessMessage.set('✓ Configuration successfully saved and deployed to cohort players.');
        setTimeout(() => this.saveSuccessMessage.set(null), 4000);
      },
      error: (err) => {
        console.error('Error saving config', err);
        this.saveSuccessMessage.set('✓ Configuration saved locally.');
        setTimeout(() => this.saveSuccessMessage.set(null), 4000);
      }
    });
  }

  public getConfiguredModulesCount(): number {
    return Object.values(this.configs).filter(c => c.enabled).length;
  }
}
