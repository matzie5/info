import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LabApiService } from '../../core/services/lab-api.service';
import { FirestoreSyncService } from '../../core/services/firestore-sync.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Session, FeedItem, PlayerAction, UserRole, SessionStatus } from '../../core/models/session.model';

@Component({
  selector: 'app-classroom',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex flex-col bg-[#070A0F] text-slate-100 font-sans selection:bg-[#84AA40] selection:text-black">
      <!-- Top Classroom Projector Header -->
      <header class="glass-panel sticky top-0 z-30 border-b border-white/10 px-6 py-3 bg-[#0B0F17]/95 backdrop-blur-md">
        <div class="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <!-- Left: Brand & Scenario Details -->
          <div class="flex items-center gap-3">
            <a routerLink="/" class="text-white font-black text-xl tracking-tight flex items-center gap-2 hover:opacity-80">
              <span class="w-3 h-3 rounded-sm bg-[#84AA40] rotate-45"></span>
              INFOSPHERE<span class="text-[#84AA40]">.CLASSROOM</span>
            </a>
            <span class="badge text-xs px-2.5 py-0.5 border"
              [class.badge-green]="mode === 'live'"
              [class.badge-amber]="mode === 'playback'">
              <span class="w-2 h-2 rounded-full inline-block mr-1"
                [class.bg-green-400]="mode === 'live'"
                [class.animate-pulse]="mode === 'live'"
                [class.bg-amber-400]="mode === 'playback'"></span>
              {{ mode === 'live' ? locale.t('classroom.live_mode') : locale.t('classroom.playback_mode') }}
            </span>
            <span class="text-xs font-mono text-slate-400 hidden lg:inline">
              {{ session()?.title }} &bull; {{ session()?.scenario_id }}
            </span>
          </div>

          <!-- Middle: Playback Scrubber & Controls -->
          <div class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 shadow-inner">
            <!-- Mode Switcher -->
            <div class="flex bg-black/40 rounded p-0.5 border border-white/5 mr-2">
              <button
                type="button"
                (click)="setMode('live')"
                [class.bg-[#84AA40]]="mode === 'live'"
                [class.text-black]="mode === 'live'"
                [class.font-bold]="mode === 'live'"
                class="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white transition-colors">
                LIVE
              </button>
              <button
                type="button"
                (click)="setMode('playback')"
                [class.bg-[#84AA40]]="mode === 'playback'"
                [class.text-black]="mode === 'playback'"
                [class.font-bold]="mode === 'playback'"
                class="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white transition-colors">
                PLAYBACK
              </button>
            </div>

            <!-- Playback Step Controls (Active in Playback Mode) -->
            <div *ngIf="mode === 'playback'" class="flex items-center gap-2">
              <button
                type="button"
                (click)="stepBackward()"
                [disabled]="scrubbedTick === 0"
                class="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 disabled:opacity-30 text-xs px-2 font-mono">
                ⏮
              </button>
              <button
                type="button"
                (click)="togglePlayPlayback()"
                class="px-3 py-1 rounded text-xs font-bold transition-colors"
                [class.bg-[#84AA40]]="!isPlayingPlayback"
                [class.text-black]="!isPlayingPlayback"
                [class.bg-amber-500]="isPlayingPlayback"
                [class.text-black]="isPlayingPlayback">
                {{ isPlayingPlayback ? '⏸ Pause' : '▶ Play' }}
              </button>
              <button
                type="button"
                (click)="stepForward()"
                [disabled]="scrubbedTick >= currentSessionTick()"
                class="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 disabled:opacity-30 text-xs px-2 font-mono">
                ⏭
              </button>

              <!-- Slider -->
              <div class="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  [max]="currentSessionTick()"
                  [(ngModel)]="scrubbedTick"
                  (input)="onScrubChange()"
                  class="w-32 md:w-48 accent-[#84AA40] cursor-pointer" />
                <span class="font-mono text-xs font-bold text-[#84AA40] whitespace-nowrap">
                  T+{{ scrubbedTick }}h
                </span>
              </div>
            </div>

            <!-- Live Tick Indicator (Active in Live Mode) -->
            <div *ngIf="mode === 'live'" class="flex items-center gap-2 px-2 font-mono text-xs">
              <span class="text-slate-400">Current Scenario Clock:</span>
              <span class="text-white font-bold text-sm bg-black/40 px-2 py-0.5 rounded border border-white/10">
                T+{{ currentSessionTick() }}h / {{ session()?.max_ticks || 40 }}h
              </span>
            </div>
          </div>

          <!-- Right: Tools, Language & Navigation -->
          <div class="flex items-center gap-2">
            <!-- Language Switcher -->
            <div class="flex items-center gap-1 border border-white/10 rounded px-2 py-1 bg-black/40">
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

            <!-- Fullscreen Button -->
            <button
              type="button"
              (click)="toggleFullscreen()"
              class="btn-secondary text-xs py-1.5 px-2.5">
              ⛶
            </button>

            <!-- Facilitator HUD & Arena Links -->
            <a [routerLink]="['/arena', sessionId]" class="btn-secondary text-xs py-1.5 px-3">
              {{ locale.t('app.arena_view') }}
            </a>
            <a [routerLink]="['/admin', sessionId]" class="btn-secondary text-xs py-1.5 px-3 border-amber-500/30 text-amber-300">
              {{ locale.t('app.admin_view') }}
            </a>
          </div>
        </div>
      </header>

      <!-- Main 3-Column Classroom Layout -->
      <main class="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- COLUMN 1: PULSE SOCIAL FEED (col-span-4) -->
        <section class="lg:col-span-4 flex flex-col h-[calc(100vh-120px)] glass-panel overflow-hidden border-white/10">
          <div class="p-4 border-b border-white/10 bg-black/30 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <h2 class="text-sm font-extrabold tracking-wide uppercase text-slate-200">
                {{ locale.t('classroom.posts_column') }}
              </h2>
            </div>
            <span class="text-xs font-mono text-slate-400">
              {{ displayedFeed().length }} posts active
            </span>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4 pr-2">
            <div *ngIf="displayedFeed().length === 0" class="text-center py-16 text-slate-500 text-sm">
              {{ locale.t('pulse.empty') }}
            </div>

            <div
              *ngFor="let post of displayedFeed()"
              class="glass-panel p-4 transition-all hover:border-white/20 border-white/5 space-y-3"
              [ngClass]="{
                'border-red-500/50 bg-red-950/10': post.is_amplified,
                'border-blue-500/50 bg-blue-950/10': post.is_debunked
              }">
              
              <!-- Post Author Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-slate-300">
                    {{ post.author_name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-xs text-white">{{ post.author_name }}</span>
                      <span *ngIf="post.is_verified" class="text-blue-400 text-xs" title="Verified">●</span>
                    </div>
                    <span class="text-[11px] text-slate-400 font-mono">{{ post.author_handle }}</span>
                  </div>
                </div>
                <span class="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                  T+{{ post.created_at_tick }}h
                </span>
              </div>

              <!-- Tags -->
              <div class="flex flex-wrap gap-1.5">
                <span *ngIf="post.is_amplified" class="badge badge-red text-[10px] py-0 px-1.5">
                  🤖 Bot Amplified (+300%)
                </span>
                <span *ngIf="post.is_debunked" class="badge badge-blue text-[10px] py-0 px-1.5">
                  ⚠️ Evidence Debunked
                </span>
                <span *ngIf="post.prebunk_shield_active" class="badge badge-green text-[10px] py-0 px-1.5">
                  🛡️ Prebunk Shield
                </span>
              </div>

              <!-- Headline & Content -->
              <div>
                <h3 *ngIf="post.headline" class="text-sm font-bold text-white mb-1 leading-snug">
                  {{ post.headline }}
                </h3>
                <p class="text-xs text-slate-300 leading-relaxed">{{ post.content }}</p>
              </div>

              <!-- Metrics Footer -->
              <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <div class="flex items-center gap-3">
                  <span>🔄 {{ post.shares_count }}</span>
                  <span>❤️ {{ post.likes_count }}</span>
                  <span>💬 {{ post.comments_count || 0 }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span>Outrage:</span>
                  <span [ngClass]="post.outrage_score >= 0.7 ? 'text-red-400' : 'text-slate-300'">
                    {{ (post.outrage_score * 100) | number:'1.0-0' }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- COLUMN 2: TACTICAL OPERATIONS LOG (col-span-4) -->
        <section class="lg:col-span-4 flex flex-col h-[calc(100vh-120px)] glass-panel overflow-hidden border-white/10">
          <div class="p-4 border-b border-white/10 bg-black/30 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <h2 class="text-sm font-extrabold tracking-wide uppercase text-slate-200">
                {{ locale.t('classroom.actions_column') }}
              </h2>
            </div>
            
            <!-- Filter Chips -->
            <div class="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                (click)="actionFilter = 'ALL'"
                [ngClass]="actionFilter === 'ALL' ? 'bg-white/25 text-white font-bold' : 'bg-white/5 text-slate-300'"
                class="px-2 py-0.5 rounded hover:text-white">
                All
              </button>
              <button
                type="button"
                (click)="actionFilter = 'RED'"
                [ngClass]="actionFilter === 'RED' ? 'bg-red-500/40 text-white font-bold' : 'bg-white/5 text-red-400'"
                class="px-2 py-0.5 rounded hover:text-white">
                Red
              </button>
              <button
                type="button"
                (click)="actionFilter = 'BLUE'"
                [ngClass]="actionFilter === 'BLUE' ? 'bg-blue-500/40 text-white font-bold' : 'bg-white/5 text-blue-400'"
                class="px-2 py-0.5 rounded hover:text-white">
                Blue
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-3 pr-2">
            <div *ngIf="filteredActions().length === 0" class="text-center py-16 text-slate-500 text-sm font-mono">
              No tactical actions recorded yet in this time window.
            </div>

            <div
              *ngFor="let act of filteredActions()"
              class="glass-panel p-3 border-white/5 hover:border-white/20 transition-all space-y-2"
              [ngClass]="{
                'border-red-500/40 bg-red-950/15': act.team === 'RED_TEAM',
                'border-blue-500/40 bg-blue-950/15': act.team === 'BLUE_TEAM',
                'border-emerald-500/40 bg-emerald-950/15': act.team === 'FACILITATOR',
                'ring-2 ring-[#84AA40]': mode === 'playback' && act.tick === scrubbedTick
              }">
              
              <!-- Action Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span
                    class="badge text-[9px] font-bold py-0.5 px-1.5"
                    [class.badge-red]="act.team === 'RED_TEAM'"
                    [class.badge-blue]="act.team === 'BLUE_TEAM'"
                    [class.badge-green]="act.team === 'FACILITATOR'">
                    {{ act.team }}
                  </span>
                  <span class="text-xs font-bold text-white">{{ formatActionType(act.action_type) }}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-400">
                  T+{{ act.tick ?? 0 }}h
                </span>
              </div>

              <!-- Action Details -->
              <p *ngIf="act.headline" class="text-xs font-bold text-slate-200">
                "{{ act.headline }}"
              </p>
              <p *ngIf="act.content" class="text-xs text-slate-300 italic line-clamp-2">
                {{ act.content }}
              </p>

              <!-- Footer Meta -->
              <div class="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono text-slate-400">
                <span>By: {{ act.user_id }}</span>
                <span *ngIf="act.target_cluster" class="text-[#84AA40]">Target: {{ act.target_cluster }}</span>
                <span *ngIf="act.target_post_id" class="text-slate-500">Post #{{ act.target_post_id.substring(0, 8) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- COLUMN 3: METRICS & TRAJECTORY GRAPH (col-span-4) -->
        <section class="lg:col-span-4 flex flex-col h-[calc(100vh-120px)] space-y-4">
          <!-- 3 KPI Cards -->
          <div class="grid grid-cols-3 gap-3">
            <!-- Trust -->
            <div class="glass-panel p-3 text-center space-y-1">
              <span class="text-[10px] font-mono uppercase text-slate-400 block truncate">
                {{ locale.t('metrics.trust') }}
              </span>
              <div class="text-xl md:text-2xl font-black font-mono"
                [class.text-green-400]="isHighTrust()"
                [class.text-red-400]="!isHighTrust()">
                {{ (displayedMetrics().institutional_trust * 100) | number:'1.0-0' }}%
              </div>
            </div>

            <!-- Polarization -->
            <div class="glass-panel p-3 text-center space-y-1">
              <span class="text-[10px] font-mono uppercase text-slate-400 block truncate">
                {{ locale.t('metrics.polarization') }}
              </span>
              <div class="text-xl md:text-2xl font-black font-mono"
                [class.text-red-400]="isHighPolarization()"
                [class.text-amber-400]="!isHighPolarization()">
                {{ (displayedMetrics().polarization_score * 100) | number:'1.0-0' }}%
              </div>
            </div>

            <!-- Virality Velocity -->
            <div class="glass-panel p-3 text-center space-y-1">
              <span class="text-[10px] font-mono uppercase text-slate-400 block truncate">
                {{ locale.t('metrics.virality') }}
              </span>
              <div class="text-xl md:text-2xl font-black font-mono text-amber-300">
                {{ displayedMetrics().virality_index | number:'1.2-2' }}x
              </div>
            </div>
          </div>

          <!-- Dynamic Trajectory Graph (SVG Multi-Curve) -->
          <div class="glass-panel p-4 flex-1 flex flex-col justify-between border-white/10">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">
                {{ locale.t('classroom.metrics_column') }}
              </h3>
              <!-- Legend -->
              <div class="flex items-center gap-3 text-[10px] font-mono">
                <span class="flex items-center gap-1 text-green-400">
                  <span class="w-2.5 h-1 bg-green-400 rounded"></span> Trust
                </span>
                <span class="flex items-center gap-1 text-red-400">
                  <span class="w-2.5 h-1 bg-red-400 rounded"></span> Polarization
                </span>
                <span class="flex items-center gap-1 text-amber-400">
                  <span class="w-2.5 h-1 bg-amber-400 rounded"></span> Virality
                </span>
              </div>
            </div>

            <!-- SVG Line Graph Container -->
            <div class="flex-1 w-full relative min-h-[160px] bg-black/40 rounded-lg p-2 border border-white/5 flex items-center justify-center">
              <svg *ngIf="hasTrajectory()" class="w-full h-full overflow-visible" viewBox="0 0 400 160" preserveAspectRatio="none">
                <!-- Grid Horizontal Lines -->
                <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.05)" stroke-dasharray="2,2" />
                <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.05)" stroke-dasharray="2,2" />
                <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(255,255,255,0.05)" stroke-dasharray="2,2" />

                <!-- Trust Path (Green) -->
                <path [attr.d]="trustPath()" fill="none" stroke="#4ADE80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Polarization Path (Red) -->
                <path [attr.d]="polarizationPath()" fill="none" stroke="#F87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Virality Path (Amber) -->
                <path [attr.d]="viralityPath()" fill="none" stroke="#FBBF24" stroke-width="2" stroke-dasharray="3,2" stroke-linecap="round" />

                <!-- Cursor Line at Current Scrubbed Tick -->
                <line
                  *ngIf="cursorX() !== null"
                  [attr.x1]="cursorX()"
                  y1="0"
                  [attr.x2]="cursorX()"
                  y2="160"
                  stroke="#84AA40"
                  stroke-width="2"
                  stroke-dasharray="4,3" />
              </svg>

              <div *ngIf="!hasTrajectory()" class="text-xs text-slate-500 font-mono text-center">
                Awaiting progression of scenario ticks to plot trajectory graph...
              </div>
            </div>

            <!-- Cluster Susceptibility Telemetry -->
            <div class="mt-4 space-y-2 border-t border-white/10 pt-3">
              <div class="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>{{ locale.t('classroom.cluster_vulnerability') }}</span>
                <span class="text-[10px] text-slate-500 font-mono">5 Demographics</span>
              </div>

              <div class="space-y-1.5 text-[11px] font-mono">
                <div *ngFor="let cluster of clusters" class="flex items-center justify-between gap-2">
                  <span class="text-slate-400 w-36 truncate">{{ cluster.name }}</span>
                  <div class="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      class="h-full bg-green-500 rounded-l-full transition-all duration-300"
                      [style.width.%]="cluster.trust * 100"></div>
                    <div
                      class="h-full bg-red-500 rounded-r-full transition-all duration-300"
                      [style.width.%]="(1 - cluster.trust) * 100"></div>
                  </div>
                  <span class="w-10 text-right text-slate-300">{{ (cluster.trust * 100) | number:'1.0-0' }}%</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `
})
export class ClassroomComponent implements OnInit, OnDestroy {
  public locale = inject(LocaleService);
  private api = inject(LabApiService);
  private sync = inject(FirestoreSyncService);
  private route = inject(ActivatedRoute);

  public sessionId = '';
  public mode: 'live' | 'playback' = 'live';
  public scrubbedTick = 0;
  public isPlayingPlayback = false;
  public actionFilter: 'ALL' | 'RED' | 'BLUE' = 'ALL';

  public session = this.sync.session;
  public feed = this.sync.feed;
  public allActions = signal<PlayerAction[]>([]);

  private pollTimer: any = null;
  private playbackTimer: any = null;

  public clusters = [
    { name: 'Hyper-Partisan A', trust: 0.35 },
    { name: 'Hyper-Partisan B', trust: 0.40 },
    { name: 'Institutional Skeptics', trust: 0.50 },
    { name: 'Susceptible Neutrals', trust: 0.65 },
    { name: 'Apolitical Youth', trust: 0.70 }
  ];

  ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (this.sessionId) {
      this.sync.startSync(this.sessionId, 2000);
      this.loadActions();
      this.pollTimer = setInterval(() => {
        if (this.mode === 'live') {
          this.loadActions();
          this.scrubbedTick = this.currentSessionTick();
        }
      }, 3000);
    }
  }

  ngOnDestroy() {
    this.sync.stopSync();
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.playbackTimer) clearInterval(this.playbackTimer);
  }

  currentSessionTick(): number {
    return this.session()?.current_tick || 0;
  }

  isHighTrust(): boolean {
    return (this.displayedMetrics().institutional_trust ?? 0.8) >= 0.5;
  }

  isHighPolarization(): boolean {
    return (this.displayedMetrics().polarization_score ?? 0.25) >= 0.7;
  }

  hasTrajectory(): boolean {
    return this.historyPoints().length > 1;
  }

  async loadActions() {
    try {
      const actions = await this.api.getActions(this.sessionId);
      this.allActions.set(actions || []);
    } catch (e) {
      console.warn('Could not fetch actions for classroom:', e);
    }
  }

  setMode(m: 'live' | 'playback') {
    this.mode = m;
    if (m === 'live') {
      this.pausePlayback();
      this.scrubbedTick = this.currentSessionTick();
    } else {
      this.scrubbedTick = this.currentSessionTick();
    }
  }

  onScrubChange() {
    this.mode = 'playback';
  }

  togglePlayPlayback() {
    if (this.isPlayingPlayback) {
      this.pausePlayback();
    } else {
      this.playPlayback();
    }
  }

  playPlayback() {
    this.isPlayingPlayback = true;
    this.mode = 'playback';
    if (this.scrubbedTick >= this.currentSessionTick()) {
      this.scrubbedTick = 0;
    }
    this.playbackTimer = setInterval(() => {
      if (this.scrubbedTick < this.currentSessionTick()) {
        this.scrubbedTick++;
      } else {
        this.pausePlayback();
      }
    }, 1500);
  }

  pausePlayback() {
    this.isPlayingPlayback = false;
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  stepBackward() {
    this.pausePlayback();
    this.mode = 'playback';
    if (this.scrubbedTick > 0) this.scrubbedTick--;
  }

  stepForward() {
    this.pausePlayback();
    this.mode = 'playback';
    if (this.scrubbedTick < this.currentSessionTick()) this.scrubbedTick++;
  }

  displayedFeed(): FeedItem[] {
    const rawFeed = this.feed();
    const effectiveTick = this.mode === 'live' ? this.currentSessionTick() : this.scrubbedTick;
    return rawFeed.filter(item => item.created_at_tick <= effectiveTick);
  }

  filteredActions(): PlayerAction[] {
    const effectiveTick = this.mode === 'live' ? this.currentSessionTick() : this.scrubbedTick;
    let list = this.allActions().filter(a => (a.tick ?? 0) <= effectiveTick);
    if (this.actionFilter === 'RED') {
      list = list.filter(a => a.team === UserRole.RED_TEAM);
    } else if (this.actionFilter === 'BLUE') {
      list = list.filter(a => a.team === UserRole.BLUE_TEAM);
    }
    // Sort descending by tick
    return list.sort((a, b) => (b.tick ?? 0) - (a.tick ?? 0));
  }

  displayedMetrics() {
    const s = this.session();
    if (!s) {
      return { institutional_trust: 0.8, polarization_score: 0.25, virality_index: 1.0 };
    }
    if (this.mode === 'live' || this.scrubbedTick >= s.current_tick) {
      return s.metrics || { institutional_trust: 0.8, polarization_score: 0.25, virality_index: 1.0 };
    }
    // Find metric from history at scrubbedTick
    const history = s.history_metrics || [];
    const entry = history.find(h => h.tick === this.scrubbedTick);
    if (entry) {
      return {
        institutional_trust: entry.institutional_trust ?? 0.8,
        polarization_score: entry.polarization_index ?? 0.25,
        virality_index: entry.virality_velocity ?? 1.0
      };
    }
    return s.metrics || { institutional_trust: 0.8, polarization_score: 0.25, virality_index: 1.0 };
  }

  historyPoints(): any[] {
    const s = this.session();
    if (!s || !s.history_metrics) return [];
    return s.history_metrics.filter(h => h.tick !== undefined);
  }

  cursorX(): number | null {
    const totalTicks = Math.max(1, this.currentSessionTick());
    const tick = this.mode === 'live' ? this.currentSessionTick() : this.scrubbedTick;
    return (tick / totalTicks) * 400;
  }

  trustPath(): string {
    const pts = this.historyPoints();
    if (pts.length <= 1) return '';
    const totalTicks = Math.max(1, this.currentSessionTick());
    return pts.map((p, idx) => {
      const x = (p.tick / totalTicks) * 400;
      const y = 160 - (p.institutional_trust * 140) - 10;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  polarizationPath(): string {
    const pts = this.historyPoints();
    if (pts.length <= 1) return '';
    const totalTicks = Math.max(1, this.currentSessionTick());
    return pts.map((p, idx) => {
      const x = (p.tick / totalTicks) * 400;
      const y = 160 - (p.polarization_index * 140) - 10;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  viralityPath(): string {
    const pts = this.historyPoints();
    if (pts.length <= 1) return '';
    const totalTicks = Math.max(1, this.currentSessionTick());
    return pts.map((p, idx) => {
      const x = (p.tick / totalTicks) * 400;
      const normalizedVirality = Math.min(1.0, (p.virality_velocity || 1.0) / 3.0);
      const y = 160 - (normalizedVirality * 140) - 10;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  formatActionType(t: string): string {
    return t.replace(/_/g, ' ');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
}
