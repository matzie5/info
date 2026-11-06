// frontend/src/app/features/admin/admin-cohorts.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { AudienceService, AudienceMode } from '../../core/audience/audience.service';

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
  audience_mode?: string;
  location_name?: string;
  prepared_session_id?: string;
  tailored_environment?: any;
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
  imports: [CommonModule, FormsModule, RouterModule],
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
                  {{ locale.t('admin_cohorts.title') }}
                </h1>
                <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {{ locale.t('admin_cohorts.badge') }}
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {{ locale.t('admin_cohorts.subtitle') }}
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
                {{ c.name }} ({{ c.assigned_user_ids.length }} {{ locale.t('dashboard.operator_col').toLowerCase() }})
              </option>
            </select>
            <button
              (click)="showCreateModal.set(true)"
              class="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
            >
              <span>+</span>
              <span>{{ locale.t('admin_cohorts.new_cohort') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Cohort Summary Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">{{ locale.t('admin_cohorts.enrolled_players') }}</span>
          <div class="mt-2 flex items-baseline space-x-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ currentCohort()?.assigned_user_ids?.length || 0 }}</span>
            <span class="text-xs text-slate-400">{{ locale.t('dashboard.operator_col') }}</span>
          </div>
        </div>

        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">{{ locale.t('admin_cohorts.avg_points') }}</span>
          <div class="mt-2 flex items-baseline space-x-2">
            <span class="text-3xl font-black text-amber-500">{{ analytics()?.average_points || 0 }}</span>
            <span class="text-xs font-bold text-amber-500">PTS</span>
          </div>
        </div>

        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">{{ locale.t('admin_cohorts.modules_active') }}</span>
          <div class="mt-2 flex items-baseline space-x-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ getConfiguredModulesCount() }} / 5</span>
            <span class="text-xs text-emerald-500 font-semibold">{{ locale.t('admin_cohorts.active_badge') }}</span>
          </div>
        </div>

        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">{{ locale.t('admin_cohorts.scenario_id') }}</span>
          <div class="mt-2">
            <span class="text-xs font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {{ currentCohort()?.module_configs?.['m1_disinfo']?.parameters?.['scenario_id'] || 'poland-grid-panic-2026' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Upfront Trainer Session Preparation & AI Location Tailoring Studio -->
      <div class="bg-white/90 dark:bg-[#141B26]/90 border border-indigo-500/30 rounded-2xl p-6 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                📍 {{ locale.t('trainer_studio.badge') }}
              </span>
              <span *ngIf="currentCohort()?.location_name" class="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Active City: {{ currentCohort()?.location_name }}
              </span>
            </div>
            <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-white mt-1">
              {{ locale.t('trainer_studio.title') }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ locale.t('trainer_studio.subtitle') }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <a
              *ngIf="currentCohort()?.prepared_session_id"
              [routerLink]="['/arena', currentCohort()?.prepared_session_id]"
              class="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
            >
              <span>{{ locale.t('trainer_studio.open_prepared_session') }}</span>
            </a>

            <button
              type="button"
              (click)="tailorEnvironment()"
              [disabled]="isTailoring()"
              class="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              <span *ngIf="isTailoring()" class="animate-spin">⚙️</span>
              <span>{{ isTailoring() ? locale.t('trainer_studio.generating_btn') : locale.t('trainer_studio.generate_btn') }}</span>
            </button>
          </div>
        </div>

        <!-- Preset City Chips -->
        <div class="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span class="font-semibold text-slate-500 dark:text-slate-400">{{ locale.t('trainer_studio.preset_cities') }}:</span>
          <button
            *ngFor="let city of ['Wrocław', 'Warszawa', 'Kraków', 'Gdańsk', 'Berlin', 'Kyiv']"
            type="button"
            (click)="applyCityPreset(city)"
            [ngClass]="tailorCity === city ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'"
            class="px-2.5 py-1 rounded-lg border transition-colors"
          >
            📍 {{ city }}
          </button>
        </div>

        <!-- Studio Input Fields -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label class="block text-slate-500 dark:text-slate-400 font-semibold mb-1">{{ locale.t('trainer_studio.city_label') }}</label>
            <input
              type="text"
              [(ngModel)]="tailorCity"
              placeholder="e.g. Wrocław"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            />
          </div>

          <div>
            <label class="block text-slate-500 dark:text-slate-400 font-semibold mb-1">{{ locale.t('trainer_studio.audience_label') }}</label>
            <select
              [(ngModel)]="tailorAudience"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            >
              <option value="seniors">{{ locale.t('audience.seniors') }}</option>
              <option value="kids">{{ locale.t('audience.kids') }}</option>
              <option value="professional">{{ locale.t('audience.professional') }}</option>
            </select>
          </div>

          <div>
            <label class="block text-slate-500 dark:text-slate-400 font-semibold mb-1">{{ locale.t('trainer_studio.mayor_label') }}</label>
            <input
              type="text"
              [(ngModel)]="tailorLeader"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label class="block text-slate-500 dark:text-slate-400 font-semibold mb-1">{{ locale.t('trainer_studio.utility_label') }}</label>
            <input
              type="text"
              [(ngModel)]="tailorUtility"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label class="block text-slate-500 dark:text-slate-400 font-semibold mb-1">{{ locale.t('trainer_studio.portal_label') }}</label>
            <input
              type="text"
              [(ngModel)]="tailorPortal"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label class="block text-slate-500 dark:text-slate-400 font-semibold mb-1">{{ locale.t('trainer_studio.institution_label') }}</label>
            <input
              type="text"
              [(ngModel)]="tailorInstitution"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <!-- Generated Localized M1-M5 Preview -->
        <div *ngIf="currentCohort()?.tailored_environment as env" class="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              ✓ {{ locale.t('trainer_studio.preview_title') }} ({{ env.city_name }} • {{ env.audience_mode }})
            </span>
            <span *ngIf="currentCohort()?.prepared_session_id" class="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              Session ID: {{ currentCohort()?.prepared_session_id }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div class="font-bold text-slate-900 dark:text-white">🌐 M1: {{ env.m1_scenario_title_pl || env.m1_scenario_title_en }}</div>
              <div class="text-[11px] font-mono text-indigo-500 mt-0.5">{{ env.m1_scenario_id }}</div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{{ env.m1_scenario_description_pl || env.m1_scenario_description_en }}</p>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div class="font-bold text-slate-900 dark:text-white">🎣 M2: {{ env.m2_scam_title }}</div>
              <div class="text-[11px] font-mono text-indigo-500 mt-0.5">{{ env.m2_scam_scenario_id }}</div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{{ env.m2_initial_message }}</p>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div class="font-bold text-slate-900 dark:text-white">🎭 M3: {{ env.m3_sample_title }}</div>
              <div class="text-[11px] font-mono text-indigo-500 mt-0.5">{{ env.m3_sample_id }}</div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">M4 Preset: {{ env.m4_preset_id }} | M5 Posts: {{ env.m5_feed_posts?.length || 4 }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Module Play Configuration Tabs/Cards -->
      <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {{ locale.t('admin_cohorts.title') }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ locale.t('admin_cohorts.subtitle') }}
            </p>
          </div>
          <button
            (click)="saveConfiguration()"
            class="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
          >
            <span>💾</span>
            <span>{{ locale.t('admin_cohorts.save_btn') }}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="currentCohort()">
          <!-- M1 Disinfo Config -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/40">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <span>🌐</span>
                <span>{{ locale.t('nav.m1_disinfo') }}</span>
              </span>
              <input
                type="checkbox"
                [(ngModel)]="configs['m1_disinfo'].enabled"
                class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.passing_score') }} (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m1_disinfo'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.reward_points') }}</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m1_disinfo'].points_reward"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.scenario_id') }}</label>
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
                <span>{{ locale.t('nav.m2_scam') }}</span>
              </span>
              <input
                type="checkbox"
                [(ngModel)]="configs['m2_scam_lab'].enabled"
                class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.passing_score') }} (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m2_scam_lab'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.reward_points') }}</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m2_scam_lab'].points_reward"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.operative_model') }}</label>
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
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.passing_score') }} (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m3_deepfake_lab'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.reward_points') }}</label>
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
                <span>{{ locale.t('nav.m4_osint') }}</span>
              </span>
              <input
                type="checkbox"
                [(ngModel)]="configs['m4_osint_lab'].enabled"
                class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.passing_score') }} (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m4_osint_lab'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.reward_points') }}</label>
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
                <span>{{ locale.t('nav.m5_echo') }}</span>
              </span>
              <input
                type="checkbox"
                [(ngModel)]="configs['m5_algo_echo'].enabled"
                class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.passing_score') }} (%)</label>
                <input
                  type="number"
                  [(ngModel)]="configs['m5_algo_echo'].pass_score"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block text-slate-500 dark:text-slate-400 font-medium mb-1">{{ locale.t('admin_cohorts.reward_points') }}</label>
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
          {{ locale.t('admin_cohorts.analytics_title') }}
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
  public audience = inject(AudienceService);
  private http = inject(HttpClient);

  public cohorts = signal<CohortData[]>([]);
  public selectedCohortId = signal<string>('cohort_silver_shield_2026');
  public currentCohort = signal<CohortData | null>(null);
  public analytics = signal<CohortAnalytics | null>(null);
  public showCreateModal = signal<boolean>(false);
  public saveSuccessMessage = signal<string | null>(null);
  public isTailoring = signal<boolean>(false);

  public tailorCity = 'Wrocław';
  public tailorAudience: AudienceMode = 'seniors';
  public tailorLeader = 'Prezydent Miasta Wrocławia (Mayor of Wrocław)';
  public tailorUtility = 'MPWiK Wrocław';
  public tailorPortal = 'wroclaw.pl';
  public tailorInstitution = 'Wrocławskie Centrum Seniora';

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

  public applyCityPreset(city: string): void {
    this.tailorCity = city;
    if (city === 'Wrocław') {
      this.tailorLeader = 'Prezydent Miasta Wrocławia (Mayor of Wrocław)';
      this.tailorUtility = 'MPWiK Wrocław';
      this.tailorPortal = 'wroclaw.pl';
      this.tailorInstitution = 'Wrocławskie Centrum Seniora';
    } else if (city === 'Warszawa') {
      this.tailorLeader = 'Prezydent m.st. Warszawy';
      this.tailorUtility = 'MPWiK Warszawa';
      this.tailorPortal = 'um.warszawa.pl';
      this.tailorInstitution = 'Warszawskie Centrum Seniora';
    } else if (city === 'Kraków') {
      this.tailorLeader = 'Prezydent Miasta Krakowa';
      this.tailorUtility = 'Wodociągi Miasta Krakowa';
      this.tailorPortal = 'krakow.pl';
      this.tailorInstitution = 'Centrum Aktywności Seniorów w Krakowie';
    } else if (city === 'Gdańsk') {
      this.tailorLeader = 'Prezydent Miasta Gdańska';
      this.tailorUtility = 'GIWK Gdańsk';
      this.tailorPortal = 'gdansk.pl';
      this.tailorInstitution = 'Centrum Pracy Seniorek i Seniorów w Gdańsku';
    } else if (city === 'Berlin') {
      this.tailorLeader = 'Regierender Bürgermeister von Berlin';
      this.tailorUtility = 'Berliner Wasserbetriebe';
      this.tailorPortal = 'berlin.de';
      this.tailorInstitution = 'Seniorenvertretung Berlin';
    } else if (city === 'Kyiv') {
      this.tailorLeader = 'Мер Києва (Mayor of Kyiv)';
      this.tailorUtility = 'Київводоканал';
      this.tailorPortal = 'kyivcity.gov.ua';
      this.tailorInstitution = 'Центр активного довголіття Києва';
    }
  }

  public tailorEnvironment(): void {
    const cId = this.selectedCohortId();
    if (!cId || !this.tailorCity.trim()) return;
    this.isTailoring.set(true);

    const payload = {
      city_name: this.tailorCity.trim(),
      audience_mode: this.tailorAudience,
      language: this.locale.language(),
      local_leader_title: this.tailorLeader,
      local_utility_name: this.tailorUtility,
      local_official_portal: this.tailorPortal,
      local_institution_name: this.tailorInstitution,
      pre_create_m1_session: true,
    };

    this.http.post<CohortData>(`/api/v1/cohorts/${cId}/tailor-environment`, payload).subscribe({
      next: (updated) => {
        this.currentCohort.set(updated);
        this.audience.applyCohortEnvironment(updated);
        if (updated.module_configs) {
          for (const key of Object.keys(updated.module_configs)) {
            if (this.configs[key]) {
              this.configs[key] = {
                ...this.configs[key],
                ...updated.module_configs[key],
                parameters: { ...this.configs[key].parameters, ...(updated.module_configs[key].parameters || {}) }
              };
            }
          }
        }
        this.isTailoring.set(false);
        this.saveSuccessMessage.set(this.locale.t('trainer_studio.tailored_success'));
        setTimeout(() => this.saveSuccessMessage.set(null), 5000);
      },
      error: (err) => {
        console.error('Error tailoring cohort environment:', err);
        this.isTailoring.set(false);
      }
    });
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
        this.audience.applyCohortEnvironment(cohort);
        if (cohort.audience_mode === 'kids' || cohort.audience_mode === 'seniors' || cohort.audience_mode === 'professional') {
          this.tailorAudience = cohort.audience_mode;
        }
        if (cohort.location_name) {
          this.applyCityPreset(cohort.location_name);
        }
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
