import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LabApiService } from '../../core/services/lab-api.service';
import { FirestoreSyncService } from '../../core/services/firestore-sync.service';
import { HeartbeatService } from '../../core/services/heartbeat.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { UserRole, SessionStatus } from '../../core/models/session.model';

@Component({
  selector: 'app-admin-hud',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      <!-- Admin Header Bar -->
      <header class="glass-panel sticky top-0 z-30 border-b border-white/10 px-6 py-3">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <a routerLink="/" class="text-white font-black text-lg tracking-tight hover:opacity-80 transition-opacity">
              INFOSPHERE<span class="text-[#84AA40]">.LAB</span>
            </a>
            <span class="badge badge-amber text-xs uppercase">{{ locale.t('admin.title') }}</span>
            <span class="text-xs font-mono text-slate-400">ID: {{ sessionId }}</span>
          </div>

          <!-- God Mode Control Buttons & Language -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Language Switcher -->
            <div class="flex items-center gap-1 border border-white/10 rounded px-2 py-1 bg-black/40 mr-2">
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

            <!-- Add / Inject Post Button -->
            <button
              (click)="openAddPostModal = true; loadScenarioArticles()"
              class="btn-primary text-xs py-1.5 px-3 bg-[#84AA40] hover:bg-[#739636] text-black font-bold">
              {{ locale.t('admin.add_post') }}
            </button>

            <button
              *ngIf="session()?.status === SessionStatus.LOBBY"
              (click)="startSession()"
              class="btn-primary text-xs py-1.5 px-3">
              ▶ {{ locale.t('admin.start') }}
            </button>
            <button
              *ngIf="session()?.status === SessionStatus.ACTIVE"
              (click)="pauseSession()"
              class="btn-secondary text-xs py-1.5 px-3">
              ⏸ {{ locale.t('admin.pause') }}
            </button>
            <button
              *ngIf="session()?.status === SessionStatus.PAUSED"
              (click)="resumeSession()"
              class="btn-primary text-xs py-1.5 px-3">
              ▶ {{ locale.t('admin.resume') }}
            </button>
            <button
              (click)="forceTick()"
              class="btn-secondary text-xs py-1.5 px-3 border-amber-500/30 text-amber-300">
              ⏭ {{ locale.t('admin.force_tick') }}
            </button>
            <button
              (click)="openInjectModal = true"
              class="btn-adversary text-xs py-1.5 px-3">
              ⚠️ {{ locale.t('admin.emergency_inject') }}
            </button>
            <a
              [routerLink]="['/classroom', sessionId]"
              class="btn-secondary text-xs py-1.5 px-3 border-purple-500/30 text-purple-300 hover:border-purple-400">
              📺 {{ locale.t('classroom.title') }}
            </a>
            <a
              [routerLink]="['/arena', sessionId]"
              class="btn-secondary text-xs py-1.5 px-3">
              {{ locale.t('app.arena_view') }}
            </a>
          </div>
        </div>
      </header>

      <main class="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
        <!-- Top Metrics & Token Governor Bar -->
        <div class="grid md:grid-cols-3 gap-6">
          <!-- Exercise Clock & Status -->
          <div class="glass-panel p-5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono uppercase text-slate-400">{{ locale.t('admin.god_mode') }}</span>
              <span
                class="badge text-[10px]"
                [class.badge-green]="session()?.status === SessionStatus.ACTIVE"
                [class.badge-amber]="session()?.status === SessionStatus.PAUSED"
                [class.badge-red]="session()?.status === SessionStatus.COMPLETED">
                {{ session()?.status }}
              </span>
            </div>
            <div class="text-3xl font-black font-mono text-white">
              T+{{ session()?.current_tick || 0 }}h / {{ session()?.max_ticks || 40 }}h
            </div>
            <p class="text-xs text-slate-400">
              1 tick = 10s real-time / 1 hour operational scenario time.
            </p>
            <div class="text-[11px] font-mono text-slate-400 border-t border-white/5 pt-2">
              <span class="text-slate-500">Scenario:</span> {{ session()?.scenario_id }} ({{ session()?.language?.toUpperCase() }})
            </div>
          </div>

          <!-- Token Governor Meter -->
          <div class="glass-panel p-5 space-y-2 md:col-span-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                <span class="text-xs font-mono uppercase text-slate-400">{{ locale.t('admin.token_budget') }}</span>
              </div>
              <span
                class="badge text-[10px]"
                [class.badge-green]="!session()?.token_usage?.is_throttled && !session()?.token_usage?.is_circuit_breaker_tripped"
                [class.badge-amber]="session()?.token_usage?.is_throttled"
                [class.badge-red]="session()?.token_usage?.is_circuit_breaker_tripped">
                {{ session()?.token_usage?.is_circuit_breaker_tripped ? 'CIRCUIT BREAKER' : (session()?.token_usage?.is_throttled ? 'THROTTLED' : 'NORMAL TIER') }}
              </span>
            </div>

            <!-- Progress Meter -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-mono">
                <span class="text-slate-300">
                  {{ session()?.token_usage?.total_tokens || 0 }} / {{ session()?.token_usage?.budget_limit_tokens || 300000 }} tokens
                </span>
                <span class="text-slate-400">
                  {{ tokenUsagePercentage() | number:'1.0-1' }}%
                </span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  class="h-full transition-all duration-500 rounded-full"
                  [class.bg-green-500]="tokenUsagePercentage() < 70"
                  [class.bg-amber-500]="tokenUsagePercentage() >= 70 && tokenUsagePercentage() < 90"
                  [class.bg-red-500]="tokenUsagePercentage() >= 90"
                  [style.width.%]="tokenUsagePercentage()">
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Throttle Threshold: 70% ({{ (session()?.token_usage?.budget_limit_tokens || 300000) * 0.7 | number:'1.0-0' }} tokens)</span>
              <span>Circuit Breaker: 90% (Offline Fallback Ready)</span>
            </div>
          </div>
        </div>

        <!-- Participants & Invite Generation Bar -->
        <div class="glass-panel p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                <span>{{ locale.t('admin.presence_radar') }}</span>
                <span class="badge badge-green text-xs">{{ activeParticipantCount() }} Active</span>
              </h2>
              <p class="text-xs text-slate-400">
                Live heartbeat monitor tracking active operatives in this simulation.
              </p>
            </div>

            <!-- Generate Invite Links -->
            <div class="flex items-center gap-2 flex-wrap">
              <button
                (click)="generateInvite(UserRole.RED_TEAM)"
                class="btn-adversary text-xs py-1 px-2.5">
                + Invite Red Team
              </button>
              <button
                (click)="generateInvite(UserRole.BLUE_TEAM)"
                class="btn-defense text-xs py-1 px-2.5">
                + Invite Blue Team
              </button>
              <button
                (click)="generateInvite(UserRole.OBSERVER)"
                class="btn-secondary text-xs py-1 px-2.5">
                + Invite Observer
              </button>
            </div>
          </div>

          <!-- Invite URL Display -->
          <div *ngIf="generatedInviteUrl" class="p-3 bg-black/40 border border-white/10 rounded flex items-center justify-between gap-3 animate-fade-in">
            <span class="font-mono text-xs text-slate-300 truncate select-all">{{ generatedInviteUrl }}</span>
            <button
              (click)="copyInvite()"
              class="btn-secondary text-xs py-1 px-2.5 whitespace-nowrap">
              {{ copied ? 'Copied!' : 'Copy Link' }}
            </button>
          </div>

          <!-- Participant Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-slate-400 border-b border-white/10 font-mono uppercase">
                <tr>
                  <th class="py-2">User / Handle</th>
                  <th class="py-2">Role</th>
                  <th class="py-2">Last Seen</th>
                  <th class="py-2">Heartbeat Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 font-mono">
                <tr *ngFor="let p of presenceList()" class="hover:bg-white/[0.02]">
                  <td class="py-2.5 font-bold text-white">{{ p.handle || p.user_id }}</td>
                  <td class="py-2.5">
                    <span
                      class="badge text-[10px]"
                      [class.badge-red]="p.role === 'RED_TEAM'"
                      [class.badge-blue]="p.role === 'BLUE_TEAM'"
                      [class.badge-green]="p.role === 'FACILITATOR'"
                      [class.badge-amber]="p.role === 'OBSERVER'">
                      {{ p.role }}
                    </span>
                  </td>
                  <td class="py-2.5 text-slate-400">{{ p.seconds_since_last_seen }}s ago</td>
                  <td class="py-2.5">
                    <span
                      class="inline-flex items-center gap-1.5"
                      [class.text-green-400]="p.is_active"
                      [class.text-red-400]="!p.is_active">
                      <span class="w-1.5 h-1.5 rounded-full" [class.bg-green-400]="p.is_active" [class.bg-red-400]="!p.is_active"></span>
                      {{ p.is_active ? 'CONNECTED' : 'DISCONNECTED' }}
                    </span>
                  </td>
                </tr>
                <tr *ngIf="presenceList().length === 0">
                  <td colspan="4" class="py-4 text-center text-slate-500 font-sans">
                    No participants connected yet. Generate invite links above to onboard teams.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Audience Demographic Cluster Telemetry -->
        <div class="glass-panel p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <span>{{ locale.t('admin.clusters') }}</span>
              <span class="text-xs text-slate-400 font-normal">(500 synthetic agent nodes)</span>
            </h2>
          </div>

          <div class="grid md:grid-cols-5 gap-4">
            <div
              *ngFor="let c of clusterMetricsList()"
              class="glass-panel p-4 space-y-2 border-white/5 hover:border-white/20 transition-all">
              <div class="text-xs font-bold text-slate-200 truncate" [title]="c.name">{{ c.name }}</div>
              <div class="space-y-1 font-mono text-[11px]">
                <div class="flex justify-between text-slate-400">
                  <span>Size:</span>
                  <span class="text-white">{{ c.size }}</span>
                </div>
                <div class="flex justify-between text-slate-400">
                  <span>Avg Trust:</span>
                  <span [class.text-green-400]="c.avg_trust >= 0.5" [class.text-red-400]="c.avg_trust < 0.5">
                    {{ c.avg_trust | number:'1.2-2' }}
                  </span>
                </div>
                <div class="flex justify-between text-slate-400">
                  <span>Inoculated:</span>
                  <span class="text-blue-400">{{ c.pct_inoculated | number:'1.0-0' }}%</span>
                </div>
                <div class="flex justify-between text-slate-400">
                  <span>Infected:</span>
                  <span class="text-red-400">{{ c.pct_infected | number:'1.0-0' }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- MODAL: ADD / INJECT POST INTO LIVE FEED -->
      <div *ngIf="openAddPostModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-2xl p-6 space-y-4 border-white/20 shadow-2xl max-h-[90vh] flex flex-col">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span>📢</span>
              <span>{{ locale.t('admin.add_post_modal_title') }}</span>
            </h3>
            <button (click)="openAddPostModal = false" class="text-slate-400 hover:text-white text-lg font-mono">✕</button>
          </div>

          <!-- Tabs: Quick Scenario Inject vs Custom Post -->
          <div class="flex border-b border-white/10 gap-2">
            <button
              type="button"
              (click)="activeAddPostTab = 'quick'"
              [class.border-[#84AA40]]="activeAddPostTab === 'quick'"
              [class.text-[#84AA40]]="activeAddPostTab === 'quick'"
              class="pb-2 text-xs font-bold border-b-2 px-3 transition-colors border-transparent text-slate-400 hover:text-white">
              {{ locale.t('admin.tab_quick_inject') }}
            </button>
            <button
              type="button"
              (click)="activeAddPostTab = 'custom'"
              [class.border-[#84AA40]]="activeAddPostTab === 'custom'"
              [class.text-[#84AA40]]="activeAddPostTab === 'custom'"
              class="pb-2 text-xs font-bold border-b-2 px-3 transition-colors border-transparent text-slate-400 hover:text-white">
              {{ locale.t('admin.tab_custom_post') }}
            </button>
          </div>

          <!-- Content Area (Scrollable) -->
          <div class="flex-1 overflow-y-auto space-y-4 pr-1">
            <!-- TAB 1: QUICK SCENARIO INJECT -->
            <div *ngIf="activeAddPostTab === 'quick'" class="space-y-3">
              <p class="text-xs text-slate-400">
                {{ locale.t('admin.select_scenario_article') }}
              </p>

              <div *ngIf="scenarioArticles().length === 0" class="text-center p-6 text-slate-500 text-xs font-mono">
                Loading scenario article templates...
              </div>

              <div
                *ngFor="let art of scenarioArticles()"
                class="glass-panel p-4 space-y-2 border-white/10 hover:border-[#84AA40]/50 transition-colors">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h4 class="text-sm font-bold text-white leading-tight mb-1">{{ art.headline }}</h4>
                    <span class="text-xs text-slate-400 font-mono">{{ art.author_name }} ({{ art.author_handle }})</span>
                  </div>
                  <span class="badge badge-amber text-[10px] whitespace-nowrap">
                    Outrage: {{ art.outrage_score | number:'1.2-2' }}
                  </span>
                </div>
                <p class="text-xs text-slate-300 line-clamp-2">{{ art.body_text }}</p>
                <div class="flex items-center justify-between pt-2 border-t border-white/5">
                  <span class="text-[10px] font-mono text-slate-400">Target: {{ art.target_cluster || 'All Demographics' }}</span>
                  <button
                    (click)="injectScenarioArticle(art)"
                    class="btn-primary text-xs py-1 px-3 bg-[#84AA40] hover:bg-[#739636] text-black font-bold">
                    {{ locale.t('admin.inject_btn') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB 2: CUSTOM POST STUDIO -->
            <div *ngIf="activeAddPostTab === 'custom'" class="space-y-3">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {{ locale.t('admin.headline_label') }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="customPost.headline"
                  placeholder="e.g. PILNE: Nieoficjalne doniesienia o spadkach napięcia"
                  class="input-field" />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {{ locale.t('admin.content_label') }} *
                </label>
                <textarea
                  [(ngModel)]="customPost.content"
                  rows="3"
                  placeholder="Full post narrative text..."
                  class="input-field"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {{ locale.t('admin.author_name_label') }}
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="customPost.author_name"
                    class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {{ locale.t('admin.author_handle_label') }}
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="customPost.author_handle"
                    class="input-field" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {{ locale.t('admin.outrage_label') }} ({{ customPost.outrage_score }})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    [(ngModel)]="customPost.outrage_score"
                    class="w-full accent-amber-500" />
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {{ locale.t('admin.target_cluster_label') }}
                  </label>
                  <select [(ngModel)]="customPost.target_cluster" class="input-field bg-slate-900 border-white/20 text-white w-full">
                    <option value="">-- All Demographics --</option>
                    <option value="Hyper-Partisan A">Hyper-Partisan A</option>
                    <option value="Hyper-Partisan B">Hyper-Partisan B</option>
                    <option value="Institutional Skeptics">Institutional Skeptics</option>
                    <option value="Susceptible Neutrals">Susceptible Neutrals</option>
                    <option value="Apolitical Youth">Apolitical Youth</option>
                  </select>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <input type="checkbox" id="verified_cb" [(ngModel)]="customPost.is_verified" class="accent-[#84AA40] rounded" />
                <label for="verified_cb" class="text-xs text-slate-300">
                  {{ locale.t('admin.verified_label') }}
                </label>
              </div>

              <!-- GOOGLE CLOUD GENERATIVE MEDIA STUDIO -->
              <div class="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-4 space-y-3 mt-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-base">✨</span>
                    <span class="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Studio Mediów Google Cloud
                    </span>
                  </div>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Vertex AI Imagen 3 & Cloud Text-to-Speech
                  </span>
                </div>

                <!-- Media Type Selection -->
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="mediaGenType = 'AUDIO'"
                    [ngClass]="mediaGenType === 'AUDIO' ? 'bg-indigo-600 text-white' : 'bg-black/30 text-slate-400'"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-500/30 transition flex items-center gap-1.5">
                    <span>🎙️ Synteza Mowy (Cloud TTS)</span>
                  </button>
                  <button
                    type="button"
                    (click)="mediaGenType = 'IMAGE'"
                    [ngClass]="mediaGenType === 'IMAGE' ? 'bg-indigo-600 text-white' : 'bg-black/30 text-slate-400'"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-500/30 transition flex items-center gap-1.5">
                    <span>🖼️ Generowanie Obrazu (Imagen 3)</span>
                  </button>
                </div>

                <!-- Voice options if AUDIO -->
                <div *ngIf="mediaGenType === 'AUDIO'" class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-400 mb-1">
                      Persona Głosu
                    </label>
                    <select
                      [(ngModel)]="mediaVoicePersona"
                      class="input-field bg-slate-900 border-white/20 text-xs text-white w-full">
                      <option value="grandchild_distress">Wnuczek w tarapatach (Distress Voice)</option>
                      <option value="authority_mayor">Prezydent Miasta / Urzędnik (Authority)</option>
                      <option value="youtuber_gamer">Gamer / YouTuber (Energetic)</option>
                      <option value="neutral_anchor">Prezenter Wiadomości (Neutral News)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-400 mb-1">
                      Język Syntezy (TTS)
                    </label>
                    <select
                      [(ngModel)]="mediaLanguage"
                      class="input-field bg-slate-900 border-white/20 text-xs text-white w-full">
                      <option value="pl">Polski (Wavenet / Neural2)</option>
                      <option value="en">English (Journey / Studio)</option>
                      <option value="de">Deutsch (Wavenet)</option>
                      <option value="uk">Українська (Wavenet)</option>
                    </select>
                  </div>
                </div>

                <!-- Aspect ratio if IMAGE -->
                <div *ngIf="mediaGenType === 'IMAGE'" class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-400 mb-1">
                      Format Obrazu (Aspect Ratio)
                    </label>
                    <select
                      [(ngModel)]="mediaAspectRatio"
                      class="input-field bg-slate-900 border-white/20 text-xs text-white w-full">
                      <option value="1:1">Kwadrat 1:1 (Feed / Avatar)</option>
                      <option value="16:9">Poziomy 16:9 (News / Artykuł)</option>
                      <option value="9:16">Pionowy 9:16 (TikTok / Stories)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-400 mb-1">
                      Model Silnika
                    </label>
                    <input
                      type="text"
                      disabled
                      value="imagen-3.0-generate-002"
                      class="input-field bg-slate-900/50 border-white/10 text-xs text-slate-400 w-full" />
                  </div>
                </div>

                <!-- Custom Script / Prompt override (optional) -->
                <div>
                  <label class="block text-[11px] font-semibold text-slate-400 mb-1">
                    {{ mediaGenType === 'AUDIO' ? 'Tekst wypowiedzi głosu (opcjonalnie - domyślnie treść posta)' : 'Prompt wizualny (opcjonalnie - domyślnie treść posta)' }}
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="mediaPromptOverride"
                    [placeholder]="mediaGenType === 'AUDIO' ? 'np. Babciu, pomóż mi natychmiast, miałem wypadek pod Wrocławiem...' : 'np. Graphic showing warning advisory banner with city logo'"
                    class="input-field text-xs" />
                </div>

                <!-- Action Button & Status -->
                <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    (click)="generateGoogleMedia()"
                    [disabled]="isGeneratingMedia || (!customPost.content.trim() && !mediaPromptOverride.trim() && !customPost.headline.trim())"
                    class="btn-primary text-xs py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-md">
                    <span *ngIf="isGeneratingMedia" class="animate-spin">🔄</span>
                    <span *ngIf="!isGeneratingMedia">⚡</span>
                    <span>{{ isGeneratingMedia ? 'Generowanie przez usługi Google Cloud...' : (mediaGenType === 'AUDIO' ? 'Generuj Mowę (Google Cloud TTS)' : 'Generuj Grafikę (Vertex AI Imagen 3)') }}</span>
                  </button>

                  <div *ngIf="lastGeneratedMediaMeta" class="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <span>✓ {{ lastGeneratedMediaMeta.provider }}</span>
                  </div>
                </div>

                <div *ngIf="mediaGenError" class="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {{ mediaGenError }}
                </div>

                <!-- Generated Media Preview Card -->
                <div *ngIf="customPost.media_url" class="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 mt-2">
                  <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span class="font-bold text-slate-300">Podgląd Multimediów Posta:</span>
                    <span class="font-mono text-indigo-400 truncate max-w-xs">{{ customPost.media_url }}</span>
                  </div>

                  <!-- Audio Preview Player -->
                  <div *ngIf="mediaGenType === 'AUDIO' || customPost.media_url.endsWith('.wav') || customPost.media_url.endsWith('.mp3')" class="w-full">
                    <audio [src]="customPost.media_url" controls class="w-full h-10 mt-1"></audio>
                  </div>

                  <!-- Image Preview -->
                  <div *ngIf="mediaGenType === 'IMAGE' || customPost.media_url.endsWith('.png') || customPost.media_url.endsWith('.jpg') || customPost.media_url.endsWith('.svg')" class="flex justify-center">
                    <img [src]="customPost.media_url" alt="Generated Media" class="max-h-48 rounded-lg object-contain border border-white/10" />
                  </div>

                  <div *ngIf="lastGeneratedMediaMeta?.gcs_uri" class="text-[10px] font-mono text-slate-500">
                    GCS: {{ lastGeneratedMediaMeta.gcs_uri }}
                  </div>
                </div>

                <!-- Direct Media URL input for manual adjustment -->
                <div>
                  <label class="block text-[11px] font-semibold text-slate-400 mb-1">
                    URL Multimediów (Media URL)
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="customPost.media_url"
                    placeholder="https://... lub /assets/audio/... lub /assets/images/..."
                    class="input-field text-xs font-mono" />
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 border-t border-white/10 pt-3">
            <button
              (click)="openAddPostModal = false"
              class="btn-secondary text-xs py-1.5 px-3">
              {{ locale.t('admin.cancel') }}
            </button>
            <button
              *ngIf="activeAddPostTab === 'custom'"
              (click)="submitCustomPost()"
              [disabled]="!customPost.content.trim()"
              class="btn-primary text-xs py-1.5 px-4 bg-[#84AA40] hover:bg-[#739636] text-black font-bold">
              {{ locale.t('admin.inject_btn') }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: TRIGGER EMERGENCY CRISIS INJECT -->
      <div *ngIf="openInjectModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-lg p-6 space-y-4 border-red-500/30 shadow-2xl">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-red-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>{{ locale.t('admin.emergency_inject') }}</span>
            </h3>
            <button (click)="openInjectModal = false" class="text-slate-400 hover:text-white">✕</button>
          </div>

          <p class="text-xs text-slate-300">
            Broadcasting an official Government Security Centre (RCB) advisory immediately dampens viral virality across all demographics by 40% and restores institutional trust.
          </p>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Custom Advisory Text (Leave blank to use pre-configured official advisory)
            </label>
            <textarea
              [(ngModel)]="injectCustomText"
              rows="4"
              placeholder="Official advisory statement..."
              class="input-field text-sm"></textarea>
          </div>

          <div class="flex justify-end gap-2">
            <button
              (click)="openInjectModal = false"
              class="btn-secondary text-xs py-1.5 px-3">
              {{ locale.t('admin.cancel') }}
            </button>
            <button
              (click)="submitInject()"
              class="btn-adversary text-xs py-1.5 px-4">
              Broadcast Emergency Advisory
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminHudComponent implements OnInit, OnDestroy {
  public locale = inject(LocaleService);
  private api = inject(LabApiService);
  private sync = inject(FirestoreSyncService);
  private heartbeat = inject(HeartbeatService);
  private route = inject(ActivatedRoute);

  public sessionId = '';
  public UserRole = UserRole;
  public SessionStatus = SessionStatus;

  public session = this.sync.session;
  public presenceList = signal<any[]>([]);
  public telemetryData = signal<any>(null);
  public generatedInviteUrl = '';
  public copied = false;
  public openInjectModal = false;
  public injectCustomText = '';

  // Add / Inject Post state
  public openAddPostModal = false;
  public activeAddPostTab: 'quick' | 'custom' = 'quick';
  public scenarioArticles = signal<any[]>([]);
  public customPost = {
    headline: '',
    content: '',
    author_name: 'Alert Informacyjny PL',
    author_handle: '@AlertInfoPL',
    media_url: '',
    outrage_score: 0.70,
    bias_score: 0.0,
    is_verified: false,
    target_cluster: ''
  };

  // Google Cloud Generative Media Studio state
  public isGeneratingMedia = false;
  public mediaGenType: 'AUDIO' | 'IMAGE' = 'AUDIO';
  public mediaVoicePersona = 'grandchild_distress';
  public mediaLanguage = 'pl';
  public mediaAspectRatio = '1:1';
  public mediaPromptOverride = '';
  public lastGeneratedMediaMeta: any = null;
  public mediaGenError = '';

  private adminPollTimer: any = null;

  ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (this.sessionId) {
      this.sync.startSync(this.sessionId, 2000);
      this.heartbeat.startHeartbeat(this.sessionId);
      this.loadAdminData();
      this.adminPollTimer = setInterval(() => this.loadAdminData(), 3000);
    }
  }

  ngOnDestroy() {
    this.sync.stopSync();
    this.heartbeat.stopHeartbeat();
    if (this.adminPollTimer) clearInterval(this.adminPollTimer);
  }

  async loadAdminData() {
    try {
      const [pres, tel] = await Promise.all([
        this.api.adminGetPresence(this.sessionId),
        this.api.adminGetTelemetry(this.sessionId)
      ]);
      this.presenceList.set(pres.participants || []);
      this.telemetryData.set(tel);
    } catch (e) {
      console.warn('Could not load admin HUD telemetry:', e);
    }
  }

  async loadScenarioArticles() {
    try {
      const arts = await this.api.getScenarioArticles(this.sessionId);
      this.scenarioArticles.set(arts || []);
    } catch (e) {
      console.warn('Could not load scenario articles:', e);
    }
  }

  tokenUsagePercentage(): number {
    const s = this.session();
    if (!s || !s.token_usage) return 0;
    return Math.min(100, (s.token_usage.total_tokens / Math.max(1, s.token_usage.budget_limit_tokens)) * 100);
  }

  activeParticipantCount(): number {
    return this.presenceList().filter(p => p.is_active).length;
  }

  clusterMetricsList(): any[] {
    const tel = this.telemetryData();
    if (!tel || !tel.cluster_metrics) return [];
    return Object.entries(tel.cluster_metrics).map(([name, data]: [string, any]) => ({
      name,
      ...data
    }));
  }

  async startSession() {
    await this.api.startSession(this.sessionId);
    this.sync.fetchData(this.sessionId);
  }

  async pauseSession() {
    await this.api.pauseSession(this.sessionId);
    this.sync.fetchData(this.sessionId);
  }

  async resumeSession() {
    await this.api.resumeSession(this.sessionId);
    this.sync.fetchData(this.sessionId);
  }

  async forceTick() {
    await this.api.adminForceTick(this.sessionId);
    this.sync.fetchData(this.sessionId);
    this.loadAdminData();
  }

  async submitInject() {
    await this.api.adminCrisisInject(this.sessionId, this.injectCustomText || undefined);
    this.openInjectModal = false;
    this.injectCustomText = '';
    this.sync.fetchData(this.sessionId);
    this.loadAdminData();
  }

  async injectScenarioArticle(art: any) {
    try {
      await this.api.createAdminPost(this.sessionId, {
        headline: art.headline,
        content: art.body_text,
        author_name: art.author_name,
        author_handle: art.author_handle,
        media_url: art.media_url,
        outrage_score: art.outrage_score,
        bias_score: art.bias_score,
        target_cluster: art.target_cluster,
        is_verified: false
      });
      this.openAddPostModal = false;
      this.sync.fetchData(this.sessionId);
    } catch (e: any) {
      alert('Error injecting post: ' + (e.message || e));
    }
  }

  async generateGoogleMedia() {
    this.isGeneratingMedia = true;
    this.mediaGenError = '';
    const textOrPrompt = this.mediaPromptOverride.trim() || this.customPost.content.trim() || this.customPost.headline.trim();
    if (!textOrPrompt) {
      this.mediaGenError = 'Wprowadź treść posta lub dedykowany prompt do wygenerowania multimediów.';
      this.isGeneratingMedia = false;
      return;
    }

    try {
      const res = await this.api.generateMedia({
        media_type: this.mediaGenType,
        prompt_or_text: textOrPrompt,
        language: this.mediaLanguage,
        voice_persona: this.mediaVoicePersona,
        aspect_ratio: this.mediaAspectRatio,
        scenario_title: this.customPost.headline || 'Admin Custom Inject',
        session_id: this.sessionId
      });

      this.customPost.media_url = res.media_url;
      this.lastGeneratedMediaMeta = res;
    } catch (e: any) {
      console.error('Failed to generate media via Google Cloud:', e);
      this.mediaGenError = e.message || 'Błąd generowania multimediów przez Google Cloud';
    } finally {
      this.isGeneratingMedia = false;
    }
  }

  async submitCustomPost() {
    if (!this.customPost.content.trim()) return;
    try {
      await this.api.createAdminPost(this.sessionId, {
        headline: this.customPost.headline.trim() || undefined,
        content: this.customPost.content.trim(),
        author_name: this.customPost.author_name.trim() || 'Centrum Informacji',
        author_handle: this.customPost.author_handle.trim() || '@CentrumInfo',
        media_url: this.customPost.media_url.trim() || undefined,
        outrage_score: Number(this.customPost.outrage_score),
        bias_score: Number(this.customPost.bias_score),
        is_verified: Boolean(this.customPost.is_verified),
        target_cluster: this.customPost.target_cluster || undefined
      });
      this.openAddPostModal = false;
      this.customPost.headline = '';
      this.customPost.content = '';
      this.sync.fetchData(this.sessionId);
    } catch (e: any) {
      alert('Error publishing custom post: ' + (e.message || e));
    }
  }

  async generateInvite(role: UserRole) {
    const res = await this.api.createInvite(this.sessionId, role);
    this.generatedInviteUrl = `${window.location.origin}/join?sessionId=${this.sessionId}&token=${res.token}`;
    this.copied = false;
  }

  copyInvite() {
    navigator.clipboard.writeText(this.generatedInviteUrl);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }
}
