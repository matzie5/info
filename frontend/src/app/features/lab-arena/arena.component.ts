import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FirestoreSyncService } from '../../core/services/firestore-sync.service';
import { HeartbeatService } from '../../core/services/heartbeat.service';
import { LabApiService } from '../../core/services/lab-api.service';
import { LocaleService, LanguageCode } from '../../core/i18n/locale.service';
import { AudienceService } from '../../core/audience/audience.service';
import { UserRole, SessionStatus } from '../../core/models/session.model';
import { PulseFeedComponent } from './components/pulse-feed/pulse-feed.component';
import { RedConsoleComponent } from './components/red-console/red-console.component';
import { BlueConsoleComponent } from './components/blue-console/blue-console.component';
import { TutorialModalComponent } from './components/tutorial-modal/tutorial-modal.component';

@Component({
  selector: 'app-arena',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PulseFeedComponent,
    RedConsoleComponent,
    BlueConsoleComponent,
    TutorialModalComponent
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-[#0B0F17]">
      <!-- Top Navigation & Macro Telemetry Bar -->
      <header class="glass-panel sticky top-0 z-30 border-b border-white/10 px-6 py-3">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <!-- Left: Title & Tick Clock -->
          <div class="flex items-center gap-4">
            <a routerLink="/" class="text-white font-black text-lg tracking-tight hover:opacity-80 transition-opacity">
              INFOSPHERE<span class="text-[#84AA40]">.LAB</span>
            </a>

            <div class="h-5 w-px bg-white/10 hidden sm:block"></div>

            <div class="flex items-center gap-2">
              <span class="text-xs font-mono bg-white/5 px-2.5 py-1 rounded border border-white/10 text-white font-bold">
                T+{{ session()?.current_tick || 0 }}h / {{ session()?.max_ticks || 40 }}h
              </span>

              <span
                class="badge text-[10px]"
                [class.badge-green]="session()?.status === SessionStatus.ACTIVE"
                [class.badge-amber]="session()?.status === SessionStatus.PAUSED"
                [class.badge-red]="session()?.status === SessionStatus.COMPLETED">
                {{ session()?.status || 'CONNECTING' }}
              </span>

              <span class="px-2 py-0.5 rounded text-[10px] font-bold border"
                [ngClass]="{
                  'bg-indigo-500/20 text-indigo-300 border-indigo-500/40': audience.isProfessional(),
                  'bg-sky-500/20 text-sky-300 border-sky-500/40': audience.isKids(),
                  'bg-amber-500/20 text-amber-300 border-amber-500/40': audience.isSeniors()
                }">
                {{ locale.t('audience.' + audience.mode()) }}
              </span>

              <span *ngIf="audience.activeLocationName()" class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                📍 {{ audience.activeLocationName() }}
              </span>
            </div>
          </div>

          <!-- Middle: Macro Telemetry Gauges -->
          <div class="flex items-center gap-6 font-mono text-xs">
            <!-- Platform Trust Index -->
            <div class="flex items-center gap-2">
              <span class="text-slate-400">{{ locale.t('metrics.trust') }}:</span>
              <span class="font-bold text-[#A3E635]">{{ ((session()?.metrics?.institutional_trust || 0) * 100).toFixed(0) }}%</span>
              <div class="w-16 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10 hidden md:block">
                <div class="h-full bg-[#84AA40]" [style.width.%]="(session()?.metrics?.institutional_trust || 0) * 100"></div>
              </div>
            </div>

            <!-- Polarization Score -->
            <div class="flex items-center gap-2">
              <span class="text-slate-400">{{ locale.t('metrics.polarization') }}:</span>
              <span class="font-bold text-amber-400">{{ ((session()?.metrics?.polarization_score || 0) * 100).toFixed(0) }}%</span>
              <div class="w-16 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10 hidden md:block">
                <div class="h-full bg-amber-400" [style.width.%]="(session()?.metrics?.polarization_score || 0) * 100"></div>
              </div>
            </div>

            <!-- Virality Index -->
            <div class="flex items-center gap-2">
              <span class="text-slate-400">{{ locale.t('metrics.virality') }}:</span>
              <span class="font-bold text-red-400">{{ (session()?.metrics?.virality_index || 0).toFixed(1) }}x</span>
              <div class="w-16 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10 hidden md:block">
                <div class="h-full bg-red-500" [style.width.%]="((session()?.metrics?.virality_index || 0) / 3) * 100"></div>
              </div>
            </div>
          </div>

          <!-- Right: Role Switcher, Language & Actions -->
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

            <!-- Tutorial / Field Manual Button -->
            <button
              type="button"
              (click)="showTutorialModal = true"
              class="btn-secondary text-xs py-1 px-2.5 border-[#84AA40]/40 text-[#A3E635] hover:bg-[#84AA40]/10">
              📖 {{ locale.t('tutorial.btn_title') }}
            </button>

            <!-- Classroom Presentation View Link -->
            <a
              *ngIf="session()?.id"
              [routerLink]="['/classroom', session()!.id]"
              class="btn-secondary text-xs py-1 px-2.5 border-purple-500/30 text-purple-300 hover:border-purple-400">
              📺 {{ locale.t('classroom.title') }}
            </a>

            <!-- Role Selector Chips -->
            <div class="flex items-center rounded-lg bg-black/40 border border-white/10 p-0.5 text-xs">
              <button
                type="button"
                (click)="activeRole = UserRole.RED_TEAM"
                [class.bg-red-500]="isRole(UserRole.RED_TEAM)"
                [class.text-white]="isRole(UserRole.RED_TEAM)"
                class="px-2.5 py-1 rounded font-bold transition-all text-slate-400">
                Red
              </button>
              <button
                type="button"
                (click)="activeRole = UserRole.BLUE_TEAM"
                [class.bg-green-600]="isRole(UserRole.BLUE_TEAM)"
                [class.text-white]="isRole(UserRole.BLUE_TEAM)"
                class="px-2.5 py-1 rounded font-bold transition-all text-slate-400">
                Blue
              </button>
              <button
                type="button"
                (click)="activeRole = UserRole.OBSERVER"
                [class.bg-slate-700]="isRole(UserRole.OBSERVER)"
                [class.text-white]="isRole(UserRole.OBSERVER)"
                class="px-2.5 py-1 rounded font-bold transition-all text-slate-400">
                Obs
              </button>
            </div>

            <a
              *ngIf="session()?.id"
              [routerLink]="['/admin', session()!.id]"
              class="btn-secondary text-xs py-1 px-2.5">
              HUD
            </a>

            <a
              *ngIf="session()?.id && session()?.status === SessionStatus.COMPLETED"
              [routerLink]="['/debrief', session()!.id]"
              class="btn-primary text-xs py-1 px-2.5">
              Debrief
            </a>
          </div>
        </div>
      </header>

      <!-- Main Layout Body -->
      <main class="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid lg:grid-cols-12 gap-6">
        <!-- Left: Pulse Social Media Feed (7 columns) -->
        <section class="lg:col-span-7">
          <app-pulse-feed
            [items]="feed()"
            (actionTriggered)="onFeedAction($event)">
          </app-pulse-feed>
        </section>

        <!-- Right: Tactical Console (5 columns) -->
        <section class="lg:col-span-5 space-y-4">
          <!-- If Red Team -->
          <app-red-console
            *ngIf="activeRole === UserRole.RED_TEAM"
            [budgets]="session()?.budgets || null"
            [posts]="feed()"
            (actionDispatched)="onActionDispatched($event)">
          </app-red-console>

          <!-- If Blue Team -->
          <app-blue-console
            *ngIf="activeRole === UserRole.BLUE_TEAM"
            [budgets]="session()?.budgets || null"
            [posts]="feed()"
            (actionDispatched)="onActionDispatched($event)">
          </app-blue-console>

          <!-- If Observer -->
          <div *ngIf="activeRole === UserRole.OBSERVER" class="glass-panel p-5 space-y-4">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-blue-400"></span>
              <h2 class="text-base font-extrabold text-white uppercase tracking-wide">
                Strategic Intelligence Radar
              </h2>
            </div>
            <p class="text-slate-400 text-xs">
              Live observational mode. You are analyzing network contagion metrics and demographic susceptibility in real time.
            </p>
            <div class="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
              <div class="p-3 rounded bg-black/40 border border-white/5">
                <span class="text-slate-400 block text-[10px]">DISINFO REACH</span>
                <span class="text-lg font-bold text-red-400">
                  {{ (session()?.metrics?.disinformation_reach || 0).toFixed(1) }}%
                </span>
              </div>
              <div class="p-3 rounded bg-black/40 border border-white/5">
                <span class="text-slate-400 block text-[10px]">DEBUNK EFFECTIVENESS</span>
                <span class="text-lg font-bold text-[#A3E635]">
                  {{ (session()?.metrics?.debunk_effectiveness || 0).toFixed(1) }}%
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- Operational Tutorial Modal -->
      <app-tutorial-modal
        *ngIf="showTutorialModal"
        (close)="showTutorialModal = false">
      </app-tutorial-modal>
    </div>
  `
})
export class ArenaComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public sync = inject(FirestoreSyncService);
  private heartbeat = inject(HeartbeatService);
  private api = inject(LabApiService);
  public locale = inject(LocaleService);
  public audience = inject(AudienceService);

  public session = this.sync.session;
  public feed = this.sync.feed;
  public UserRole = UserRole;
  public SessionStatus = SessionStatus;

  public activeRole: UserRole = UserRole.BLUE_TEAM;
  public showTutorialModal = false;
  private sessionId = '';

  isRole(role: UserRole): boolean {
    return this.activeRole === role;
  }

  ngOnInit() {
    this.sync.initUserFromStorage();
    const stored = this.sync.currentUser();
    if (stored) {
      this.activeRole = stored.role;
    }

    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (this.sessionId) {
      this.sync.startSync(this.sessionId, 2500);
      this.heartbeat.startHeartbeat(this.sessionId);
    }
  }

  ngOnDestroy() {
    this.sync.stopSync();
    this.heartbeat.stopHeartbeat();
  }

  async onActionDispatched(actionPayload: any) {
    if (!this.sessionId) return;
    try {
      const user = this.sync.currentUser() || {
        userId: 'operative_' + Math.random().toString(36).substring(2, 6),
        role: this.activeRole,
        handle: 'Operative'
      };

      await this.api.submitAction(this.sessionId, {
        userId: user.userId,
        team: this.activeRole,
        actionType: actionPayload.actionType,
        targetPostId: actionPayload.targetPostId,
        targetCluster: actionPayload.targetCluster,
        customPrompt: actionPayload.customPrompt,
        headline: actionPayload.headline,
        content: actionPayload.content
      });

      // Instantly trigger sync
      this.sync.fetchData(this.sessionId);
    } catch (e: any) {
      alert('Action error: ' + (e.message || e));
    }
  }

  onFeedAction(event: any) {
    // Engagement interaction
  }
}
