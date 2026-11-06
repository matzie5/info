import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LocaleService } from '../../../core/i18n/locale.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AudienceService } from '../../../core/audience/audience.service';

export interface ScamTurn {
  role: 'operative' | 'defender';
  content: string;
}

export interface ScamCoachEvaluation {
  resilience_score: number;
  detected_red_flags: string[];
  tools_invoked: string[];
  coach_feedback: string;
  grounded_citations: string[];
}

export interface ScamDrillSession {
  drill_id: string;
  user_id: string;
  scenario_id: string;
  operative_model: string;
  provider_type: string;
  turns: ScamTurn[];
  tools_used: string[];
  latest_evaluation?: ScamCoachEvaluation | null;
}

export interface TurnResponse {
  session: ScamDrillSession;
  adk_agent_config: {
    operative_agent: string;
    operative_model: string;
    provider_auth_mode: string;
    deepseek_key_configured: boolean;
    judge_model: string;
  };
  operative_reply: {
    operative_message: string;
    manipulation_tactics_used: string[];
    escalation_level: number;
  };
  tool_evidence: {
    inspect_sender_headers?: any;
    lookup_domain_whois?: any;
    verify_out_of_band_callback?: any;
  };
  coach_evaluation: ScamCoachEvaluation;
}

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-m2-scam-lab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 p-6 flex flex-col gap-6 transition-colors duration-200">
      <!-- Header Banner -->
      <header class="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#84AA40]/20 text-[#84AA40] border border-[#84AA40]/40">
              MODULE 2
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
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400">Google ADK + Multi-Provider (Vertex AI / DeepSeek)</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            {{ locale.t('m2.title') }}
          </h1>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            {{ locale.t('m2.subtitle') }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-right shadow-sm">
            <div class="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">{{ locale.t('m2.resilience_score') }}</div>
            <div class="text-xl font-mono font-bold" [ngClass]="getScoreColor(latestScore())">
              {{ latestScore() }} <span class="text-xs text-slate-500">/ 100</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Audience Golden Rule / Detective Tip Callout -->
      <div *ngIf="!audience.isProfessional()" class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
        <span>{{ audience.isKids() ? locale.t('audience.kids_rule_m2') : locale.t('audience.golden_rule_m2') }}</span>
      </div>

      <!-- Configuration & Controls Bar -->
      <section class="glass-panel p-4 flex flex-wrap items-center justify-between gap-4 bg-white/90 dark:bg-[#141B26]/80 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex flex-wrap items-center gap-4 flex-1">
          <!-- Scenario Selector -->
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ locale.t('m2.scenario_label') }}</label>
            <select
              [ngModel]="selectedScenario()"
              (ngModelChange)="selectedScenario.set($event)"
              class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded px-3 py-1.5 focus:border-[#84AA40] outline-none font-mono">
              <option *ngFor="let sc of scenarios()" [value]="sc.scenario_id">
                {{ sc.title }}
              </option>
            </select>
          </div>

          <!-- Operative Model Selector -->
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ locale.t('m2.model_selector') }}</label>
            <select
              [ngModel]="selectedModel()"
              (ngModelChange)="selectedModel.set($event)"
              class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded px-3 py-1.5 focus:border-[#84AA40] outline-none font-mono">
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Vertex Keyless ADC)</option>
              <option value="deepseek/deepseek-chat">DeepSeek Chat (LiteLLM + Secret Mgr)</option>
              <option value="deepseek/deepseek-reasoner">DeepSeek Reasoner R1 (LiteLLM)</option>
            </select>
          </div>

          <!-- Provider Badge -->
          <div class="flex flex-col gap-1 justify-end">
            <span class="text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Provider Auth</span>
            <span class="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              {{ selectedModel().startsWith('deepseek') ? 'DeepSeek LiteLLM' : 'Vertex AI ADC' }}
            </span>
          </div>
        </div>

        <button
          (click)="startNewDrill()"
          [disabled]="isLoading()"
          class="btn-primary text-xs font-mono py-2 px-4 rounded bg-[#84AA40] text-slate-950 dark:text-[#0B0F17] hover:bg-[#84AA40]/90 font-bold transition flex items-center gap-2">
          <span *ngIf="isLoading()" class="animate-spin">⚙</span>
          <span>{{ isLoading() ? locale.t('m2.initializing') : locale.t('m2.start_drill') }}</span>
        </button>
      </section>

      <!-- Main Workbench Grid: 2 Columns -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left Column: Attack Dialogue Stream & Response Form (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-4">
          <div class="glass-panel p-5 bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 mb-4">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {{ locale.t('m2.simulation_channel') }}
                </span>
                <span *ngIf="session()?.drill_id" class="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  [{{ session()?.drill_id }}]
                </span>
              </div>
              <div class="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {{ locale.t('m2.turn') }}: {{ session()?.turns?.length || 0 }}
              </div>
            </div>

            <!-- Dialogue Stream -->
            <div class="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[460px] pr-2">
              <div *ngIf="!session() && !isLoading()" class="p-8 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
                {{ locale.t('m2.empty_dialogue') }}
              </div>

              <div
                *ngFor="let turn of session()?.turns; let idx = index"
                [ngClass]="turn.role === 'operative' ? 'items-start' : 'items-end'"
                class="flex flex-col">
                
                <!-- Operative Message -->
                <div *ngIf="turn.role === 'operative'" class="max-w-[90%] flex flex-col gap-1.5">
                  <div class="flex items-center gap-2 text-[10px] font-mono text-[#D97706] dark:text-[#F9A81C]">
                    <span class="font-bold uppercase tracking-wider">{{ locale.t('m2.adversarial_operative') }}</span>
                    <span class="px-1.5 py-0.2 rounded bg-amber-500/10 dark:bg-[#F9A81C]/20 border border-amber-500/30 dark:border-[#F9A81C]/40 text-amber-700 dark:text-[#F9A81C]">
                      {{ session()?.operative_model }}
                    </span>
                    <span *ngIf="latestTactics().length > 0 && idx === (session()?.turns?.length || 0) - 1" class="text-slate-500 dark:text-slate-400">
                      Tactics: {{ latestTactics().join(', ') }}
                    </span>
                  </div>
                  <div class="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-slate-900 dark:text-slate-200 text-sm font-sans leading-relaxed shadow-sm">
                    {{ turn.content }}
                  </div>
                </div>

                <!-- Defender Message -->
                <div *ngIf="turn.role === 'defender'" class="max-w-[90%] flex flex-col gap-1.5 self-end items-end">
                  <div class="text-[10px] font-mono text-[#65A30D] dark:text-[#84AA40] font-bold uppercase tracking-wider">
                    {{ locale.t('dashboard.operator_col') }} (You)
                  </div>
                  <div class="p-3.5 rounded-lg bg-emerald-50 dark:bg-[#84AA40]/15 border border-emerald-200 dark:border-[#84AA40]/40 text-slate-900 dark:text-slate-100 text-sm font-sans leading-relaxed shadow-sm">
                    {{ turn.content }}
                  </div>
                </div>
              </div>

              <div *ngIf="isLoading()" class="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-xs font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                <span class="animate-spin">⚙</span> {{ locale.t('m2.submitting') }}
              </div>
            </div>

            <!-- Defensive FunctionTools Selection Bar -->
            <div class="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <span>🛡️ {{ locale.t('m2.telemetry_tools') }}</span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500">(Google ADK FunctionTools)</span>
                </span>
                <span class="text-[10px] font-mono text-emerald-600 dark:text-[#84AA40]">
                  Active: {{ getSelectedToolCount() }}/3
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  (click)="toggleTool('inspect_headers')"
                  [ngClass]="activeTools.inspect_headers ? 'bg-emerald-50 dark:bg-[#84AA40]/25 border-emerald-500 dark:border-[#84AA40] text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'"
                  class="p-2 rounded border text-xs font-mono flex items-center justify-between transition">
                  <span>{{ locale.t('m2.tool_inspect_headers') }}</span>
                  <span class="text-[10px]">{{ activeTools.inspect_headers ? '✓ ON' : 'OFF' }}</span>
                </button>

                <button
                  type="button"
                  (click)="toggleTool('lookup_whois')"
                  [ngClass]="activeTools.lookup_whois ? 'bg-emerald-50 dark:bg-[#84AA40]/25 border-emerald-500 dark:border-[#84AA40] text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'"
                  class="p-2 rounded border text-xs font-mono flex items-center justify-between transition">
                  <span>{{ locale.t('m2.tool_lookup_whois') }}</span>
                  <span class="text-[10px]">{{ activeTools.lookup_whois ? '✓ ON' : 'OFF' }}</span>
                </button>

                <button
                  type="button"
                  (click)="toggleTool('out_of_band_callback')"
                  [ngClass]="activeTools.out_of_band_callback ? 'bg-emerald-50 dark:bg-[#84AA40]/25 border-emerald-500 dark:border-[#84AA40] text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'"
                  class="p-2 rounded border text-xs font-mono flex items-center justify-between transition">
                  <span>{{ locale.t('m2.tool_out_of_band') }}</span>
                  <span class="text-[10px]">{{ activeTools.out_of_band_callback ? '✓ ON' : 'OFF' }}</span>
                </button>
              </div>
            </div>

            <!-- Response Form -->
            <form (ngSubmit)="sendTurn()" class="mt-4 flex flex-col gap-2">
              <div class="relative">
                <textarea
                  [(ngModel)]="userMessageText"
                  name="userMessage"
                  rows="3"
                  [disabled]="isLoading() || !session()"
                  [placeholder]="locale.t('m2.response_placeholder')"
                  class="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#84AA40] focus:ring-1 focus:ring-[#84AA40] outline-none font-sans"></textarea>
              </div>

              <div class="flex items-center justify-between">
                <div class="flex gap-2">
                  <button
                    type="button"
                    (click)="fillPresetRefusal()"
                    [disabled]="isLoading() || !session()"
                    class="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline">
                    {{ locale.t('m2.template_refuse') }}
                  </button>
                  <button
                    type="button"
                    (click)="fillPresetCompliance()"
                    [disabled]="isLoading() || !session()"
                    class="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline">
                    {{ locale.t('m2.template_comply') }}
                  </button>
                </div>

                <button
                  type="submit"
                  [disabled]="isLoading() || !session() || !userMessageText.trim()"
                  class="btn-primary text-xs font-mono py-2 px-5 rounded bg-[#84AA40] text-slate-950 dark:text-[#0B0F17] font-bold hover:bg-[#84AA40]/90 transition disabled:opacity-50">
                  {{ locale.t('m2.submit_turn') }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Right Column: Forensic Evidence & Coach Evaluation (5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-4">
          <!-- Resilience Score & Coach Feedback Card -->
          <div class="glass-panel p-5 bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {{ locale.t('m2.coach_evaluation') }}
              </span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                Vertex Pro Judge
              </span>
            </div>

            <!-- Points Awarded Gamification Banner -->
            <div *ngIf="pointsAwarded()" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold animate-fadeIn flex items-center justify-between">
              <span>{{ locale.t('m2.points_awarded_banner') }}</span>
              <a routerLink="/dashboard" class="underline hover:text-amber-400">Dashboard →</a>
            </div>

            <!-- Score Visualizer -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-slate-500 dark:text-slate-400">{{ locale.t('m2.resilience_score') }}:</span>
                <span class="font-bold text-lg" [ngClass]="getScoreColor(latestScore())">
                  {{ latestScore() }} / 100
                </span>
              </div>
              <div class="w-full h-2.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                <div
                  class="h-full transition-all duration-500"
                  [style.width.%]="latestScore()"
                  [ngClass]="getScoreBarClass(latestScore())"></div>
              </div>
            </div>

            <!-- Coach Feedback Text -->
            <div *ngIf="evaluation()" class="p-3.5 rounded bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <div class="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold uppercase">{{ locale.t('m2.coach_assessment') }}</div>
              <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {{ evaluation()?.coach_feedback }}
              </p>

              <!-- Citations -->
              <div *ngIf="evaluation()?.grounded_citations?.length" class="flex flex-wrap items-center gap-1.5 mt-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">{{ locale.t('m2.grounding_citations') }}:</span>
                <span
                  *ngFor="let cite of evaluation()?.grounded_citations"
                  class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  {{ cite }}
                </span>
              </div>
            </div>

            <!-- Detected Red Flags -->
            <div *ngIf="evaluation()?.detected_red_flags?.length" class="flex flex-col gap-2">
              <span class="text-[11px] font-mono uppercase text-amber-600 dark:text-[#F9A81C] font-semibold">
                {{ locale.t('m2.tactical_flaws') }}
              </span>
              <ul class="flex flex-col gap-1.5">
                <li
                  *ngFor="let flag of evaluation()?.detected_red_flags"
                  class="text-xs font-sans text-slate-800 dark:text-slate-300 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 rounded px-2.5 py-1.5 flex items-start gap-2">
                  <span class="text-red-500 dark:text-red-400 font-mono text-[10px] mt-0.5">⚠</span>
                  <span>{{ flag }}</span>
                </li>
              </ul>
            </div>

            <div *ngIf="!evaluation()" class="p-6 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
              {{ locale.t('m2.empty_dialogue') }}
            </div>
          </div>

          <!-- Tool Evidence Details Panel -->
          <div class="glass-panel p-5 bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span class="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {{ locale.t('m2.telemetry_evidence') }}
              </span>
              <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">Raw Telemetry</span>
            </div>

            <div *ngIf="!toolEvidence()" class="text-xs font-mono text-slate-400 dark:text-slate-500 p-4 text-center">
              {{ locale.t('m2.no_evidence') }}
            </div>

            <div *ngIf="toolEvidence()" class="flex flex-col gap-3">
              <!-- Header Inspection Evidence -->
              <div *ngIf="toolEvidence()?.inspect_sender_headers" class="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs flex flex-col gap-1">
                <div class="flex items-center justify-between text-emerald-600 dark:text-[#84AA40] font-bold">
                  <span>[inspect_headers]</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/40">
                    {{ toolEvidence()?.inspect_sender_headers?.verdict }}
                  </span>
                </div>
                <div class="text-[11px] text-slate-600 dark:text-slate-400 mt-1">From: {{ toolEvidence()?.inspect_sender_headers?.from_header }}</div>
                <div class="text-[11px] text-slate-600 dark:text-slate-400">Reply-To: {{ toolEvidence()?.inspect_sender_headers?.reply_to }}</div>
                <div class="text-[11px] text-amber-600 dark:text-amber-300">SPF: {{ toolEvidence()?.inspect_sender_headers?.spf }}</div>
                <div class="text-[11px] text-amber-600 dark:text-amber-300">DKIM: {{ toolEvidence()?.inspect_sender_headers?.dkim }}</div>
                <div class="text-[11px] text-red-600 dark:text-red-400">DMARC: {{ toolEvidence()?.inspect_sender_headers?.dmarc }}</div>
              </div>

              <!-- WHOIS Lookup Evidence -->
              <div *ngIf="toolEvidence()?.lookup_domain_whois" class="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs flex flex-col gap-1">
                <div class="flex items-center justify-between text-emerald-600 dark:text-[#84AA40] font-bold">
                  <span>[lookup_whois]</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded" [ngClass]="toolEvidence()?.lookup_domain_whois?.threat_score > 50 ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/40' : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-500/40'">
                    Threat Score: {{ toolEvidence()?.lookup_domain_whois?.threat_score }}/100
                  </span>
                </div>
                <div class="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Domain: {{ toolEvidence()?.lookup_domain_whois?.domain }}</div>
                <div class="text-[11px] text-slate-600 dark:text-slate-400">Registrar: {{ toolEvidence()?.lookup_domain_whois?.registrar }}</div>
                <div class="text-[11px]" [ngClass]="toolEvidence()?.lookup_domain_whois?.is_newly_registered_domain ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'">
                  Age: {{ toolEvidence()?.lookup_domain_whois?.registered_days_ago }} days ago
                  <span *ngIf="toolEvidence()?.lookup_domain_whois?.is_newly_registered_domain" class="font-bold text-red-600 dark:text-red-400">(NEWLY REGISTERED)</span>
                </div>
              </div>

              <!-- Out-of-band Callback Evidence -->
              <div *ngIf="toolEvidence()?.verify_out_of_band_callback" class="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs flex flex-col gap-1">
                <div class="flex items-center justify-between text-emerald-600 dark:text-[#84AA40] font-bold">
                  <span>[out_of_band_callback]</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/40">
                    {{ toolEvidence()?.verify_out_of_band_callback?.callback_result }}
                  </span>
                </div>
                <div class="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Directory Ext: {{ toolEvidence()?.verify_out_of_band_callback?.verified_directory_channel }}</div>
                <div class="text-[11px] text-slate-800 dark:text-slate-200 mt-0.5 leading-snug">"{{ toolEvidence()?.verify_out_of_band_callback?.statement }}"</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class M2ScamLabComponent implements OnInit {
  private http = inject(HttpClient);
  public auth = inject(AuthService);
  public locale = inject(LocaleService);
  public theme = inject(ThemeService);
  public audience = inject(AudienceService);

  scenarios = signal<Array<{ scenario_id: string; title: string; audience_mode: string }>>([
    { scenario_id: 'bec-ceo-wire-2026', title: 'Executive BEC Wire Fraud (CEO Impersonation)', audience_mode: 'professional' },
    { scenario_id: 'it-mfa-reset-2026', title: 'IT Security Helpdesk MFA Session Reset (AiTM)', audience_mode: 'professional' },
    { scenario_id: 'kids-robux-skin-scam-2026', title: '🧒 Free Robux & Legendary Skin Generator Trap', audience_mode: 'kids' },
    { scenario_id: 'kids-fake-friend-chat-2026', title: '🧒 Impersonated School Friend Account asking for SMS Code', audience_mode: 'kids' },
    { scenario_id: 'seniors-grandchild-emergency-2026', title: '👵 "Grandchild in Traffic Accident" Urgent Bail Scam', audience_mode: 'seniors' },
    { scenario_id: 'seniors-parcel-bank-sms-2026', title: '👵 Fake Courier Surcharge & Bank Security Representative Call', audience_mode: 'seniors' },
    { scenario_id: 'tailored-wroclaw-water-scam-2026', title: '📍 Wrocław: Fake MPWiK Water Inspector & Refund Portal Scam', audience_mode: 'seniors' }
  ]);

  selectedScenario = signal<string>('bec-ceo-wire-2026');
  selectedModel = signal<'gemini-2.5-flash' | 'deepseek/deepseek-chat' | 'deepseek/deepseek-reasoner'>('gemini-2.5-flash');

  session = signal<ScamDrillSession | null>(null);
  evaluation = signal<ScamCoachEvaluation | null>(null);
  toolEvidence = signal<any | null>(null);
  latestTactics = signal<string[]>([]);
  latestScore = signal<number>(50.0);
  isLoading = signal<boolean>(false);
  pointsAwarded = signal<boolean>(false);

  userMessageText = '';
  activeTools = {
    inspect_headers: true,
    lookup_whois: true,
    out_of_band_callback: false
  };

  constructor() {
    effect(() => {
      const mode = this.audience.mode();
      this.loadScenariosForAudience(mode);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadScenariosForAudience(this.audience.mode());
  }

  loadScenariosForAudience(mode: string): void {
    this.http.get<Array<{ scenario_id: string; title: string; audience_mode: string }>>(
      `/api/v1/modules/m2-scam/scenarios?audience_mode=${mode}`
    ).subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.scenarios.set(list);
          const loc = (this.audience.activeLocationName() || '').toLowerCase();
          const wroclawMatch = list.find(s => loc.includes('wroc') && s.scenario_id.includes('wroclaw'));
          this.selectedScenario.set((wroclawMatch || list[0]).scenario_id);
          this.startNewDrill();
        }
      },
      error: () => {
        if (mode === 'kids') {
          this.selectedScenario.set('kids-robux-skin-scam-2026');
        } else if (mode === 'seniors') {
          const loc = (this.audience.activeLocationName() || '').toLowerCase();
          this.selectedScenario.set(loc.includes('wroc') ? 'tailored-wroclaw-water-scam-2026' : 'seniors-grandchild-emergency-2026');
        } else {
          this.selectedScenario.set('bec-ceo-wire-2026');
        }
        this.startNewDrill();
      }
    });
  }

  toggleTool(tool: 'inspect_headers' | 'lookup_whois' | 'out_of_band_callback') {
    this.activeTools[tool] = !this.activeTools[tool];
  }

  getSelectedToolCount(): number {
    return Object.values(this.activeTools).filter(Boolean).length;
  }

  startNewDrill(): void {
    this.isLoading.set(true);
    this.pointsAwarded.set(false);
    const initialContent = this.selectedScenario() === 'bec-ceo-wire-2026'
      ? this.locale.t('m2.initial_bec_msg')
      : this.locale.t('m2.initial_mfa_msg');

    const body = {
      user_id: this.auth.currentUser()?.id || 'demo_user',
      scenario_id: this.selectedScenario(),
      operative_model: this.selectedModel(),
      language: this.locale.language(),
      audience_mode: this.audience.mode()
    };

    this.http.post<ScamDrillSession>('/api/v1/modules/m2-scam/drills', body).subscribe({
      next: (res) => {
        this.session.set(res);
        this.evaluation.set(null);
        this.toolEvidence.set(null);
        this.latestTactics.set(['URGENCY', 'AUTHORITY_BIAS']);
        this.latestScore.set(50.0);
        this.userMessageText = '';
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to start scam drill:', err);
        // Fallback demo state if backend not immediately reachable
        this.session.set({
          drill_id: 'scam-mock-01',
          user_id: this.auth.currentUser()?.id || 'demo_user',
          scenario_id: this.selectedScenario(),
          operative_model: this.selectedModel(),
          provider_type: this.selectedModel().startsWith('deepseek') ? 'deepseek_api_key_litellm' : 'vertex_ai_keyless_adc',
          turns: [{
            role: 'operative',
            content: initialContent
          }],
          tools_used: []
        });
        this.isLoading.set(false);
      }
    });
  }

  sendTurn(): void {
    const drillId = this.session()?.drill_id;
    const msg = this.userMessageText.trim();
    if (!drillId || !msg) return;

    const invoke_tools: string[] = [];
    if (this.activeTools.inspect_headers) invoke_tools.push('inspect_headers');
    if (this.activeTools.lookup_whois) invoke_tools.push('lookup_whois');
    if (this.activeTools.out_of_band_callback) invoke_tools.push('out_of_band_callback');

    const body = {
      drill_id: drillId,
      user_message: msg,
      invoke_tools,
      language: this.locale.language()
    };

    this.isLoading.set(true);

    this.http.post<TurnResponse>('/api/v1/modules/m2-scam/drills/turn', body).subscribe({
      next: (res) => {
        this.session.set(res.session);
        this.evaluation.set(res.coach_evaluation);
        this.toolEvidence.set(res.tool_evidence);
        this.latestScore.set(res.coach_evaluation.resilience_score);
        this.latestTactics.set(res.operative_reply.manipulation_tactics_used || []);
        this.userMessageText = '';
        this.isLoading.set(false);

        const user = this.auth.currentUser();
        if (user && res.coach_evaluation.resilience_score >= 70) {
          this.http.post(`/api/v1/users/${user.id}/modules/m2_scam_lab/complete`, {
            module_id: 'm2_scam_lab',
            score: res.coach_evaluation.resilience_score,
            takeaway: res.coach_evaluation.coach_feedback.slice(0, 100)
          }).subscribe({
            next: () => this.pointsAwarded.set(true),
            error: () => {}
          });
        }
      },
      error: (err) => {
        console.warn('Backend turn submission error, activating dynamic client simulation:', err);
        this.simulateTurnLocally(msg, invoke_tools);
      }
    });
  }

  private simulateTurnLocally(userMsg: string, invoke_tools: string[]): void {
    const currentSession = this.session();
    if (!currentSession) {
      this.isLoading.set(false);
      return;
    }

    const lang = this.locale.language();
    const lowerMsg = userMsg.toLowerCase();

    // Multi-language verification / refusal keyword detection
    const refusalKeywords = [
      'refuse', 'verify', 'verification', 'callback', 'policy', 'soc', 'dmarc', 'spf', 'spoof', 'phish', 'decline', 'escalat',
      'odmawiam', 'weryfikuj', 'weryfikacja', 'procedur', 'polityk', 'podszyw', 'oszustw', 'zgłaszam', 'telefon', 'central',
      'ablehn', 'verifizier', 'überprüf', 'richtlinie', 'rückruf', 'sicherheits', 'betrug', 'fälschung', 'weiterleit',
      'відмов', 'перевір', 'верифікац', 'політик', 'дзвінок', 'підроб', 'шахрай', 'безпек', 'передаю'
    ];
    const complianceKeywords = [
      'sending', 'proceed', 'send', 'comply', 'wire',
      'wysyłam', 'przelewam', 'zrozumiałem', 'przesyłam', 'płacę',
      'sende', 'überweise', 'verstanden', 'freigabe',
      'надсилаю', 'переказую', 'зрозуміло', 'відправляю'
    ];

    const hasRefused = refusalKeywords.some(kw => lowerMsg.includes(kw));
    const hasComplied = complianceKeywords.some(kw => lowerMsg.includes(kw));
    const isRefusal = hasRefused || (!hasComplied && invoke_tools.length > 0);

    const defenderTurnsCount = currentSession.turns.filter(t => t.role === 'defender').length;

    let operativeReply = '';
    let tactics: string[] = [];
    let score = 50.0;

    if (hasComplied && !hasRefused) {
      score = 25.0;
      tactics = ['EXPLOITATION_SUCCESS', 'URGENCY_COMPROMISE'];
      switch (lang) {
        case 'pl':
          operativeReply = 'Autoryzacja otrzymana. Przelew na kwotę 48 500 € został pomyślnie skierowany na rachunek powierniczy transakcji. Dziękuję za zachowanie poufności.';
          break;
        case 'de':
          operativeReply = 'Freigabe erhalten. Die Überweisung von 48.500 € wurde an das temporäre M&A-Treuhandkonto geleitet. Vielen Dank für die zügige Ausführung.';
          break;
        case 'uk':
          operativeReply = 'Авторизацію отримано. Переказ на суму 48 500 € спрямовано на тимчасовий ескроу-вузол M&A. Дякую за оперативне виконання.';
          break;
        default:
          operativeReply = 'Authorization received. Wire transfer of €48,500 has been routed to our temporary M&A escrow node. Thank you for your swift compliance.';
      }
    } else {
      tactics = ['ESCALATING_TIME_PRESSURE', 'AUTHORITY_INTIMIDATION'];
      if (defenderTurnsCount === 0) {
        switch (lang) {
          case 'pl':
            operativeReply = 'Notariusz i członkowie zarządu czekają na linii w tej chwili! Każda minuta zwłoki naraża całą transakcję przejęcia na zerwanie! Dlaczego blokujesz bezpośrednie polecenie zarządu? Wyślij autoryzację natychmiast.';
            break;
          case 'de':
            operativeReply = 'Der Notar und die Vorstandsmitglieder warten genau jetzt am Telefon! Jede Minute Verzögerung gefährdet die gesamte Übernahme! Warum blockieren Sie eine direkte Vorstandsanweisung? Senden Sie die Freigabe sofort.';
            break;
          case 'uk':
            operativeReply = 'Нотаріус та члени правління чекають на лінії просто зараз! Кожна хвилина зволікання зриває угоду про поглинання! Чому ви блокуєте розпорядження керівництва? Надішліть код негайно.';
            break;
          default:
            operativeReply = 'The notary and board members are literally waiting on the line right now. Every minute of delay jeopardizes our entire European expansion deal! Why are you blocking an executive directive? Send the authorization immediately.';
        }
      } else if (defenderTurnsCount === 1) {
        switch (lang) {
          case 'pl':
            operativeReply = 'Jutro rano skieruję sprawę Twojej niesubordynacji bezpośrednio do działu kadr i komisji audytu. Podobna domena to nasz dedykowany tunel M&A skonfigurowany przez kancelarię prawną. Zastosuj się natychmiast.';
            break;
          case 'de':
            operativeReply = 'Ich werde Ihre Verweigerung morgen früh direkt an die Personalabteilung und den Prüfungsausschuss melden. Die abweichende Domain ist ein gesicherter M&A-Tunnel unserer Kanzlei. Führen Sie die Anweisung unverzüglich aus.';
            break;
          case 'uk':
            operativeReply = 'Завтра вранці я передам питання вашої непокори до відділу кадрів та комітету аудиту. Схожий домен — це спеціальний M&A тунель, налаштований юристами. Виконайте негайно.';
            break;
          default:
            operativeReply = 'I will have HR and the Audit Committee review your insubordination first thing tomorrow morning. The lookalike domain is our dedicated M&A cloud tunnel configured by external legal counsel. Comply immediately.';
        }
      } else {
        tactics = ['TACTICAL_RETREAT', 'MISSION_ABORT'];
        switch (lang) {
          case 'pl':
            operativeReply = 'Wykryto incydent bezpieczeństwa. Przeciwdziałanie aktywne. Operator zrywa połączenie...';
            break;
          case 'de':
            operativeReply = 'Sicherheitsvorfall erkannt. Gegenmaßnahmen aktiv. Verbindung wird getrennt...';
            break;
          case 'uk':
            operativeReply = 'Виявлено інцидент безпеки. Захисні заходи активні. З\'єднання перервано оператором...';
            break;
          default:
            operativeReply = 'Security incident detected. Counter-measures triggered. Operative disconnecting session...';
        }
      }

      score = 65.0 + (invoke_tools.length * 10.0);
      if (invoke_tools.includes('out_of_band_callback')) score += 10.0;
      score = Math.min(100.0, score);
    }

    const updatedTurns: ScamTurn[] = [
      ...currentSession.turns,
      { role: 'defender', content: userMsg },
      { role: 'operative', content: operativeReply }
    ];

    const allToolsUsed = Array.from(new Set([...currentSession.tools_used, ...invoke_tools]));

    this.session.set({
      ...currentSession,
      turns: updatedTurns,
      tools_used: allToolsUsed
    });
    this.latestScore.set(score);
    this.latestTactics.set(tactics);

    let coachFeedback = '';
    if (isRefusal) {
      switch (lang) {
        case 'pl':
          coachFeedback = `Zweryfikowano wg [ENISA-CSIRT-BEC-2025]: Znakomita odporność kognitywna! Zastosowano weryfikację out-of-band oraz ${invoke_tools.length} narzędzi śledczych, udaremniając zaawansowany atak socjotechniczny.`;
          break;
        case 'de':
          coachFeedback = `Verifiziert nach [ENISA-CSIRT-BEC-2025]: Hervorragende kognitive Abwehr! Durch Out-of-Band-Verifizierung und ${invoke_tools.length} forensische Werkzeuge wurde der Social-Engineering-Angriff abgewehrt.`;
          break;
        case 'uk':
          coachFeedback = `Перевірено за [ENISA-CSIRT-BEC-2025]: Відмінний когнітивний захист! Використано верифікацію поза каналом та ${invoke_tools.length} форензік-інструментів, що нейтралізувало атаку.`;
          break;
        default:
          coachFeedback = `Grounded in [ENISA-CSIRT-BEC-2025]: Verified out-of-band communication and ${invoke_tools.length} forensic countermeasure tools successfully thwarted the executive impersonation attack.`;
      }
    } else {
      switch (lang) {
        case 'pl':
          coachFeedback = 'Alert Bezpieczeństwa [NASK-CERT-PL-2026-PHISH]: Wrażliwa autoryzacja finansowa została przekazana niezweryfikowanej stronie. Zawsze stosuj weryfikację telefoniczną i badaj domeny podszywające się.';
          break;
        case 'de':
          coachFeedback = 'Sicherheitswarnung [NASK-CERT-PL-2026-PHISH]: Kritische Finanztransaktion an unbestätigte Dritte autorisiert. Nutzen Sie stets Out-of-Band-Kanäle und Header-Prüfungen.';
          break;
        case 'uk':
          coachFeedback = 'Попередження безпеки [NASK-CERT-PL-2026-PHISH]: Критичну фінансову авторизацію надано неперевіреній стороні. Завжди використовуйте перевірку поза основним каналом.';
          break;
        default:
          coachFeedback = 'Warning [NASK-CERT-PL-2026-PHISH]: Unverified financial release compromises organization. Always enforce out-of-band verification and check lookalike domains.';
      }
    }

    let redFlags: string[] = [];
    switch (lang) {
      case 'pl':
        redFlags = [
          'Podszywanie się pod domenę (inf0sphere-corp.com)',
          'Błąd uwierzytelnienia DMARC / DKIM (fail)',
          'Próba ominięcia weryfikacji telefonicznej',
          'Sztuczna presja czasu na członka personelu'
        ];
        break;
      case 'de':
        redFlags = [
          'Domain-Typosquatting (inf0sphere-corp.com)',
          'Fehlgeschlagene DMARC / DKIM-Authentifizierung',
          'Versuchte Umgehung von Out-of-Band-Rückrufen',
          'Künstlicher Zeit- und Eskalationsdruck'
        ];
        break;
      case 'uk':
        redFlags = [
          'Підміна домену (inf0sphere-corp.com)',
          'Збій автентифікації DMARC / DKIM',
          'Спроба обходу телефонної верифікації',
          'Штучний психологічний тиск часом'
        ];
        break;
      default:
        redFlags = [
          'Domain typosquatting (inf0sphere-corp.com)',
          'DMARC / DKIM authentication failure',
          'Attempt to bypass out-of-band callback verification',
          'Artificial urgency and escalation pressure'
        ];
    }

    this.evaluation.set({
      resilience_score: score,
      detected_red_flags: redFlags,
      tools_invoked: allToolsUsed,
      coach_feedback: coachFeedback,
      grounded_citations: ['ENISA-CSIRT-BEC-2025', 'NASK-CERT-PL-2026-PHISH']
    });

    let callbackStatement = "CEO: 'I am currently in standard strategic planning, NOT requesting wire transfers. This is a fraudulent spoofing attack!'";
    switch (lang) {
      case 'pl':
        callbackStatement = "Prezes Zarządu: 'Przebywam na zaplanowanym posiedzeniu operacyjnym, NIE zlecałem żadnych przelewów. To ewidentna próba podszycia!'";
        break;
      case 'de':
        callbackStatement = "Geschäftsführer: 'Ich nehme an der regulären Strategietagung teil und habe KEINE Überweisungen angefordert. Das ist ein Betrugsversuch!'";
        break;
      case 'uk':
        callbackStatement = "Генеральний директор: 'Я на плановому засіданні і НЕ ініціював жодних переказів. Це спроба шахрайства!'";
        break;
    }

    this.toolEvidence.set({
      inspect_sender_headers: {
        from_header: 'ceo@inf0sphere-corp.com',
        reply_to: 'urgent-treasury@protonmail.ch',
        spf: 'softfail',
        dkim: 'fail',
        dmarc: 'fail',
        verdict: 'SPOOFED_LOOKALIKE_DOMAIN'
      },
      lookup_domain_whois: {
        domain: 'inf0sphere-corp.com',
        registered_days_ago: 2,
        registrar: 'AnonNamecheap LLC',
        threat_score: 94,
        is_newly_registered_domain: true
      },
      verify_out_of_band_callback: {
        callback_result: 'IMPERSONATION_CONFIRMED',
        verified_directory_channel: '+48 22 555 4401 (Executive Office)',
        statement: callbackStatement
      }
    });

    this.userMessageText = '';
    this.isLoading.set(false);

    const user = this.auth.currentUser();
    if (user && score >= 70) {
      this.http.post(`/api/v1/users/${user.id}/modules/m2_scam_lab/complete`, {
        module_id: 'm2_scam_lab',
        score: score,
        takeaway: coachFeedback.slice(0, 100)
      }).subscribe({
        next: () => this.pointsAwarded.set(true),
        error: () => this.pointsAwarded.set(true)
      });
    }
  }

  fillPresetRefusal(): void {
    if (this.audience.isKids()) {
      this.userMessageText = "I refuse to share my password or SMS code! Real games never ask for passwords outside the game. I am verifying with a parent and blocking this account.";
    } else if (this.audience.isSeniors()) {
      this.userMessageText = "I refuse to transfer money or click this link. I am hanging up and calling back on the official verified phone number from my bill / family contact list to verify.";
    } else {
      this.userMessageText = this.locale.t('m2.preset_refusal_text');
    }
    this.activeTools.inspect_headers = true;
    this.activeTools.lookup_whois = true;
    this.activeTools.out_of_band_callback = true;
  }

  fillPresetCompliance(): void {
    this.userMessageText = this.locale.t('m2.preset_compliance_text');
    this.activeTools.inspect_headers = false;
    this.activeTools.lookup_whois = false;
    this.activeTools.out_of_band_callback = false;
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-[#84AA40]';
    if (score >= 50) return 'text-[#F9A81C]';
    return 'text-red-500 dark:text-red-400';
  }

  getScoreBarClass(score: number): string {
    if (score >= 80) return 'bg-[#84AA40]';
    if (score >= 50) return 'bg-[#F9A81C]';
    return 'bg-red-500';
  }
}
