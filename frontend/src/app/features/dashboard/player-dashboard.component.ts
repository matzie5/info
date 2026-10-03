// frontend/src/app/features/dashboard/player-dashboard.component.ts
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { ThemeService } from '../../core/theme/theme.service';

export interface ModuleRecord {
  module_id: string;
  is_completed: boolean;
  best_score: number;
  points_earned: number;
  attempts: number;
  completed_at?: number;
  takeaway: string;
}

export interface UserProgressData {
  user_id: string;
  cohort_id: string;
  total_points: number;
  completed_modules: string[];
  module_records: { [key: string]: ModuleRecord };
  badges: string[];
  updated_at: number;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string;
  total_points: number;
  completed_modules_count: number;
  badges_count: number;
  rank: number;
}

export interface ModuleChallengeCard {
  id: string;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  icon: string;
  route: string;
  badgeName: string;
  badgeTitle: string;
}

@Component({
  selector: 'app-player-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-8 animate-fadeIn">
      <!-- Player Profile & Cohort Banner -->
      <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-md">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20">
              {{ getUserInitials() }}
            </div>
            <div>
              <div class="flex items-center space-x-3">
                <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {{ auth.currentUser()?.display_name || auth.currentUser()?.username }}
                </h1>
                <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {{ auth.currentUser()?.role || 'PLAYER' }}
                </span>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {{ auth.currentUser()?.email }}
              </p>
              <div class="flex items-center space-x-2 mt-2">
                <span class="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20">
                  🛡️ {{ cohortName() }}
                </span>
                <span class="text-xs text-slate-400 dark:text-slate-500">
                  ID: {{ auth.cohortId() }}
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Actions & STIX Export -->
          <div class="flex flex-wrap items-center gap-3">
            <button
              (click)="exportStix21()"
              class="px-4 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all flex items-center space-x-1.5"
            >
              <span>📥</span>
              <span>Export STIX 2.1 Threat Intel</span>
            </button>
            <button
              (click)="refreshProgress()"
              class="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="Refresh Progress"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Metrics Counters -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Points -->
        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Points</span>
            <span class="p-2 rounded-xl bg-amber-500/10 text-amber-500 text-lg">🏆</span>
          </div>
          <div class="mt-3 flex items-baseline space-x-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ progress()?.total_points || 0 }}</span>
            <span class="text-xs font-semibold text-amber-500">PTS</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Accumulated across completed modules</p>
        </div>

        <!-- Modules Completed -->
        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Modules Completed</span>
            <span class="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-lg">🎯</span>
          </div>
          <div class="mt-3 flex items-baseline space-x-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ (progress()?.completed_modules || []).length }} / 5</span>
            <span class="text-xs font-semibold text-emerald-500">{{ getCompletionPercentage() }}%</span>
          </div>
          <!-- Progress Bar -->
          <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
            <div class="bg-emerald-500 h-2 rounded-full transition-all duration-500" [style.width.%]="getCompletionPercentage()"></div>
          </div>
        </div>

        <!-- Maturity Tier -->
        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hygiene Posture</span>
            <span class="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 text-lg">🛡️</span>
          </div>
          <div class="mt-3">
            <span class="text-sm font-black px-2.5 py-1 rounded-lg" [ngClass]="getTierClass(passportTier())">
              {{ passportTier() }}
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">Overall Score: {{ passportScore() }}/100</p>
        </div>

        <!-- Badges Earned -->
        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Defense Badges</span>
            <span class="p-2 rounded-xl bg-purple-500/10 text-purple-500 text-lg">🏅</span>
          </div>
          <div class="mt-3 flex items-baseline space-x-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ (progress()?.badges || []).length }}</span>
            <span class="text-xs text-slate-400">/ 6 Unlocked</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Specialized credentials</p>
        </div>
      </div>

      <!-- 5-Module Challenge Cards Grid -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Cognitive Defense Curriculum
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Complete each operational module to earn points, unlock credentials, and strengthen your Digital Hygiene Passport.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            *ngFor="let mod of moduleCards"
            class="bg-white/90 dark:bg-[#141B26]/90 border rounded-2xl p-6 transition-all duration-300 hover:shadow-md flex flex-col justify-between"
            [ngClass]="isModuleCompleted(mod.id) ? 'border-emerald-500/30 dark:border-emerald-500/20 shadow-emerald-500/5' : 'border-slate-200 dark:border-slate-800'"
          >
            <div>
              <div class="flex items-start justify-between">
                <span class="text-3xl p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                  {{ mod.icon }}
                </span>
                <span
                  class="px-2.5 py-1 text-xs font-bold rounded-full"
                  [ngClass]="isModuleCompleted(mod.id) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'"
                >
                  {{ isModuleCompleted(mod.id) ? '✓ COMPLETED' : 'INCOMPLETE' }}
                </span>
              </div>

              <h3 class="text-base font-bold text-slate-900 dark:text-white mt-4">
                {{ mod.defaultTitle }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {{ mod.defaultDesc }}
              </p>

              <!-- Points & Score Details -->
              <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Points:</span>
                  <span class="font-bold text-amber-500">
                    {{ isModuleCompleted(mod.id) ? '+' + getPointsEarned(mod.id) + ' PTS' : '150 PTS available' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Best Score:</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200">
                    {{ getBestScore(mod.id) }}%
                  </span>
                </div>
                <div *ngIf="getTakeaway(mod.id)" class="text-[11px] text-slate-400 dark:text-slate-500 italic mt-1 truncate">
                  "{{ getTakeaway(mod.id) }}"
                </div>
              </div>
            </div>

            <!-- Launch Action -->
            <div class="mt-5">
              <a
                [routerLink]="mod.route"
                class="w-full block text-center py-2.5 text-xs font-bold rounded-xl transition-all shadow-sm"
                [ngClass]="isModuleCompleted(mod.id) ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'"
              >
                {{ isModuleCompleted(mod.id) ? 'Re-Drill Lab ↺' : 'Launch Challenge →' }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Badges Showcase & Cohort Leaderboard -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Badges Showcase -->
        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-white mb-4">
            Cybersecurity Badges
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              *ngFor="let b of availableBadges"
              class="p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center"
              [ngClass]="hasBadge(b.code) ? 'border-purple-500/30 bg-purple-500/5 dark:bg-purple-900/10 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 opacity-60'"
            >
              <span class="text-2xl mb-1.5">{{ b.icon }}</span>
              <span class="text-xs font-bold">{{ b.name }}</span>
              <span class="text-[10px] mt-1 text-slate-500 dark:text-slate-400 line-clamp-2">{{ b.desc }}</span>
              <span
                class="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full"
                [ngClass]="hasBadge(b.code) ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'"
              >
                {{ hasBadge(b.code) ? 'UNLOCKED' : 'LOCKED' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Cohort Leaderboard -->
        <div class="bg-white/90 dark:bg-[#141B26]/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Cohort Leaderboard
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ cohortName() }}</p>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              Top Operators
            </span>
          </div>

          <div class="space-y-2.5">
            <div
              *ngFor="let item of leaderboard()"
              class="p-3 rounded-xl border flex items-center justify-between transition-all"
              [ngClass]="item.user_id === auth.currentUser()?.id ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 font-bold' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'"
            >
              <div class="flex items-center space-x-3">
                <span
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                  [ngClass]="item.rank === 1 ? 'bg-amber-500 text-slate-950' : item.rank === 2 ? 'bg-slate-300 text-slate-900' : item.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'"
                >
                  {{ item.rank }}
                </span>
                <div>
                  <span class="text-sm text-slate-900 dark:text-slate-100">{{ item.display_name }}</span>
                  <div class="text-[10px] text-slate-400">
                    {{ item.completed_modules_count }} / 5 Modules • {{ item.badges_count }} Badges
                  </div>
                </div>
              </div>

              <div class="text-right">
                <span class="text-sm font-black text-amber-500">{{ item.total_points }}</span>
                <span class="text-[10px] text-slate-400 block">PTS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PlayerDashboardComponent implements OnInit {
  public auth = inject(AuthService);
  public locale = inject(LocaleService);
  public theme = inject(ThemeService);
  private http = inject(HttpClient);

  public progress = signal<UserProgressData | null>(null);
  public leaderboard = signal<LeaderboardEntry[]>([]);
  public cohortName = signal<string>('National Cybersecurity Cohort 2026');
  public passportTier = signal<string>('AWARE_OPERATOR');
  public passportScore = signal<number>(52.0);

  public moduleCards: ModuleChallengeCard[] = [
    {
      id: 'm1_disinfo',
      titleKey: 'nav.m1',
      defaultTitle: 'M1: Disinformation Defense Lab',
      descKey: 'm1.desc',
      defaultDesc: 'Agent-Based network diffusion simulation defending power grid infrastructure against coordinated inauthentic panic.',
      icon: '🌐',
      route: '/modules/disinfo',
      badgeName: 'DISINFO_DEFENDER',
      badgeTitle: 'Disinfo Defender',
    },
    {
      id: 'm2_scam_lab',
      titleKey: 'nav.m2',
      defaultTitle: 'M2: Generative Phishing & BEC Lab',
      descKey: 'm2.desc',
      defaultDesc: 'Interactive drill defending against AI-generated spear-phishing and out-of-band wire redirection.',
      icon: '🎣',
      route: '/modules/scam-lab',
      badgeName: 'SCAM_RESILIENT',
      badgeTitle: 'Scam Resilient',
    },
    {
      id: 'm3_deepfake_lab',
      titleKey: 'nav.m3',
      defaultTitle: 'M3: Deepfake & Synthetic Forensics Lab',
      descKey: 'm3.desc',
      defaultDesc: 'Multi-agent acoustic & visual analysis verifying C2PA cryptographic provenance manifests and Google SynthID watermarks.',
      icon: '🎭',
      route: '/modules/deepfake-lab',
      badgeName: 'SYNTHID_FORENSIC',
      badgeTitle: 'Deepfake Forensics',
    },
    {
      id: 'm4_osint_lab',
      titleKey: 'nav.m4',
      defaultTitle: 'M4: OSINT Footprint & DLP Hygiene Lab',
      descKey: 'm4.desc',
      defaultDesc: 'Public footprint analysis and automated DLP sanitizer shielding personal metadata from reconnaissance.',
      icon: '🔍',
      route: '/modules/osint-exposure',
      badgeName: 'DLP_GUARDIAN',
      badgeTitle: 'DLP Guardian',
    },
    {
      id: 'm5_algo_echo',
      titleKey: 'nav.m5',
      defaultTitle: 'M5: Algorithmic Echo-Chamber Lab',
      descKey: 'm5.desc',
      defaultDesc: 'Recommender tuning sandbox measuring Shannon Viewpoint Entropy and mitigating ideological polarization drift.',
      icon: '📊',
      route: '/modules/echo-chamber',
      badgeName: 'ECHO_CHAMBER_BREAKER',
      badgeTitle: 'Echo Breaker',
    },
  ];

  public availableBadges = [
    { code: 'DISINFO_DEFENDER', name: 'Disinfo Defender', icon: '🌐', desc: 'Inoculated critical population nodes against coordinated panic.' },
    { code: 'SCAM_RESILIENT', name: 'Scam Resilient', icon: '🛡️', desc: 'Neutralized generative BEC attacks and verified out-of-band channels.' },
    { code: 'SYNTHID_FORENSIC', name: 'SynthID Forensics', icon: '🔬', desc: 'Unmasked voice clones and synthetic video with C2PA manifests.' },
    { code: 'DLP_GUARDIAN', name: 'DLP Guardian', icon: '🔒', desc: 'Scrubbed PII, PESEL, and EXIF metadata from public footprints.' },
    { code: 'ECHO_CHAMBER_BREAKER', name: 'Echo Breaker', icon: '⚖️', desc: 'Restored viewpoint entropy and mitigated echo-chamber polarization.' },
    { code: 'COGNITIVE_SHIELD_MASTER', name: 'Shield Master', icon: '👑', desc: 'Conquered all five cognitive defense operational domains.' },
  ];

  ngOnInit(): void {
    this.refreshProgress();
    this.loadCohortLeaderboard();
  }

  public refreshProgress(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    this.http.get<UserProgressData>(`/api/v1/users/${user.id}/progress`).subscribe({
      next: (data) => {
        this.progress.set(data);
      },
      error: () => {
        // Fallback default progression if offline
        const fallback: UserProgressData = {
          user_id: user.id,
          cohort_id: this.auth.cohortId(),
          total_points: 250,
          completed_modules: ['m1_disinfo', 'm2_scam_lab'],
          module_records: {
            m1_disinfo: { module_id: 'm1_disinfo', is_completed: true, best_score: 88, points_earned: 100, attempts: 1, takeaway: 'Stabilized grid.' },
            m2_scam_lab: { module_id: 'm2_scam_lab', is_completed: true, best_score: 92.5, points_earned: 150, attempts: 2, takeaway: 'Verified BEC callback.' },
          },
          badges: ['DISINFO_DEFENDER', 'SCAM_RESILIENT'],
          updated_at: Date.now() / 1000,
        };
        this.progress.set(fallback);
      },
    });

    this.http.get<any>(`/api/v1/platform/passport/${user.id}`).subscribe({
      next: (res) => {
        if (res && res.overall_hygiene_index !== undefined) {
          this.passportScore.set(res.overall_hygiene_index);
        }
        if (res && res.maturity_tier) {
          this.passportTier.set(res.maturity_tier);
        }
      },
      error: () => {},
    });
  }

  public loadCohortLeaderboard(): void {
    const cId = this.auth.cohortId();
    this.http.get<LeaderboardEntry[]>(`/api/v1/cohorts/${cId}/leaderboard`).subscribe({
      next: (entries) => {
        this.leaderboard.set(entries);
      },
      error: () => {
        this.leaderboard.set([
          { user_id: 'user_player1', username: 'player1', display_name: 'Alex Vance (Player 1)', total_points: 250, completed_modules_count: 2, badges_count: 2, rank: 1 },
          { user_id: 'user_player2', username: 'player2', display_name: 'Sam Carter (Player 2)', total_points: 150, completed_modules_count: 1, badges_count: 1, rank: 2 },
        ]);
      },
    });
  }

  public exportStix21(): void {
    const user = this.auth.currentUser();
    const uid = user ? user.id : 'demo_user';
    this.http.get(`/api/v1/platform/passport/${uid}/stix21`).subscribe({
      next: (bundle) => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `stix21_passport_${uid}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      },
      error: (err) => console.error('STIX export error', err),
    });
  }

  public getUserInitials(): string {
    const user = this.auth.currentUser();
    const name = user?.display_name || user?.username || 'P';
    return name.slice(0, 2).toUpperCase();
  }

  public isModuleCompleted(moduleId: string): boolean {
    return (this.progress()?.completed_modules || []).includes(moduleId);
  }

  public getPointsEarned(moduleId: string): number {
    return this.progress()?.module_records[moduleId]?.points_earned || 0;
  }

  public getBestScore(moduleId: string): number {
    return this.progress()?.module_records[moduleId]?.best_score || 0;
  }

  public getTakeaway(moduleId: string): string {
    return this.progress()?.module_records[moduleId]?.takeaway || '';
  }

  public hasBadge(code: string): boolean {
    return (this.progress()?.badges || []).includes(code);
  }

  public getCompletionPercentage(): number {
    const done = (this.progress()?.completed_modules || []).length;
    return Math.round((done / 5) * 100);
  }

  public getTierClass(tier: string): string {
    if (tier === 'RESILIENT_DEFENDER') {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
    if (tier === 'AWARE_OPERATOR') {
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    }
    return 'bg-red-500/20 text-red-400 border border-red-500/30';
  }
}
