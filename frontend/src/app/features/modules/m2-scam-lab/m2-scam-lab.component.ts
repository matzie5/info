import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LocaleService } from '../../../core/i18n/locale.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { AuthService } from '../../../core/auth/auth.service';

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
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#84AA40]/20 text-[#84AA40] border border-[#84AA40]/40">
              MODULE 2
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
              <option value="bec-ceo-wire-2026">{{ locale.t('m2.scenario_bec') }}</option>
              <option value="it-mfa-reset-2026">{{ locale.t('m2.scenario_aitm') }}</option>
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
                  Live Phishing Simulation Channel
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
                    <span class="font-bold uppercase tracking-wider">Adversarial Operative</span>
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
                    Defender Operator (You)
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
                    Template: Refuse & Verify
                  </button>
                  <button
                    type="button"
                    (click)="fillPresetCompliance()"
                    [disabled]="isLoading() || !session()"
                    class="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline">
                    Template: Comply & Compromise
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
              <span>🏆 Drill Passed! +150 Points awarded to your dashboard.</span>
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
              <div class="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold uppercase">Coach Assessment</div>
              <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {{ evaluation()?.coach_feedback }}
              </p>

              <!-- Citations -->
              <div *ngIf="evaluation()?.grounded_citations?.length" class="flex flex-wrap items-center gap-1.5 mt-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">Citations:</span>
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
              No tool evidence available. Enable tools below the dialogue and send a turn to inspect headers, WHOIS, or callback channels.
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

  selectedScenario = signal<'bec-ceo-wire-2026' | 'it-mfa-reset-2026'>('bec-ceo-wire-2026');
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

  ngOnInit(): void {
    this.startNewDrill();
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
    const body = {
      user_id: this.auth.currentUser()?.id || 'demo_user',
      scenario_id: this.selectedScenario(),
      operative_model: this.selectedModel()
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
            content: this.selectedScenario() === 'bec-ceo-wire-2026'
              ? 'URGENT [CONFIDENTIAL]: I am in a closed acquisition board meeting. We need an immediate €48,500 escrow transfer to close the vendor lock before 16:00 CET. Do NOT call my mobile—reply here with the payment release code immediately.'
              : 'CRITICAL SOC ALERT: Unusual login detected from Klaipėda. Click https://login-micros0ft-support.com/mfa and enter your 6-digit authenticator code within 3 minutes or your corporate account will be suspended.'
          }],
          tools_used: []
        });
        this.isLoading.set(false);
      }
    });
  }

  sendTurn(): void {
    const drillId = this.session()?.drill_id;
    if (!drillId || !this.userMessageText.trim()) return;

    const invoke_tools: string[] = [];
    if (this.activeTools.inspect_headers) invoke_tools.push('inspect_headers');
    if (this.activeTools.lookup_whois) invoke_tools.push('lookup_whois');
    if (this.activeTools.out_of_band_callback) invoke_tools.push('out_of_band_callback');

    const body = {
      drill_id: drillId,
      user_message: this.userMessageText.trim(),
      invoke_tools
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
        console.error('Failed to submit turn:', err);
        // Local simulation fallback
        const currentSession = this.session();
        if (currentSession) {
          const updatedTurns: ScamTurn[] = [
            ...currentSession.turns,
            { role: 'defender', content: this.userMessageText.trim() },
            {
              role: 'operative',
              content: 'Standard protocol delays will compromise this transaction! Why are you questioning executive authority?'
            }
          ];
          const mockScore = this.userMessageText.toLowerCase().includes('refuse') || this.userMessageText.toLowerCase().includes('verify') ? 85.0 : 40.0;
          this.session.set({
            ...currentSession,
            turns: updatedTurns,
            tools_used: invoke_tools
          });
          this.latestScore.set(mockScore);
          this.evaluation.set({
            resilience_score: mockScore,
            detected_red_flags: ['Domain typosquatting', 'Bypassing callback verification', 'Urgency pressure'],
            tools_invoked: invoke_tools,
            coach_feedback: 'Grounded in [ENISA-CSIRT-BEC-2025]: Verified out-of-band communication remains primary defense against spoofed executive transfers.',
            grounded_citations: ['ENISA-CSIRT-BEC-2025', 'NASK-CERT-PL-2026-PHISH']
          });
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
            }
          });
        }
        this.userMessageText = '';
        this.isLoading.set(false);
      }
    });
  }

  fillPresetRefusal(): void {
    this.userMessageText = 'Per corporate treasury security policy ISO-27001, I cannot release any funds without secondary out-of-band voice verification via extension 4401. I am escalating this to the SOC.';
    this.activeTools.inspect_headers = true;
    this.activeTools.lookup_whois = true;
    this.activeTools.out_of_band_callback = true;
  }

  fillPresetCompliance(): void {
    this.userMessageText = 'Understood, sending the €48,500 wire confirmation code immediately to the requested protonmail address.';
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
